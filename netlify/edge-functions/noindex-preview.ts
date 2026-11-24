// Пока сайт живёт на *.netlify.app, поисковики не должны его индексировать:
// иначе в Google появится дубль будущего soulvibespace.com.
// Заголовок X-Robots-Tag ставится ТОЛЬКО для хостов *.netlify.app (основной адрес и
// deploy-превью). Когда домен soulvibespace.com переедет сюда, запросы к нему придут
// с другим host — и noindex снимется сам, без правок кода.
// robots.txt при этом НЕ закрываем: иначе роботы не увидят сам noindex.
import type { Config, Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const response = await context.next();
  try {
    const host = new URL(request.url).hostname;
    if (host.endsWith(".netlify.app")) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
  } catch (_e) {
    // Никогда не ломаем ответ сайта из-за этой функции.
  }
  return response;
};

export const config: Config = { path: "/*" };
