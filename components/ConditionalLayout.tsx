"use client";

import { usePathname } from "next/navigation";
import { ScrollHeader } from "@/components/ScrollHeader";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

  if (isAuthPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
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
    </>
  );
}




