import { NextResponse, type NextRequest } from "next/server";
import { FEATURES, isSectionVisible } from "@/lib/features";
import { isSectionId } from "@/lib/section";
import { parseBranch, resolveBranch } from "@/lib/section-tree";

function unknownCatalogBranch(pathname: string): boolean {
  const match = pathname.match(/^\/section\/([^/]+)\/c\/(.+)$/);
  if (!match) return false;
  const id = match[1];
  if (!isSectionId(id) || !isSectionVisible(id)) return false;
  try {
    return resolveBranch(id, parseBranch(match[2].split("/"))) === null;
  } catch {
    return true;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const home = new URL("/", req.url);
  if (!FEATURES.developers && (pathname.startsWith("/developers") || pathname === "/developer")) return NextResponse.redirect(home);
  if (!FEATURES.complexes && pathname.startsWith("/complexes")) return NextResponse.redirect(home);
  if (!FEATURES.dealers && (pathname.startsWith("/dealers") || pathname === "/dealer")) return NextResponse.redirect(home);
  if (!FEATURES.vacancies && pathname.startsWith("/section/vacancies")) return NextResponse.redirect(home);
  if (!FEATURES.stays && pathname.startsWith("/section/stays")) return NextResponse.redirect(home);
  if (unknownCatalogBranch(pathname)) {
    return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
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
