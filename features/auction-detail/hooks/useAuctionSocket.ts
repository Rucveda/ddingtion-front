"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { request } from "@/lib/client/api";
import { SOCKET_URL } from "@/lib/client/runtimeConfig";
import { isLocalDev } from "@/dev/devMode";
import { subscribeSessionIdle } from "@/lib/auth/authPreferences";
import type { AuctionDetailRecord } from "../auctionDetailTypes";

export function useAuctionSocket(auctionId: string) {
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionDetailRecord | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [extensionNotice, setExtensionNotice] = useState<string | null>(null);

  useEffect(() => {
    return subscribeSessionIdle(() => {
      setSocket((prev) => {
        prev?.close();
        return null;
      });
    });
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        const data = await request(`/api/auctions/${auctionId}`);
        if (data) setAuction(data);
      } catch (err) {
        console.error(err);
      }
    };
    void initData();

    if (isLocalDev()) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    newSocket.emit("join_auction", auctionId);
    newSocket.on(
      "bid_updated",
      (data: { newPrice: string; bidderName: string; endTime?: string; extended?: boolean }) => {
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentPrice: data.newPrice,
                lastBidder: data.bidderName,
                ...(data.endTime ? { endTime: data.endTime } : {}),
              }
            : prev,
        );
        if (data.extended) {
          setExtensionNotice("유효 입찰로 마감이 3분 연장되었습니다.");
          window.setTimeout(() => setExtensionNotice(null), 6000);
        }
      },
    );
    newSocket.on("chat_error", (data: { message?: string }) => {
      if (data?.message) alert(data.message);
    });
    newSocket.on("auction_finished", (data: { winner?: string }) => {
      alert(`경매 종료. 낙찰자: ${data.winner}`);
      router.replace("/?tab=AUCTION");
    });
    return () => {
      newSocket.close();
    };
  }, [auctionId, router]);

  return { auction, setAuction, socket, extensionNotice };
}
