"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { Sparkles, Bell, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function ScrollHeader() {
  const { isSignedIn } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        isScrolled ? "px-4 pt-2" : "",
      )}
    >
      <div
        className={cn(
          "transition-[border-radius,background-color,border-color,box-shadow,height,max-width,margin] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
          isScrolled
            ? "container mx-auto rounded-xl backdrop-blur-xl bg-background/95 dark:bg-background/90 border-2 border-border shadow-xl h-14"
            : "w-full backdrop-blur-xl bg-background/40 dark:bg-background/20 border-b border-border/50 shadow-sm h-16",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-0 w-full relative h-full",
            isScrolled ? "px-6" : "container mx-auto px-6",
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2 group min-w-0 flex-shrink-0 z-10"
          >
            <div
              className={cn(
                "rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 grid place-items-center text-white shadow-lg group-hover:scale-105 transition-[width,height,transform] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0",
                isScrolled ? "h-7 w-7" : "h-8 w-8",
              )}
            >
              <Sparkles
                className={cn(
                  "transition-[width,height] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  isScrolled ? "h-4 w-4" : "h-5 w-5",
                )}
              />
            </div>
            <span
              className={cn(
                "font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent transition-[font-size] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap",
                isScrolled ? "text-lg" : "text-xl",
              )}
            >
              PreMarket
            </span>
          </Link>
          <nav className="flex items-center gap-2 flex-1 justify-center absolute left-0 right-0 top-0 bottom-0">
            <Link
              href="/"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-[background-color,border-color] duration-500 ease-out",
                isScrolled
                  ? "backdrop-blur-sm bg-background/60 dark:bg-background/40 border border-border/60 hover:bg-background/80 dark:hover:bg-background/60"
                  : "backdrop-blur-sm bg-background/50 dark:bg-background/30 border border-border/50 hover:bg-background/80 dark:hover:bg-background/50",
              )}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium rounded-lg text-foreground/70 hover:text-foreground hover:bg-background/50 dark:hover:bg-background/30 transition-[color,background-color] duration-300 ease-out"
            >
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-3 flex-shrink-0 z-10 ml-auto">
            {isSignedIn && (
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-[padding,font-size,transform,box-shadow] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] border border-primary/20 whitespace-nowrap",
                  isScrolled ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                )}
              >
                <Bell
                  className={cn(
                    "transition-[width,height] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0",
                    isScrolled ? "h-3.5 w-3.5" : "h-4 w-4",
                  )}
                />
                <span
                  className={cn(
                    "transition-[opacity,width] duration-500 ease-out overflow-hidden whitespace-nowrap",
                    isScrolled ? "opacity-0 w-0" : "opacity-100 w-auto",
                  )}
                >
                  Notifications
                </span>
              </button>
            )}
            {isSignedIn ? (
              <SignOutButton>
                <button
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg backdrop-blur-sm bg-background/50 dark:bg-background/30 border border-border/50 text-foreground hover:bg-background/70 dark:hover:bg-background/50 font-medium shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap",
                    isScrolled ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                  )}
                >
                  <LogOut
                    className={cn(
                      "transition-[width,height] duration-300 flex-shrink-0",
                      isScrolled ? "h-3.5 w-3.5" : "h-4 w-4",
                    )}
                  />
                  <span
                    className={cn(
                      "transition-[opacity,width] duration-500 ease-out overflow-hidden whitespace-nowrap",
                      isScrolled ? "opacity-0 w-0" : "opacity-100 w-auto",
                    )}
                  >
                    Sign out
                  </span>
                </button>
              </SignOutButton>
            ) : (
              <Link
                href="/sign-in"
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-primary/20 whitespace-nowrap",
                  isScrolled ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                )}
              >
                <span
                  className={cn(
                    "transition-[opacity,width] duration-500 ease-out overflow-hidden whitespace-nowrap",
                    isScrolled ? "opacity-0 w-0" : "opacity-100 w-auto",
                  )}
                >
                  Sign in
                </span>
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
