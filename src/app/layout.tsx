import type { Metadata } from "next";
import { Inter } from "next/font/google"
import "./globals.css";
import NavBar from "./components/NavBar";

import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
config.autoAddCss = false

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Learn-It"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}>
    <body className="min-h-full flex flex-col">
      <NavBar/>
        <main className="min-h-full flex flex-col p-2">
          {children}
        </main>
    </body>
    </html>
  );
}
