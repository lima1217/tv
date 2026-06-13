/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';

import {
  BangumiCalendarData,
  GetBangumiCalendarData,
} from '@/lib/bangumi.client';
// 客户端收藏 API
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

const RECOMMEND_CACHE_KEY = 'moontv_home_recommend_cache_v1';
const RECOMMEND_CACHE_TTL = 10 * 60 * 1000;

type RecommendCache = {
  savedAt: number;
  hotMovies: DoubanItem[];
  hotTvShows: DoubanItem[];
  hotVarietyShows: DoubanItem[];
  bangumiCalendarData: BangumiCalendarData[];
};

function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [quickSearch, setQuickSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [bangumiCalendarData, setBangumiCalendarData] = useState<
    BangumiCalendarData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const { announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 收藏夹数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
    origin?: 'vod' | 'live';
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(tab === 'favorites' ? 'favorites' : 'home');
  }, [searchParams]);

  useEffect(() => {
    getSearchHistory()
      .then((history) => setRecentSearches(history.slice(0, 6)))
      .catch(() => setRecentSearches([]));
  }, []);

  useEffect(() => {
    const fetchRecommendData = async () => {
      const applyCache = (cache: RecommendCache) => {
        setHotMovies(cache.hotMovies);
        setHotTvShows(cache.hotTvShows);
        setHotVarietyShows(cache.hotVarietyShows);
        setBangumiCalendarData(cache.bangumiCalendarData);
      };

      const readCachedRecommendData = (): RecommendCache | null => {
        try {
          const rawCache = localStorage.getItem(RECOMMEND_CACHE_KEY);
          if (!rawCache) return null;

          const cache = JSON.parse(rawCache) as RecommendCache;
          const hasData =
            cache.hotMovies?.length ||
            cache.hotTvShows?.length ||
            cache.hotVarietyShows?.length ||
            cache.bangumiCalendarData?.length;

          if (!hasData) return null;

          applyCache(cache);
          setLoading(false);
          return cache;
        } catch {
          return null;
        }
      };

      const cachedRecommendData = readCachedRecommendData();
      const hasFreshCache =
        !!cachedRecommendData &&
        Date.now() - cachedRecommendData.savedAt < RECOMMEND_CACHE_TTL;

      try {
        setLoading(!hasFreshCache);

        // 并行获取热门电影、热门剧集、热门综艺和番剧日历
        // 使用 allSettled 避免单个请求失败导致全部数据为空
        const [moviesRes, tvShowsRes, varietyShowsRes, bangumiRes] =
          await Promise.allSettled([
            getDoubanCategories({
              kind: 'movie',
              category: '热门',
              type: '全部',
            }),
            getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
            getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
            GetBangumiCalendarData(),
          ]);

        const nextCache: RecommendCache = {
          savedAt: Date.now(),
          hotMovies: cachedRecommendData?.hotMovies || [],
          hotTvShows: cachedRecommendData?.hotTvShows || [],
          hotVarietyShows: cachedRecommendData?.hotVarietyShows || [],
          bangumiCalendarData: cachedRecommendData?.bangumiCalendarData || [],
        };

        if (moviesRes.status === 'fulfilled' && moviesRes.value.code === 200) {
          nextCache.hotMovies = moviesRes.value.list;
          setHotMovies(moviesRes.value.list);
        } else if (moviesRes.status === 'rejected') {
          console.error('获取热门电影失败:', moviesRes.reason);
        }

        if (tvShowsRes.status === 'fulfilled' && tvShowsRes.value.code === 200) {
          nextCache.hotTvShows = tvShowsRes.value.list;
          setHotTvShows(tvShowsRes.value.list);
        } else if (tvShowsRes.status === 'rejected') {
          console.error('获取热门剧集失败:', tvShowsRes.reason);
        }

        if (
          varietyShowsRes.status === 'fulfilled' &&
          varietyShowsRes.value.code === 200
        ) {
          nextCache.hotVarietyShows = varietyShowsRes.value.list;
          setHotVarietyShows(varietyShowsRes.value.list);
        } else if (varietyShowsRes.status === 'rejected') {
          console.error('获取热门综艺失败:', varietyShowsRes.reason);
        }

        if (bangumiRes.status === 'fulfilled') {
          nextCache.bangumiCalendarData = bangumiRes.value;
          setBangumiCalendarData(bangumiRes.value);
        } else {
          console.error('获取番剧日历失败:', bangumiRes.reason);
        }

        localStorage.setItem(RECOMMEND_CACHE_KEY, JSON.stringify(nextCache));
      } catch (error) {
        console.error('获取推荐数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendData();
  }, []);

  // 处理收藏数据更新的函数
  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();

    // 根据保存时间排序（从近到远）
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        // 查找对应的播放记录，获取当前集数
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
          origin: fav?.origin,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  const groupedFavorites = useMemo(() => {
    const watching = favoriteItems.filter(
      (item) =>
        item.currentEpisode &&
        item.episodes > 1 &&
        item.currentEpisode < item.episodes
    );
    const watched = favoriteItems.filter(
      (item) =>
        item.currentEpisode &&
        item.episodes > 0 &&
        item.currentEpisode >= item.episodes
    );
    const wantToWatch = favoriteItems.filter((item) => !item.currentEpisode);

    return [
      { key: 'watching', title: '在追', items: watching },
      { key: 'want', title: '想看', items: wantToWatch },
      { key: 'watched', title: '已看', items: watched },
    ].filter((group) => group.items.length > 0);
  }, [favoriteItems]);

  // 当切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    // 监听收藏更新事件
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement); // 记录已查看弹窗
  };

  const handleQuickSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = quickSearch.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const renderFavoriteGrid = (items: FavoriteItem[]) => (
    <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'>
      {items.map((item) => (
        <div key={item.id + item.source} className='w-full'>
          <VideoCard
            query={item.search_title}
            {...item}
            from='favorite'
            type={item.episodes > 1 ? 'tv' : ''}
          />
        </div>
      ))}
    </div>
  );

  return (
    <PageLayout>
      <div className='overflow-visible px-3 py-4 sm:px-8 sm:py-8 lg:px-10'>
        <section className='mx-auto mb-8 max-w-[95%]'>
          <div className='mb-3 flex items-end justify-between gap-4'>
            <div>
              <p className='hidden text-xs font-medium text-gray-500 dark:text-gray-400 sm:block'>
                MoonTV
              </p>
              <h1 className='mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-100 sm:text-3xl'>
                观影台
              </h1>
            </div>
          </div>

          <form onSubmit={handleQuickSearch}>
            <div className='relative rounded-2xl bg-white/85 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-gray-200/70 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10'>
              <Search className='absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
              <input
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                placeholder='输入片名，聚合搜索'
                className='h-12 w-full rounded-xl bg-transparent pl-12 pr-24 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500'
              />
              <button
                type='submit'
                className='absolute right-2 top-1/2 inline-flex h-9 -translate-y-1/2 items-center justify-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition-[background-color,transform] active:scale-95 hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:ring-offset-gray-950'
              >
                搜索
              </button>
            </div>
          </form>

          {recentSearches.length > 0 && (
            <div className='mt-4 flex flex-wrap items-center gap-2'>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                最近搜索
              </span>
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type='button'
                  onClick={() =>
                    router.push(`/search?q=${encodeURIComponent(item.trim())}`)
                  }
                  className='rounded-full bg-gray-900/5 px-3 py-1.5 text-xs text-gray-700 transition-[background-color,color,transform] active:scale-95 hover:bg-green-500/10 hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:bg-white/10 dark:text-gray-300 dark:hover:text-green-400'
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className='max-w-[95%] mx-auto'>
          {activeTab === 'favorites' ? (
            // 收藏夹视图
            <section className='mb-8'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    onClick={async () => {
                      await clearAllFavorites();
                      setFavoriteItems([]);
                    }}
                  >
                    清空
                  </button>
                )}
              </div>
              {favoriteItems.length === 0 ? (
                <div className='rounded-xl bg-white/60 py-12 text-center text-gray-500 ring-1 ring-gray-200/60 dark:bg-gray-900/50 dark:text-gray-400 dark:ring-white/10'>
                  暂无收藏内容
                </div>
              ) : (
                <div className='space-y-10'>
                  {groupedFavorites.map((group) => (
                    <section key={group.key}>
                      <div className='mb-4 flex items-center gap-2'>
                        <h3 className='text-base font-semibold text-gray-800 dark:text-gray-200'>
                          {group.title}
                        </h3>
                        <span className='rounded-full bg-gray-900/5 px-2 py-0.5 text-xs text-gray-500 dark:bg-white/10 dark:text-gray-400'>
                          {group.items.length}
                        </span>
                      </div>
                      {renderFavoriteGrid(group.items)}
                    </section>
                  ))}
                </div>
              )}
            </section>
          ) : (
            // 首页视图
            <>
              {/* 继续观看 */}
              <ContinueWatching />

              {/* 热门电影 */}
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    热门电影
                  </h2>
                  <Link
                    href='/douban?type=movie'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示灰色占位数据
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                          <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                        </div>
                        <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                      </div>
                    ))
                    : // 显示真实数据
                    hotMovies.map((movie, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <VideoCard
                          from='douban'
                          title={movie.title}
                          poster={movie.poster}
                          douban_id={Number(movie.id)}
                          rate={movie.rate}
                          year={movie.year}
                          type='movie'
                          priority={index < 4}
                        />
                      </div>
                    ))}
                </ScrollableRow>
              </section>

              {/* 热门剧集 */}
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    热门剧集
                  </h2>
                  <Link
                    href='/douban?type=tv'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示灰色占位数据
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                          <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                        </div>
                        <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                      </div>
                    ))
                    : // 显示真实数据
                    hotTvShows.map((show, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <VideoCard
                          from='douban'
                          title={show.title}
                          poster={show.poster}
                          douban_id={Number(show.id)}
                          rate={show.rate}
                          year={show.year}
                          priority={index < 4}
                        />
                      </div>
                    ))}
                </ScrollableRow>
              </section>

              {/* 每日新番放送 */}
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    新番放送
                  </h2>
                  <Link
                    href='/douban?type=anime'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示灰色占位数据
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                          <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                        </div>
                        <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                      </div>
                    ))
                    : // 展示当前日期的番剧
                    (() => {
                      // 获取当前日期对应的星期
                      const today = new Date();
                      const weekdays = [
                        'Sun',
                        'Mon',
                        'Tue',
                        'Wed',
                        'Thu',
                        'Fri',
                        'Sat',
                      ];
                      const currentWeekday = weekdays[today.getDay()];

                      // 找到当前星期对应的番剧数据
                      const todayAnimes =
                        bangumiCalendarData.find(
                          (item) => item.weekday.en === currentWeekday
                        )?.items || [];

                      return todayAnimes.map((anime, index) => (
                        <div
                          key={`${anime.id}-${index}`}
                          className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                        >
                          <VideoCard
                            from='douban'
                            title={anime.name_cn || anime.name}
                            poster={
                              anime.images.large ||
                              anime.images.common ||
                              anime.images.medium ||
                              anime.images.small ||
                              anime.images.grid
                            }
                            douban_id={anime.id}
                            rate={anime.rating?.score?.toFixed(1) || ''}
                            year={anime.air_date?.split('-')?.[0] || ''}
                            isBangumi={true}
                            priority={index < 4}
                          />
                        </div>
                      ));
                    })()}
                </ScrollableRow>
              </section>

              {/* 热门综艺 */}
              <section className='mb-8'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                    热门综艺
                  </h2>
                  <Link
                    href='/douban?type=show'
                    className='flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示灰色占位数据
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                          <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                        </div>
                        <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                      </div>
                    ))
                    : // 显示真实数据
                    hotVarietyShows.map((show, index) => (
                      <div
                        key={index}
                        className='min-w-[96px] w-24 sm:min-w-[180px] sm:w-44'
                      >
                        <VideoCard
                          from='douban'
                          title={show.title}
                          poster={show.poster}
                          douban_id={Number(show.id)}
                          rate={show.rate}
                          year={show.year}
                          priority={index < 4}
                        />
                      </div>
                    ))}
                </ScrollableRow>
              </section>
            </>
          )}
        </div>
      </div>
      {announcement && showAnnouncement && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300 ${showAnnouncement ? '' : 'opacity-0 pointer-events-none'
            }`}
          onTouchStart={(e) => {
            // 如果点击的是背景区域，阻止触摸事件冒泡，防止背景滚动
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
          onTouchMove={(e) => {
            // 如果触摸的是背景区域，阻止触摸移动，防止背景滚动
            if (e.target === e.currentTarget) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onTouchEnd={(e) => {
            // 如果触摸的是背景区域，阻止触摸结束事件，防止背景滚动
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
          style={{
            touchAction: 'none', // 禁用所有触摸操作
          }}
        >
          <div
            className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'
            onTouchMove={(e) => {
              // 允许公告内容区域正常滚动，阻止事件冒泡到外层
              e.stopPropagation();
            }}
            style={{
              touchAction: 'auto', // 允许内容区域的正常触摸操作
            }}
          >
            <div className='flex justify-between items-start mb-4'>
              <h3 className='text-2xl font-bold tracking-tight text-gray-800 dark:text-white border-b border-green-500 pb-1'>
                提示
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors'
                aria-label='关闭'
              ></button>
            </div>
            <div className='mb-6'>
              <div className='relative overflow-hidden rounded-lg mb-4 bg-green-50 dark:bg-green-900/20'>
                <div className='absolute inset-y-0 left-0 w-1.5 bg-green-500 dark:bg-green-400'></div>
                <p className='ml-4 text-gray-600 dark:text-gray-300 leading-relaxed'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='w-full rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg hover:from-green-700 hover:to-green-800 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 transition-all duration-300 transform hover:-translate-y-0.5'
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
