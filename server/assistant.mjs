/** Shared by Vite development middleware and the production server. */
export async function handleAssistant(req, res, env = process.env) {
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  if (req.method === 'GET') { send(200, { mode: env.GEMINI_API_KEY ? 'live' : 'preview' }); return; }
  if (req.method !== 'POST') { send(405, { error: 'Use POST to send a message.' }); return; }
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) { send(403, { error: 'Origin not allowed.' }); return; } }
    catch { send(403, { error: 'Invalid origin.' }); return; }
  }
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 40000) { send(413, { error: 'Conversation is too large.' }); return; } }
    const data = JSON.parse(body);
    if (!Array.isArray(data.messages) || !data.messages.length || data.messages.length > 24 || data.messages.some(m => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 4000)) { send(400, { error: 'Invalid conversation.' }); return; }
    if (!env.GEMINI_API_KEY) { send(200, { mode: 'preview' }); return; }
    const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are Atlas, Worldscope’s warm, concise travel discovery assistant. Help users choose destinations based on interests, travel month, trip length, and budget. Respond naturally to greetings and casual conversation. Ask one focused question when needed. Use plain text, without Markdown headings. Suggest at most three countries and explain the fit. Do not invent live prices, current entry requirements, or availability. Mention uncertainty when asked about changing travel conditions. Keep most replies under 140 words.' }] },
        contents: data.messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { maxOutputTokens: 1600, temperature: 0.7 },
      }), signal: AbortSignal.timeout(45000),
    });
    if (!result.ok) { send(502, { error: 'The travel assistant is temporarily unavailable. Please try again.' }); return; }
    const response = await result.json();
    const reply = (response.candidates || []).flatMap(candidate => candidate.content?.parts || []).map(part => part.text || '').join('\n').trim();
    if (!reply) { send(502, { error: 'The assistant could not complete that response. Please try again.' }); return; }
    send(200, { mode: 'live', reply });
  } catch (error) { send(error instanceof SyntaxError ? 400 : 502, { error: error instanceof SyntaxError ? 'Invalid request.' : 'The connection to the assistant was interrupted. Please try again.' }); }
}
