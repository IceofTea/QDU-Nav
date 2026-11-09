// 文件路径: /qdu-nav/backend-options/02-cloudflare-kv/worker.js
// GET /doc/:key 读；PUT /doc/:key 写（X-Write-Token 校验）。KV binding = NAV_DOCS。

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Write-Token',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const m = new URL(request.url).pathname.match(/^\/doc\/([\w-]+)$/);
    if (!m) return json({ error: 'not found' }, 404);
    const key = m[1];
    if (request.method === 'GET') {
      const v = await env.NAV_DOCS.get(key, 'json');
      return v === null ? json({ error: 'empty' }, 404) : json(v);
    }
    if (request.method === 'PUT') {
      if (!env.WRITE_TOKEN || request.headers.get('X-Write-Token') !== env.WRITE_TOKEN)
        return json({ error: 'forbidden' }, 403);
      let body;
      try { body = await request.json(); }
      catch (e) { return json({ error: 'body must be JSON object' }, 400); }
      if (body === null || typeof body !== 'object' || Array.isArray(body))
        return json({ error: 'body must be JSON object' }, 400);
      await env.NAV_DOCS.put(key, JSON.stringify(body));
      return json({ ok: true });
    }
    return json({ error: 'method not allowed' }, 405);
  },
};

function json(v, status = 200) {
  return new Response(JSON.stringify(v), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
