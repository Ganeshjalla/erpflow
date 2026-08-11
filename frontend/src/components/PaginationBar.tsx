import { Pagination } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, total, limit } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
      <span>
        Showing <span className="font-medium text-gray-900">{start}</span>-
        <span className="font-medium text-gray-900">{end}</span> of{" "}
        <span className="font-medium text-gray-900">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-gray-200 p-1.5 disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-gray-200 p-1.5 disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
