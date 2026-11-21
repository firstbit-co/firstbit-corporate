import { getCollection, type CollectionEntry } from 'astro:content';

const isPublished = (entry: { data: { draft: boolean } }) => import.meta.env.DEV || !entry.data.draft;

/** 公開設定(PUBLIC_ALLOW_INDEX=true)のビルドにサンプル記事が残っていたら失敗させる */
function assertNoSamples(entries: { id: string; data: { title: string } }[]) {
  if (import.meta.env.PUBLIC_ALLOW_INDEX !== 'true') return;
  const samples = entries.filter((e) => e.data.title.includes('【サンプル】'));
  if (samples.length) {
    throw new Error(`公開ビルドにサンプル記事が含まれています: ${samples.map((e) => e.id).join(', ')}`);
  }
}

export async function getEvents(): Promise<CollectionEntry<'events'>[]> {
  const events = await getCollection('events', isPublished);
  assertNoSamples(events);
  return events.sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}

/** ビルド時点で今日以降のイベント。毎日の再ビルド(docs/03-roadmap.md)で鮮度を保つ */
export async function getUpcomingEvents(limit?: number): Promise<CollectionEntry<'events'>[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = (await getEvents()).filter((e) => e.data.date >= today);
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export async function getNews(limit?: number): Promise<CollectionEntry<'news'>[]> {
  const news = (await getCollection('news', isPublished)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  assertNoSamples(news);
  return limit ? news.slice(0, limit) : news;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
