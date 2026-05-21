"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@/lib/client/api";

type StepStatus = "pending" | "running" | "passed" | "failed";

type HealthStep = {
  id: string;
  label: string;
  status: StepStatus;
  message: string | null;
  durationMs: number | null;
};

type HealthRun = {
  runId: string;
  checkId: string;
  status: "running" | "passed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  steps: HealthStep[];
  error: string | null;
  meta?: Record<string, unknown>;
};

const statusLabel: Record<StepStatus, string> = {
  pending: "대기",
  running: "진행 중",
  passed: "성공",
  failed: "실패",
};

const statusClass: Record<StepStatus, string> = {
  pending: "text-zinc-500 border-zinc-700/40 bg-zinc-900/40",
  running: "text-amber-200 border-amber-500/30 bg-amber-500/10",
  passed: "text-emerald-200 border-emerald-500/30 bg-emerald-500/10",
  failed: "text-red-200 border-red-500/30 bg-red-500/10",
};

export function HealthCheckPanel({ triggerHaptic }: { triggerHaptic: () => void }) {
  const [run, setRun] = useState<HealthRun | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchRun = useCallback(async (runId: string) => {
    const data = await request(`/api/admin/health-checks/auction-flow/runs/${runId}`);
    if (data) setRun(data as HealthRun);
    return data as HealthRun | null;
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await request("/api/admin/health-checks/auction-flow/latest");
      if (data) setRun(data as HealthRun);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        setRun(null);
        return;
      }
      setLoadError(error instanceof Error ? error.message : "최근 기록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void loadLatest();
    return () => stopPolling();
  }, [loadLatest, stopPolling]);

  useEffect(() => {
    if (!run || run.status !== "running") {
      stopPolling();
      return;
    }
    stopPolling();
    pollRef.current = setInterval(() => {
      void fetchRun(run.runId);
    }, 2000);
    return () => stopPolling();
  }, [run?.runId, run?.status, fetchRun, stopPolling]);

  const startAuctionFlowCheck = async () => {
    triggerHaptic();
    setIsStarting(true);
    setLoadError(null);
    try {
      const data = await request("/api/admin/health-checks/auction-flow/run", { method: "POST" });
      if (data) {
        setRun(data as HealthRun);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "헬스체크를 시작할 수 없습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  const isRunning = run?.status === "running" || isStarting;

  return (
    <div className="space-y-6 p-4 md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-[-0.02em] text-zinc-100">서비스 헬스체크</h2>
          <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-zinc-500 break-keep">
            실제 API·DB·Redis·경매 마감 로직으로 경매 플로우를 검증합니다. 테스트 계정(
            <span className="font-mono text-zinc-400">__hc_seller__</span>,{" "}
            <span className="font-mono text-zinc-400">__hc_buyer__</span>)은 재사용되며, 실행 후 데이터는
            자동 삭제됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={startAuctionFlowCheck}
          disabled={isRunning}
          className="site-btn site-btn-primary shrink-0"
        >
          {isRunning ? "검사 실행 중..." : "경매 플로우 검사"}
        </button>
      </div>

      {loadError && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-200">
          {loadError}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="site-label text-cyan-300/90">Auction flow</span>
          {run && (
            <span
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                run.status === "passed"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : run.status === "failed"
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              {run.status === "running" ? "RUNNING" : run.status === "passed" ? "PASSED" : "FAILED"}
            </span>
          )}
          {run?.finishedAt && (
            <span className="text-[10px] font-medium text-zinc-600">
              완료: {new Date(run.finishedAt).toLocaleString()}
            </span>
          )}
        </div>

        {!run ? (
          <p className="text-xs font-medium text-zinc-600">아직 실행 기록이 없습니다. 위 버튼으로 첫 검사를 시작하세요.</p>
        ) : (
          <>
            {run.error && (
              <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-300">
                {run.error}
              </p>
            )}
            <ul className="space-y-2">
              {run.steps.map((step) => (
                <li
                  key={step.id}
                  className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between ${statusClass[step.status]}`}
                >
                  <span className="text-xs font-bold">{step.label}</span>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                    <span className="uppercase tracking-wide opacity-80">{statusLabel[step.status]}</span>
                    {step.durationMs != null && <span className="text-zinc-500">{step.durationMs}ms</span>}
                    {step.message && <span className="font-medium opacity-90">{step.message}</span>}
                  </div>
                </li>
              ))}
            </ul>
            {run.meta && Object.keys(run.meta).length > 0 && (
              <pre className="mt-4 overflow-x-auto rounded-xl border border-white/5 bg-black/40 p-3 text-[10px] font-mono text-zinc-500">
                {JSON.stringify(run.meta, null, 2)}
              </pre>
            )}
          </>
        )}
      </section>

      <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
        Redis·경매 워커가 동작해야 입찰 rate limit과 마감 처리가 정상 검증됩니다. 헬스체크 경매는 공개 목록에서
        제외됩니다.
      </p>
    </div>
  );
}
