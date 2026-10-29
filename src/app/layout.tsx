import type { Metadata } from "next";
import { Inter } from "next/font/google"
import "./globals.css";

import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Learn-IT",
  description: "Fokus-Timer und Lernzeiterfassung für die AP2-Vorbereitung"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${inter.variable} h-full antialiased`}>
    <body className="min-h-full flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {children}
    </body>
    </html>
  );
}
