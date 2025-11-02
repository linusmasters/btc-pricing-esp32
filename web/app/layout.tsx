import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bitcoin Price Monitor",
  description: "Real-time Bitcoin price monitoring from ESP32",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
