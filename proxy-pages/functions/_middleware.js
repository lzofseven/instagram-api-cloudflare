export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

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

  if (!targetUrl) {
    return new Response('Missing url parameter', { 
      status: 400,
      headers: corsHeaders
    });
  }

  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ];

  async function fetchWithRetry(targetUrl) {
    const shuffled = [...USER_AGENTS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
        try {
            const res = await fetch(targetUrl, {
                headers: {
                    'User-Agent': shuffled[i],
                    'Referer': 'https://www.instagram.com/',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                }
            });
            if (res.ok || i === shuffled.length - 1) return res;
        } catch (e) {
            if (i === shuffled.length - 1) throw e;
        }
    }
  }

  try {
    const response = await fetchWithRetry(targetUrl);
    
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      }
    });
  } catch (e) {
    return new Response('Error: ' + e.message, { 
      status: 500,
      headers: corsHeaders
    });
  }
}
