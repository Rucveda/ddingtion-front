"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { request } from "@/utils/api";
import ReviewModal from "./ReviewModal";
import { SOCKET_URL } from "@/utils/runtimeConfig";
import { isLocalDev } from "@/utils/devMode";
import { ensureLocalDummySession } from "@/utils/localDummyData";

// 동일 탭 이벤트 수신을 위한 키 (AuctionDetail과 동일해야 함)
const CHAT_OPEN_EVENT = "ddingtion_chat_open";
const TRADE_UPDATED_EVENT = "ddingtion_trade_updated";

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

  // 💡 버그 패치: 소켓 이벤트 수신 시 현재 열려있는 방을 정확히 판별하기 위한 Ref
  const selectedRoomRef = useRef<any>(null);
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingReviewData, setPendingReviewData] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const roomsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // 선택된 방이 바뀔 때마다 Ref 업데이트
  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(10);
    }
  }, []);

  // 채팅방 목록 불러오기
  const fetchRooms = useCallback(async () => {
    if (isLocalDev()) ensureLocalDummySession();
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
  }, []);

  const scheduleFetchRooms = useCallback(() => {
    if (roomsRefreshTimerRef.current) clearTimeout(roomsRefreshTimerRef.current);
    roomsRefreshTimerRef.current = setTimeout(() => {
      roomsRefreshTimerRef.current = null;
      void fetchRooms();
      window.dispatchEvent(new Event(TRADE_UPDATED_EVENT));
    }, 400);
  }, [fetchRooms]);

  const applyRoomUpdate = useCallback((room: any) => {
    if (!room?.id) return;
    setRooms((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      if (room.status !== "ACTIVE") {
        return list.filter((entry) => entry.id !== room.id);
      }
      const index = list.findIndex((entry) => entry.id === room.id);
      if (index === -1) return [...list, room];
      const next = [...list];
      next[index] = { ...list[index], ...room };
      return next;
    });
    if (selectedRoomRef.current?.id === room.id) {
      if (room.status !== "ACTIVE") {
        setSelectedRoom(null);
      } else {
        setSelectedRoom((prev: any) => (prev ? { ...prev, ...room } : room));
      }
    }
    window.dispatchEvent(new Event(TRADE_UPDATED_EVENT));
  }, []);

  const fetchMessages = async (roomId: number) => {
    if (isLocalDev()) ensureLocalDummySession();
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const data = await request(`/api/chat/rooms/${roomId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) { 
      setMessages([]); 
    }
  };

  // 💡 자동 열기 로직 (핵심 수정 부분)
  const checkAutoOpen = useCallback(async () => {
    const autoOpenId = localStorage.getItem("openChatId");
    if (autoOpenId) {
      // 신호를 받았으므로 ID 삭제 후 창 열기
      localStorage.removeItem("openChatId");
      setIsOpen(true);
      if (isLocalDev()) ensureLocalDummySession();
      
      try {
        const data = await request("/api/chat/rooms");
        if (data && Array.isArray(data)) {
          const activeRooms = data.filter((r: any) => r.status === "ACTIVE");
          setRooms(activeRooms);
          const target = activeRooms.find(r => r.id === Number(autoOpenId));
          if (target) setSelectedRoom(target);
        }
      } catch (err) {
        console.error("자동 채팅 열기 실패:", err);
      }
    }
  }, []);

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

  // 거래 확정: 양측이 모두 확인하면 거래가 완료되고 리뷰 단계로 넘어갑니다.
  const closeTrade = async () => {
    if (!selectedRoom || !confirm("거래를 확정하시겠습니까? 양측이 모두 확정하면 거래가 완료됩니다.")) return;
    try {
      const res = await request(`/api/chat/rooms/${selectedRoom.id}/close`, { method: "PATCH" });
      
      if (res) {
        if (!res.completed) {
          if (res.room) applyRoomUpdate(res.room);
          else void fetchRooms();
          alert(res.message || "거래 확정이 기록되었습니다. 상대방의 확정을 기다려주세요.");
          return;
        }

        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const isSeller = selectedRoom.sellerId === currentUser.id;

        setPendingReviewData({
          auctionId: selectedRoom.auctionId,
          revieweeId: isSeller ? selectedRoom.buyerId : selectedRoom.sellerId,
          revieweeName: isSeller ? selectedRoom.buyer?.ingameName : selectedRoom.seller?.ingameName
        });

        if (res.room) applyRoomUpdate(res.room);
        else {
          setSelectedRoom(null);
          void fetchRooms();
        }
        setIsOpen(false);
        setShowReviewModal(true);
      }
    } catch (e) { 
      alert("거래 확정 처리 중 오류가 발생했습니다."); 
    }
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
    if (isLocalDev()) ensureLocalDummySession();
    const userStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userStr || !token) return;

    if (isLocalDev()) {
      fetchRooms();
      checkAutoOpen();
      window.addEventListener("storage", checkAutoOpen);
      window.addEventListener(CHAT_OPEN_EVENT, checkAutoOpen);
      return () => {
        window.removeEventListener("storage", checkAutoOpen);
        window.removeEventListener(CHAT_OPEN_EVENT, checkAutoOpen);
      };
    }

    // 💡 유지보수 패치: 하드코딩된 서버 주소 제거
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    const parsedUser = JSON.parse(userStr);
    if (parsedUser?.id) {
      newSocket.emit("setup_notifications", parsedUser.id);
    }
    void fetchRooms();

    newSocket.on("refresh_chat_rooms", scheduleFetchRooms);
    newSocket.on("room_updated", (payload: { room?: any }) => {
      if (payload?.room) applyRoomUpdate(payload.room);
      else scheduleFetchRooms();
    });
    newSocket.on("new_message", (msg) => {
      // 💡 버그 패치: 도착한 메시지가 현재 내가 보고 있는 채팅방의 메시지일 때만 화면에 추가
      if (selectedRoomRef.current?.id === msg.roomId) {
        setMessages((prev) => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
        
        // 💡 UX 패치: 채팅방을 켜둔 상태에서 새 메시지를 받으면 서버에 즉시 읽음 처리를 요청하여 빨간 뱃지 끄기
        const token = localStorage.getItem("token");
        if (token) newSocket.emit("join_room", { roomId: msg.roomId, token });
      }
      scheduleFetchRooms();
    });

    // 초기 로드 시 자동 열기 확인
    checkAutoOpen();

    // 💡 이벤트 리스너 등록
    window.addEventListener("storage", checkAutoOpen); // 타 탭 대응
    window.addEventListener(CHAT_OPEN_EVENT, checkAutoOpen); // 현재 탭 대응
    
    return () => { 
      if (roomsRefreshTimerRef.current) clearTimeout(roomsRefreshTimerRef.current);
      newSocket.close(); 
      window.removeEventListener("storage", checkAutoOpen);
      window.removeEventListener(CHAT_OPEN_EVENT, checkAutoOpen);
    };
  }, [isMounted, checkAutoOpen, fetchRooms, scheduleFetchRooms, applyRoomUpdate]);

  useEffect(() => {
    if (isLocalDev() && selectedRoom?.id) {
      fetchMessages(selectedRoom.id);
      return;
    }
    if (selectedRoom?.id && socket) {
      // 💡 보안 패치: userId 대신 검증 불가능한 토큰을 전송
      const token = localStorage.getItem("token");
      socket.emit("join_room", { roomId: selectedRoom.id, token });
      fetchMessages(selectedRoom.id);
    }
  }, [selectedRoom, socket]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedRoom?.id) return;
    if (isLocalDev()) {
      const currentUser = ensureLocalDummySession();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          roomId: selectedRoom.id,
          senderId: currentUser.id,
          content: input,
          createdAt: new Date().toISOString(),
          sender: { id: currentUser.id, ingameName: currentUser.ingameName },
        },
      ]);
      setInput("");
      return;
    }
    if (!socket) return;
    // 💡 보안 패치: userId 변조 공격 차단을 위해 토큰 전송
    const token = localStorage.getItem("token");
    socket.emit("send_message", { roomId: Number(selectedRoom.id), token, content: input });
    setInput("");
  };

  if (!isMounted) return null;
  const user = isLocalDev() ? ensureLocalDummySession() : JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.id) return null;

  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const totalUnread = safeRooms.reduce((acc, room) => acc + (room._count?.messages || 0), 0);
  const currentUserConfirmed =
    selectedRoom && !selectedRoom.isAdminChat
      ? (selectedRoom.sellerId === user.id ? selectedRoom.sellerConfirmed : selectedRoom.buyerConfirmed)
      : false;
  const partnerConfirmed =
    selectedRoom && !selectedRoom.isAdminChat
      ? (selectedRoom.sellerId === user.id ? selectedRoom.buyerConfirmed : selectedRoom.sellerConfirmed)
      : false;

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
                  <button onClick={() => setSelectedRoom(null)} className="site-btn site-btn-ghost site-btn-compact">← 뒤로</button>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-200">
                      {selectedRoom.isAdminChat ? "고객지원팀" : (selectedRoom.sellerId === user.id ? selectedRoom.buyer?.ingameName : selectedRoom.seller?.ingameName)}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">채팅 목록</h3>
                </div>
              )}
              {selectedRoom && !selectedRoom.isAdminChat && (
                <div className="flex gap-4 items-center">
                  <button onClick={() => setShowReport(true)} className="site-btn site-btn-danger site-btn-compact">신고</button>
                  <button
                    onClick={closeTrade}
                    disabled={Boolean(currentUserConfirmed)}
                    className="site-btn site-btn-secondary site-btn-compact"
                  >
                    {currentUserConfirmed ? "확정 완료" : "거래 확정"}
                  </button>
                </div>
              )}
              {!selectedRoom && <button onClick={() => setIsOpen(false)} className="site-btn site-btn-ghost h-8 w-8 rounded-full p-0">✕</button>}
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {!selectedRoom ? (
                <div className="space-y-4">
                  <div onClick={startAdminChat} className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-2xl cursor-pointer hover:bg-blue-500/20 transition-all group shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-xs font-black text-blue-200 border border-blue-600/30">상담</div>
                      <div>
                        <p className="text-sm font-black text-blue-300 tracking-tight">관리자 1:1 상담</p>
                        <p className="text-xs text-zinc-400 font-bold">운영 정책 및 거래 이슈 문의</p>
                      </div>
                    </div>
                  </div>

                  {safeRooms.length === 0 ? (
                    <div className="text-center py-20">
                      <p className="text-xs text-zinc-500 font-bold">진행 중인 거래 채팅이 없습니다.</p>
                    </div>
                  ) : (
                    safeRooms.map(room => (
                      <div key={room.id} onClick={() => setSelectedRoom(room)} className="p-5 bg-white/[0.04] border border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.08] transition-all flex items-center gap-5 relative overflow-hidden group">
                        <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-[11px] font-black text-zinc-500 border border-white/10 shrink-0">
                          {room.sellerId === user.id ? "판매" : "구매"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-zinc-200 truncate leading-none">
                              {room.sellerId === user.id ? room.buyer?.ingameName : room.seller?.ingameName}
                            </span>
                            <span className="text-[11px] text-blue-400 font-bold">진행 중</span>
                          </div>
                          <p className="text-xs text-zinc-400 truncate">{room.messages?.[0]?.content || "최근 메시지가 없습니다"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {!selectedRoom.isAdminChat && (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">거래 확정 상태</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`rounded-xl px-3 py-2 text-[11px] font-black ${currentUserConfirmed ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.04] text-zinc-500"}`}>
                          내 확인 {currentUserConfirmed ? "완료" : "대기"}
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-[11px] font-black ${partnerConfirmed ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.04] text-zinc-500"}`}>
                          상대 확인 {partnerConfirmed ? "완료" : "대기"}
                        </div>
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.senderId === user.id ? "items-end" : "items-start"}`}>
                      <div className={`max-w-[85%] px-5 py-3.5 rounded-[22px] text-[13px] font-bold leading-relaxed ${
                        msg.senderId === user.id 
                        ? "bg-blue-600 text-white rounded-tr-none shadow-[0_5px_15px_rgba(37,99,235,0.3)]" 
                        : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-white/5 shadow-lg"
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[11px] text-zinc-500 font-bold mt-2 px-1">{new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
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
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500/50 transition-all text-zinc-200 placeholder:text-zinc-500" 
                />
                <button className="site-btn site-btn-primary h-12 w-12 p-0">
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
                    <button onClick={() => setShowReport(false)} className="site-btn site-btn-secondary flex-1 py-4">취소</button>
                    <button onClick={handleReport} className="site-btn site-btn-danger flex-1 py-4">전송</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 평점 모달 연동 */}
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
        className="site-btn site-btn-secondary relative h-14 w-14 rounded-full p-0 shadow-xl group"
      >
        <div className={`relative flex items-center justify-center transition-all ${isOpen ? 'scale-90' : 'opacity-50 group-hover:opacity-100'} ${totalUnread > 0 && !isOpen ? 'animate-pulse' : ''}`}>
          {isOpen ? (
            <span className="text-sm font-black text-white">✕</span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill={totalUnread > 0 ? "#3b82f6" : "#71717a"} xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/>
            </svg>
          )}
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