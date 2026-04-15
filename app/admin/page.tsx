"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/utils/api"; 
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

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
  reputationScore: number;
  successfulTrades: number;
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
  reporter: { ingameName: string };
  target: { ingameName: string };
  room: { id: number };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<"USERS" | "REPORTS" | "SUPPORT" | "AUCTIONS">("USERS");
  
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [supportRooms, setSupportRooms] = useState<ChatRoom[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);

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

  const fetchUsers = useCallback(async () => {
    const data = await request("/api/admin/users");
    setUsers(Array.isArray(data) ? data : []);
  }, []);

  const changeUserRole = async (id: number, newRole: string) => {
    triggerHaptic();
    const data = await request(`/api/admin/users/${id}/role`, { 
      method: "PATCH", 
      body: JSON.stringify({ role: newRole }) 
    });
    if (data) fetchUsers();
  };

  const toggleUserBan = async (id: number, currentBanStatus: boolean) => {
    triggerHaptic();
    const action = currentBanStatus ? "해제" : "차단";
    if (!confirm(`해당 사용자를 ${action}하시겠습니까?`)) return;

    const data = await request(`/api/admin/users/${id}/ban`, { 
      method: "PATCH", 
      body: JSON.stringify({ isBanned: !currentBanStatus }) 
    });
    if (data) fetchUsers();
  };

  const fetchSupportRooms = useCallback(async () => {
    const data = await request("/api/admin/support/rooms");
    setSupportRooms(Array.isArray(data) ? data : []);
  }, []);

  const fetchAuctions = useCallback(async () => {
    const data = await request("/api/auctions");
    setAuctions(Array.isArray(data) ? data : []);
  }, []);

  const fetchReports = useCallback(async () => {
    const data = await request("/api/admin/reports");
    setReports(Array.isArray(data) ? data : []);
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
    const userStr = localStorage.getItem("user");
    if (!userStr) { router.push("/login"); return; }
    const user = JSON.parse(userStr);
    if (user.role?.toUpperCase() !== "ADMIN") {
      router.push("/");
      return;
    }
    setIsAdmin(true);
    setAdminId(user.id);

    /**
     * 🛠️ [소켓 주소 패치]
     * 하드코딩된 주소 대신 환경 변수를 사용합니다. 
     * 환경변수가 없으면 기존 Render 주소를 폴백으로 사용합니다.
     */
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://ddingtion-back.onrender.com";
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);
    
    newSocket.on("new_message", (msg) => {
      setSupportMessages((prev) => (prev.length > 0 && prev[0].roomId === msg.roomId ? [...prev, msg] : prev));
      fetchSupportRooms();
    });

    handleTabChange(activeTab);
    return () => { newSocket.close(); };
  }, [router]);

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
    if (!supportInput.trim() || !selectedSupportRoom || !socket) return;
    socket.emit("send_message", { roomId: selectedSupportRoom.id, senderId: adminId, content: supportInput });
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

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.ingameName.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.loginId.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toString() === userSearch
    );
  }, [users, userSearch]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#010101] text-zinc-100 font-sans select-none relative overflow-x-hidden">
      <style jsx global>{`
        .premium-abyss-bg {
          position: fixed; inset: -15%; z-index: 0;
          background: radial-gradient(circle at 10% 20%, rgba(239, 68, 68, 0.12) 0%, transparent 40%),
                      radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
                      radial-gradient(circle at 50% 50%, rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%);
          filter: blur(100px); pointer-events: none;
        }
        .bg-texture {
          position: fixed; inset: 0; z-index: 1; opacity: 0.3; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.08' d='M1 3h1v1H1V3zm2-2h1v1H2V1z'%3E%3C/path%3E%3C/svg%3E");
        }
        .pixel-art { image-rendering: pixelated; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}</style>

      <div className="premium-abyss-bg" />
      <div className="bg-texture" />

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-[1800px] mx-auto px-10 h-20 flex justify-between items-center relative z-10">
          <Link href="/" onClick={triggerHaptic} className="flex items-center gap-1 group">
            <span className="text-3xl font-black tracking-tighter transition-transform group-hover:scale-105">
              <span className="text-[#3b82f6]">D</span><span className="text-[#eab308]">D</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">N</span>
              <span className="text-[#eab308]">G</span><span className="text-[#ef4444]">T</span>
              <span className="text-[#3b82f6]">I</span><span className="text-[#22c55e]">O</span>
              <span className="text-[#ef4444]">N</span>
            </span>
          </Link>

          <div className="flex gap-4 items-center">
             <Link href="/market/AdminTab" onClick={triggerHaptic} className="text-[10px] font-black text-blue-400 border border-blue-500/20 px-5 py-2 rounded-xl hover:bg-blue-500/10 transition-all uppercase tracking-widest">
                Market Engine
             </Link>
             <Link href="/" onClick={triggerHaptic} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border border-white/5 transition-all">
                ✕
             </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-16 relative z-10">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          
          <div className="mb-12">
            <h1 className="text-5xl font-black tracking-tighter text-red-500 italic uppercase leading-none">ADMIN TOOL</h1>
            <p className="text-zinc-600 font-bold mt-3 uppercase tracking-[0.4em] text-[10px]">user support & management</p>
          </div>

          <div className="flex gap-2 mb-10 overflow-x-auto pb-4 custom-scrollbar">
            {[
              { id: "USERS", label: "유저 관리", icon: "👥" },
              { id: "REPORTS", label: "신고 관리", icon: "🚨" },
              { id: "SUPPORT", label: "상담 지원", icon: "🎧" },
              { id: "AUCTIONS", label: "경매 감시", icon: "🔨" }
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => handleTabChange(tab.id as any)} 
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border ${activeTab === tab.id ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20" : "bg-white/[0.02] text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300"}`}
              >
                <span className="text-sm opacity-80">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-[48px] overflow-hidden shadow-2xl min-h-[650px] backdrop-blur-md">
            <AnimatePresence mode="wait">
              {activeTab === "USERS" && (
                <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
                  <div className="flex justify-between items-center mb-10">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                      <div className="w-1 h-3 bg-red-600 rounded-full" /> ID Database
                    </h2>
                    <input 
                      type="text" placeholder="UID, ID, Alias 검색..." 
                      className="bg-black/40 border border-white/10 px-6 py-3 rounded-2xl text-xs font-bold outline-none focus:border-red-500/50 w-80 text-zinc-300 transition-all" 
                      value={userSearch} onChange={(e) => setUserSearch(e.target.value)} 
                    />
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                          <th className="px-6 py-4">UID</th>
                          <th className="px-6 py-4">Identification</th>
                          <th className="px-6 py-4">Ingame Alias</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4 text-right">Access Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className={`bg-white/[0.01] hover:bg-white/[0.03] transition-colors group ${u.isBanned ? "opacity-40 grayscale" : ""}`}>
                            <td className="px-6 py-5 rounded-l-2xl font-mono text-xs text-zinc-700">#{u.id}</td>
                            <td className="px-6 py-5 font-bold text-blue-400/80">
                                {u.loginId}
                                {u.isBanned && <span className="ml-2 text-[9px] text-red-500 font-black uppercase tracking-tighter">[BANNED]</span>}
                            </td>
                            <td className="px-6 py-5 font-black text-zinc-300">{u.ingameName}</td>
                            <td className="px-6 py-5">
                              <select 
                                value={u.role} 
                                onChange={(e) => changeUserRole(u.id, e.target.value)}
                                className={`bg-zinc-900 text-[10px] font-black border border-white/5 rounded-lg px-2 py-1 outline-none focus:border-red-500/50 transition-all uppercase ${u.role === 'ADMIN' ? 'text-red-500' : u.role === 'WRITER' ? 'text-blue-400' : 'text-zinc-500'}`}
                              >
                                <option value="USER">User</option>
                                <option value="WRITER">Writer</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-5 text-right rounded-r-2xl">
                               <button 
                                 onClick={() => toggleUserBan(u.id, u.isBanned)} 
                                 className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all border ${
                                   u.isBanned 
                                   ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white" 
                                   : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                                 }`}
                               >
                                 {u.isBanned ? "Unban" : "Ban Account"}
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === "REPORTS" && (
                <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-3 text-red-500">
                    <div className="w-1 h-3 bg-red-600 rounded-full" /> Reports
                  </h2>
                  <div className="grid grid-cols-1 gap-4">
                    {reports.map((r) => (
                      <div key={r.id} className={`bg-white/[0.01] border p-8 rounded-[32px] flex flex-col gap-6 transition-all ${r.isResolved ? "opacity-30 border-white/5" : "border-red-500/20 hover:bg-white/[0.03]"}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black bg-red-600 text-white px-4 py-1.5 rounded-full uppercase tracking-tighter">Case #{r.id}</span>
                          <div className="flex gap-2">
                            {!r.isResolved ? (
                              <button onClick={() => resolveReport(r.id)} className="bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Close Case</button>
                            ) : (
                              <button onClick={() => deleteResolvedReport(r.id)} className="text-red-500 bg-red-500/5 border border-red-500/20 px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Purge Record</button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div><p className="text-[9px] text-zinc-600 font-black uppercase mb-3 tracking-widest">Reason / Issue</p><p className="bg-black/20 p-5 rounded-2xl text-sm text-zinc-300 font-medium leading-relaxed">{r.reason}</p></div>
                          <div><p className="text-[9px] text-zinc-600 font-black uppercase mb-3 tracking-widest">Reporter / Target</p><p className="p-5 border-l-2 border-red-500/30 italic text-sm text-zinc-500 bg-red-500/[0.02] rounded-r-2xl">From: {r.reporter?.ingameName} → To: {r.target?.ingameName}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "SUPPORT" && (
                <motion.div key="support" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-[650px]">
                  <div className="w-[350px] border-r border-white/5 overflow-y-auto bg-black/20 custom-scrollbar">
                    <div className="p-8 border-b border-white/5"><h2 className="text-lg font-black uppercase italic tracking-tighter">User Support</h2></div>
                    {supportRooms.map((room) => (
                      <div key={room.id} onClick={() => { triggerHaptic(); setSelectedSupportRoom(room); }} className={`p-8 border-b border-white/5 cursor-pointer transition-all flex justify-between items-center group ${selectedSupportRoom?.id === room.id ? "bg-red-600/10 border-l-4 border-l-red-600" : "hover:bg-white/[0.02]"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-xs text-zinc-200 uppercase tracking-tighter">{room.buyer?.ingameName}</div>
                          <p className="text-[10px] text-zinc-600 truncate mt-1 font-bold">In-App Inquiry System</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteResolvedSupport(room.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-700 hover:text-red-500 transition-all">🗑️</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col bg-black/40">
                    {selectedSupportRoom ? (
                      <>
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                          <span className="font-black text-red-500 text-[10px] tracking-widest uppercase flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Established Connection: {selectedSupportRoom.buyer?.ingameName}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                          {supportMessages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.senderId === adminId ? "items-end" : "items-start"}`}>
                              <div className={`px-6 py-3.5 rounded-[24px] text-xs font-bold max-w-[80%] ${msg.senderId === adminId ? "bg-red-600 text-white rounded-tr-none shadow-lg shadow-red-900/10" : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5"}`}>{msg.content}</div>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={sendSupportMessage} className="p-8 bg-[#0a0a0b] border-t border-white/5 flex gap-4">
                          <input 
                            value={supportInput} onChange={(e) => setSupportInput(e.target.value)} 
                            placeholder="명령어 또는 응답 입력..." 
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-xs text-zinc-200 outline-none focus:border-red-500/40 transition-all font-bold" 
                          />
                          <button className="bg-white text-black hover:bg-red-600 hover:text-white px-10 rounded-2xl text-[10px] font-black uppercase transition-all">Transmit</button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center opacity-10 gap-4">
                        <div className="w-12 h-12 border-2 border-zinc-500 rotate-45 flex items-center justify-center">
                          <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-[0.5em]">System Idle</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "AUCTIONS" && (
                <motion.div key="auctions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-3 text-yellow-500">
                    <div className="w-1 h-3 bg-yellow-500 rounded-full" /> list control
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {auctions.map((a) => (
                      <div key={a.id} className="bg-white/[0.01] border border-white/5 p-6 rounded-[32px] flex items-center gap-6 group hover:bg-white/[0.03] transition-all">
                        <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center p-3 border border-white/5 shrink-0 overflow-hidden">
                           {/* 🛠️ [이미지 경로 패치 적용] */}
                           <img src={getSecureUrl(a.item.iconUrl)} className="w-full h-full object-contain pixel-art group-hover:scale-110 transition-transform" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-sm truncate text-zinc-100 uppercase italic tracking-tighter">{a.item.name}</h3>
                          <p className="text-yellow-500 font-mono text-lg font-black mt-1">{Number(a.currentPrice).toLocaleString()} <span className="text-[10px] text-zinc-600 ml-1 uppercase">Gold</span></p>
                        </div>
                        <button onClick={() => cancelAuction(a.id)} className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-3 rounded-xl text-[9px] font-black uppercase transition-all">Terminate</button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <footer className="mt-20 border-t border-white/5 py-12 opacity-30 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em]">DDINGTION PROTOCOL // ROOT ACCESS GRANTED</p>
      </footer>
    </div>
  );
}