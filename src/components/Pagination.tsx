import React from "react";
import "./TableStyle.scss";
import { ArrowLeftCircleIcon, ArrowRightCircleIcon } from "lucide-react";

type OptionType = {
  value: string;
  label: string;
};

export interface PaginationProps {
  page: number;
  totalPages: number;
  currentPageSize: number;
  pageSizeOptions: OptionType[];
  onPageChange: (page: number) => void;
  onPageSizeChanged: (option: string) => void;
  forPaymentHistory?: boolean;
  disableNext?: boolean;
  disableBack?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  currentPageSize = 10,
  pageSizeOptions,
  onPageChange,
  onPageSizeChanged,
  forPaymentHistory = false,
  disableBack = false,
  disableNext = false,
}) => {
  const getVisiblePages = (current: number, total: number): (number | "dots")[] => {
    const pages: (number | "dots")[] = [];

    if (total <= 2) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (current > 3) {
      pages.push("dots");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push("dots");
    }

    pages.push(total);

    return pages;
  };

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-[var(--text-secondary)] text-[12px] md:text-[12px] xl:text-[14px] font-[500]">
        Rows per page
      </span>

      <select
        value={currentPageSize.toString()}
        onChange={(e) => onPageSizeChanged(e.target.value)}
        className="selectRoot"
      >
        {pageSizeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        {/* Previous */}
        {forPaymentHistory ? (
          <button
            type="button"
            disabled={disableBack}
            onClick={() => {
              if (!disableBack && page > 1) {
                onPageChange(page - 1);
              }
            }}
            className={`text-[11px] font-[400] border p-1 rounded-l-lg ${
              disableBack ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            Back
          </button>
        ) : (
          <ArrowLeftCircleIcon
            className={`w-5 h-5 text-primary hover:text-primary-dark transition-colors cursor-pointer ${page === 1 ? "opacity-30 pointer-events-none" : ""}`}
            onClick={() => {
              if (page > 1) {
                onPageChange(page - 1);
              }
            }}
          />
        )}

        {/* Pages */}
        {!forPaymentHistory &&
          visiblePages.map((item, index) => {
            if (item === "dots") {
              return (
                <span key={`dots-${index}`} className="px-2 text-[var(--text-muted)]">
                  ...
                </span>
              );
            }

            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={`min-w-[24px] h-6 px-1 rounded flex justify-center items-center text-xs md:text-sm font-medium transition-colors mr-1
                  ${page === item ? "bg-primary/10 text-primary border border-primary/20" : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--border-strong)]/20"}`}
              >
                {item}
              </button>
            );
          })}

        {/* Next */}
        {forPaymentHistory ? (
          <button
            type="button"
            disabled={disableNext}
            onClick={() => {
              if (!disableNext && page < totalPages) {
                onPageChange(page + 1);
              }
            }}
            className={`text-[11px] font-[400] border p-1 rounded-r-lg ${
              disableNext ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            Next
          </button>
        ) : (
          <ArrowRightCircleIcon
            className={`w-5 h-5 text-primary hover:text-primary-dark transition-colors cursor-pointer ${page === totalPages ? "opacity-30 pointer-events-none" : ""}`}
            onClick={() => {
              if (page < totalPages) {
                onPageChange(page + 1);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
