import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutriTrack AI",
  description:
    "AI-powered meal & water tracking with budget-aware, hostel-friendly nutrition guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 pb-28 pt-6">
          {children}
        </main>
        <Disclaimer />
        <BottomNav />
      </body>
    </html>
  );
}
