/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { privateJson, requireAuthenticatedUser } from '@/lib/private-route';
import { Favorite } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/favorites
 *
 * 支持两种调用方式：
 * 1. 不带 query，返回全部收藏列表（Record<string, Favorite>）。
 * 2. 带 key=source+id，返回单条收藏（Favorite | null）。
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // 查询单条收藏
    if (key) {
      const [source, id] = key.split('+');
      if (!source || !id) {
        return privateJson({ error: 'Invalid key format' }, { status: 400 });
      }
      const fav = await db.getFavorite(auth.username, source, id);
      return privateJson(fav, { status: 200 });
    }

    // 查询全部收藏
    const favorites = await db.getAllFavorites(auth.username);
    return privateJson(favorites, { status: 200 });
  } catch (err) {
    console.error('获取收藏失败', err);
    return privateJson({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/favorites
 * body: { key: string; favorite: Favorite }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { key, favorite }: { key: string; favorite: Favorite } = body;

    if (!key || !favorite) {
      return privateJson(
        { error: 'Missing key or favorite' },
        { status: 400 }
      );
    }

    // 验证必要字段
    if (!favorite.title || !favorite.source_name) {
      return privateJson({ error: 'Invalid favorite data' }, { status: 400 });
    }

    const [source, id] = key.split('+');
    if (!source || !id) {
      return privateJson({ error: 'Invalid key format' }, { status: 400 });
    }

    const finalFavorite = {
      ...favorite,
      save_time: favorite.save_time ?? Date.now(),
    } as Favorite;

    await db.saveFavorite(auth.username, source, id, finalFavorite);

    return privateJson({ success: true }, { status: 200 });
  } catch (err) {
    console.error('保存收藏失败', err);
    return privateJson({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/favorites
 *
 * 1. 不带 query -> 清空全部收藏
 * 2. 带 key=source+id -> 删除单条收藏
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      // 删除单条
      const [source, id] = key.split('+');
      if (!source || !id) {
        return privateJson({ error: 'Invalid key format' }, { status: 400 });
      }
      await db.deleteFavorite(auth.username, source, id);
    } else {
      // 清空全部
      await db.deleteAllFavorites(auth.username);
    }

    return privateJson({ success: true }, { status: 200 });
  } catch (err) {
    console.error('删除收藏失败', err);
    return privateJson({ error: 'Internal Server Error' }, { status: 500 });
  }
}
