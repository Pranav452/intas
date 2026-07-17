import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import ScrollContext from "@/components/scroll-context";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INTAS DSR · Air Freight Dashboard by LINKS",
  description:
    "Live air-freight dashboard for INTAS DSR exports — AWBs, flight routings, uplift and customs filings managed by LINKS from Mumbai and Delhi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <ScrollContext>{children}</ScrollContext>
        </ThemeProvider>
      </body>
    </html>
  );
}
