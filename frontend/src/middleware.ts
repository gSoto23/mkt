import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  const user = process.env.PORTAL_USER;
  const pwd = process.env.PORTAL_PASS;

  if (basicAuth && user && pwd) {
    const authValue = basicAuth.split(' ')[1];
    const [providedUser, providedPwd] = atob(authValue).split(':');

    if (providedUser === user && providedPwd === pwd) {
      return NextResponse.next();
    }
  }

  url.pathname = '/api/auth';
  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="G-MKT Secure Area"',
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
