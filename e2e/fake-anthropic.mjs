// TEST DOUBLE for the Anthropic Messages API, used only by the browser tests (the product reads its URL from ANTHROPIC_URL).
// It validates the request shape the real API requires, records the last request, and answers with text derived from the
// context it received, so tests can prove the learner's code and the current trace step really reach the model.
import { createServer } from 'node:http';

let last = null;
createServer((req, res) => {
  const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
  if (req.method === 'GET' && req.url === '/last') return send(200, last ?? {});
  if (req.method !== 'POST' || req.url !== '/v1/messages') return send(404, { error: 'not found' });
  let raw = '';
  req.on('data', c => (raw += c));
  req.on('end', () => {
    if (req.headers['x-api-key'] !== 'e2e-key') return send(401, { error: { message: 'invalid x-api-key' } });
    if (req.headers['anthropic-version'] !== '2023-06-01') return send(400, { error: { message: 'missing anthropic-version' } });
    const body = JSON.parse(raw);
    last = body;
    const user = body.messages[body.messages.length - 1].content;
    if (user.includes('trigger-upstream-error')) return send(500, { error: { message: 'boom' } });
    const step = /step (\d+) of (\d+); line (\d+)/.exec(user);
    const level = /Help level requested: (\w+)/.exec(user)?.[1];
    send(200, {
      model: body.model, usage: { input_tokens: 1, output_tokens: 1 },
      content: [{ type: 'text', text: `FAKE-LLM answer (level ${level}). I can see ${step ? `step ${step[1]} of ${step[2]} at line ${step[3]}` : 'no trace'}; your code has ${(/<student_code>\n([\s\S]*?)\n<\/student_code>/.exec(user)?.[1] ?? '').length} characters.` }],
    });
  });
}).listen(9911, '127.0.0.1');
