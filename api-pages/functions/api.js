export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const username = url.searchParams.get('username');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), {
      status: 400,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    });
  }

  const worker_url = "https://insta-proxy-lz.pages.dev/?url=";
  const ig_url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  try {
    const response = await fetch(ig_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-ig-app-id': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.instagram.com',
        'Referer': `https://www.instagram.com/${username}/`
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'User not found or Instagram API error', status: response.status }), {
        status: response.status,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      });
    }

    const data = await response.json();

    if (!data || !data.data || !data.data.user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      });
    }

    const user = data.data.user;

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
      "_chaining_results": []
    };

    return new Response(JSON.stringify(result, null, 4), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    });
  }
}
