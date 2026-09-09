"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Mic, Clock, TrendingUp, Tag, Package } from "lucide-react";
import { fetchSearchRecommendations, type SearchRecommendation } from "../lib/storeApi";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFocusCatalog?: () => void;
  onSelectProduct?: (productId: string) => void;
  onSelectCategory?: (categoryName: string) => void;
  placeholder?: string;
  compact?: boolean;
};

export default function SearchBarWithRecommendations({
  value,
  onChange,
  onFocusCatalog,
  onSelectProduct,
  onSelectCategory,
  placeholder = "Search fresh spinach, mangoes, milk...",
  compact = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popular, setPopular] = useState<SearchRecommendation[]>([]);
  const [suggestions, setSuggestions] = useState<SearchRecommendation[]>([]);

  const loadRecommendations = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const data = await fetchSearchRecommendations(query);
      setPopular(data.popular);
      setSuggestions(data.suggestions);
    } catch {
      setPopular([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadRecommendations(value);
    }, value ? 180 : 0);
    return () => window.clearTimeout(timer);
  }, [value, open, loadRecommendations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchRecommendation) => {
    onChange(item.query);
    onFocusCatalog?.();
    setOpen(false);

    if (item.type === "product" && item.id) {
      onSelectProduct?.(item.id);
      return;
    }
    if (item.type === "category") {
      onSelectCategory?.(item.label);
    }
  };

  const showPopular = value.trim().length === 0;
  const items = showPopular ? popular : suggestions;

  const renderItem = (item: SearchRecommendation, index: number) => {
    const Icon = item.type === "category" ? Tag : item.type === "query" ? Clock : Package;
    return (
      <button
        key={`${item.type}-${item.id || item.label}-${index}`}
        type="button"
        className="search-rec-item"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => handleSelect(item)}
      >
        <div className="search-rec-thumb">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" loading="lazy" />
          ) : (
            <Icon size={compact ? 14 : 16} />
          )}
        </div>
        <div className="search-rec-copy">
          <span className="search-rec-label">{item.label}</span>
          {item.subtitle ? <span className="search-rec-sub">{item.subtitle}</span> : null}
        </div>
        <span className="search-rec-type">
          {item.type === "category" ? "Category" : item.type === "query" ? "Search" : "Product"}
        </span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="search-rec-root" style={{ position: "relative", width: "100%" }}>
      <Search
        size={compact ? 17 : 18}
        style={{ position: "absolute", left: compact ? "14px" : "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", zIndex: 2 }}
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onFocusCatalog?.();
          setOpen(true);
        }}
        onFocus={() => {
          onFocusCatalog?.();
          setOpen(true);
        }}
        className="search-bar-premium"
        style={{
          paddingRight: "40px",
          height: compact ? "44px" : undefined,
          fontSize: compact ? "14px" : undefined,
        }}
        autoComplete="off"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      <Mic
        size={compact ? 17 : 16}
        style={{ position: "absolute", right: compact ? "14px" : "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-4)", cursor: "pointer", zIndex: 2 }}
        onClick={() => alert("Voice search coming soon")}
      />

      {open && (
        <div className="search-rec-panel" role="listbox">
          <div className="search-rec-header">
            {showPopular ? (
              <>
                <TrendingUp size={14} />
                <span>Popular searches</span>
              </>
            ) : (
              <>
                <Search size={14} />
                <span>Suggestions for &ldquo;{value.trim()}&rdquo;</span>
              </>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="search-rec-empty">Finding matches…</div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="search-rec-empty">No matches found. Try another item or category.</div>
          ) : (
            items.map(renderItem)
          )}
        </div>
      )}
    </div>
  );
}
