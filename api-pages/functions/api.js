export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get('username');

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

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    let totalLikes30d = 0;
    let totalViews30d = 0;
    let totalComments30d = 0;
    let postsIn30d = 0;
    let hiddenLikesCount = 0;

    const posts = (user.edge_owner_to_timeline_media.edges || []).map(edge => {
      const node = edge.node;
      let likes = node.edge_media_preview_like?.count;
      const views = node.video_view_count || 0;
      const comments = node.edge_media_to_comment?.count || 0;
      const timestamp = node.taken_at_timestamp;

      let displayLikes = likes;
      if (likes === -1) {
        displayLikes = "curtidas_ocultas";
        hiddenLikesCount++;
      }

      if (timestamp >= thirtyDaysAgo) {
        if (typeof likes === 'number' && likes !== -1) {
          totalLikes30d += likes;
        }
        totalViews30d += views;
        totalComments30d += comments;
        postsIn30d++;
      }

      return {
        "id": node.id,
        "shortcode": node.shortcode,
        "type": node.__typename,
        "is_video": node.is_video,
        "image_url": worker_url + encodeURIComponent(node.display_url),
        "video_url": node.is_video ? worker_url + encodeURIComponent(node.video_url || "") : "",
        "like_count": displayLikes,
        "view_count": views,
        "comment_count": comments,
        "taken_at": timestamp,
        "caption": node.edge_media_to_caption?.edges[0]?.node.text || ""
      };
    });

    let engagementRate30d = 0;
    if (followerCount > 0 && postsIn30d > 0) {
      const validPostsForEngagement = postsIn30d - hiddenLikesCount;
      if (validPostsForEngagement > 0) {
        const avgInteractions = (totalLikes30d + totalComments30d) / validPostsForEngagement;
        engagementRate30d = (avgInteractions / followerCount) * 100;
      }
    }

    const result = {
      "user_info": {
        "username": user.username,
        "full_name": user.full_name,
        "biography": user.biography,
        "profile_pic_url": worker_url + encodeURIComponent(user.profile_pic_url_hd),
        "follower_count": followerCount,
        "following_count": user.edge_follow.count,
        "media_count": user.edge_owner_to_timeline_media.count,
        "is_private": user.is_private,
        "is_verified": user.is_verified,
        "user_id": user.id
      },
      "metrics_30_days": {
        "total_likes": totalLikes30d,
        "total_views": totalViews30d,
        "total_comments": totalComments30d,
        "posts_count": postsIn30d,
        "hidden_likes_posts": hiddenLikesCount,
        "engagement_rate": engagementRate30d > 0 ? engagementRate30d.toFixed(2) + "%" : "N/A (curtidas ocultas)"
      },
      "posts": posts,
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
