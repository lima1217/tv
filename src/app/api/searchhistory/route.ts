/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { privateJson, requireAuthenticatedUser } from '@/lib/private-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最大保存条数（与客户端保持一致）
const HISTORY_LIMIT = 20;

/**
 * GET /api/searchhistory
 * 返回 string[]
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;

    const history = await db.getSearchHistory(auth.username);
    return privateJson(history, { status: 200 });
  } catch (err) {
    console.error('获取搜索历史失败', err);
    return privateJson({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/searchhistory
 * body: { keyword: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const keyword: string = body.keyword?.trim();

    if (!keyword) {
      return privateJson({ error: 'Keyword is required' }, { status: 400 });
    }

    await db.addSearchHistory(auth.username, keyword);

    // 再次获取最新列表，确保客户端与服务端同步
    const history = await db.getSearchHistory(auth.username);
    return privateJson(history.slice(0, HISTORY_LIMIT), { status: 200 });
  } catch (err) {
    console.error('添加搜索历史失败', err);
    return privateJson({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/searchhistory?keyword=<kw>
 *
 * 1. 不带 keyword -> 清空全部搜索历史
 * 2. 带 keyword=<kw> -> 删除单条关键字
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const kw = searchParams.get('keyword')?.trim();

    await db.deleteSearchHistory(auth.username, kw || undefined);

    return privateJson({ success: true }, { status: 200 });
  } catch (err) {
    console.error('删除搜索历史失败', err);
    return privateJson({ error: 'Internal Server Error' }, { status: 500 });
  }
}
