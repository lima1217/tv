import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from './auth';
import { getConfig } from './config';

const PRIVATE_NO_STORE = 'private, no-store, max-age=0';

export type AuthenticatedUser =
  | { username: string; response?: never }
  | { username?: never; response: NextResponse };

export function privateJson<T>(body: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', PRIVATE_NO_STORE);

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

export async function requireAuthenticatedUser(
  request: NextRequest,
  unauthorizedMessage = 'Unauthorized'
): Promise<AuthenticatedUser> {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo?.username) {
    return {
      response: privateJson({ error: unauthorizedMessage }, { status: 401 }),
    };
  }

  const username = authInfo.username;
  if (username === process.env.USERNAME) {
    return { username };
  }

  const config = await getConfig();
  const user = config.UserConfig.Users.find((u) => u.username === username);

  if (!user) {
    return {
      response: privateJson({ error: '用户不存在' }, { status: 401 }),
    };
  }

  if (user.banned) {
    return {
      response: privateJson({ error: '用户已被封禁' }, { status: 401 }),
    };
  }

  return { username };
}
