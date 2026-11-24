// Индексировать поисковикам разрешено ТОЛЬКО основной домен: soulvibespace.com и
// www.soulvibespace.com. На всех остальных адресах этого сайта ставится заголовок
// X-Robots-Tag: noindex, nofollow:
//   * soul-vibe-space.netlify.app, deploy-превью и ветки (*--soul-vibe-space.netlify.app);
//   * app.soulvibespace.com — новый сайт до переключения апекса (после Yoga Day 13.12)
//     и рабочий алиас для установленных PWA после него (без редиректа);
//   * любой другой алиас, который добавят в Netlify позже.
// Пока soulvibespace.com указывает на Squarespace, сюда запросы с ним не приходят,
// поэтому до переключения закрыт весь новый сайт. После переключения DNS апекса на
// Netlify основной домен откроется сам, а app.* останется закрытым — правки не нужны.
// robots.txt при этом НЕ закрываем: иначе роботы не увидят сам noindex.
import type { Config, Context } from "https://edge.netlify.com";

export const INDEXABLE_HOSTS = new Set(["soulvibespace.com", "www.soulvibespace.com"]);

export function isIndexable(hostname: string): boolean {
  return INDEXABLE_HOSTS.has(hostname.toLowerCase().replace(/\.$/, ""));
}

export default async (request: Request, context: Context) => {
  const response = await context.next();
  try {
    if (!isIndexable(new URL(request.url).hostname)) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  } catch (_e) {
    // Никогда не ломаем ответ сайта из-за этой функции.
  }
  return response;
};

export const config: Config = { path: "/*" };
