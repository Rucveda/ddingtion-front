"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

type BackgroundVariant = "default" | "home" | "admin";

export function SiteBackground({ variant = "default" }: { variant?: BackgroundVariant }) {
  const variantClass =
    variant === "home"
      ? "premium-abyss-bg--home"
      : variant === "admin"
        ? "premium-abyss-bg--admin"
        : "";

  return (
    <>
      <div className={`premium-abyss-bg ${variantClass}`} />
      <div className={`bg-texture ${variant === "home" ? "bg-texture--home" : ""}`} />
    </>
  );
}

export function DdingtionLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`text-2xl md:text-[28px] font-black tracking-tighter transition-transform group-hover:scale-105 ${className}`}>
      <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
      <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
      <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
      <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
      <span className="text-[#ef4444]">N</span>
    </span>
  );
}

export function SimpleTopBar({
  onNavigate,
  children,
  closeHref,
  closeLabel = "경매로 돌아가기",
  maxWidth = "max-w-7xl",
  preferBrowserBack = true,
}: {
  onNavigate?: () => void;
  children?: ReactNode;
  closeHref?: string;
  closeLabel?: string;
  maxWidth?: string;
  preferBrowserBack?: boolean;
}) {
  const router = useRouter();

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    onNavigate?.();
    if (preferBrowserBack && typeof window !== "undefined" && window.history.length > 1) {
      event.preventDefault();
      router.back();
      return;
    }
    if (closeHref) router.push(closeHref);
  };

  return (
    <nav className="site-topbar">
      <div className={`site-topbar-inner ${maxWidth}`}>
        <Link href="/" onClick={onNavigate} className="flex items-center gap-1 group shrink-0" aria-label="DDINGTION 홈">
          <DdingtionLogo />
        </Link>
        <div className="flex items-center gap-3">
          {children}
          {closeHref && (
            preferBrowserBack ? (
              <button
                type="button"
                onClick={handleClose}
                aria-label={closeLabel}
                title={closeLabel}
                className="flex h-10 w-10 items-center justify-center text-sm font-semibold text-zinc-500 transition-colors hover:text-white"
              >
                X
              </button>
            ) : (
              <Link
                href={closeHref}
                onClick={onNavigate}
                aria-label={closeLabel}
                title={closeLabel}
                className="flex h-10 w-10 items-center justify-center text-sm font-semibold text-zinc-500 transition-colors hover:text-white"
              >
                X
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="mt-16 border-t border-white/5 py-10 text-center relative z-10">
      <div className="mx-auto max-w-3xl px-4 text-xs font-semibold leading-relaxed text-zinc-500">
        {children || (
          <>
            <p>© 2026 DDINGTION. 비공식 서비스입니다.</p>
            <p className="mt-1 text-zinc-600">일부 이미지 및 게임 리소스의 권리는 띵타이쿤 및 원 저작권자에게 있습니다.</p>
            <Link href="/privacy" className="mt-3 inline-flex text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-200">
              개인정보처리방침
            </Link>
          </>
        )}
      </div>
    </footer>
  );
}
