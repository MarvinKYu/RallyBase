import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { MobileNav } from "@/components/layout/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RallyBase",
  description: "Competitive table tennis tournament management and rating tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ClerkProvider>
          <header className="relative border-b border-zinc-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
              {/* Brand + nav */}
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-semibold text-zinc-900"
                >
                  RallyBase
                </Link>
                {/* MobileNav renders desktop links (sm+) + mobile hamburger (<sm) */}
                <MobileNav />
              </div>

              {/* Auth controls */}
              <div className="flex items-center gap-2 sm:gap-4">
                <Show when="signed-out">
                  <SignInButton>
                    <button className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700">
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
        </ClerkProvider>
      </body>
    </html>
  );
}
