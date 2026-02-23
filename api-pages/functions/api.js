export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  const target = url.searchParams.get('target');
  
  const filterType = url.searchParams.get('type'); 
  const filterDays = parseInt(url.searchParams.get('days')) || null;
  const viewMode = url.searchParams.get('view'); 

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

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
  
  // Se 'target' estiver presente, verificamos se 'username' segue 'target'
  if (target) {
    try {
      const ig_url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(target)}`;
      const igHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'x-ig-app-id': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest'
      };

      let response = await fetch(ig_url, { headers: igHeaders });
      if (!response.ok) {
        return jsonResponse({ error: 'Instagram API error', status: response.status }, response.status);
      }

      const data = await response.json();
      if (!data || !data.data || !data.data.user) {
        return jsonResponse({ error: 'Target user not found' }, 404);
      }

      const targetId = data.data.user.id;
      
      // Agora buscamos o perfil do 'username' para ver se o 'target' está entre os seguidos
      // Nota: A API pública web_profile_info não lista todos os seguidos, 
      // mas podemos verificar se há uma relação mútua ou usar outra estratégia se disponível.
      // Infelizmente, sem autenticação (cookies), não há um endpoint direto para "check friendship".
      // Uma alternativa comum é verificar se o 'username' aparece nos seguidores do 'target' 
      // ou vice-versa, mas isso exige paginação.
      
      // No entanto, para uma implementação simples via Cloudflare Worker sem cookies:
      // Vamos retornar os dados básicos e informar que a verificação direta de "segue" 
      // requer autenticação ou uma lógica de raspagem mais complexa.
      
      return jsonResponse({ 
        message: "Endpoint de verificação de seguidor implementado.",
        note: "A verificação exata de 'quem segue quem' em APIs públicas do Instagram sem cookies de sessão é restrita. Este endpoint serve como base para futuras integrações com sessões autenticadas.",
        source: username,
        target: target,
        target_id: targetId
      });
    } catch (error) {
      return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
    }
  }

  const ig_url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  try {
    const igHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'x-ig-app-id': '936619743392459',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };

    let response = await fetch(ig_url, { headers: igHeaders });

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
    const followerCount = user.edge_followed_by.count;
    const now = Math.floor(Date.now() / 1000);
    const filterTimestamp = filterDays ? now - (filterDays * 24 * 60 * 60) : null;

    let totalLikesAll = 0;
    let totalViewsAll = 0;
    let totalCommentsAll = 0;
    let postsAnalyzedAll = 0;
    let hiddenLikesAll = 0;

    let totalLikesFiltered = 0;
    let totalViewsFiltered = 0;
    let totalCommentsFiltered = 0;
    let postsAnalyzedFiltered = 0;
    let hiddenLikesFiltered = 0;

    const allPosts = user.edge_owner_to_timeline_media.edges || [];
    
    const processedPosts = allPosts.map(edge => {
      const node = edge.node;
      let likes = node.edge_media_preview_like?.count;
      const views = node.video_view_count || 0;
      const comments = node.edge_media_to_comment?.count || 0;
      const timestamp = node.taken_at_timestamp;
      const type = node.__typename;

      if (likes === -1) hiddenLikesAll++;
      else if (typeof likes === 'number') totalLikesAll += likes;
      totalViewsAll += views;
      totalCommentsAll += comments;
      postsAnalyzedAll++;

      let passFilter = true;
      if (filterTimestamp && timestamp < filterTimestamp) passFilter = false;
      if (filterType) {
        if (filterType === 'video' && !node.is_video) passFilter = false;
        if (filterType === 'image' && (node.is_video || type === 'GraphSidecar')) passFilter = false;
        if (filterType === 'sidecar' && type !== 'GraphSidecar') passFilter = false;
      }

      if (passFilter) {
        if (likes === -1) hiddenLikesFiltered++;
        else if (typeof likes === 'number') totalLikesFiltered += likes;
        totalViewsFiltered += views;
        totalCommentsFiltered += comments;
        postsAnalyzedFiltered++;
      }

      if (viewMode === 'basic') {
        return {
          "id": node.id,
          "shortcode": node.shortcode,
          "caption": node.edge_media_to_caption?.edges[0]?.node.text || "",
          "comment_count": comments,
          "taken_at": timestamp,
          "pass_filter": passFilter
        };
      }

      let carousel_media = [];
      if (type === "GraphSidecar" && node.edge_sidecar_to_children) {
        carousel_media = node.edge_sidecar_to_children.edges.map(child => ({
          "id": child.node.id,
          "type": child.node.__typename,
          "image_url": worker_url + encodeURIComponent(child.node.display_url),
          "video_url": child.node.is_video ? worker_url + encodeURIComponent(child.node.video_url || "") : ""
        }));
      }

      return {
        "id": node.id,
        "shortcode": node.shortcode,
        "type": type,
        "is_video": node.is_video,
        "image_url": worker_url + encodeURIComponent(node.display_url),
        "video_url": node.is_video ? worker_url + encodeURIComponent(node.video_url || "") : "",
        "carousel_media": carousel_media,
        "like_count": likes === -1 ? "curtidas_ocultas" : likes,
        "view_count": views,
        "comment_count": comments,
        "taken_at": timestamp,
        "caption": node.edge_media_to_caption?.edges[0]?.node.text || "",
        "pass_filter": passFilter
      };
    });

    const calcEngagement = (likes, comments, posts, hidden, followers) => {
      const validPosts = posts - hidden;
      if (followers > 0 && validPosts > 0) {
        return (((likes + comments) / validPosts) / followers * 100).toFixed(2) + "%";
      }
      return "0.00%";
    };

    const result = {
      "user_info": {
        "username": user.username,
        "full_name": user.full_name,
        "biography": user.biography,
        "profile_pic_url": worker_url + encodeURIComponent(user.profile_pic_url_hd),
        "follower_count": followerCount,
        "following_count": user.edge_follow.count,
        "media_count": user.edge_owner_to_timeline_media.count,
        "is_verified": user.is_verified,
        "user_id": user.id
      }
    };

    if (viewMode !== 'basic') {
      result.user_info.external_url = user.external_url;
      result.user_info.category = user.category_name;
      result.user_info.is_business = user.is_business_account;
      result.user_info.is_private = user.is_private;
      
      result.filters_applied = {
        "type": filterType || "all",
        "days": filterDays || "all_loaded",
        "view": viewMode || "full"
      };
      
      result.metrics = {
        "total_loaded": {
          "likes": totalLikesAll,
          "views": totalViewsAll,
          "comments": totalCommentsAll,
          "posts": postsAnalyzedAll,
          "engagement": calcEngagement(totalLikesAll, totalCommentsAll, postsAnalyzedAll, hiddenLikesAll, followerCount)
        },
        "filtered_result": {
          "likes": totalLikesFiltered,
          "views": totalViewsFiltered,
          "comments": totalCommentsFiltered,
          "posts": postsAnalyzedFiltered,
          "engagement": calcEngagement(totalLikesFiltered, totalCommentsFiltered, postsAnalyzedFiltered, hiddenLikesFiltered, followerCount)
        }
      };
      
      result.related_profiles = (user.edge_related_profiles?.edges || []).map(edge => ({
        "username": edge.node.username,
        "full_name": edge.node.full_name,
        "profile_pic_url": worker_url + encodeURIComponent(edge.node.profile_pic_url)
      }));
    } else {
      result.view_mode = "basic";
    }

    result.posts = processedPosts.filter(p => p.pass_filter);

    return jsonResponse(result);

  } catch (error) {
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
