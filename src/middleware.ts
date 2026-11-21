import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = req.nextUrl.pathname.startsWith("/login");

        if (isAuthPage) {
            if (isAuth) {
                const role = token?.role as string | undefined;
                const dest = (role === 'ADMIN' || role === 'JUDGE') ? '/admin' : '/dashboard';
                return NextResponse.redirect(new URL(dest, req.url));
            }
            return null;
        }

        if (!isAuth) {
            let from = req.nextUrl.pathname;
            if (req.nextUrl.search) {
                from += req.nextUrl.search;
            }

            return NextResponse.redirect(
                new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
            );
        }

        // Role-based protection: Only Admins/Judges can access /admin
        if (req.nextUrl.pathname.startsWith("/admin")) {
            const role = token?.role as string | undefined;
            if (role !== 'ADMIN' && role !== 'JUDGE') {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }
        }
    },
    {
        callbacks: {
            async authorized() {
                // This is a work-around for handling redirect on auth pages.
                // We return true here so that the middleware function above
                // is always called.
                return true;
            },
        },
    }
);

export const config = {
    matcher: ["/admin/:path*", "/dashboard/:path*", "/login"],
};
