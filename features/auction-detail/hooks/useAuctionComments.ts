"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/client/api";
import type { AuctionComment } from "../auctionDetailTypes";

export function useAuctionComments(auctionId: string, currentUser: any) {
  const router = useRouter();
  const [comments, setComments] = useState<AuctionComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const data = await request(`/api/auctions/${auctionId}/comments`);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      setComments([]);
    }
  }, [auctionId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = commentInput.trim();
    if (!content || isCommenting) return;
    if (!currentUser) return router.push("/login");
    if (content.length > 500) return alert("댓글은 500자 이하로 입력해주세요.");

    setIsCommenting(true);
    try {
      const created = await request(`/api/auctions/${auctionId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      const fallback: AuctionComment = {
        id: Date.now(),
        content,
        createdAt: new Date().toISOString(),
        author: {
          id: currentUser.id,
          ingameName: currentUser.ingameName || currentUser.loginId || "Unknown",
          reputationScore: currentUser.reputationScore || 0,
        },
      };
      setComments((prev) => [...prev, created?.content ? created : fallback]);
      setCommentInput("");
    } catch (err: any) {
      alert(err?.message || "댓글 등록에 실패했습니다.");
    } finally {
      setIsCommenting(false);
    }
  };

  return {
    comments,
    commentInput,
    setCommentInput,
    isCommenting,
    handleCommentSubmit,
  };
}
