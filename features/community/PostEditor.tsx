"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { request } from "@/lib/client/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  DEFAULT_CATEGORY_GUIDES,
  getPostCategoryLabel,
  POST_FILTER_OPTIONS,
  WRITABLE_POST_CATEGORIES,
} from "@/lib/domain/postCategories";

export default function PostEditor({ userRole, userDiscordLinked = false }: { userRole: string; userDiscordLinked?: boolean }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "GENERAL", category: "WILD" });
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [categoryGuides, setCategoryGuides] = useState<Record<string, string>>(DEFAULT_CATEGORY_GUIDES);
  const [guideEditing, setGuideEditing] = useState(false);
  const [guideDraft, setGuideDraft] = useState("");
  const [guideSaving, setGuideSaving] = useState(false);

  const canWrite = userRole === "ADMIN" || userRole === "WRITER" || userDiscordLinked;
  const isAdmin = userRole === "ADMIN";
  const getPostTypeLabel = (type: string) => (type === "NOTICE" ? "공지" : "일반");

  const activeGuideText =
    categoryFilter !== "ALL"
      ? categoryGuides[categoryFilter] || DEFAULT_CATEGORY_GUIDES[categoryFilter] || ""
      : "";

  const { latestNotices, communityPosts } = useMemo(() => {
    const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      latestNotices: sortedPosts.filter((post) => post.type === "NOTICE").slice(0, 3),
      communityPosts: sortedPosts.filter((post) => {
        if (post.type === "NOTICE") return false;
        if (categoryFilter === "ALL") return true;
        return (post.category || "WILD") === categoryFilter;
      }),
    };
  }, [posts, categoryFilter]);

  const fetchCategoryGuides = useCallback(async () => {
    try {
      const data = await request("/api/posts/category-guides");
      if (data?.guides && typeof data.guides === "object") {
        setCategoryGuides({ ...DEFAULT_CATEGORY_GUIDES, ...data.guides });
      }
    } catch (err) {
      console.error("말머리 안내 로드 실패:", err);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await request("/api/posts");
      if (Array.isArray(data)) setPosts(data);
      else setPosts([]);
    } catch (err) {
      console.error("게시글 로드 실패:", err);
      setPosts([]);
    } finally {
      setPostsLoaded(true);
    }
  }, []);

  const emptyCommunityMessage =
    categoryFilter === "ALL"
      ? "아직 게시글이 없습니다."
      : `「${getPostCategoryLabel(categoryFilter)}」 게시글이 없습니다.`;

  useEffect(() => {
    fetchPosts();
    fetchCategoryGuides();
  }, [fetchPosts, fetchCategoryGuides]);

  useEffect(() => {
    setGuideEditing(false);
    if (categoryFilter !== "ALL") {
      setGuideDraft(categoryGuides[categoryFilter] || DEFAULT_CATEGORY_GUIDES[categoryFilter] || "");
    }
  }, [categoryFilter, categoryGuides]);

  const handleCategorySelect = (categoryId: string) => {
    setCategoryFilter(categoryId);
    setGuideEditing(false);
  };

  const startGuideEdit = () => {
    if (!isAdmin || categoryFilter === "ALL") return;
    setGuideDraft(activeGuideText);
    setGuideEditing(true);
  };

  const cancelGuideEdit = () => {
    setGuideEditing(false);
    setGuideDraft(activeGuideText);
  };

  const saveCategoryGuide = async () => {
    if (!isAdmin || categoryFilter === "ALL") return;
    if (!guideDraft.trim()) return alert("안내 문구를 입력해 주세요.");

    setGuideSaving(true);
    try {
      const data = await request(`/api/admin/posts/category-guides/${categoryFilter}`, {
        method: "PATCH",
        body: JSON.stringify({ guideText: guideDraft.trim() }),
      });
      if (data?.guideText) {
        setCategoryGuides((prev) => ({ ...prev, [categoryFilter]: data.guideText }));
        setGuideEditing(false);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setGuideSaving(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("정말로 이 게시글을 영구 삭제하시겠습니까?")) return;

    try {
      const res = await request(`/api/posts/${postId}`, { method: "DELETE" });
      if (res) {
        alert("게시글이 삭제되었습니다.");
        setSelectedPost(null);
        fetchPosts();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim() || !form.content.trim()) return alert("내용을 입력하세요.");
    if (form.type === "NOTICE" && !isAdmin) return alert("공지사항 작성 권한이 없습니다.");

    setIsLoading(true);
    try {
      await request("/api/posts", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", content: "", type: "GENERAL", category: "WILD" });
      setIsWriting(false);
      fetchPosts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "등록 실패: 권한이 부족합니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentUserId = () => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}")?.id ?? null;
    } catch {
      return null;
    }
  };
  const currentUserId = getCurrentUserId();

  return (
    <motion.div className="mx-auto min-h-[640px] max-w-5xl px-4 pb-28 sm:px-6">
      <AnimatePresence mode="wait">
        {selectedPost ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto max-w-4xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="site-btn site-btn-secondary site-btn-compact"
              >
                <span className="text-sm">←</span> 목록으로
              </button>

              {(selectedPost.authorId === currentUserId || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedPost.id)}
                  className="site-btn site-btn-danger site-btn-compact"
                >
                  삭제
                </button>
              )}
            </div>

            <article className="site-card overflow-hidden rounded-[30px]">
              <header className="border-b border-white/5 bg-white/[0.018] p-5 md:p-7">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold ${selectedPost.type === "NOTICE" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                    {getPostTypeLabel(selectedPost.type)}
                  </span>
                  {selectedPost.type !== "NOTICE" && (
                    <span className="rounded-lg border border-cyan-500/15 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
                      {getPostCategoryLabel(selectedPost.category)}
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-zinc-600">
                    {new Date(selectedPost.createdAt).toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-700">#{selectedPost.id}</span>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <h2 className="min-w-0 max-w-3xl text-2xl font-extrabold leading-tight tracking-[-0.04em] text-white md:text-4xl">
                    {selectedPost.title}
                  </h2>

                  <div className="flex w-fit shrink-0 items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3 md:w-48">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-cyan-500/10 text-xs font-extrabold text-blue-100">
                      {(selectedPost.author?.ingameName || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-200">{selectedPost.author?.ingameName || "알 수 없음"}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-zinc-600">작성자</p>
                    </div>
                  </div>
                </div>
              </header>

              <div className="bg-black/10 px-5 py-6 md:px-7 md:py-8">
                <div className="min-h-[260px] whitespace-pre-wrap break-keep text-[15px] font-medium leading-8 text-zinc-300">
                  {selectedPost.content}
                </div>
              </div>

              <footer className="flex flex-col gap-3 border-t border-white/5 bg-white/[0.012] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-zinc-600">커뮤니티 게시글은 작성자의 의견이며, 거래 전 정보 확인을 권장합니다.</p>
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="site-btn site-btn-secondary site-btn-compact w-fit"
                >
                  목록 보기
                </button>
              </footer>
            </article>
          </motion.div>
        ) : !isWriting ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="site-label text-blue-400">Community</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-white md:text-3xl">커뮤니티</h2>
                <p className="mt-2 text-xs font-medium text-zinc-500">최신 공지와 유저 게시글을 확인합니다.</p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setIsWriting(true)}
                  className="site-btn site-btn-primary w-fit"
                >
                  새 글 작성
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {POST_FILTER_OPTIONS.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={`shrink-0 rounded-xl border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-all ${
                    categoryFilter === category.id
                      ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100"
                      : "border-white/5 bg-white/[0.02] text-zinc-600 hover:border-white/10 hover:text-zinc-300"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {categoryFilter !== "ALL" && activeGuideText && (
                <motion.div
                  key={`guide-${categoryFilter}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                    {guideEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={guideDraft}
                          onChange={(e) => setGuideDraft(e.target.value)}
                          rows={4}
                          className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-[13px] font-medium leading-relaxed text-zinc-300 outline-none focus:border-cyan-500/30 custom-scrollbar"
                          placeholder="이 말머리에 어떤 글을 올리면 좋은지 안내해 주세요."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelGuideEdit}
                            disabled={guideSaving}
                            className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={saveCategoryGuide}
                            disabled={guideSaving}
                            className="text-[11px] font-semibold text-cyan-300/90 transition-colors hover:text-cyan-200"
                          >
                            {guideSaving ? "저장 중…" : "저장"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-zinc-400">
                          {activeGuideText}
                        </p>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={startGuideEdit}
                            className="mt-2 text-[10px] font-medium text-zinc-600 transition-colors hover:text-zinc-400"
                          >
                            안내 수정
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="order-2 grid grid-cols-1 gap-3 lg:order-1">
                {!postsLoaded ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                    <p className="text-sm font-semibold text-zinc-500 animate-pulse">게시글을 불러오는 중...</p>
                  </div>
                ) : communityPosts.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                    <p className="text-sm font-semibold text-zinc-400">{emptyCommunityMessage}</p>
                    <p className="mt-2 text-xs font-medium text-zinc-600">글이 작성되면 이곳에 표시됩니다.</p>
                  </div>
                ) : (
                  communityPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedPost(post)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPost(post);
                        }
                      }}
                      className="group cursor-pointer rounded-[22px] border border-white/5 bg-white/[0.025] p-4 transition-all hover:border-white/10 hover:bg-white/[0.05] active:scale-[0.995]"
                    >
                      <div className="mb-2.5 flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${post.type === "NOTICE" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                          {getPostTypeLabel(post.type)}
                        </span>
                        <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold text-cyan-300">
                          {getPostCategoryLabel(post.category)}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-600">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="mb-2 truncate text-sm font-semibold text-zinc-200 transition-colors group-hover:text-cyan-300 md:text-base">
                        {post.title}
                      </h3>
                      <div className="pointer-events-none flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500">작성자: {post.author?.ingameName || "알 수 없음"}</span>
                        <span className="text-[10px] font-semibold text-zinc-600">자세히 보기</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <aside className="order-1 rounded-[24px] border border-blue-500/10 bg-blue-500/[0.035] p-3 lg:sticky lg:top-32 lg:order-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-xs font-extrabold text-blue-100">최신 공지</h3>
                  <span className="text-[10px] font-medium text-blue-200/50">최대 3개</span>
                </div>
                <div className="grid gap-1.5">
                  {latestNotices.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-blue-500/10 bg-black/15 px-3 py-2 text-xs font-medium text-blue-100/45">
                      등록된 공지가 없습니다.
                    </div>
                  ) : (
                    latestNotices.map((post) => (
                      <button
                        key={`notice-${post.id}`}
                        type="button"
                        onClick={() => setSelectedPost(post)}
                        className="rounded-xl bg-black/20 px-3 py-2 text-left transition-colors hover:bg-white/[0.045]"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="rounded bg-blue-600 px-2 py-0.5 text-[9px] font-semibold text-white">공지</span>
                          <span className="text-[10px] font-medium text-zinc-600">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="line-clamp-2 text-xs font-semibold leading-relaxed text-zinc-200">{post.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="site-card rounded-[28px] p-4 md:p-5">
              <div className="mb-5 flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  className="w-fit text-xs font-semibold text-zinc-500 transition-colors hover:text-white"
                >
                  ← 목록으로
                </button>
                <div className="flex w-fit rounded-xl border border-white/10 bg-black/40 p-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "GENERAL" })}
                    className={`rounded-lg px-4 py-1.5 text-[10px] font-semibold transition-all ${form.type === "GENERAL" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    일반 게시글
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "NOTICE", category: "NOTICE" })}
                      className={`ml-1 rounded-lg px-4 py-1.5 text-[10px] font-semibold transition-all ${form.type === "NOTICE" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      시스템 공지
                    </button>
                  )}
                </div>
              </div>

              {form.type === "GENERAL" && (
                <div className="mb-4">
                  <p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-600">말머리</p>
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {WRITABLE_POST_CATEGORIES.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setForm({ ...form, category: category.id })}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-all ${
                          form.category === category.id
                            ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100"
                            : "border-white/5 bg-black/25 text-zinc-600 hover:border-white/10 hover:text-zinc-300"
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                  {(categoryGuides[form.category] || DEFAULT_CATEGORY_GUIDES[form.category]) && (
                    <p className="whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[12px] font-medium leading-relaxed text-zinc-500">
                      {categoryGuides[form.category] || DEFAULT_CATEGORY_GUIDES[form.category]}
                    </p>
                  )}
                </div>
              )}

              <input
                className="mb-4 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base font-semibold text-white outline-none transition-all placeholder:text-zinc-700 focus:border-blue-500/50"
                placeholder="제목을 입력하세요"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="mb-4 h-72 w-full resize-none rounded-2xl border border-white/5 bg-black/20 p-4 text-sm leading-relaxed text-zinc-300 outline-none transition-all placeholder:text-zinc-700 focus:border-white/10 custom-scrollbar"
                placeholder="내용을 작성하세요. 줄바꿈이 그대로 반영됩니다."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <button
                type="button"
                onClick={handlePublish}
                disabled={isLoading}
                className={`site-btn w-full ${form.type === "NOTICE" ? "site-btn-primary" : "site-btn-secondary"}`}
              >
                {isLoading ? "전송 중..." : "게시글 작성 완료"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
