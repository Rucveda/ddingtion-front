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
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="site-btn site-btn-secondary site-btn-compact disabled:opacity-40"
      >
        이전
      </button>
      <span className="text-xs font-semibold text-zinc-400 tabular-nums">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="site-btn site-btn-secondary site-btn-compact disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
