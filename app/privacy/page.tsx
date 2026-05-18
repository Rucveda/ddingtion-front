"use client";

import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";

const sections = [
  {
    title: "1. 수집하는 개인정보",
    body: [
      "회원가입 및 로그인 과정에서 마인크래프트 닉네임으로 사용하는 아이디, 비밀번호 해시, 서비스 내 표시 닉네임을 수집합니다.",
      "디스코드 인증을 사용하는 경우 디스코드 계정 식별자와 인증 상태를 저장합니다.",
      "경매 등록, 입찰, 즉시구매, 댓글, 거래 채팅, 신고, 리뷰, 알림 등 서비스 이용 과정에서 생성되는 활동 기록을 저장합니다.",
      "부정 이용 방지와 다중 계정 악용 방지를 위해 접속 IP 등 접속 환경 정보를 제한적으로 저장할 수 있습니다.",
    ],
  },
  {
    title: "2. 개인정보 이용 목적",
    body: [
      "계정 식별, 로그인 유지, 경매 등록 및 입찰 기능 제공에 이용합니다.",
      "거래 채팅, 거래 확정, 댓글, 리뷰, 신고 처리 등 이용자 간 거래 흐름을 운영하기 위해 이용합니다.",
      "디스코드 인증 여부 확인, 부정 입찰 방지, 신고 및 분쟁 대응, 서비스 안정성 개선에 이용합니다.",
      "알림 발송, 운영 공지, 문의 대응 등 서비스 운영 목적으로 이용합니다.",
    ],
  },
  {
    title: "3. 개인정보 보관 기간",
    body: [
      "회원 정보는 회원 탈퇴 또는 운영자가 계정을 삭제할 때까지 보관합니다.",
      "경매, 입찰, 거래, 리뷰, 신고, 댓글 및 채팅 기록은 거래 분쟁 대응과 서비스 운영을 위해 필요한 기간 동안 보관할 수 있습니다.",
      "부정 이용 방지용 접속 IP 등 임시 기록은 목적 달성 후 합리적인 기간 내 삭제하거나 만료 처리합니다.",
    ],
  },
  {
    title: "4. 제3자 제공 및 외부 서비스",
    body: [
      "띵션은 이용자의 개인정보를 판매하지 않습니다.",
      "디스코드 인증 기능을 사용하는 경우 인증 진행을 위해 디스코드와 계정 인증 정보가 연동될 수 있습니다.",
      "서비스 운영 환경, 데이터베이스, 배포 인프라 등 외부 호스팅 서비스를 통해 정보가 처리될 수 있습니다.",
    ],
  },
  {
    title: "5. 이용자의 권리",
    body: [
      "이용자는 본인의 계정 정보 확인, 수정, 삭제를 요청할 수 있습니다.",
      "댓글, 신고, 채팅 등 거래 안전과 분쟁 대응에 필요한 기록은 요청 즉시 삭제가 제한될 수 있습니다.",
      "개인정보 관련 문의, 삭제 요청, 리소스 사용 관련 문의는 운영자에게 요청할 수 있습니다.",
    ],
  },
  {
    title: "6. 비공식 서비스 및 리소스 고지",
    body: [
      "띵션은 띵타이쿤 유저를 위한 비공식 서비스입니다.",
      "서비스 내 일부 이미지 및 게임 리소스의 권리는 띵타이쿤 및 원 저작권자에게 있습니다.",
      "권리자의 요청이 있는 경우 관련 리소스는 확인 후 수정 또는 삭제될 수 있습니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans relative overflow-x-hidden">
      <SiteBackground />
      <SimpleTopBar closeHref="/" closeLabel="홈으로 돌아가기" />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        <section className="site-card rounded-[32px] p-5 sm:p-7 md:p-8">
          <div className="mb-7 border-b border-white/5 pb-6">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-400">
              Privacy Policy
            </p>
            <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-white sm:text-3xl">
              개인정보처리방침
            </h1>
            <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">
              시행일: 2026년 5월 18일
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <h2 className="mb-3 text-sm font-extrabold tracking-[-0.02em] text-zinc-100">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {section.body.map((line) => (
                    <p key={line} className="text-xs font-medium leading-relaxed text-zinc-400 break-keep">
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
