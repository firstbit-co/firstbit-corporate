import type { APIRoute } from 'astro';

/** 公開設定(PUBLIC_ALLOW_INDEX=true)のときだけクロールを許可する。それ以外は全ページ拒否 */
export const GET: APIRoute = ({ site }) => {
  const allowIndex = import.meta.env.PUBLIC_ALLOW_INDEX === 'true';
  const body = allowIndex
    ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap-index.xml', site)}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
