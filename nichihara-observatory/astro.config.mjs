// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 本番ドメイン確定後に SITE_URL を設定する(src/data/facility.ts の SITE.url も合わせる)
const site = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [sitemap()],
});
