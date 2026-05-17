"use client";

import { useState, useEffect, useCallback } from "react";
import { request } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

export default function PostEditor({ userRole }: { userRole: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "GENERAL" });
  const [isLoading, setIsLoading] = useState(false);

  const canWrite = userRole === "ADMIN" || userRole === "WRITER";
  const isAdmin = userRole === "ADMIN";

  const fetchPosts = useCallback(async () => {
    try {
      const data = await request("/api/posts");
      if (Array.isArray(data)) setPosts(data);
    } catch (err) {
      console.error("게시글 로드 실패:", err);
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 💡 [신규] 게시글 삭제 로직
  const handleDelete = async (postId: number) => {
    if (!confirm("정말로 이 게시글을 영구 삭제하시겠습니까?")) return;

    try {
      const res = await request(`/api/posts/${postId}`, { method: "DELETE" });
      if (res) {
        alert("게시글이 삭제되었습니다.");
        setSelectedPost(null); // 상세보기 닫기
        fetchPosts(); // 목록 갱신
      }
    } catch (err: any) {
      alert(err.message || "삭제에 실패했습니다.");
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert("내용을 입력하세요.");
    if (form.type === "NOTICE" && !isAdmin) return alert("공지사항 작성 권한이 없습니다.");

    setIsLoading(true);
    try {
      await request("/api/posts", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", content: "", type: "GENERAL" });
      setIsWriting(false);
      fetchPosts();
    } catch (err: any) {
      alert(err.message || "등록 실패: 권한이 부족합니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 로그인한 유저 ID 가져오기 (삭제 버튼 노출용)
  const currentUserId = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}").id : null;

  return (
    <div className="max-w-5xl mx-auto px-6 min-h-[800px] pb-40">
      <AnimatePresence mode="wait">
        {selectedPost ? (
          /* --- 1. 상세보기 모드 --- */
          <motion.div
            key="detail"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0c0c0e] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl backdrop-blur-xl relative"
          >
            <div className="flex justify-between items-start mb-8">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
              >
                <span className="text-lg">←</span> Back to list
              </button>

              {/* 💡 [패치] 삭제 권한 확인: 본인 글이거나 관리자일 때만 노출 */}
              {(selectedPost.authorId === currentUserId || isAdmin) && (
                <button
                  onClick={() => handleDelete(selectedPost.id)}
                  className="px-5 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition-all border border-red-500/20"
                >
                  Delete Post
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${selectedPost.type === 'NOTICE' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                {selectedPost.type}
              </span>
              <span className="text-zinc-600 text-[10px] font-bold">
                {new Date(selectedPost.createdAt).toLocaleString()}
              </span>
            </div>

            <h2 className="text-3xl font-black text-white mb-8 tracking-tight leading-tight border-b border-white/5 pb-8">
              {selectedPost.title}
            </h2>

            <div className="text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap min-h-[300px]">
              {selectedPost.content}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-zinc-500">
              <span className="text-xs font-bold uppercase tracking-tight">Author: {selectedPost.author?.ingameName}</span>
              <span className="text-[10px] font-mono opacity-30 tracking-tighter uppercase font-black">UID_{selectedPost.id}</span>
            </div>
          </motion.div>
        ) : !isWriting ? (
          /* --- 2. 목록 모드 --- */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Community</h2>
                <p className="text-zinc-500 text-[10px] font-black tracking-[0.3em] uppercase mt-1">최신 공지 및 유저 게시글</p>
              </div>
              {canWrite && (
                <button
                  onClick={() => setIsWriting(true)}
                  className="px-8 py-3 bg-white text-black font-black rounded-xl text-xs hover:bg-cyan-500 transition-all active:scale-95 shadow-lg"
                >
                  새 글 작성
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white/[0.03] border border-white/5 p-6 rounded-[24px] hover:bg-white/[0.08] hover:border-white/10 transition-all group cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${post.type === 'NOTICE' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      {post.type}
                    </span>
                    <span className="text-zinc-600 text-[10px] font-bold">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-200 mb-2 group-hover:text-cyan-400 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="text-xs text-zinc-500 font-medium opacity-60 uppercase font-black tracking-tight">Author: {post.author?.ingameName}</span>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] text-zinc-700 font-mono font-black">READ MORE +</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* --- 3. 작성 모드 --- */
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-[#0c0c0e] border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <button
                  onClick={() => setIsWriting(false)}
                  className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                >
                  ← Back to list
                </button>
                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => setForm({ ...form, type: "GENERAL" })}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${form.type === "GENERAL" ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500"}`}
                  >
                    일반 게시글
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setForm({ ...form, type: "NOTICE" })}
                      className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ml-1 ${form.type === "NOTICE" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500"}`}
                    >
                      시스템 공지
                    </button>
                  )}
                </div>
              </div>

              <input
                className="w-full bg-transparent border-b border-white/10 p-4 text-xl font-bold text-white outline-none focus:border-blue-500 transition-all mb-8 placeholder:text-zinc-800"
                placeholder="제목을 입력하세요"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="w-full bg-black/20 border border-white/5 p-8 rounded-[32px] text-zinc-300 h-96 resize-none leading-relaxed mb-10 custom-scrollbar outline-none focus:border-white/10 transition-all"
                placeholder="내용을 작성하세요. 줄바꿈이 그대로 반영됩니다."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <button
                onClick={handlePublish}
                disabled={isLoading}
                className={`w-full py-6 rounded-2xl font-black transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] text-xs ${
                    form.type === 'NOTICE' ? 'bg-blue-600 text-white shadow-blue-900/20' : 'bg-white text-black hover:bg-cyan-500'
                } shadow-xl`}
              >
                {isLoading ? "전송 중..." : "게시글 작성 완료"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}