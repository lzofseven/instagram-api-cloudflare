export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  
  const filterType = url.searchParams.get('type'); 
  const filterDays = parseInt(url.searchParams.get('days')) || null;

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
        "external_url": user.external_url,
        "profile_pic_url": worker_url + encodeURIComponent(user.profile_pic_url_hd),
        "follower_count": followerCount,
        "following_count": user.edge_follow.count,
        "media_count": user.edge_owner_to_timeline_media.count,
        "is_private": user.is_private,
        "is_verified": user.is_verified,
        "user_id": user.id,
        "category": user.category_name,
        "is_business": user.is_business_account
      },
      "filters_applied": {
        "type": filterType || "all",
        "days": filterDays || "all_loaded"
      },
      "metrics": {
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
      },
      "posts": processedPosts.filter(p => p.pass_filter),
      "related_profiles": (user.edge_related_profiles?.edges || []).map(edge => ({
        "username": edge.node.username,
        "full_name": edge.node.full_name,
        "profile_pic_url": worker_url + encodeURIComponent(edge.node.profile_pic_url)
      }))
    };

    return jsonResponse(result);

  } catch (error) {
    return jsonResponse({ error: 'Internal Server Error', message: error.message }, 500);
  }
}
