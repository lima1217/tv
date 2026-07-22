import {
  buildSearchQueries,
  cleanSearchQuery,
  normalizeTitleKey,
  titlesLooselyMatch,
} from '@/lib/search-query';

describe('cleanSearchQuery', () => {
  it('strips season / language / quality noise', () => {
    expect(cleanSearchQuery('庆余年 第二季 国语')).toBe('庆余年');
    expect(cleanSearchQuery('三体·S01 4K蓝光')).toBe('三体');
    expect(cleanSearchQuery('  狂飙  ')).toBe('狂飙');
  });

  it('drops standalone year tokens', () => {
    expect(cleanSearchQuery('繁花 2023')).toBe('繁花');
  });
});

describe('buildSearchQueries', () => {
  it('puts original first then cleaned fallback', () => {
    expect(buildSearchQueries('庆余年 第二季')).toEqual([
      '庆余年 第二季',
      '庆余年',
    ]);
  });

  it('dedupes when already clean', () => {
    expect(buildSearchQueries('狂飙')).toEqual(['狂飙']);
  });
});

describe('titlesLooselyMatch', () => {
  it('matches when source title has extra tags', () => {
    expect(titlesLooselyMatch('庆余年', '庆余年国语版')).toBe(true);
    expect(titlesLooselyMatch('庆余年 第二季', '庆余年')).toBe(true);
  });

  it('rejects short single-char false positives', () => {
    expect(titlesLooselyMatch('人', '庆余年')).toBe(false);
  });

  it('normalizeTitleKey removes noise consistently', () => {
    expect(normalizeTitleKey('庆余年·国语')).toBe(
      normalizeTitleKey('庆余年')
    );
  });
});
