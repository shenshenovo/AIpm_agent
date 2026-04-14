import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI产品经理求职陪练Agent",
  description: "面向AI产品经理求职场景的结构化分析、学习和面试训练工作台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
