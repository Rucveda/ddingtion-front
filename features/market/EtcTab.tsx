"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { request } from "@/lib/client/api";

export default function EtcTab({ selectedItem }: { selectedItem: any }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartUnit, setChartUnit] = useState<"day" | "month">("day");

  const formatGold = (num: number) => {
    const safeNum = Math.abs(Math.round(num || 0));
    if (safeNum >= 100000000) {
      const uk = Math.floor(safeNum / 100000000);
      const man = Math.floor((safeNum % 100000000) / 10000);
      return `${uk}억 ${man > 0 ? man.toLocaleString() + "만" : ""}`;
    }
    if (safeNum >= 10000) return `${Math.floor(safeNum / 10000).toLocaleString()}만`;
    return safeNum.toLocaleString();
  };

  const fetchHistory = useCallback(async () => {
    if (!selectedItem?.id) return;
    setIsLoading(true);
    try {
      const data = await request(`/api/auctions/market-analysis/${selectedItem.id}?cacheTtl=4`);
      setAnalysis(data || null);
    } catch (error) {
      console.error("시세 그래프 로드 실패:", error);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const chartData = useMemo(() => {
    const history = Array.isArray(analysis?.history) ? analysis.history : [];
    const dailyData = [...history]
      .sort((a: any, b: any) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime())
      .map((trade: any) => ({
        date: new Date(trade.tradeDate).toLocaleDateString([], { month: "numeric", day: "numeric" }),
        month: new Date(trade.tradeDate).toLocaleDateString([], { year: "2-digit", month: "numeric" }),
        price: Number(trade.price || 0),
      }));

    if (chartUnit === "day") return dailyData;

    const monthly = new Map<string, { date: string; price: number; count: number }>();
    dailyData.forEach((point) => {
      const current = monthly.get(point.month) || { date: point.month, price: 0, count: 0 };
      current.price += point.price;
      current.count += 1;
      monthly.set(point.month, current);
    });

    return Array.from(monthly.values()).map((point) => ({
      date: point.date,
      month: point.date,
      price: Math.round(point.price / point.count),
      count: point.count,
    }));
  }, [analysis, chartUnit]);

  const stats = useMemo(() => {
    const prices = chartData.map((point) => point.price).filter((price) => price > 0);
    if (prices.length === 0) return { latest: 0, min: 0, max: 0, avg: 0, changeRate: 0 };
    const latest = prices[prices.length - 1];
    const first = prices[0];
    return {
      latest,
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      changeRate: first > 0 ? Math.round(((latest - first) / first) * 100) : 0,
    };
  }, [chartData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.018] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-3 w-1 rounded-full bg-blue-600" />
          <div>
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-300">지난 시세 그래프</h3>
            <p className="mt-0.5 text-[10px] font-semibold text-zinc-600">{selectedItem?.name}</p>
          </div>
        </div>
        <span className="rounded-lg border border-white/5 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">
          {isLoading ? "로딩" : `${chartData.length}건`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          ["최근가", stats.latest],
          ["평균가", stats.avg],
          ["최저가", stats.min],
          ["최고가", stats.max],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-white/5 bg-black/25 px-3 py-2.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-zinc-600">{label}</p>
            <p className="mt-1 font-mono text-sm font-black tracking-[-0.03em] text-zinc-200">{formatGold(Number(value))} G</p>
          </div>
        ))}
        <div className={`rounded-xl border px-3 py-2.5 ${stats.changeRate >= 0 ? "border-green-500/15 bg-green-500/5" : "border-red-500/15 bg-red-500/5"}`}>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-zinc-600">변동률</p>
          <p className={`mt-1 font-mono text-sm font-black tracking-[-0.03em] ${stats.changeRate >= 0 ? "text-green-300" : "text-red-300"}`}>
            {stats.changeRate > 0 ? "+" : ""}{stats.changeRate}%
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">
            {chartUnit === "day" ? "일 단위 거래가" : "월 단위 평균가"}
          </p>
          <div className="flex rounded-xl border border-white/5 bg-black/30 p-1">
            {[
              { id: "day", label: "일" },
              { id: "month", label: "월" },
            ].map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => setChartUnit(unit.id as "day" | "month")}
                className={`rounded-lg px-3 py-1 text-[10px] font-bold transition-all ${
                  chartUnit === unit.id ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {unit.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[280px]">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="marketHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} stroke="#52525b" />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
                  labelStyle={{ color: "#a1a1aa", fontSize: 11, fontWeight: 700 }}
                  itemStyle={{ color: "#bfdbfe", fontSize: 11, fontWeight: 800 }}
                  formatter={(value) => [`${formatGold(Number(value))} G`, chartUnit === "day" ? "거래가" : "월 평균가"]}
                />
                <Area type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2.5} fill="url(#marketHistoryGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/5 bg-black/15 text-center">
              <p className="text-xs font-semibold text-zinc-600">그래프로 표시할 거래 데이터가 부족합니다.</p>
            </div>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.018] p-3">
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">
            {chartUnit === "day" ? "최근 거래" : "월별 평균"}
          </div>
          <div className="grid max-h-[160px] grid-cols-1 gap-1.5 overflow-y-auto pr-1 custom-scrollbar md:grid-cols-2">
            {[...chartData].reverse().map((trade, idx) => (
              <div key={`${trade.date}-${idx}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                <span className="text-[11px] font-semibold text-zinc-500">{trade.date}</span>
                <span className="font-mono text-[11px] font-bold text-zinc-300">{formatGold(trade.price)} G</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}