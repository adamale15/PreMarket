import "../global.css";
import React from "react";
import Link from "next/link";
import { Sparkles, Bell } from "lucide-react";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "TrendForge — Predictive trend platform",
  description: "See tomorrow's trends today — signals from news, social, and research.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
              <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/80 border-b">
                <div className="container mx-auto flex h-16 items-center justify-between">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 grid place-items-center text-white">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="font-extrabold tracking-tight text-xl">TrendForge</span>
                  </Link>
                  <nav className="flex items-center gap-1">
                    <Link href="/" className="px-3 py-2 text-sm font-medium rounded-md bg-secondary text-foreground">Home</Link>
                    <Link href="/dashboard" className="px-3 py-2 text-sm font-medium rounded-md text-foreground/70 hover:text-foreground hover:bg-secondary">Dashboard</Link>
                  </nav>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold shadow-sm hover:brightness-110">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </button>
                  </div>
                </div>
              </header>

              <main className="flex-1">{children}</main>

              <footer className="border-t">
                <div className="container mx-auto py-10 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
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
