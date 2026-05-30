import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "食光记 · AI 饮食分析",
  description: "记录每一餐，智能分析营养摄入",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#eef6f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>
          <div className="app-shell mx-auto min-h-dvh max-w-md">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
