import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/ChatWidget";
import NotificationCenter from "@/components/NotificationCenter";
// 💡 신규 공지사항 팝업 임포트
import NoticePopup from "@/components/NoticePopup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DDINGTION",
  description: "띵타이쿤 비공식 강화계산기, 경매플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#010101] selection:bg-white selection:text-black">
        {/* 메인 페이지 콘텐츠 */}
        <div className="flex-1 relative z-10">
          {children}
        </div>

        {/* 💡 0. 시스템 공지사항 팝업 (좌측 하단 배치 버전) */}
        <NoticePopup />

        {/* 💡 1. 알림 센터 (상시 노출 버튼, 클릭 시 과거 내역 조회) */}
        <NotificationCenter />

        {/* 💡 2. 우하단 채팅 위젯 */}
        <ChatWidget />
      </body>
    </html>
  );
}