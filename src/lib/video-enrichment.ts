import { SearchResult } from './types';

/** 豆瓣 subject 补全字段（与 /api/douban/subject 对齐） */
export interface DoubanSubjectEnrichment {
  rate: string;
  directors: string;
  actors: string;
  genres: string;
  area: string;
  year: string;
  desc: string;
}

function isBlank(value?: string): boolean {
  return !value || !value.trim();
}

function isWeakDesc(value?: string): boolean {
  return isBlank(value) || (value as string).trim().length < 40;
}

/**
 * 将豆瓣元数据合并进下游详情。
 * 评分：豆瓣优先；演员/导演/地区/类型：下游空才补；简介：下游过短才换。
 */
export function mergeVideoEnrichment(
  base: SearchResult,
  douban: DoubanSubjectEnrichment | null | undefined
): SearchResult {
  if (!douban) return base;

  return {
    ...base,
    score: douban.rate || base.score,
    director: isBlank(base.director) ? douban.directors || base.director : base.director,
    actors: isBlank(base.actors) ? douban.actors || base.actors : base.actors,
    area: isBlank(base.area) ? douban.area || base.area : base.area,
    class: isBlank(base.class) ? douban.genres || base.class : base.class,
    year:
      base.year && base.year !== 'unknown'
        ? base.year
        : douban.year || base.year,
    desc: isWeakDesc(base.desc) ? douban.desc || base.desc : base.desc,
  };
}

/** 清洗 MacCMS 人员/文本字段 */
export function normalizeVodText(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '';
  return String(raw).replace(/<[^>]+>/g, '').trim();
}
