"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Socket } from "socket.io-client";
import { request } from "@/lib/client/api";
import { isLocalDev } from "@/dev/devMode";
import { getMinimumBid, parseBidPrice } from "@/lib/domain/bidIncrement";
import { triggerHaptic } from "@/features/home/auctionListUtils";
import { CHAT_OPEN_EVENT } from "../auctionDetailTypes";
import type { AuctionDetailRecord } from "../auctionDetailTypes";

type UseAuctionActionsParams = {
  auctionId: string;
  auction: AuctionDetailRecord | null;
  setAuction: React.Dispatch<React.SetStateAction<AuctionDetailRecord | null>>;
  socket: Socket | null;
  currentUser: any;
  bidAmount: string;
  setBidAmount: (value: string) => void;
  needsDiscordForTrade: boolean;
  verifyingSession: boolean;
};

export function useAuctionActions({
  auctionId,
  auction,
  setAuction,
  socket,
  currentUser,
  bidAmount,
  setBidAmount,
  needsDiscordForTrade,
  verifyingSession,
}: UseAuctionActionsParams) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const isSeller =
    auction && currentUser && Number(auction.sellerId) === Number(currentUser.id);
  const canAuctionTrade = auction?.status === "ACTIVE";

  const handleBid = () => {
    if (!auction) return;
    triggerHaptic();
    if (!currentUser) return router.push("/login");
    if (verifyingSession) {
      alert("계정 인증 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (needsDiscordForTrade) {
      alert("경매 입찰은 디스코드 인증이 필요합니다. 마이페이지에서 연동해 주세요.");
      return router.push("/mypage");
    }
    if (!canAuctionTrade) return alert("현재 입찰할 수 없는 경매 상태입니다.");
    if (isSeller) return alert("본인이 등록한 물품에는 입찰할 수 없습니다.");
    const minimumBid = getMinimumBid(parseBidPrice(auction.currentPrice), auction.endTime);
    if (Number(bidAmount) < minimumBid) {
      return alert(
        `최소 입찰가는 ${minimumBid.toLocaleString()}G 입니다. (마감이 가까울수록 최소 인상이 커집니다)`,
      );
    }
    if (isLocalDev()) {
      setAuction((prev) =>
        prev
          ? {
              ...prev,
              currentPrice: bidAmount,
              lastBidder: currentUser.ingameName,
              lastBidderId: currentUser.id,
              bidCount: (prev.bidCount || 0) + 1,
            }
          : prev,
      );
      alert("로컬 더미 입찰이 반영되었습니다.");
      return;
    }
    const token = localStorage.getItem("token");
    socket?.emit("place_bid", { auctionId, token, bidAmount: Number(bidAmount) });
  };

  const handleCancelRevoke = async () => {
    triggerHaptic();
    if (!currentUser || !isSeller) return;
    if (needsDiscordForTrade) {
      alert("디스코드 인증이 필요합니다. 마이페이지에서 연동해 주세요.");
      return router.push("/mypage");
    }
    if (!confirm("취소 요청을 철회하고 경매를 다시 진행하시겠습니까?")) return;

    setIsProcessing(true);
    try {
      const data = await request(`/api/auctions/${auctionId}/cancel-revoke`, { method: "POST" });
      if (data) {
        setAuction((prev) =>
          prev ? { ...prev, status: "ACTIVE", cancelRequestedAt: null } : prev,
        );
        alert(data.message || "경매가 다시 진행됩니다.");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "취소 철회에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelRequest = async () => {
    triggerHaptic();
    if (!currentUser || !isSeller) return;
    if (needsDiscordForTrade) {
      alert("디스코드 인증이 필요합니다. 마이페이지에서 연동해 주세요.");
      return router.push("/mypage");
    }
    if (!confirm("취소 요청 후 5분이 지나면 입찰 여부와 관계없이 유찰 처리됩니다. 계속하시겠습니까?"))
      return;

    setIsProcessing(true);
    try {
      const data = await request(`/api/auctions/${auctionId}/cancel-request`, { method: "POST" });
      if (data) {
        setAuction((prev) =>
          prev
            ? { ...prev, status: "CANCEL_PENDING", cancelRequestedAt: data.cancelRequestedAt }
            : prev,
        );
        alert(data.message || "취소 요청이 접수되었습니다.");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "취소 요청에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyNow = async () => {
    if (!auction) return;
    triggerHaptic();
    if (!currentUser) {
      alert("로그인이 필요한 서비스입니다.");
      return router.push("/login");
    }
    if (verifyingSession) {
      alert("계정 인증 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (needsDiscordForTrade) {
      alert("즉시 구매는 디스코드 인증이 필요합니다. 마이페이지에서 연동해 주세요.");
      return router.push("/mypage");
    }
    if (!canAuctionTrade) return alert("현재 즉시 구매할 수 없는 경매 상태입니다.");
    if (isSeller) return alert("본인이 등록한 물품은 구매할 수 없습니다.");
    if (!confirm("즉시 구매를 진행하시겠습니까? 확인 시 즉시 낙찰 처리됩니다.")) return;

    setIsProcessing(true);
    try {
      const result = await request(`/api/auctions/${auctionId}/buy`, { method: "POST" });
      if (result?.roomId) {
        localStorage.setItem("openChatId", result.roomId.toString());
        window.dispatchEvent(new Event(CHAT_OPEN_EVENT));
        router.replace("/?tab=AUCTION");
        console.log("구매 성공: 채팅방으로 연결을 시도합니다.");
      } else {
        throw new Error("채팅방 생성에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("Purchase Error:", err);
      if (err.status === 403) {
        alert("잔액이 부족하거나 구매 권한이 없습니다.");
      } else {
        alert(err.message || "구매 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    isSeller: Boolean(isSeller),
    canAuctionTrade: Boolean(canAuctionTrade),
    handleBid,
    handleBuyNow,
    handleCancelRequest,
    handleCancelRevoke,
  };
}
