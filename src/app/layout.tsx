import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Team Insights",
  description: "Developer Activity Dashboard",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html suppressHydrationWarning>
      <body>
        {isProduction && adsenseId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
