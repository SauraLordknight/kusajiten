// Same-origin gateway to the two existing public ranking services.
// Preview deployments keep using the test partition, never production scores.
export async function onRequest({request, params}) {
  try {
  const segments = Array.isArray(params.path) ? [...params.path] : String(params.path || '').split('/');
  const game = segments.shift();
  const services = {
    pachi: 'https://kusa-pachi-ranking-test.lordwitekingdom.workers.dev',
    glass: 'https://glass-girl-ranking.lordwitekingdom.workers.dev'
  };
  if (!services[game] || !['GET', 'POST', 'OPTIONS'].includes(request.method)) {
    return new Response('Not found', {status: 404});
  }
  const source = new URL(request.url);
  const upstream = new URL('/' + segments.map(encodeURIComponent).join('/'), services[game]);
  upstream.search = source.search;
  const origin = source.hostname === 'kusajiten.com' ? 'https://sauralordknight.github.io' : 'null';
  const headers = new Headers({'Origin': origin});
  if (request.headers.has('Content-Type')) headers.set('Content-Type', request.headers.get('Content-Type'));
  const response = await fetch(upstream.href, {
    method: request.method, headers,
    body: request.method === 'POST' ? request.body : undefined,
    redirect: 'error'
  });
  const output = new Headers(response.headers);
  output.delete('Access-Control-Allow-Origin');
  output.set('Cache-Control', 'no-store');
  output.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {status: response.status, headers: output});
  } catch (error) {
    console.error('Ranking gateway:', error);
    return Response.json({error:'ranking_gateway_unavailable',message:String(error.message)}, {status:502,headers:{'Cache-Control':'no-store'}});
  }
}
