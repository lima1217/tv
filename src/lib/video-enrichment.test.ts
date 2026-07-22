import { mergeVideoEnrichment } from './video-enrichment';
import { SearchResult } from './types';

function base(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: '1',
    title: '测试',
    poster: '',
    episodes: ['u'],
    episodes_titles: ['1'],
    source: 'demo',
    source_name: 'Demo',
    year: '2020',
    ...overrides,
  };
}

describe('mergeVideoEnrichment', () => {
  const douban = {
    rate: '9.1',
    directors: '导演A',
    actors: '演员A / 演员B',
    genres: '剧情 / 爱情',
    area: '中国大陆',
    year: '2021',
    desc: '这是一段足够长的豆瓣简介，用来替换过短的下游简介内容。',
  };

  it('prefers douban rating', () => {
    const merged = mergeVideoEnrichment(base({ score: '8.0' }), douban);
    expect(merged.score).toBe('9.1');
  });

  it('keeps downstream cast when present', () => {
    const merged = mergeVideoEnrichment(
      base({ actors: '下游演员', director: '下游导演' }),
      douban
    );
    expect(merged.actors).toBe('下游演员');
    expect(merged.director).toBe('下游导演');
  });

  it('fills cast when downstream is empty', () => {
    const merged = mergeVideoEnrichment(base(), douban);
    expect(merged.actors).toBe('演员A / 演员B');
    expect(merged.director).toBe('导演A');
    expect(merged.area).toBe('中国大陆');
  });

  it('replaces weak desc only', () => {
    const short = mergeVideoEnrichment(base({ desc: '短' }), douban);
    expect(short.desc).toBe(douban.desc);

    const longDesc =
      '下游已经写了一段足够长的剧情介绍，包含背景设定、人物关系与主要冲突，不应被豆瓣简介覆盖掉。';
    const kept = mergeVideoEnrichment(base({ desc: longDesc }), douban);
    expect(kept.desc).toBe(longDesc);
  });

  it('returns base when douban is null', () => {
    const src = base({ actors: 'x' });
    expect(mergeVideoEnrichment(src, null)).toEqual(src);
  });
});
