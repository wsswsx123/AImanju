import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Manga Drama Platform",
  description: "Script to storyboard AI manga drama creation platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-[#f7f4ee] text-stone-950 antialiased">
        <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(246,184,84,0.20),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(49,111,124,0.18),transparent_28%)]">
          <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fffaf2]/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              <Link href="/" className="flex items-center gap-3 font-black text-stone-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-950 text-amber-200">
                  MD
                </span>
                <span>AI Manga Drama</span>
              </Link>
              <nav className="flex gap-3">
                <Link href="/" className="text-sm font-semibold text-stone-600 hover:text-stone-950">
                  Projects
                </Link>
                <Link
                  href="/projects/create"
                  className="rounded-lg bg-[#c2410c] px-4 py-2 text-sm font-bold text-white"
                >
                  New
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
