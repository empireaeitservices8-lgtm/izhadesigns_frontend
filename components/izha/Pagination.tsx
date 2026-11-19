"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { focusRing } from "@/components/izha/ui";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
  scrollToTop?: boolean;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 12,
  className = "",
  scrollToTop = true,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageClick = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    if (scrollToTop && typeof window !== "undefined") {
      // Smoothly scroll up toward the product catalog area
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  };

  // Generate page numbers with ellipsis for large catalogs
  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = getPageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem =
    totalItems !== undefined
      ? Math.min(currentPage * pageSize, totalItems)
      : currentPage * pageSize;

  return (
    <nav
      aria-label="Product catalog pagination"
      className={`mt-10 flex flex-col items-center justify-center gap-3 border-t border-[#E8CFD2] pt-8 sm:mt-12 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className={`inline-flex h-10 items-center justify-center gap-1 rounded-[10px] border px-3 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors sm:px-4 sm:text-[13px] ${
            currentPage <= 1
              ? "cursor-not-allowed border-[#E8CFD2] bg-[#FAF7F2] text-[#b3a9ab] opacity-50"
              : "border-[#E8CFD2] bg-white text-[#332B2B] hover:border-[#E99A9F] hover:bg-[#FFF5F7] hover:text-[#B20947]"
          } ${focusRing}`}
        >
          <ChevronLeft size={16} strokeWidth={2} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-10 w-8 items-center justify-center text-[14px] text-[#8c8282]"
                >
                  …
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Go to page ${p}`}
                className={`flex h-10 min-w-10 items-center justify-center rounded-[10px] border px-2.5 text-[13px] font-medium transition-all sm:text-[14px] ${
                  isActive
                    ? "border-[#B20947] bg-[#B20947] font-semibold text-white shadow-xs"
                    : "border-[#E8CFD2] bg-white text-[#332B2B] hover:border-[#E99A9F] hover:bg-[#FFF5F7] hover:text-[#B20947]"
                } ${focusRing}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className={`inline-flex h-10 items-center justify-center gap-1 rounded-[10px] border px-3 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors sm:px-4 sm:text-[13px] ${
            currentPage >= totalPages
              ? "cursor-not-allowed border-[#E8CFD2] bg-[#FAF7F2] text-[#b3a9ab] opacity-50"
              : "border-[#E8CFD2] bg-white text-[#332B2B] hover:border-[#E99A9F] hover:bg-[#FFF5F7] hover:text-[#B20947]"
          } ${focusRing}`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Item range indicator */}
      {totalItems !== undefined && totalItems > 0 && (
        <p className="text-[12px] text-[#6f6565]">
          Showing <span className="font-medium text-[#332B2B]">{startItem}</span>–
          <span className="font-medium text-[#332B2B]">{endItem}</span> of{" "}
          <span className="font-medium text-[#332B2B]">{totalItems}</span> pieces
        </p>
      )}
    </nav>
  );
}

