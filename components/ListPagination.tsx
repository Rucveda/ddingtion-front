"use client";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function ListPagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}: ListPaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        className="site-btn site-btn-secondary site-btn-compact disabled:opacity-40"
      >
        이전
      </button>
      <span className="min-w-[3.5rem] text-center text-xs font-semibold text-zinc-400 tabular-nums">
        {safePage} / {safeTotal}
      </span>
      <button
        type="button"
        disabled={safePage >= safeTotal}
        onClick={() => onPageChange(safePage + 1)}
        className="site-btn site-btn-secondary site-btn-compact disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
