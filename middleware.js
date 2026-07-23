import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/access', '/api/access'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rutas públicas y assets — no requieren acceso
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/);

  if (isPublic) return NextResponse.next();

  // Verificar cookie de acceso
  const accessCookie = request.cookies.get('ph_access');
  if (!accessCookie || accessCookie.value !== '1407_granted') {
    const url = request.nextUrl.clone();
    url.pathname = '/access';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
