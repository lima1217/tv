import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchDoubanData } from '@/lib/douban';
import { DoubanSubjectEnrichment } from '@/lib/video-enrichment';

export const runtime = 'nodejs';

interface RexxarSubjectResponse {
  id?: string | number;
  title?: string;
  intro?: string;
  year?: string;
  card_subtitle?: string;
  genres?: string[];
  countries?: string[];
  rating?: {
    value?: number;
  };
  directors?: Array<{ name?: string } | string>;
  actors?: Array<{ name?: string } | string>;
}

function peopleNames(
  list: Array<{ name?: string } | string> | undefined,
  limit = 8
): string {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list
    .slice(0, limit)
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .map((name) => name.trim())
    .filter(Boolean)
    .join(' / ');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = (searchParams.get('id') || '').trim();

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: '无效的豆瓣 id' },
      { status: 400 }
    );
  }

  const target = `https://m.douban.com/rexxar/api/v2/subject/${id}`;

  try {
    const data = await fetchDoubanData<RexxarSubjectResponse>(target);
    const yearFromSubtitle =
      data.card_subtitle?.match(/(\d{4})/)?.[1] || '';

    const enrichment: DoubanSubjectEnrichment & { code: number; message: string } =
      {
        code: 200,
        message: '获取成功',
        rate: data.rating?.value ? data.rating.value.toFixed(1) : '',
        directors: peopleNames(data.directors, 4),
        actors: peopleNames(data.actors, 8),
        genres: (data.genres || []).filter(Boolean).join(' / '),
        area: (data.countries || []).filter(Boolean).join(' / '),
        year: data.year || yearFromSubtitle,
        desc: (data.intro || '').trim(),
      };

    const cacheTime = await getCacheTime();
    return NextResponse.json(enrichment, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: '获取豆瓣详情失败',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
