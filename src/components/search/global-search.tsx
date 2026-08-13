"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, FileText, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/data/search";

const KIND_ICON = { client: Users, job_order: Briefcase, quotation: FileText } as const;
const KIND_LABEL = { client: "Clients", job_order: "Job orders", quotation: "Quotations" } as const;

/**
 * SPEC §10: "Global search (⌘K across clients/JOs/quotes)." Mounted once
 * in the topbar (present on every authenticated page), owns both the
 * visible trigger button and the ⌘K keyboard shortcut so there's exactly
 * one place that listens for the shortcut.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      return;
    }
    // Radix focuses the dialog panel by default; steal focus back to the input.
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function navigateTo(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    }
  }

  const grouped = (["client", "job_order", "quotation"] as const)
    .map((kind) => ({ kind, items: results.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </Button>
      <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setOpen(true)} className="sm:hidden">
        <Search className="size-4.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 p-0" showCloseButton={false}>
          <VisuallyHidden>
            <DialogTitle>Search</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, job orders, quotations…"
              className="h-12 border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-96 overflow-y-auto p-1">
            {query.trim().length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : isLoading ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;.</p>
            ) : (
              grouped.map((group) => {
                const Icon = KIND_ICON[group.kind];
                return (
                  <div key={group.kind} className="mb-1">
                    <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {KIND_LABEL[group.kind]}
                    </p>
                    {group.items.map((r) => {
                      const globalIndex = results.indexOf(r);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => navigateTo(r)}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm",
                            globalIndex === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                          {r.subtitle && <span className="shrink-0 truncate text-xs text-muted-foreground">{r.subtitle}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
