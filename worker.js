export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API requests to the Render backend service
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = new URL(url.pathname + url.search, 'https://sachbot-project.onrender.com');

      // Preflight CORS response
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      try {
        const proxyRequest = new Request(backendUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow',
        });

        const response = await fetch(proxyRequest);

        // Re-emit response with permissive CORS headers to prevent browser blocks
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        newHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({
            detail: 'Backend gateway error connecting to Render service. It may be waking from cold sleep.',
            error: err.message
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }
    }

    // Serve static SPA frontend assets
    return env.ASSETS.fetch(request);
  }
};
