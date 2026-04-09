"use client";

import { motion } from "framer-motion";

export default function EtcTab({ items }: { items: any[] }) {
  /**
   * 🛠️ [이미지 보안 패치]
   */
  const getSecureUrl = (url: string) => url?.replace("http://", "https://") || "";

  /**
   * 🛠️ [필터 로직 패치]
   * WILD, RPG, ISLAND 카테고리가 아닌 모든 아이템을 가져옵니다.
   * 카테고리 값이 없거나(null) 빈 문자열인 아이템도 안전하게 "기타" 탭에 포함시킵니다.
   */
  const etcItems = items.filter(i => {
    const cat = (i.category || "").toUpperCase(); // 카테고리가 없으면 빈 문자열 처리
    return (
      !cat.includes("WILD") && 
      !cat.includes("RPG") && 
      !cat.includes("ISLAND")
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-blue-600 rounded-full" />
          <h3 className="text-sm font-black text-zinc-300 uppercase tracking-tight">아이템 시세 데이터</h3>
        </div>
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
          검색된 아이템: {etcItems.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {etcItems.map(item => (
          <motion.div 
            key={item.id} 
            whileHover={{ y: -2 }}
            className="bg-black/40 border border-white/5 p-5 rounded-2xl flex justify-between items-center transition-all hover:bg-white/[0.04] group hover:border-blue-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 shrink-0">
                {/* 🛠️ [패치 적용] 이미지 보안 경로 처리 */}
                <img 
                  src={getSecureUrl(item.iconUrl)} 
                  className="w-7 h-7 [image-rendering:pixelated] group-hover:scale-110 transition-transform" 
                  alt={item.name} 
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-zinc-200 group-hover:text-white transition-colors">{item.name}</span>
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-tighter mt-0.5">
                  분류: {item.category || "기타"}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-blue-500 font-black text-[9px] uppercase tracking-tighter">데이터 연결됨</span>
              <div className="w-4 h-[1px] bg-blue-500/30 mt-1" />
            </div>
          </motion.div>
        ))}

        {etcItems.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[40px] opacity-20">
            <div className="w-10 h-10 border border-zinc-700 rotate-45 flex items-center justify-center mb-6">
              <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em]">등록된 아이템 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}