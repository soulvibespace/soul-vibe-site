// netlify/edge-functions/noindex-preview.ts: noindex только для *.netlify.app.
// Запуск: node tests/noindex-edge.test.mjs (Node 22.18+ сам убирает типы TypeScript).
import assert from 'node:assert/strict';
const mod = await import('../netlify/edge-functions/noindex-preview.ts');
const run = async (url) => {
  const ctx = { next: async () => new Response('ok', { headers: { 'content-type': 'text/html' } }) };
  const res = await mod.default(new Request(url), ctx);
  return res.headers.get('x-robots-tag');
};
const cases = [
  ['https://soul-vibe-space.netlify.app/', 'noindex, nofollow'],
  ['https://soul-vibe-space.netlify.app/pricing', 'noindex, nofollow'],
  ['https://deploy-preview-12--soul-vibe-space.netlify.app/', 'noindex, nofollow'],
  ['https://main--soul-vibe-space.netlify.app/robots.txt', 'noindex, nofollow'],
  ['https://www.soulvibespace.com/', null],
  ['https://soulvibespace.com/pricing', null],
  ['https://ecstatic.soulvibespace.com/', null],
  ['https://netlify.app.soulvibespace.com/', null],
  ['https://soulvibespace.com/?h=x.netlify.app', null],
];
for (const [url, want] of cases) assert.equal(await run(url), want, url);
assert.equal(mod.config.path, '/*');
console.log('noindex-edge: ок (' + cases.length + ' адресов)');
