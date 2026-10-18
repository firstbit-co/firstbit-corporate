import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 観望会・特別イベント。1イベント = 1 Markdown ファイル */
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    /** 開催日(JST) */
    date: z.coerce.date(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    category: z.enum(['観望会', '天文現象', 'ワークショップ', '季節イベント', 'その他']),
    summary: z.string(),
    fee: z.string().optional(),
    capacity: z.string().optional(),
    reservation: z.enum(['不要', '要予約', '先着順']).default('不要'),
    /** true の間はビルドに含めない */
    draft: z.boolean().default(false),
  }),
});

/** お知らせ(休館・道路情報・メディア掲載など) */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['お知らせ', '休館・営業', '道路・アクセス', 'メディア']),
    /** トップページ上部の帯に出す重要なお知らせ */
    important: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { events, news };
