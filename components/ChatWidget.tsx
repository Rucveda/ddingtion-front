"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api";
import ReviewModal from "./ReviewModal";

export default function ChatWidget() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingReviewData, setPendingReviewData] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  const fetchRooms = async () => {
    // 💡 403 에러 방지: 토큰이 없으면 요청하지 않음
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const data = await request("/api/chat/rooms");
      if (data && Array.isArray(data)) {
        setRooms(data.filter((r: any) => r.status === "ACTIVE"));
      } else {
        setRooms([]);
      }
    } catch (error) { 
      console.error("목록 로드 실패:", error); 
      setRooms([]);
    }
  };

  const fetchMessages = async (roomId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const data = await request(`/api/chat/rooms/${roomId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) { 
      setMessages([]); 
    }
  };

  const startAdminChat = async () => {
    triggerHaptic();
    try {
      const result = await request("/api/chat/rooms/admin", { method: "POST" });
      if (result && result.id) {
        setSelectedRoom(result);
        fetchRooms();
      }
    } catch (err) { alert("관리자 연결 실패"); }
  };

  const closeTrade = async () => {
    if (!selectedRoom || !confirm("거래를 종료하시겠습니까? 종료 후 상대방 평가가 진행됩니다.")) return;
    try {
      const res = await request(`/api/chat/rooms/${selectedRoom.id}/close`, { method: "PATCH" });
      if (res) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const isSeller = selectedRoom.sellerId === currentUser.id;

        setPendingReviewData({
          auctionId: selectedRoom.auctionId,
          revieweeId: isSeller ? selectedRoom.buyerId : selectedRoom.sellerId,
          revieweeName: isSeller ? selectedRoom.buyer?.ingameName : selectedRoom.seller?.ingameName
        });

        setSelectedRoom(null);
        setIsOpen(false);
        fetchRooms();
        setShowReviewModal(true);
      }
    } catch (e) { alert("오류 발생"); }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return alert("사유 입력 필수");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const targetId = selectedRoom.sellerId === user.id ? selectedRoom.buyerId : selectedRoom.sellerId;
    try {
      const result = await request(`/api/chat/rooms/${selectedRoom.id}/report`, {
        method: "POST",
        body: JSON.stringify({ targetId, reason: reportReason })
      });
      if (result) {
        alert("접수 완료");
        setShowReport(false);
        setReportReason("");
      }
    } catch (e) { alert("실패"); }
  };

  useEffect(() => {
    if (!isMounted) return;
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userStr || !token) return;

    const newSocket = io("http://localhost:8080");
    setSocket(newSocket);
    fetchRooms();

    newSocket.on("refresh_chat_rooms", () => { fetchRooms(); });
    newSocket.on("new_message", (msg) => {
      setMessages((prev) => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      fetchRooms();
    });

    const checkAutoOpen = async () => {
      const autoOpenId = localStorage.getItem("openChatId");
      if (autoOpenId) {
        localStorage.removeItem("openChatId");
        setIsOpen(true);
        const data = await request("/api/chat/rooms");
        if (data && Array.isArray(data)) {
          const activeRooms = data.filter((r: any) => r.status === "ACTIVE");
          setRooms(activeRooms);
          const target = activeRooms.find(r => r.id === Number(autoOpenId));
          if (target) setSelectedRoom(target);
        }
      }
    };
    checkAutoOpen();
    window.addEventListener("storage", checkAutoOpen);
    return () => { 
      newSocket.close(); 
      window.removeEventListener("storage", checkAutoOpen);
    };
  }, [isMounted]);

  useEffect(() => {
    if (selectedRoom?.id && socket) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      socket.emit("join_room", { roomId: selectedRoom.id, userId: user.id });
      fetchMessages(selectedRoom.id);
    }
  }, [selectedRoom, socket]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedRoom?.id || !socket) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    socket.emit("send_message", { roomId: Number(selectedRoom.id), senderId: Number(user.id), content: input });
    setInput("");
  };

  if (!isMounted) return null;
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.id) return null;

  // 💡 데이터 안정성 확보: rooms가 배열이 아닐 경우를 대비
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const totalUnread = safeRooms.reduce((acc, room) => acc + (room._count?.messages || 0), 0);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans select-none flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="w-[360px] h-[600px] bg-black/95 border border-white/10 rounded-[32px] shadow-2xl mb-4 backdrop-blur-3xl overflow-hidden flex flex-col"
          >
            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              {selectedRoom ? (
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedRoom(null)} className="text-[11px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-none">← 뒤로</button>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Connected</span>
                    <span className="text-[13px] font-bold text-zinc-200">
                      {selectedRoom.isAdminChat ? "고객지원팀" : (selectedRoom.sellerId === user.id ? selectedRoom.buyer?.ingameName : selectedRoom.seller?.ingameName)}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] block mb-1 font-mono">Chat Log</span>
                  <h3 className="text-[13px] font-bold text-zinc-200">채팅 목록</h3>
                </div>
              )}
              {selectedRoom && !selectedRoom.isAdminChat && (
                <div className="flex gap-4 items-center">
                  <button onClick={() => setShowReport(true)} className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase transition-colors">신고</button>
                  <button onClick={closeTrade} className="text-[9px] font-black text-zinc-500 hover:text-white uppercase transition-colors">종료</button>
                </div>
              )}
              {!selectedRoom && <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-zinc-500 hover:text-white transition-colors">✕</button>}
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {!selectedRoom ? (
                <div className="space-y-4">
                  <div onClick={startAdminChat} className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl cursor-pointer hover:bg-blue-500/20 transition-all group shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600/30 rounded-xl flex items-center justify-center text-2xl border border-blue-600/40">🛡️</div>
                      <div>
                        <p className="text-[14px] font-black text-blue-400 uppercase tracking-tight">관리자 1:1 상담</p>
                        <p className="text-[11px] text-zinc-500 font-bold">운영 정책 및 거래 이슈 문의</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 opacity-20 py-2">
                    <div className="h-[1px] flex-1 bg-white/30" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">활성화 채널</span>
                    <div className="h-[1px] flex-1 bg-white/30" />
                  </div>

                  {safeRooms.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                      <p className="text-[11px] text-zinc-500 font-black uppercase tracking-[0.4em]">거래 신호 없음</p>
                    </div>
                  ) : (
                    safeRooms.map(room => (
                      <div key={room.id} onClick={() => setSelectedRoom(room)} className="p-5 bg-white/[0.04] border border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.08] transition-all flex items-center gap-5 relative overflow-hidden group">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-[11px] font-black text-zinc-500 border border-white/10 shrink-0">
                          {room.sellerId === user.id ? "판매" : "구매"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[14px] text-zinc-200 truncate leading-none">
                              {room.sellerId === user.id ? room.buyer?.ingameName : room.seller?.ingameName}
                            </span>
                            <span className="text-[9px] text-blue-500 font-mono font-black uppercase">Active</span>
                          </div>
                          <p className="text-[12px] text-zinc-500 truncate">{room.messages?.[0]?.content || "데이터 동기화됨"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.senderId === user.id ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] px-5 py-3.5 rounded-[22px] text-[13px] font-bold leading-relaxed ${
                        msg.senderId === user.id 
                          ? "bg-blue-600 text-white rounded-tr-none shadow-[0_5px_15px_rgba(37,99,235,0.3)]" 
                          : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5 shadow-lg"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-zinc-700 font-black mt-2 px-1 uppercase tracking-tighter">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              )}
            </div>

            {selectedRoom && (
              <form onSubmit={sendMessage} className="p-5 bg-black/40 border-t border-white/5 flex gap-3 items-center">
                <input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder="메시지 전송..." 
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4 text-[13px] font-bold outline-none focus:border-blue-500/50 transition-all text-zinc-200 placeholder:text-zinc-800" 
                />
                <button className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                </button>
              </form>
            )}

            <AnimatePresence>
              {showReport && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/98 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-red-600/10 rounded-2xl flex items-center justify-center border border-red-600/20 mb-6 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter mb-1 text-red-500">보안 신고</h3>
                  <p className="text-[9px] text-zinc-600 mb-8 font-black uppercase tracking-[0.3em]">운영 정책 위반 사항 접수</p>
                  <textarea 
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-4 text-[13px] text-white outline-none focus:border-red-500/50 mb-6 resize-none h-32 font-bold" 
                    placeholder="사유를 입력하세요..." 
                    value={reportReason} 
                    onChange={e => setReportReason(e.target.value)} 
                  />
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setShowReport(false)} className="flex-1 py-4 rounded-xl bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500">취소</button>
                    <button onClick={handleReport} className="flex-1 py-4 rounded-xl bg-red-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20">전송</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {pendingReviewData && (
        <ReviewModal 
          isOpen={showReviewModal}
          auctionId={pendingReviewData.auctionId}
          revieweeId={pendingReviewData.revieweeId}
          revieweeName={pendingReviewData.revieweeName}
          onClose={() => {
            setShowReviewModal(false);
            setPendingReviewData(null);
          }}
        />
      )}

      <button 
        onClick={() => { triggerHaptic(); setIsOpen(!isOpen); }} 
        className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center relative hover:scale-110 active:scale-95 transition-all shadow-xl group backdrop-blur-md"
      >
        <div className={`relative flex items-center justify-center transition-all ${isOpen ? 'rotate-90 scale-90' : 'opacity-40 group-hover:opacity-100'}`}>
           <div className={`w-6 h-6 border-2 rounded-sm rotate-45 flex items-center justify-center transition-all ${totalUnread > 0 && !isOpen ? 'border-blue-600 animate-pulse' : 'border-zinc-500'}`}>
              {isOpen ? (
                <span className="text-[10px] -rotate-45 font-black text-white">✕</span>
              ) : (
                <div className="-rotate-45 mb-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={totalUnread > 0 ? "#3b82f6" : "#71717a"} xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
                  </svg>
                </div>
              )}
           </div>
        </div>
        
        {totalUnread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 text-[9px] font-black text-white rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-lg animate-bounce">
            {totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}