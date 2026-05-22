"use client";

import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/client/api";

type ReportListItem = {
  id: number;
  roomId: number;
  auctionId: number;
  status: string;
  resolution?: string | null;
  reasonPreview: string;
  createdAt: string;
  messageCount: number;
  reporter: { id: number; ingameName: string };
  target: { id: number; ingameName: string; isBanned?: boolean; reputationScore?: number };
  auction: {
    id: number;
    status: string;
    currentPrice: string | number | bigint;
    item: { name: string; iconUrl?: string | null };
  };
};

type ReportDetail = ReportListItem & {
  reason: string;
  previousAuctionStatus: string;
  resolvedAt?: string | null;
  resolvedBy?: { id: number; ingameName: string } | null;
};

type ChatMessage = {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender?: { id: number; ingameName: string };
};

type Pagination = {
  page: number;
  total: number;
  hasMore: boolean;
};

const DEFAULT_PAGINATION: Pagination = { page: 1, total: 0, hasMore: false };

export default function ReportReviewPanel({ onHaptic }: { onHaptic?: () => void }) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "RESOLVED" | "DISMISSED" | "ALL">("PENDING");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchReports = useCallback(async (page = 1, append = false) => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        status: statusFilter,
      });
      const data = await request(`/api/admin/reports?${params.toString()}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      setReports((prev) => (append ? [...prev, ...items] : items));
      setPagination(data?.pagination || { page, total: items.length, hasMore: false });
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setMessages([]);
    setMessagesLoaded(false);
    try {
      const data = await request(`/api/admin/reports/${id}`);
      setDetail(data || null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    setLoadingMessages(true);
    try {
      const data = await request(`/api/admin/reports/${id}/messages`);
      setMessages(Array.isArray(data) ? data : []);
      setMessagesLoaded(true);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const selectReport = (id: number) => {
    onHaptic?.();
    setSelectedId(id);
    void loadDetail(id);
  };

  const resolve = async (action: string) => {
    if (!selectedId || !detail) return;
    const labels: Record<string, string> = {
      dismiss: "기각(거래 종료 상태 유지)",
      ban: "계정 차단",
      strict_ban: "강력 밴(계정+IP)",
      warning: "경고(평점 1점 반영)",
    };
    if (!confirm(`${detail.target.ingameName} — ${labels[action] || action} 처리하시겠습니까?`)) return;

    onHaptic?.();
    setResolving(true);
    try {
      const data = await request(`/api/admin/reports/${selectedId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (data?.message) alert(data.message);
      if (data?.report) setDetail(data.report);
      void fetchReports(1, false);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "처리 실패");
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    void fetchReports(1, false);
  }, [fetchReports]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setMessages([]);
      setMessagesLoaded(false);
    }
  }, [selectedId]);

  const formatPrice = (value: string | number | bigint) => {
    try {
      return BigInt(value).toLocaleString();
    } catch {
      return String(value);
    }
  };

  return (
    <div className="flex h-[560px]">
      <div className="flex w-[300px] shrink-0 flex-col border-r border-white/5 bg-black/20">
        <div className="border-b border-white/5 p-4">
          <h2 className="text-sm font-extrabold tracking-[-0.02em] text-zinc-100">거래 신고</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["PENDING", "RESOLVED", "DISMISSED", "ALL"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onHaptic?.();
                  setStatusFilter(status);
                  setSelectedId(null);
                }}
                className={`rounded-lg border px-2 py-1 text-[9px] font-bold ${
                  statusFilter === status
                    ? "border-red-500/50 bg-red-500/15 text-red-200"
                    : "border-white/5 text-zinc-600"
                }`}
              >
                {status === "PENDING" ? "대기" : status === "RESOLVED" ? "처리" : status === "DISMISSED" ? "기각" : "전체"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {reports.length === 0 && !loadingList && (
            <p className="p-4 text-center text-[10px] font-medium text-zinc-600">신고 내역이 없습니다.</p>
          )}
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => selectReport(report.id)}
              className={`w-full border-b border-white/5 p-4 text-left transition-all ${
                selectedId === report.id ? "border-l-2 border-l-red-500 bg-red-500/10" : "hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-zinc-200">
                  {report.target.ingameName}
                </span>
                <span className="shrink-0 text-[9px] font-bold text-zinc-600">#{report.id}</span>
              </div>
              <p className="mt-1 truncate text-[10px] text-zinc-500">{report.auction.item.name}</p>
              <p className="mt-1 line-clamp-2 text-[10px] text-zinc-600">{report.reasonPreview}</p>
              <p className="mt-1 text-[9px] text-zinc-700">
                채팅 {report.messageCount}건 · {new Date(report.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
        {pagination.hasMore && (
          <div className="border-t border-white/5 p-3">
            <button
              type="button"
              disabled={loadingList}
              onClick={() => void fetchReports(pagination.page + 1, true)}
              className="site-btn site-btn-secondary site-btn-compact w-full"
            >
              {loadingList ? "불러오는 중…" : "더 보기"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col bg-black/40">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-700">
            <p className="text-sm font-semibold">신고 건을 선택해주세요</p>
            <p className="text-xs font-medium">채팅 로그는 선택 후 불러옵니다.</p>
          </div>
        ) : loadingDetail && !detail ? (
          <div className="flex flex-1 items-center justify-center text-xs text-zinc-600">불러오는 중…</div>
        ) : detail ? (
          <>
            <div className="border-b border-white/5 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-red-300">{detail.target.ingameName}</span>
                <span className="text-zinc-600">←</span>
                <span className="text-zinc-400">신고자 {detail.reporter.ingameName}</span>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">
                경매 #{detail.auctionId} · {detail.auction.item.name} · {formatPrice(detail.auction.currentPrice)}G ·{" "}
                {detail.auction.status}
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
              <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <h3 className="mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">신고 사유</h3>
                <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-zinc-300">{detail.reason}</p>
              </section>

              <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500">채팅 로그</h3>
                  {!messagesLoaded && (
                    <button
                      type="button"
                      disabled={loadingMessages}
                      onClick={() => void loadMessages(detail.id)}
                      className="site-btn site-btn-secondary site-btn-compact"
                    >
                      {loadingMessages ? "로드 중…" : "채팅 로그 불러오기"}
                    </button>
                  )}
                </div>
                {!messagesLoaded ? (
                  <p className="text-[10px] text-zinc-600">버튼을 눌러야 메시지가 로드됩니다.</p>
                ) : messages.length === 0 ? (
                  <p className="text-[10px] text-zinc-600">메시지가 없습니다.</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto custom-scrollbar">
                    {messages.map((msg) => (
                      <div key={msg.id} className="rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                        <div className="mb-1 flex justify-between text-[9px] text-zinc-600">
                          <span>{msg.sender?.ingameName || `#${msg.senderId}`}</span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-zinc-300">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {detail.status === "PENDING" ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => void resolve("dismiss")}
                    className="site-btn site-btn-secondary site-btn-compact"
                  >
                    기각
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => void resolve("warning")}
                    className="site-btn site-btn-secondary site-btn-compact"
                  >
                    경고
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => void resolve("ban")}
                    className="site-btn site-btn-danger site-btn-compact"
                  >
                    차단
                  </button>
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={() => void resolve("strict_ban")}
                    className="site-btn site-btn-compact border-orange-500/30 bg-orange-500/10 text-orange-300"
                  >
                    강력 밴
                  </button>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  처리 완료 ({detail.resolution}){" "}
                  {detail.resolvedBy ? `· ${detail.resolvedBy.ingameName}` : ""}
                  {detail.resolvedAt ? ` · ${new Date(detail.resolvedAt).toLocaleString()}` : ""}
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
