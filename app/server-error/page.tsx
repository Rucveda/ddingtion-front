"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function ServerErrorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="text-8xl flex justify-center">🚧</div>
        <h1 className="text-5xl font-black tracking-tighter italic uppercase">
          Server <span className="text-red-500">Offline</span>
        </h1>
        <div className="space-y-2">
          <p className="text-zinc-400 text-lg font-medium">
            현재 서버와의 연결이 원활하지 않습니다.
          </p>
          <p className="text-zinc-600 text-sm">
            잠시 후 서버가 재가동될 예정이니 조금만 기다려 주세요.
          </p>
        </div>
        
        <div className="pt-10">
          <button 
            onClick={() => window.location.href = "/"}
            className="bg-white text-black font-black px-10 py-4 rounded-2xl hover:bg-cyan-500 transition-all active:scale-95 uppercase tracking-widest"
          >
            다시 연결 시도
          </button>
        </div>
      </motion.div>
    </div>
  );
}