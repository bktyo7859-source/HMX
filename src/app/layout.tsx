import React from "react";
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "@/styles/globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-dmsans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HMX — AI Property Valuation Platform",
  description:
    "Know the value behind every space. High-precision AI-powered house price predictions and real estate valuation intelligence.",
  keywords: [
    "House Price Prediction",
    "AI Property Valuation",
    "Real Estate Machine Learning",
    "Property Value Estimator",
    "Luxury Architecture",
  ],
  openGraph: {
    title: "HMX — AI Property Valuation Platform",
    description: "Know the value behind every space with AI property valuation.",
    siteName: "HMX",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`scroll-smooth ${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-[#111111] antialiased selection:bg-[#F5EFE6] font-sans">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
