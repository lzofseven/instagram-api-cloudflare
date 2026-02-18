export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get('username');

  // Headers CORS ultra-permissivos para evitar qualquer bloqueio no navegador
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };

  // Resposta imediata para Preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Função auxiliar para retornar JSON com CORS garantido
  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data, null, 4), {
      status: status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json;charset=UTF-8',
      }
    });
  };

  if (!username) {
    return jsonResponse({ error: 'Username is required' }, 400);
  }

  const worker_url = "https://insta-proxy-lz.pages.dev/?url=";
  const ig_url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  try {
    // Headers para simular requisição legítima e evitar 401
    const igHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'x-ig-app-id': '936619743392459',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };

    let response = await fetch(ig_url, { headers: igHeaders });

    // Fallback se o Instagram bloquear com 401/403
    if (response.status === 401 || response.status === 403) {
      response = await fetch(ig_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'x-ig-app-id': '936619743392459'
        }
      });
    }

    if (!response.ok) {
      return jsonResponse({ error: 'Instagram API error', status: response.status }, response.status);
    }

    const data = await response.json();

    if (!data || !data.data || !data.data.user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    const user = data.data.user;

    // Processar Posts
    const posts = (user.edge_owner_to_timeline_media.edges || []).map(edge => {
      const node = edge.node;
      return {
        "post": {
          "image_url": worker_url + encodeURIComponent(node.display_url),
          "video_url": node.is_video ? worker_url + encodeURIComponent(node.video_url || "") : "",
          "like_count": node.edge_media_preview_like.count,
          "comment_count": node.edge_media_to_comment.count,
          "taken_at": node.taken_at_timestamp,
          "caption": node.edge_media_to_caption.edges[0]?.node.text || ""
        }
      };
    });

    // Processar Stories (_chaining_results)
    const chaining = (user.edge_related_profiles?.edges || []).map(edge => ({
      "username": edge.node.username,
      "full_name": edge.node.full_name,
      "profile_pic_url": worker_url + encodeURIComponent(edge.node.profile_pic_url)
    }));

    // Garantir 14 usuários reais/conhecidos para os stories
    if (chaining.length < 14) {
      const mocks = [
        { username: "leomessi", name: "Leo Messi" },
        { username: "neymarjr", name: "Neymar Jr" },
        { username: "kendalljenner", name: "Kendall" },
        { username: "arianagrande", name: "Ariana Grande" },
        { username: "beyonce", name: "Beyoncé" },
        { username: "kimkardashian", name: "Kim Kardashian" },
        { username: "therock", name: "The Rock" },
        { username: "selenagomez", name: "Selena Gomez" },
        { username: "kyliejenner", name: "Kylie Jenner" },
        { username: "taylorswift", name: "Taylor Swift" },
        { username: "justinbieber", name: "Justin Bieber" },
        { username: "natgeo", name: "National Geographic" },
        { username: "nike", name: "Nike" },
        { username: "realmadrid", name: "Real Madrid" }
      ];
      
      for (let i = chaining.length; i < 14; i++) {
        const mock = mocks[i % mocks.length];
        chaining.push({
          "username": mock.username,
          "full_name": mock.name,
          "profile_pic_url": `https://unavatar.io/instagram/${mock.username}`
        });
      }
    }

    const result = {
      "username": user.username,
      "full_name": user.full_name,
      "biography": user.biography,
      "profile_pic_url": worker_url + encodeURIComponent(user.profile_pic_url_hd),
      "follower_count": user.edge_followed_by.count,
      "following_count": user.edge_follow.count,
      "media_count": user.edge_owner_to_timeline_media.count,
      "is_private": user.is_private,
      "is_verified": user.is_verified,
      "user_id": user.id,
      "external_url": user.external_url,
      "posts": posts,
      "_chaining_results": chaining
    };

    return jsonResponse(result);

  } catch (error) {
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
