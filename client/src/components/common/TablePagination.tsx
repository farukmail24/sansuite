import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown 
} from "lucide-react";

export const ALL_PAGE_SIZE = 999999;

export interface SortOption {
  label: string;
  value: string;
}

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: (number | "All")[];
  itemName?: string;
  className?: string;
  // Sorting options
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc") => void;
  sortOptions?: SortOption[];
}

/**
 * Universal TablePagination Component for SanSuite.
 * Use across all data tables and lists in Practice Management, Bookkeeping, Admin, etc.
 */
export default function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 75, 100, "All"],
  itemName = "Records",
  className = "",
  sortBy,
  sortOrder = "desc",
  onSortChange,
  sortOptions,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  if (totalItems === 0) return null;

  return (
    <div
      className={`bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 ${className}`}
    >
      <div>
        Displaying <strong>{startItem}</strong> to <strong>{endItem}</strong> of{" "}
        <strong>{totalItems}</strong> {itemName}
      </div>

      <div className="flex items-center gap-3">
        {/* Optional Sorting Controls */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
            <span className="text-slate-400 flex items-center gap-1">
              <ArrowUpDown size={12} />
              Sort:
            </span>
            <select
              value={sortBy || sortOptions[0].value}
              onChange={(e) => onSortChange(e.target.value, sortOrder || "desc")}
              className="border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onSortChange(sortBy || sortOptions[0].value, sortOrder === "asc" ? "desc" : "asc")}
              className="p-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              title={`Sort ${sortOrder === "asc" ? "Ascending (click for Descending)" : "Descending (click for Ascending)"}`}
            >
              {sortOrder === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            </button>
          </div>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={pageSize >= ALL_PAGE_SIZE ? ALL_PAGE_SIZE : pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs focus:outline-hidden focus:ring-1 focus:ring-purple-500"
            >
              {pageSizeOptions.map((opt) => {
                const isAll = opt === "All";
                const val = isAll ? ALL_PAGE_SIZE : opt;
                return (
                  <option key={String(opt)} value={val}>
                    {isAll ? "All" : opt}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="p-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
            title="First Page"
          >
            <ChevronsLeft size={14} />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5"
          >
            <ChevronLeft size={13} />
            <span>Previous</span>
          </button>

          {/* Current Page indicator */}
          <span className="px-2.5 font-bold text-slate-700 dark:text-slate-200">
            Page {currentPage} of {totalPages}
          </span>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5"
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="p-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
            title="Last Page"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
