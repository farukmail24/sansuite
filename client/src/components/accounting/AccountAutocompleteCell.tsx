import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

export interface AccountOption {
  id?: number;
  code: string;
  name: string;
  category?: string;
  group?: string;
}

interface AccountAutocompleteCellProps {
  nameValue: string;
  codeValue?: string;
  onSelect: (account: { code: string; name: string; category?: string }) => void;
  onNameChange: (name: string) => void;
  accounts: AccountOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function AccountAutocompleteCell({
  nameValue,
  codeValue,
  onSelect,
  onNameChange,
  accounts = [],
  placeholder = "Account Name",
  className = "",
  disabled = false,
}: AccountAutocompleteCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  // Calculate fixed portal coordinates to prevent clipping by overflow containers
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const minWidth = 360;
    const width = Math.max(rect.width, minWidth);
    let left = rect.left;
    if (left + width > window.innerWidth - 16) {
      left = Math.max(8, window.innerWidth - width - 16);
    }

    setCoords({
      top: placeAbove ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left,
      width,
    });
  }, []);

  // Sync internal search query when external value changes
  useEffect(() => {
    setQuery(nameValue || "");
  }, [nameValue]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInput = inputRef.current && inputRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedInput && !clickedDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update position on open, scroll, or resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Filter accounts by query matching name or code
  const filteredAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return accounts.slice(0, 10);
    }
    return accounts
      .filter((acc) => {
        const nameMatch = acc.name?.toLowerCase().includes(q);
        const codeMatch = acc.code?.toLowerCase().includes(q);
        const catMatch = acc.category?.toLowerCase().includes(q);
        return nameMatch || codeMatch || catMatch;
      })
      .slice(0, 12);
  }, [accounts, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        updatePosition();
        return;
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filteredAccounts.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredAccounts.length - 1));
    } else if (e.key === "Enter") {
      if (filteredAccounts[highlightIndex]) {
        e.preventDefault();
        const selected = filteredAccounts[highlightIndex];
        onSelect({
          code: selected.code,
          name: selected.name,
          category: selected.category,
        });
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={nameValue}
        disabled={disabled}
        onChange={(e) => {
          onNameChange(e.target.value);
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightIndex(0);
          updatePosition();
        }}
        onFocus={() => {
          setQuery(nameValue || "");
          setIsOpen(true);
          setHighlightIndex(0);
          updatePosition();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${className}`}
      />

      {isOpen && filteredAccounts.length > 0 && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-in fade-in duration-75"
        >
          <div className="p-1.5 bg-slate-50 dark:bg-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
            <span>Matching Chart of Accounts ({filteredAccounts.length})</span>
            <span className="lowercase font-mono text-[9px] text-slate-400">Click or Enter to select</span>
          </div>

          {filteredAccounts.map((account, idx) => {
            const isHighlighted = idx === highlightIndex;
            return (
              <div
                key={`${account.code}-${idx}`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect({
                    code: account.code,
                    name: account.name,
                    category: account.category,
                  });
                  setIsOpen(false);
                }}
                className={`p-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                  isHighlighted
                    ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-xs">
                    {account.code}
                  </span>
                  <span className="font-medium truncate text-xs">
                    {account.name}
                  </span>
                </div>

                {account.category && (
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0 font-sans">
                    {account.category}
                  </span>
                )}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

interface NominalCodeAutocompleteCellProps {
  codeValue: string;
  nameValue?: string;
  onCodeChange: (code: string) => void;
  onSelect: (account: { code: string; name: string; category?: string }) => void;
  accounts: AccountOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NominalCodeAutocompleteCell({
  codeValue,
  nameValue,
  onCodeChange,
  onSelect,
  accounts = [],
  placeholder = "Code",
  className = "",
  disabled = false,
}: NominalCodeAutocompleteCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const minWidth = 320;
    const width = Math.max(rect.width, minWidth);
    let left = rect.left;
    if (left + width > window.innerWidth - 16) {
      left = Math.max(8, window.innerWidth - width - 16);
    }

    setCoords({
      top: placeAbove ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
      left,
      width,
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInput = inputRef.current && inputRef.current.contains(target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(target);

      if (!clickedInput && !clickedDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  const filteredAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    const q = codeValue?.trim().toLowerCase() || "";
    if (!q) return accounts.slice(0, 8);
    return accounts
      .filter((acc) => acc.code?.toLowerCase().startsWith(q) || acc.code?.toLowerCase().includes(q))
      .slice(0, 10);
  }, [accounts, codeValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        updatePosition();
        return;
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < filteredAccounts.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredAccounts.length - 1));
    } else if (e.key === "Enter") {
      if (filteredAccounts[highlightIndex]) {
        e.preventDefault();
        const selected = filteredAccounts[highlightIndex];
        onSelect({
          code: selected.code,
          name: selected.name,
          category: selected.category,
        });
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    if (codeValue && (!nameValue || !nameValue.trim())) {
      const match = accounts.find((a) => a.code.toLowerCase() === codeValue.trim().toLowerCase());
      if (match) {
        onSelect({ code: match.code, name: match.name, category: match.category });
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        value={codeValue}
        disabled={disabled}
        onChange={(e) => {
          onCodeChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(0);
          updatePosition();
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightIndex(0);
          updatePosition();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${className}`}
      />

      {isOpen && filteredAccounts.length > 0 && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-in fade-in duration-75"
        >
          {filteredAccounts.map((account, idx) => {
            const isHighlighted = idx === highlightIndex;
            return (
              <div
                key={`${account.code}-${idx}`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect({
                    code: account.code,
                    name: account.name,
                    category: account.category,
                  });
                  setIsOpen(false);
                }}
                className={`p-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                  isHighlighted
                    ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                }`}
              >
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-xs">
                  {account.code}
                </span>
                <span className="font-medium truncate text-xs text-slate-700 dark:text-slate-300">
                  {account.name}
                </span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
