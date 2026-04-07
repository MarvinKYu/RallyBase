import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { isAdminUser } from "@/server/services/admin.service";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "RallyBase",
  description: "Competitive table tennis tournament management and rating tracking.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const isAdmin = userId ? await isAdminUser(userId) : false;

  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Script
          src="https://app.termly.io/resource-blocker/5a9bd49e-cb4e-4d39-b41c-c040c6a535fd?autoBlock=on"
          strategy="beforeInteractive"
        />
        <ClerkProvider>
          <header className="relative border-b border-border bg-surface">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
              {/* Brand + nav */}
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-semibold text-accent"
                >
                  RallyBase
                </Link>
                {/* MobileNav renders desktop links (sm+) + mobile hamburger (<sm) */}
                <MobileNav isAdmin={isAdmin} />
              </div>

              {/* Auth controls */}
              <div className="flex items-center gap-2 sm:gap-4">
                <Show when="signed-out">
                  <SignInButton>
                    <button className="rounded-md px-3 py-1.5 text-sm font-medium text-text-2 transition-colors hover:bg-surface-hover hover:text-text-1">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-accent-dim">
                      Sign up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </header>

          <div className="min-h-[calc(100vh-57px)]">{children}</div>

          <footer className="border-t border-border bg-surface px-4 py-6 text-center text-sm text-text-2">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/privacy" className="transition-colors hover:text-text-1">Privacy Policy</Link>
              <Link href="/cookies" className="transition-colors hover:text-text-1">Cookie Policy</Link>
              <a href="#" className="termly-display-preferences transition-colors hover:text-text-1">Consent Preferences</a>
            </div>
            <p className="mt-3 text-xs opacity-60">&copy; 2026 RallyBase</p>
          </footer>
        </ClerkProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
