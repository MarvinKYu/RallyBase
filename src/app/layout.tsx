import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RallyBase",
  description: "Competitive table tennis tournament management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          <header className="flex items-center justify-between gap-4 px-6 py-4 border-b">
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold text-zinc-900">
                RallyBase
              </Link>
              <Link href="/tournaments" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
                Tournaments
              </Link>
              <Link href="/players" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
                Players
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
