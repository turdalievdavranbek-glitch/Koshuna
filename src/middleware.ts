import { NextResponse, type NextRequest } from "next/server";
import { FEATURES } from "@/lib/features";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const home = new URL("/", req.url);
  if (!FEATURES.developers && (pathname.startsWith("/developers") || pathname === "/developer")) return NextResponse.redirect(home);
  if (!FEATURES.complexes && pathname.startsWith("/complexes")) return NextResponse.redirect(home);
  if (!FEATURES.dealers && (pathname.startsWith("/dealers") || pathname === "/dealer")) return NextResponse.redirect(home);
  if (!FEATURES.vacancies && pathname.startsWith("/section/vacancies")) return NextResponse.redirect(home);
  if (!FEATURES.stays && pathname.startsWith("/section/stays")) return NextResponse.redirect(home);
  const kind = searchParams.get("kind");
  if (pathname === "/partner" && ((kind === "developer" && !FEATURES.developers) || (kind === "dealer" && !FEATURES.dealers))) {
    return NextResponse.redirect(new URL("/partner?kind=realtor", req.url));
  }
  const card = searchParams.get("card");
  if (pathname === "/post" && ((card === "developer" && !FEATURES.developers) || (card === "dealer" && !FEATURES.dealers))) {
    return NextResponse.redirect(new URL("/post", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/developers/:path*", "/developer", "/complexes/:path*", "/dealers/:path*", "/dealer", "/section/:path*", "/partner", "/post"],
};
