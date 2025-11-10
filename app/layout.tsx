import "../global.css";
import React from "react";
import { Providers } from "@/components/providers";
import { ConditionalLayout } from "@/components/ConditionalLayout";
import { Analytics } from "@vercel/analytics/next";

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
            <ConditionalLayout>{children}</ConditionalLayout>
            <Analytics />
          </div>
        </Providers>
      </body>
    </html>
  );
}
