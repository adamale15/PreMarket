import "../global.css";
import React from "react";
import Link from "next/link";
import { Sparkles, Bell } from "lucide-react";
import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "TrendForge — Predictive trend platform",
  description: "See tomorrow's trends today — signals from news, social, and research.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
              <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/40 dark:bg-background/20 border-b border-border/50 shadow-sm">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                  <Link href="/" className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 grid place-items-center text-white shadow-lg group-hover:scale-105 transition-transform">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">TrendForge</span>
                  </Link>
                  <nav className="flex items-center gap-1">
                    <Link href="/" className="px-3 py-2 text-sm font-medium rounded-lg backdrop-blur-sm bg-background/50 dark:bg-background/30 border border-border/50 hover:bg-background/80 dark:hover:bg-background/50 transition-all">Home</Link>
                    <Link href="/dashboard" className="px-3 py-2 text-sm font-medium rounded-lg text-foreground/70 hover:text-foreground hover:bg-background/50 dark:hover:bg-background/30 transition-all">Dashboard</Link>
                  </nav>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-2 rounded-lg backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground px-3 py-2 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-primary/20">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </button>
                    <ThemeToggle />
                  </div>
                </div>
              </header>

              <main className="flex-1">{children}</main>

              <footer className="border-t border-border/50 backdrop-blur-sm bg-background/40 dark:bg-background/20 mt-auto">
                <div className="container mx-auto py-10 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4 px-4">
                  <p>© {new Date().getFullYear()} TrendForge. All rights reserved.</p>
                  <p className="opacity-80">Predictive insights from news, X, and the open web.</p>
                </div>
              </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
