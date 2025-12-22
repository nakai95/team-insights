import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: "Team Insights",
  description: "Developer Activity Dashboard",
  icons: {
    icon: "/favicon.svg",
  },
  other: {
    ...(adsenseId && {
      "google-adsense-account": adsenseId,
    }),
    ...(googleSiteVerification && {
      "google-site-verification": googleSiteVerification,
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
