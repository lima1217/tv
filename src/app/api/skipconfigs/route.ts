/* eslint-disable no-console */

import { NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { privateJson, requireAuthenticatedUser } from '@/lib/private-route';
import { SkipConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request, '未登录');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const id = searchParams.get('id');

    if (source && id) {
      // 获取单个配置
      const config = await db.getSkipConfig(auth.username, source, id);
      return privateJson(config);
    } else {
      // 获取所有配置
      const configs = await db.getAllSkipConfigs(auth.username);
      return privateJson(configs);
    }
  } catch (error) {
    console.error('获取跳过片头片尾配置失败:', error);
    return privateJson(
      { error: '获取跳过片头片尾配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request, '未登录');
    if (auth.response) return auth.response;

    const body = await request.json();
    const { key, config } = body;

    if (!key || !config) {
      return privateJson({ error: '缺少必要参数' }, { status: 400 });
    }

    // 解析key为source和id
    const [source, id] = key.split('+');
    if (!source || !id) {
      return privateJson({ error: '无效的key格式' }, { status: 400 });
    }

    // 验证配置格式
    const skipConfig: SkipConfig = {
      enable: Boolean(config.enable),
      intro_time: Number(config.intro_time) || 0,
      outro_time: Number(config.outro_time) || 0,
    };

    await db.setSkipConfig(auth.username, source, id, skipConfig);

    return privateJson({ success: true });
  } catch (error) {
    console.error('保存跳过片头片尾配置失败:', error);
    return privateJson(
      { error: '保存跳过片头片尾配置失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request, '未登录');
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return privateJson({ error: '缺少必要参数' }, { status: 400 });
    }

    // 解析key为source和id
    const [source, id] = key.split('+');
    if (!source || !id) {
      return privateJson({ error: '无效的key格式' }, { status: 400 });
    }

    await db.deleteSkipConfig(auth.username, source, id);

    return privateJson({ success: true });
  } catch (error) {
    console.error('删除跳过片头片尾配置失败:', error);
    return privateJson(
      { error: '删除跳过片头片尾配置失败' },
      { status: 500 }
    );
  }
}
