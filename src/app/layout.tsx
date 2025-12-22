import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata: Metadata = {
  title: "Team Insights",
  description: "Developer Activity Dashboard",
  icons: {
    icon: "/favicon.svg",
  },
  ...(adsenseId && {
    other: {
      "google-adsense-account": adsenseId,
    },
  }),
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
