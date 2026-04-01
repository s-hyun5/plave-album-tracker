import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLAVE Caligo Pt.2 Tracker",
  description: "플레이브 4th Mini Album 앨범 판매처 · 가격 비교 · 구매 기록",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-geist-sans)]">
        <Nav />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
