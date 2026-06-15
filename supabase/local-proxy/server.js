// Minimal local proxy to emulate Supabase Edge Function endpoints for development
// Run: `npm run local-proxy`

import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT ? Number(process.env.PORT) : 54321;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  if (url.pathname === '/functions/v1/health' && req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, function: 'health' });
  }

  if (url.pathname === '/functions/v1/scholarx-chat' && req.method === 'POST') {
    // Dynamic import of local logic so edits don't require server restart
    try {
      const { default: handler } = await import('./scholarx-chat.js');
      const result = await handler(req, { fetch, process });
      // result should be { status, headers, body }
      res.writeHead(result.status || 200, { ...(result.headers || {}), ...corsHeaders });
      return res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    } catch (e) {
      console.error('local handler error', e);
      return sendJSON(res, 500, { error: 'local handler error', detail: String(e) });
    }
  }

  // fallback
  sendJSON(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`Local proxy running on http://localhost:${PORT}`);
});
