/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps,@typescript-eslint/no-empty-function */

import { ExternalLink, Heart, Link as LinkIcon, PlayCircleIcon, Radio, Trash2 } from 'lucide-react';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { processImageUrl } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';
import MobileActionSheet from '@/components/MobileActionSheet';

export interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  source_names?: string[];
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: number;
  onDelete?: () => void;
  rate?: string;
  remarks?: string;
  type?: string;
  isBangumi?: boolean;
  isAggregate?: boolean;
  origin?: 'vod' | 'live';
  priority?: boolean;
}

export type VideoCardHandle = {
  setEpisodes: (episodes?: number) => void;
  setSourceNames: (names?: string[]) => void;
  setDoubanId: (id?: number) => void;
};

const VideoCard = forwardRef<VideoCardHandle, VideoCardProps>(function VideoCard(
  {
    id,
    title = '',
    query = '',
    poster = '',
    episodes,
    source,
    source_name,
    source_names,
    progress = 0,
    year,
    from,
    currentEpisode,
    douban_id,
    onDelete,
    rate,
    remarks,
    type = '',
    isBangumi = false,
    isAggregate = false,
    origin = 'vod',
    priority = false,
  }: VideoCardProps,
  ref
) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [searchFavorited, setSearchFavorited] = useState<boolean | null>(null); // 搜索结果的收藏状态

  // 可外部修改的可控字段
  const [dynamicEpisodes, setDynamicEpisodes] = useState<number | undefined>(
    episodes
  );
  const [dynamicSourceNames, setDynamicSourceNames] = useState<string[] | undefined>(
    source_names
  );
  const [dynamicDoubanId, setDynamicDoubanId] = useState<number | undefined>(
    douban_id
  );

  useEffect(() => {
    setDynamicEpisodes(episodes);
  }, [episodes]);

  useEffect(() => {
    setDynamicSourceNames(source_names);
  }, [source_names]);

  useEffect(() => {
    setDynamicDoubanId(douban_id);
  }, [douban_id]);

  useImperativeHandle(ref, () => ({
    setEpisodes: (eps?: number) => setDynamicEpisodes(eps),
    setSourceNames: (names?: string[]) => setDynamicSourceNames(names),
    setDoubanId: (id?: number) => setDynamicDoubanId(id),
  }));

  const actualTitle = title;
  const actualPoster = poster;
  const actualSource = source;
  const actualId = id;
  const actualDoubanId = dynamicDoubanId;
  const actualEpisodes = dynamicEpisodes;
  const actualYear = year;
  const actualQuery = query || '';
  const actualSearchType = isAggregate
    ? (actualEpisodes && actualEpisodes === 1 ? 'movie' : 'tv')
    : type;

  // 获取收藏状态（搜索结果页面不检查）
  useEffect(() => {
    if (from === 'douban' || from === 'search' || !actualSource || !actualId) return;

    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setFavorited(fav);
      } catch (err) {
        throw new Error('检查收藏状态失败');
      }
    };

    fetchFavoriteStatus();

    // 监听收藏状态更新事件
    const storageKey = generateStorageKey(actualSource, actualId);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        // 检查当前项目是否在新的收藏列表中
        const isNowFavorited = !!newFavorites[storageKey];
        setFavorited(isNowFavorited);
      }
    );

    return unsubscribe;
  }, [from, actualSource, actualId]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from === 'douban' || !actualSource || !actualId) return;

      try {
        // 确定当前收藏状态
        const currentFavorited = from === 'search' ? searchFavorited : favorited;

        if (currentFavorited) {
          // 如果已收藏，删除收藏
          await deleteFavorite(actualSource, actualId);
          if (from === 'search') {
            setSearchFavorited(false);
          } else {
            setFavorited(false);
          }
        } else {
          // 如果未收藏，添加收藏
          await saveFavorite(actualSource, actualId, {
            title: actualTitle,
            source_name: source_name || '',
            year: actualYear || '',
            cover: actualPoster,
            total_episodes: actualEpisodes ?? 1,
            save_time: Date.now(),
          });
          if (from === 'search') {
            setSearchFavorited(true);
          } else {
            setFavorited(true);
          }
        }
      } catch (err) {
        throw new Error('切换收藏状态失败');
      }
    },
    [
      from,
      actualSource,
      actualId,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
      favorited,
      searchFavorited,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from !== 'playrecord' || !actualSource || !actualId) return;
      try {
        await deletePlayRecord(actualSource, actualId);
        onDelete?.();
      } catch (err) {
        throw new Error('删除播放记录失败');
      }
    },
    [from, actualSource, actualId, onDelete]
  );

  const href = useMemo(() => {
    if (origin === 'live' && actualSource && actualId) {
      return `/live?source=${actualSource.replace('live_', '')}&id=${actualId.replace('live_', '')}`;
    }
    if (from === 'douban' || (isAggregate && !actualSource && !actualId)) {
      return `/play?title=${encodeURIComponent(actualTitle.trim())}${
        actualYear ? `&year=${actualYear}` : ''
      }${actualSearchType ? `&stype=${actualSearchType}` : ''}${
        isAggregate ? '&prefer=true' : ''
      }${actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''}`;
    }
    if (actualSource && actualId) {
      return `/play?source=${actualSource}&id=${actualId}&title=${encodeURIComponent(
        actualTitle
      )}${actualYear ? `&year=${actualYear}` : ''}${
        isAggregate ? '&prefer=true' : ''
      }${actualQuery ? `&stitle=${encodeURIComponent(actualQuery.trim())}` : ''}${
        actualSearchType ? `&stype=${actualSearchType}` : ''
      }`;
    }
    return '';
  }, [
    origin,
    from,
    actualSource,
    actualId,
    actualTitle,
    actualYear,
    isAggregate,
    actualQuery,
    actualSearchType,
  ]);

  const handleClick = useCallback(() => {
    if (!href) return;
    router.push(href);
  }, [href, router]);

  // 新标签页播放处理函数
  const handlePlayInNewTab = useCallback(() => {
    if (!href) return;
    window.open(href, '_blank');
  }, [href]);

  // 检查搜索结果的收藏状态
  const checkSearchFavoriteStatus = useCallback(async () => {
    if (from === 'search' && !isAggregate && actualSource && actualId && searchFavorited === null) {
      try {
        const fav = await isFavorited(actualSource, actualId);
        setSearchFavorited(fav);
      } catch (err) {
        setSearchFavorited(false);
      }
    }
  }, [from, isAggregate, actualSource, actualId, searchFavorited]);

  // 长按操作
  const handleLongPress = useCallback(() => {
    if (!showMobileActions) { // 防止重复触发
      // 立即显示菜单，避免等待数据加载导致动画卡顿
      setShowMobileActions(true);

      // 异步检查收藏状态，不阻塞菜单显示
      if (from === 'search' && !isAggregate && actualSource && actualId && searchFavorited === null) {
        checkSearchFavoriteStatus();
      }
    }
  }, [showMobileActions, from, isAggregate, actualSource, actualId, searchFavorited, checkSearchFavoriteStatus]);

  // 长按手势hook（短按导航交由下方 Link 处理）
  const longPressProps = useLongPress({
    onLongPress: handleLongPress,
    longPressDelay: 500,
  });

  const config = useMemo(() => {
    const configs = {
      playrecord: {
        showSourceName: true,
        showProgress: true,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: true,
        showDoubanLink: false,
        showRating: false,
        showYear: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true,
        showCheckCircle: false,
        showDoubanLink: false,
        showRating: false,
        showYear: false,
      },
      search: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: true,
        showHeart: true, // 移动端菜单中需要显示收藏选项
        showCheckCircle: false,
        showDoubanLink: true, // 移动端菜单中显示豆瓣链接
        showRating: false,
        showYear: true,
      },
      douban: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: true,
        showHeart: false,
        showCheckCircle: false,
        showDoubanLink: true,
        showRating: !!rate,
        showYear: false,
      },
    };
    return configs[from] || configs.search;
  }, [from, isAggregate, douban_id, rate]);

  // 移动端操作菜单配置
  const mobileActions = useMemo(() => {
    const actions = [];

    // 播放操作
    if (config.showPlayButton) {
      actions.push({
        id: 'play',
        label: origin === 'live' ? '观看直播' : '播放',
        icon: <PlayCircleIcon size={20} />,
        onClick: handleClick,
        color: 'primary' as const,
      });

      // 新标签页播放
      actions.push({
        id: 'play-new-tab',
        label: origin === 'live' ? '新标签页观看' : '新标签页播放',
        icon: <ExternalLink size={20} />,
        onClick: handlePlayInNewTab,
        color: 'default' as const,
      });
    }

    // 聚合源信息 - 直接在菜单中展示，不需要单独的操作项

    // 收藏/取消收藏操作
    if (config.showHeart && from !== 'douban' && actualSource && actualId) {
      const currentFavorited = from === 'search' ? searchFavorited : favorited;

      if (from === 'search') {
        // 搜索结果：根据加载状态显示不同的选项
        if (searchFavorited !== null) {
          // 已加载完成，显示实际的收藏状态
          actions.push({
            id: 'favorite',
            label: currentFavorited ? '取消收藏' : '添加收藏',
            icon: currentFavorited ? (
              <Heart size={20} className="fill-red-600 stroke-red-600" />
            ) : (
              <Heart size={20} className="fill-transparent stroke-red-500" />
            ),
            onClick: () => {
              const mockEvent = {
                preventDefault: () => { },
                stopPropagation: () => { },
              } as React.MouseEvent;
              handleToggleFavorite(mockEvent);
            },
            color: currentFavorited ? ('danger' as const) : ('default' as const),
          });
        } else {
          // 正在加载中，显示占位项
          actions.push({
            id: 'favorite-loading',
            label: '收藏加载中…',
            icon: <Heart size={20} />,
            onClick: () => { }, // 加载中时不响应点击
            disabled: true,
          });
        }
      } else {
        // 非搜索结果：直接显示收藏选项
        actions.push({
          id: 'favorite',
          label: currentFavorited ? '取消收藏' : '添加收藏',
          icon: currentFavorited ? (
            <Heart size={20} className="fill-red-600 stroke-red-600" />
          ) : (
            <Heart size={20} className="fill-transparent stroke-red-500" />
          ),
          onClick: () => {
            const mockEvent = {
              preventDefault: () => { },
              stopPropagation: () => { },
            } as React.MouseEvent;
            handleToggleFavorite(mockEvent);
          },
          color: currentFavorited ? ('danger' as const) : ('default' as const),
        });
      }
    }

    // 删除播放记录操作
    if (config.showCheckCircle && from === 'playrecord' && actualSource && actualId) {
      actions.push({
        id: 'delete',
        label: '删除记录',
        icon: <Trash2 size={20} />,
        onClick: () => {
          const mockEvent = {
            preventDefault: () => { },
            stopPropagation: () => { },
          } as React.MouseEvent;
          handleDeleteRecord(mockEvent);
        },
        color: 'danger' as const,
      });
    }

    // 豆瓣链接操作
    if (config.showDoubanLink && actualDoubanId && actualDoubanId !== 0) {
      actions.push({
        id: 'douban',
        label: isBangumi ? 'Bangumi 详情' : '豆瓣详情',
        icon: <LinkIcon size={20} />,
        onClick: () => {
          const url = isBangumi
            ? `https://bgm.tv/subject/${actualDoubanId.toString()}`
            : `https://movie.douban.com/subject/${actualDoubanId.toString()}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        color: 'default' as const,
      });
    }

    return actions;
  }, [
    config,
    from,
    actualSource,
    actualId,
    favorited,
    searchFavorited,
    actualDoubanId,
    isBangumi,
    isAggregate,
    dynamicSourceNames,
    handleClick,
    handleToggleFavorite,
    handleDeleteRecord,
  ]);

  return (
    <>
      <div
        className='group relative w-full cursor-pointer transition-transform duration-150 ease-out active:scale-[0.98]'
        {...longPressProps}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          pointerEvents: 'auto',
        } as React.CSSProperties}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowMobileActions(true);
          if (from === 'search' && !isAggregate && actualSource && actualId && searchFavorited === null) {
            checkSearchFavoriteStatus();
          }
          return false;
        }}
        onDragStart={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        {href && (
          <NextLink
            href={href}
            className='absolute inset-0 z-[1] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950'
            aria-label={origin === 'live' ? `观看 ${actualTitle}` : `播放 ${actualTitle}`}
            prefetch={false}
          />
        )}

        {/* 海报容器 */}
        <div
          className='relative aspect-[2/3] overflow-hidden rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10'
          style={{
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
          } as React.CSSProperties}
          onContextMenu={(e) => {
            e.preventDefault();
            return false;
          }}
        >
          {/* 骨架屏 */}
          {!isLoading && <ImagePlaceholder aspectRatio='aspect-[2/3]' />}
          {/* 图片 */}
          <Image
            src={processImageUrl(actualPoster)}
            alt={actualTitle}
            fill
            className={origin === 'live' ? 'object-contain' : 'object-cover'}
            referrerPolicy='no-referrer'
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onLoadingComplete={() => setIsLoading(true)}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried) {
                img.dataset.retried = 'true';
                setTimeout(() => {
                  img.src = processImageUrl(actualPoster);
                }, 2000);
              }
            }}
            style={{
              WebkitUserSelect: 'none',
              userSelect: 'none',
              WebkitTouchCallout: 'none',
              pointerEvents: 'none',
            } as React.CSSProperties}
            onContextMenu={(e) => {
              e.preventDefault();
              return false;
            }}
            onDragStart={(e) => {
              e.preventDefault();
              return false;
            }}
          />

          {/* 悬浮遮罩 */}
          <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100' />

          {/* 播放按钮 */}
          {config.showPlayButton && (
            <div className='pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100'>
              <PlayCircleIcon
                size={44}
                strokeWidth={1}
                className='ml-0.5 text-white/95'
                aria-hidden='true'
              />
            </div>
          )}

          {/* 操作按钮 */}
          {(config.showHeart || config.showCheckCircle) && (
            <div
              data-button='true'
              className='absolute bottom-2 right-2 z-[2] flex gap-2 opacity-0 transition-opacity duration-200 ease-out sm:group-hover:opacity-100'
            >
              {config.showCheckCircle && (
                <button
                  type='button'
                  onClick={handleDeleteRecord}
                  className='flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
                  aria-label='删除记录'
                >
                  <Trash2 size={16} aria-hidden='true' />
                </button>
              )}
              {config.showHeart && from !== 'search' && (
                <button
                  type='button'
                  onClick={handleToggleFavorite}
                  className='flex h-10 w-10 items-center justify-center rounded-full bg-black/40 transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] hover:bg-black/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'
                  aria-label={favorited ? '取消收藏' : '收藏'}
                >
                  <Heart
                    size={16}
                    aria-hidden='true'
                    className={
                      favorited
                        ? 'fill-red-500 stroke-red-500'
                        : 'fill-transparent stroke-white'
                    }
                  />
                </button>
              )}
            </div>
          )}

          {/* 年份 */}
          {config.showYear && actualYear && actualYear !== 'unknown' && actualYear.trim() !== '' && (
            <div className='pointer-events-none absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-xs font-medium text-white'>
              {actualYear}
            </div>
          )}

          {/* 评分 */}
          {config.showRating && rate && (
            <div className='pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white'>
              {rate}
            </div>
          )}

          {actualEpisodes && actualEpisodes > 1 && (
            <div className='pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white'>
              {currentEpisode
                ? `${currentEpisode}/${actualEpisodes}`
                : actualEpisodes}
            </div>
          )}

          {/* 豆瓣链接 */}
          {config.showDoubanLink && actualDoubanId && actualDoubanId !== 0 && (
            <a
              href={
                isBangumi
                  ? `https://bgm.tv/subject/${actualDoubanId.toString()}`
                  : `https://movie.douban.com/subject/${actualDoubanId.toString()}`
              }
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}
              className={`absolute z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-[opacity,transform,background-color] duration-150 ease-out active:scale-[0.96] hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:group-hover:opacity-100 ${
                config.showYear ? 'bottom-2 left-2' : 'left-2 top-2'
              }`}
              aria-label={isBangumi ? 'Bangumi 详情' : '豆瓣详情'}
            >
              <LinkIcon size={14} aria-hidden='true' />
            </a>
          )}

          {/* 聚合播放源指示器 */}
          {isAggregate && dynamicSourceNames && dynamicSourceNames.length > 0 && (() => {
            const uniqueSources = Array.from(new Set(dynamicSourceNames));
            const sourceCount = uniqueSources.length;

            return (
              <div className='pointer-events-none absolute bottom-2 right-2 z-[2]'>
                <div className='group/sources relative'>
                  <div className='flex h-7 min-w-7 items-center justify-center rounded-md bg-black/55 px-1.5 text-xs font-medium tabular-nums text-white'>
                    {sourceCount}
                  </div>

                  {(() => {
                    const prioritySources = ['爱奇艺', '腾讯视频', '优酷', '芒果TV', '哔哩哔哩', 'Netflix', 'Disney+'];
                    const sortedSources = uniqueSources.sort((a, b) => {
                      const aIndex = prioritySources.indexOf(a);
                      const bIndex = prioritySources.indexOf(b);
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      return a.localeCompare(b);
                    });

                    const maxDisplayCount = 6;
                    const displaySources = sortedSources.slice(0, maxDisplayCount);
                    const hasMore = sortedSources.length > maxDisplayCount;
                    const remainingCount = sortedSources.length - maxDisplayCount;

                    return (
                      <div className='pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 min-w-[7.5rem] rounded-lg bg-gray-900/95 p-2 text-xs text-white opacity-0 invisible shadow-[0_0_0_1px_oklch(1_0_0/0.08)] transition-[opacity] duration-150 ease-out group-hover/sources:visible group-hover/sources:opacity-100'>
                        <div className='space-y-1'>
                          {displaySources.map((sourceName, index) => (
                            <div key={index} className='truncate leading-tight' title={sourceName}>
                              {sourceName}
                            </div>
                          ))}
                        </div>
                        {hasMore && (
                          <div className='mt-1.5 border-t border-white/10 pt-1.5 text-center text-[10px] text-gray-400'>
                            +{remainingCount} 播放源
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 进度条 */}
        {config.showProgress && progress !== undefined && (
          <div className='pointer-events-none mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-full bg-green-500 transition-[width] duration-300 ease-out'
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* 标题与来源 */}
        <div className='pointer-events-none mt-2 text-center'>
          <span
            className='block truncate text-sm font-medium text-gray-900 transition-colors duration-150 ease-out group-hover:text-green-600 dark:text-gray-100 dark:group-hover:text-green-400'
            title={actualTitle}
          >
            {actualTitle}
          </span>
          {from === 'search' && remarks && remarks.trim() && (
            <span
              className='mt-0.5 block truncate text-xs text-green-600/90 dark:text-green-400/90'
              title={remarks}
            >
              {remarks}
            </span>
          )}
          {config.showSourceName && source_name && (
            <span className='mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400'>
              {origin === 'live' && (
                <Radio size={11} className='mr-1 inline-block align-[-1px]' aria-hidden />
              )}
              {source_name}
            </span>
          )}
        </div>
      </div>

      {/* 操作菜单 - 支持右键和长按触发 */}
      <MobileActionSheet
        isOpen={showMobileActions}
        onClose={() => setShowMobileActions(false)}
        title={actualTitle}
        poster={processImageUrl(actualPoster)}
        actions={mobileActions}
        sources={isAggregate && dynamicSourceNames ? Array.from(new Set(dynamicSourceNames)) : undefined}
        isAggregate={isAggregate}
        sourceName={source_name}
        currentEpisode={currentEpisode}
        totalEpisodes={actualEpisodes}
        origin={origin}
      />
    </>
  );
}

);

export default memo(VideoCard);
