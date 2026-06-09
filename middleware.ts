import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
]);

const useClerkProxy = Boolean(process.env.NEXT_PUBLIC_CLERK_PROXY_URL);
const ALLOWED_EMAIL_DOMAIN = "@creativewaco.org";

function hasAllowedEmail(email: unknown): boolean {
  return (
    typeof email === "string" &&
    email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)
  );
}

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      const session = await auth.protect();
      const email = session.sessionClaims?.email;
      if (!hasAllowedEmail(email)) {
        const signInUrl = new URL("/sign-in/", req.url);
        signInUrl.searchParams.set("reason", "unauthorized_domain");
        return NextResponse.redirect(signInUrl);
      }
    }
  },
  useClerkProxy ? { frontendApiProxy: { enabled: true } } : undefined,
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
