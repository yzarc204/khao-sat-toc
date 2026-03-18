import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const thangLongSans = localFont({
  variable: "--font-thanglong-sans",
  display: "swap",
  src: [
    {
      path: "../public/fonts/ThangLongSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/ThangLongSans-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/ThangLongSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/ThangLongSans-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/ThangLongSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/ThangLongSans-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
});

export const metadata: Metadata = {
  title: "Khảo Sát Mẫu Tóc",
  description: "Nền tảng khảo sát mẫu tóc yêu thích với dashboard quản trị",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${thangLongSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
