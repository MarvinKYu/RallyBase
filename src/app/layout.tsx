import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { MobileNav } from "@/components/layout/MobileNav";
import { isAdminUser } from "@/server/services/admin.service";
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
        </ClerkProvider>
      </body>
    </html>
  );
}
