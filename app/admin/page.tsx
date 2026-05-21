"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/client/api"; 
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { SOCKET_URL } from "@/lib/client/runtimeConfig";
import { SimpleTopBar, SiteBackground, SiteFooter } from "@/components/SiteChrome";
import { isLocalDev } from "@/dev/devMode";
import { ensureLocalDummySession } from "@/dev/localDummyData";
import { subscribeSessionIdle } from "@/lib/auth/authPreferences";

// --- Interfaces ---
interface Auction { 
  id: number; 
  currentPrice: string; 
  status: string; 
  endTime: string;
  item: { name: string; iconUrl: string; category: string }; 
  seller: { ingameName: string }; 
}

interface UserData { 
  id: number; 
  loginId: string; 
  ingameName: string; 
  role: string; 
  isBanned: boolean; 
  bannedIp?: string | null;
  strictBanActive?: boolean;
  reputationScore: number;
  successfulTrades: number;
  discordLinked?: boolean;
}

interface ChatRoom { 
  id: number; 
  buyer: { id: number; ingameName: string }; 
  messages: { senderId: number; content: string; createdAt: string }[]; 
  isAdminChat: boolean; 
  status?: string;
}

interface ReportData {
  id: number;
  reason: string;
  isResolved: boolean;
  createdAt: string;
  previousAuctionStatus?: string | null;
  reporter: { ingameName: string; id?: number };
  target: { ingameName: string; id?: number };
  room: { id: number; auctionId?: number | null };
  auction?: {
    id: number;
    status: string;
    currentPrice: string;
    item?: { name: string };
  } | null;
}

type PaginationState = {
  page: number;
  total: number;
  hasMore: boolean;
};

const DEFAULT_PAGINATION: PaginationState = { page: 1, total: 0, hasMore: false };

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<"USERS" | "REPORTS" | "SUPPORT" | "AUCTIONS">("USERS");
  
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [supportRooms, setSupportRooms] = useState<ChatRoom[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [userPagination, setUserPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [reportPagination, setReportPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [selectedSupportRoom, setSelectedSupportRoom] = useState<ChatRoom | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  /**
   * 🛠️ [이미지 경로 패치]
   * http로 된 주소를 https로 강제 변환하여 Mixed Content 에러를 방지합니다.
   */
  const getSecureUrl = (url: string) => {
    if (!url) return "";
    return url.replace("http://", "https://");
  };

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, append = false) => {
    setIsLoadingUsers(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (userSearch.trim()) params.set("q", userSearch.trim());
      const data = await request(`/api/admin/users?${params.toString()}`);
      if (Array.isArray(data)) {
        setUsers(data);
        setUserPagination({ page: 1, total: data.length, hasMore: false });
        return;
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      setUsers((prev) => append ? [...prev, ...items] : items);
      setUserPagination(data?.pagination || { page, total: items.length, hasMore: false });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userSearch]);

  const changeUserRole = async (id: number, newRole: string) => {
    triggerHaptic();
    const data = await request(`/api/admin/users/${id}/role`, { 
      method: "PATCH", 
      body: JSON.stringify({ role: newRole }) 
    });
    if (data) fetchUsers(1, false);
  };

  const toggleStrictBan = async (id: number, enable: boolean, label: string) => {
    triggerHaptic();
    const action = enable ? "강력 밴(계정+IP)" : "강력 밴 해제";
    if (!confirm(`${label} 님에게 ${action}을 적용하시겠습니까?`)) return;
    const data = await request(`/api/admin/users/${id}/strict-ban`, {
      method: "PATCH",
      body: JSON.stringify({ enable }),
    });
    if (data?.message) alert(data.message);
    if (data) fetchUsers(1, false);
  };

  const banReportTarget = async (targetId: number, label: string) => {
    triggerHaptic();
    if (!confirm(`${label} 계정을 차단하시겠습니까?`)) return;
    const data = await request(`/api/admin/users/${targetId}/ban`, {
      method: "PATCH",
      body: JSON.stringify({ isBanned: true }),
    });
    if (data?.message) alert(data.message);
    if (data) fetchUsers(1, false);
  };

  const toggleUserBan = async (id: number, currentBanStatus: boolean) => {
    triggerHaptic();
    const action = currentBanStatus ? "해제" : "차단";
    if (!confirm(`해당 사용자를 ${action}하시겠습니까?`)) return;

    const data = await request(`/api/admin/users/${id}/ban`, { 
      method: "PATCH", 
      body: JSON.stringify({ isBanned: !currentBanStatus }) 
    });
    if (data) fetchUsers(1, false);
  };

  const anonymizeUser = async (id: number, label: string) => {
    triggerHaptic();
    if (!confirm(`${label} 계정을 익명화하시겠습니까?\n로그인/닉네임/Discord 연동은 제거되고 거래 기록은 보존됩니다.`)) return;
    const data = await request(`/api/admin/users/${id}/anonymize`, { method: "PATCH" });
    if (data) fetchUsers(1, false);
  };

  const fetchSupportRooms = useCallback(async () => {
    const data = await request("/api/admin/support/rooms");
    setSupportRooms(Array.isArray(data) ? data : []);
  }, []);

  const fetchAuctions = useCallback(async () => {
    const data = await request("/api/auctions");
    setAuctions(Array.isArray(data) ? data : []);
  }, []);

  const fetchReports = useCallback(async (page = 1, append = false) => {
    setIsLoadingReports(true);
    try {
      const data = await request(`/api/admin/reports?page=${page}&limit=20`);
      if (Array.isArray(data)) {
        setReports(data);
        setReportPagination({ page: 1, total: data.length, hasMore: false });
        return;
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      setReports((prev) => append ? [...prev, ...items] : items);
      setReportPagination(data?.pagination || { page, total: items.length, hasMore: false });
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  const handleTabChange = (tab: any) => {
    triggerHaptic();
    setActiveTab(tab);
    if (tab === "USERS") fetchUsers();
    if (tab === "SUPPORT") fetchSupportRooms();
    if (tab === "AUCTIONS") fetchAuctions();
    if (tab === "REPORTS") fetchReports();
  };

  useEffect(() => {
    if (isLocalDev()) ensureLocalDummySession();
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user && !isLocalDev()) { router.push("/login"); return; }
    if (user && user.role?.toUpperCase() !== "ADMIN" && !isLocalDev()) {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    setAdminId(user?.id ?? 0);

    /**
     * 🛠️ [소켓 주소 패치]
     * 하드코딩된 주소 대신 환경 변수를 사용합니다. 
     * 환경변수가 없으면 기존 Render 주소를 폴백으로 사용합니다.
     */
    if (isLocalDev()) {
      handleTabChange(activeTab);
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    
    newSocket.on("new_message", (msg) => {
      setSupportMessages((prev) => (prev.length > 0 && prev[0].roomId === msg.roomId ? [...prev, msg] : prev));
      fetchSupportRooms();
    });

    handleTabChange(activeTab);
    return () => { newSocket.close(); };
  }, [router]);

  useEffect(() => {
    return subscribeSessionIdle(() => {
      setSocket((prev) => {
        prev?.close();
        return null;
      });
    });
  }, []);

  useEffect(() => {
    if (activeTab !== "USERS" || !isAdmin) return;
    const timer = setTimeout(() => {
      void fetchUsers(1, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, fetchUsers, isAdmin]);

  const resolveReport = async (reportId: number) => {
    triggerHaptic();
    const res = await request(`/api/admin/reports/${reportId}/resolve`, { method: "PATCH", body: JSON.stringify({ isResolved: true }) });
    if (res) fetchReports();
  };

  const deleteResolvedReport = async (reportId: number) => {
    triggerHaptic();
    if (!confirm("기록을 영구 삭제하시겠습니까?")) return;
    const res = await request(`/api/admin/reports/${reportId}`, { method: "DELETE" });
    if (res) fetchReports();
  };

  const sendSupportMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportInput.trim() || !selectedSupportRoom) return;
    if (isLocalDev()) {
      setSupportMessages((prev) => [
        ...prev,
        { id: Date.now(), roomId: selectedSupportRoom.id, senderId: adminId, content: supportInput, createdAt: new Date().toISOString() },
      ]);
      setSupportInput("");
      return;
    }
    if (!socket) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    socket.emit("send_message", { roomId: selectedSupportRoom.id, token, content: supportInput });
    setSupportInput("");
  };

  const deleteResolvedSupport = async (roomId: number) => {
    triggerHaptic();
    if (!confirm("상담 내역을 영구 삭제하시겠습니까?")) return;
    const res = await request(`/api/admin/support/rooms/${roomId}`, { method: "DELETE" });
    if (res) {
      if (selectedSupportRoom?.id === roomId) setSelectedSupportRoom(null);
      fetchSupportRooms();
    }
  };

  const cancelAuction = async (id: number) => {
    triggerHaptic();
    if (!confirm("경매를 중단하시겠습니까?")) return;
    const data = await request(`/api/admin/auctions/${id}`, { method: "DELETE" });
    if (data) fetchAuctions();
  };

  const filteredUsers = useMemo(() => users, [users]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden">
      <SiteBackground variant="admin" />
      <SimpleTopBar onNavigate={triggerHaptic} closeHref="/" closeLabel="홈으로 돌아가기" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          
          <div className="mb-5">
            <p className="site-label text-red-400">Admin</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-white md:text-3xl">관리자 도구</h1>
            <p className="mt-2 text-xs font-medium text-zinc-500">유저, 신고, 상담, 경매 상태를 한 화면에서 관리합니다.</p>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: "USERS", label: "유저 관리" },
              { id: "REPORTS", label: "신고 관리" },
              { id: "SUPPORT", label: "상담 지원" },
              { id: "AUCTIONS", label: "경매 감시" }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => handleTabChange(tab.id as any)} 
                className={`shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold transition-all ${activeTab === tab.id ? "border-red-500/60 bg-red-500/15 text-red-100" : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/10 hover:text-zinc-300"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="site-card overflow-hidden rounded-[28px] min-h-[560px]">
            <AnimatePresence mode="wait">
              {activeTab === "USERS" && (
                <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-extrabold tracking-[-0.02em] text-zinc-100">
                        유저 데이터베이스
                      </h2>
                      <p className="mt-1 text-[10px] font-semibold text-zinc-600">
                        {users.length.toLocaleString()} / {userPagination.total.toLocaleString()}명 로드
                      </p>
                    </div>
                    <input 
                      type="text" placeholder="UID, ID, Alias 검색..." 
                      className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-medium text-zinc-300 outline-none transition-all placeholder:text-zinc-700 focus:border-red-500/50 sm:w-72" 
                      value={userSearch} onChange={(e) => setUserSearch(e.target.value)} 
                    />
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[760px] border-separate border-spacing-y-1 text-left">
                      <thead>
                        <tr className="text-[10px] font-semibold text-zinc-600">
                          <th className="px-3 py-2">UID</th>
                          <th className="px-3 py-2">계정</th>
                          <th className="px-3 py-2">닉네임</th>
                          <th className="px-3 py-2">권한/인증</th>
                          <th className="px-3 py-2 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className={`group bg-white/[0.015] transition-colors hover:bg-white/[0.035] ${u.isBanned ? "opacity-45 grayscale" : ""}`}>
                            <td className="rounded-l-xl px-3 py-2.5 font-mono text-[11px] text-zinc-700">#{u.id}</td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-blue-300/80">
                                {u.loginId}
                                {u.isBanned && <span className="ml-2 text-[9px] font-semibold text-red-400">차단됨</span>}
                                {u.strictBanActive && <span className="ml-2 text-[9px] font-semibold text-orange-400">IP강력밴</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-semibold text-zinc-300">{u.ingameName}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select 
                                  value={u.role} 
                                  onChange={(e) => changeUserRole(u.id, e.target.value)}
                                  className={`rounded-lg border border-white/5 bg-zinc-900 px-2 py-1 text-[10px] font-semibold uppercase outline-none transition-all focus:border-red-500/50 ${u.role === 'ADMIN' ? 'text-red-400' : u.role === 'WRITER' ? 'text-blue-400' : 'text-zinc-500'}`}
                                >
                                  <option value="USER">User</option>
                                  <option value="WRITER">Writer</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                                <span className={`rounded-md border px-2 py-1 text-[9px] font-semibold ${u.discordLinked ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200" : "border-white/5 bg-white/[0.025] text-zinc-600"}`}>
                                  {u.discordLinked ? "Discord" : "미연동"}
                                </span>
                              </div>
                            </td>
                            <td className="rounded-r-xl px-3 py-2.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => anonymizeUser(u.id, u.ingameName)}
                                  className="site-btn site-btn-secondary site-btn-compact"
                                >
                                  익명화
                                </button>
                                <button 
                                  onClick={() => toggleUserBan(u.id, u.isBanned)} 
                                  className={`site-btn site-btn-compact ${
                                    u.isBanned 
                                    ? "border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white" 
                                    : "site-btn-danger"
                                  }`}
                                >
                                  {u.isBanned ? "차단 해제" : "차단"}
                                </button>
                                <button
                                  onClick={() => toggleStrictBan(u.id, !u.strictBanActive, u.ingameName)}
                                  className={`site-btn site-btn-compact ${
                                    u.strictBanActive
                                      ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                                      : "site-btn-secondary"
                                  }`}
                                >
                                  {u.strictBanActive ? "강력밴 해제" : "강력밴"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {userPagination.hasMore && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => fetchUsers(userPagination.page + 1, true)}
                        disabled={isLoadingUsers}
                        className="site-btn site-btn-secondary"
                      >
                        {isLoadingUsers ? "불러오는 중..." : "유저 더 보기"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "REPORTS" && (
                <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold tracking-[-0.02em] text-zinc-100">
                        신고 관리
                      </h2>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-zinc-500">
                        거래 채팅 신고는 자동 유찰 처리됩니다. 내용 확인 후 유저 관리에서 제재하세요.
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-zinc-600">
                        {reports.length.toLocaleString()} / {reportPagination.total.toLocaleString()}건 로드
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {reports.map((r) => (
                      <div key={r.id} className={`flex flex-col gap-3 rounded-2xl border bg-white/[0.015] p-4 transition-all ${r.isResolved ? "opacity-40 border-white/5" : "border-red-500/20 hover:bg-white/[0.035]"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-[10px] font-semibold text-red-200">Case #{r.id}</span>
                          <div className="flex flex-wrap justify-end gap-2">
                            {!r.isResolved ? (
                              <>
                                {r.target?.id != null && (
                                  <button
                                    type="button"
                                    onClick={() => banReportTarget(r.target.id!, r.target.ingameName)}
                                    className="site-btn site-btn-danger site-btn-compact"
                                  >
                                    대상 차단
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => resolveReport(r.id)}
                                  className="site-btn site-btn-primary site-btn-compact"
                                >
                                  확인 완료
                                </button>
                              </>
                            ) : (
                              <button onClick={() => deleteResolvedReport(r.id)} className="site-btn site-btn-danger site-btn-compact">기록 삭제</button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_280px]">
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold text-zinc-600">신고 사유</p>
                            <p className="rounded-xl bg-black/20 p-3 text-xs font-medium leading-relaxed text-zinc-300">{r.reason}</p>
                            {r.auction && (
                              <p className="mt-2 text-[11px] font-medium text-amber-200/90">
                                연결 경매 #{r.auction.id} · {r.auction.item?.name} · 유찰 처리됨
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold text-zinc-600">신고자 / 대상</p>
                            <p className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-3 text-xs font-medium text-zinc-400">
                              {r.reporter?.ingameName} → {r.target?.ingameName}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {reportPagination.hasMore && (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => fetchReports(reportPagination.page + 1, true)}
                        disabled={isLoadingReports}
                        className="site-btn site-btn-secondary"
                      >
                        {isLoadingReports ? "불러오는 중..." : "신고 더 보기"}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "SUPPORT" && (
                <motion.div key="support" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[560px]">
                  <div className="w-[300px] overflow-y-auto border-r border-white/5 bg-black/20 custom-scrollbar">
                    <div className="border-b border-white/5 p-4"><h2 className="text-sm font-extrabold tracking-[-0.02em] text-zinc-100">상담 지원</h2></div>
                    {supportRooms.map((room) => (
                      <div key={room.id} onClick={() => { triggerHaptic(); setSelectedSupportRoom(room); setSupportMessages(room.messages || []); }} className={`group flex cursor-pointer items-center justify-between border-b border-white/5 p-4 transition-all ${selectedSupportRoom?.id === room.id ? "border-l-2 border-l-red-500 bg-red-500/10" : "hover:bg-white/[0.02]"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-xs font-semibold text-zinc-200">{room.buyer?.ingameName}</div>
                          <p className="mt-1 truncate text-[10px] font-medium text-zinc-600">상담 문의</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteResolvedSupport(room.id); }} className="site-btn site-btn-ghost site-btn-compact opacity-0 group-hover:opacity-100">삭제</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col bg-black/40">
                    {selectedSupportRoom ? (
                      <>
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4">
                          <span className="flex items-center gap-2 text-xs font-semibold text-red-300">
                             <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> {selectedSupportRoom.buyer?.ingameName}
                          </span>
                        </div>
                        <div className="flex-1 space-y-3 overflow-y-auto p-5 custom-scrollbar">
                          {supportMessages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.senderId === adminId ? "items-end" : "items-start"}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium ${msg.senderId === adminId ? "rounded-tr-none bg-red-600 text-white" : "rounded-tl-none border border-white/5 bg-zinc-800 text-zinc-200"}`}>{msg.content}</div>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={sendSupportMessage} className="flex gap-3 border-t border-white/5 bg-[#0a0a0b] p-4">
                          <input 
                            value={supportInput} onChange={(e) => setSupportInput(e.target.value)} 
                            placeholder="명령어 또는 응답 입력..." 
                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-200 outline-none transition-all placeholder:text-zinc-700 focus:border-red-500/40" 
                          />
                          <button className="site-btn site-btn-secondary site-btn-compact px-5">전송</button>
                        </form>
                      </>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-700">
                        <p className="text-sm font-semibold">상담방을 선택해주세요</p>
                        <p className="text-xs font-medium">좌측 목록에서 문의를 선택하면 대화가 표시됩니다.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "AUCTIONS" && (
                <motion.div key="auctions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-5">
                  <h2 className="mb-4 text-sm font-extrabold tracking-[-0.02em] text-zinc-100">
                    경매 감시
                  </h2>
                  <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                    {auctions.map((a) => (
                      <div key={a.id} className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.015] p-3 transition-all hover:bg-white/[0.035]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 p-2">
                           {/* 🛠️ [이미지 경로 패치 적용] */}
                           <img src={getSecureUrl(a.item.iconUrl)} className="w-full h-full object-contain pixel-art group-hover:scale-110 transition-transform" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate text-xs font-semibold text-zinc-100">{a.item.name}</h3>
                          <p className="mt-1 font-mono text-sm font-semibold text-yellow-400">{Number(a.currentPrice).toLocaleString()} <span className="ml-1 text-[10px] text-zinc-600">Gold</span></p>
                        </div>
                        <button onClick={() => cancelAuction(a.id)} className="site-btn site-btn-danger site-btn-compact">중단</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <SiteFooter />
    </div>
  );
}