import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LayoutShell } from "@/components/shell/LayoutShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Finance Tools",
  description: "Personal finance calculators and simulators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-app font-sans text-t1 antialiased">
        <div className="flex flex-col h-screen overflow-hidden">
          <LayoutShell>{children}</LayoutShell>
        </div>
      </body>
    </html>
  );
}
