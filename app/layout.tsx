import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İade Takip Sistemi",
  description: "İade giriş, teslim ve kontrol süreçlerini yönetin.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
