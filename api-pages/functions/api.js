export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  const target = url.searchParams.get('target');
  const shortcode = url.searchParams.get('shortcode');
  
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

  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
  ];

  async function fetchWithRotation(url, options = {}) {
    let lastError = null;
    const shuffledAgents = [...USER_AGENTS].sort(() => Math.random() - 0.5);
    
    const tryFetch = async (targetUrl, agent) => {
        const headers = { 
            ...options.headers, 
            'User-Agent': agent 
        };
        const sessionCookie = context.env ? context.env.SESSION_COOKIE : null;
        if (sessionCookie) {
            headers['Cookie'] = headers['Cookie'] ? `${headers['Cookie']}; sessionid=${sessionCookie}` : `sessionid=${sessionCookie}`;
        }
        const response = await fetch(targetUrl, { ...options, headers });
        if (response.status === 401 || response.status === 403 || response.status === 429) {
            throw new Error(`Blocked (${response.status})`);
        }
        return response;
    };

    // Tenta até 3 vezes com agentes diferentes diretamente
    for (let i = 0; i < Math.min(3, shuffledAgents.length); i++) {
        try {
            return await tryFetch(url, shuffledAgents[i]);
        } catch (e) {
            lastError = e;
            console.log(`Direct fetch failed: ${e.message}. Trying next agent...`);
        }
    }

    // Se falhou direto, tenta 1 vez via proxy
    try {
        console.log("Attempting via proxy fallback...");
        const proxyUrl = `https://insta-proxy-lz.pages.dev/?url=${encodeURIComponent(url)}`;
        return await tryFetch(proxyUrl, USER_AGENTS[0]);
    } catch (e) {
        throw lastError || e || new Error("Falha após todas as tentativas (incluindo proxy)");
    }
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

  if (!username && !shortcode) {
    return jsonResponse({ error: 'Username or shortcode is required' }, 400);
  }

  const worker_url = "https://insta-proxy-lz.pages.dev/?url=";
  
  // Se 'target' estiver presente, verificamos se 'username' segue 'target'
  if (target) {
    try {
      const ig_url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(target)}`;
      const igHeaders = {
        'x-ig-app-id': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest'
      };

      let response = await fetchWithRotation(ig_url, { headers: igHeaders });
      if (!response.ok) {
        return jsonResponse({ error: 'Instagram API error', status: response.status }, response.status);
      }

      const data = await response.json();
      if (!data || !data.data || !data.data.user) {
        return jsonResponse({ error: 'Target user not found' }, 404);
      }

      const targetId = data.data.user.id;
      
      return jsonResponse({ 
        message: "Endpoint de verificação de seguidor implementado.",
        note: "A verificação exata de 'quem segue quem' em APIs públicas do Instagram sem cookies de sessão é restrita.",
        source: username,
        target: target,
        target_id: targetId
      });
    } catch (error) {
      return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
    }
  }

  // Novo: Buscar comentários de um post específico
  if (shortcode) {
    try {
        // Obter Media ID do shortcode localmente
        function shortcodeToId(shortcodeStr) {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
            let id = BigInt(0);
            for (let i = 0; i < shortcodeStr.length; i++) {
                id = id * BigInt(64) + BigInt(alphabet.indexOf(shortcodeStr[i]));
            }
            return id.toString();
        }

        const mediaId = shortcodeToId(shortcode);

        const initialHeaders = {
            'x-ig-app-id': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://www.instagram.com/p/${shortcode}/`
        };

        // Passo 2: Buscar comentários via v1 media ID
        const comments_url = `https://www.instagram.com/api/v1/media/${mediaId}/comments/`;
        const v1Headers = {
            ...initialHeaders,
            'x-asbd-id': '197023',
            'x-ig-www-claim': '0'
        };

        const finalResponse = await fetchWithRotation(comments_url, { headers: v1Headers });
        if (!finalResponse.ok) return jsonResponse({ error: 'Comment API error', status: finalResponse.status }, finalResponse.status);

        const data = await finalResponse.json();
        return jsonResponse({
            id: mediaId,
            shortcode: shortcode,
            comment_count: data.comment_count,
            comments: (data.comments || []).map(c => ({
                id: c.pk,
                text: c.text,
                created_at: c.created_at,
                owner: {
                    username: c.user.username,
                    profile_pic_url: c.user.profile_pic_url
                }
            }))
        });
    } catch (error) {
        return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
    }
  }

  const ig_url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  try {
    const igHeaders = {
      'x-ig-app-id': '936619743392459',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Referer': 'https://www.instagram.com/'
    };

    let response = await fetchWithRotation(ig_url, { headers: igHeaders });

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
