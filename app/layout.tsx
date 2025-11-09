import "../global.css";
import React from "react";
import { Providers } from "@/components/providers";
import { ScrollHeader } from "@/components/ScrollHeader";

export const metadata = {
  title: "PreMarket — Predictive trend platform",
  description:
    "See tomorrow's trends today — signals from news, social, and research.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <ScrollHeader />

            <main className="flex-1">{children}</main>

            <footer className="border-t border-border/50 backdrop-blur-sm bg-background/40 dark:bg-background/20 mt-auto">
              <div className="container mx-auto py-10 text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4 px-4">
                <p>
                  © {new Date().getFullYear()} PreMarket. All rights reserved.
                </p>
                <p className="opacity-80">
                  Predictive insights from news, X, and the open web.
                </p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
