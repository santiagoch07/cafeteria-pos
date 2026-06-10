import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/registro"];
const PUBLIC_API   = ["/api/registro/empresa", "/api/me"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value; },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname     = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPublicApi  = PUBLIC_API.some((p) => pathname.startsWith(p));

  // Sin sesión y ruta protegida → redirigir a login
  if (!user && !isPublicPath && !isPublicApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", "1");
    return NextResponse.redirect(url);
  }

  // Con sesión en login/registro → redirigir a /pos
  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/pos";
    return NextResponse.redirect(url);
  }

  // Cajero intentando acceder a rutas exclusivas de dueño → redirigir a /pos
  const RESTRICTED_TO_DUENO = ["/admin", "/finanzas", "/equipo"];
  if (user && !isPublicPath && !isPublicApi) {
    const isRestricted = RESTRICTED_TO_DUENO.some((p) => pathname.startsWith(p));
    if (isRestricted) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (usuario?.rol === "cajero") {
        const url = request.nextUrl.clone();
        url.pathname = "/pos";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
