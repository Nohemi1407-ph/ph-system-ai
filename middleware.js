import { NextResponse } from 'next/server';
import { firmaDeAcceso, igualSeguro } from './lib/acceso';

const PUBLIC_PATHS = ['/access', '/api/access'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rutas públicas y assets — no requieren acceso
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/);

  if (isPublic) return NextResponse.next();

  // La cookie ya no es un texto fijo escrito en el repositorio (que es
  // publico), sino una firma hecha con un secreto del servidor. Ver
  // app/api/access/route.js.
  const accessCookie = request.cookies.get('ph_access');
  if (!accessCookie || !igualSeguro(accessCookie.value, await firmaDeAcceso())) {
    const url = request.nextUrl.clone();
    url.pathname = '/access';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
