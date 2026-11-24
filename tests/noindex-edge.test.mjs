// netlify/edge-functions/noindex-preview.ts: индексируется только soulvibespace.com и www.
// Запуск: node tests/noindex-edge.test.mjs (Node 22.18+ сам убирает типы TypeScript).
import assert from 'node:assert/strict';
const mod = await import('../netlify/edge-functions/noindex-preview.ts');
const run = async (url) => {
  const ctx = { next: async () => new Response('ok', { headers: { 'content-type': 'text/html' } }) };
  const res = await mod.default(new Request(url), ctx);
  return res.headers.get('x-robots-tag');
};
const NO = 'noindex, nofollow';
const cases = [
  // закрыто
  ['https://soul-vibe-space.netlify.app/', NO],
  ['https://soul-vibe-space.netlify.app/pricing', NO],
  ['https://deploy-preview-12--soul-vibe-space.netlify.app/', NO],
  ['https://main--soul-vibe-space.netlify.app/robots.txt', NO],
  ['https://app.soulvibespace.com/', NO],
  ['https://APP.soulvibespace.com/schedule', NO],
  ['https://soulvibespace.com.evil.example/', NO],
  ['https://notsoulvibespace.com/', NO],
  ['https://www.soulvibespace.com.netlify.app/', NO],
  // открыто: только основной домен
  ['https://soulvibespace.com/', null],
  ['https://soulvibespace.com/pricing?x=app.soulvibespace.com', null],
  ['https://www.soulvibespace.com/', null],
  ['https://WWW.SoulVibeSpace.com/about', null],
];
for (const [url, want] of cases) assert.equal(await run(url), want, url);
assert.equal(mod.isIndexable('soulvibespace.com.'), true);
assert.equal(mod.config.path, '/*');
console.log('noindex-edge: ок (' + cases.length + ' адресов)');
