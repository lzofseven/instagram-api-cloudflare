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

  const newRequest = new Request(targetUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.instagram.com/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  try {
    const response = await fetch(newRequest);
    
    if (!response.ok) {
      const retryRequest = new Request(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const retryResponse = await fetch(retryRequest);
      
      const body = await retryResponse.arrayBuffer();
      return new Response(body, {
        status: retryResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': retryResponse.headers.get('Content-Type') || 'image/jpeg',
        }
      });
    }

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
