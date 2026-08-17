// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const MANUAL_URL = "/docs/user-manual-vi.md";

interface TocItem {
  id: string;
  text: string;
  level: number; // 1 | 2 | 3
}

// Strip Vietnamese (and other) diacritics so the contents search matches
// regardless of accents — typing "tim" finds "Tìm".
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// Parse the ATX headings (#, ##, ###) straight from the markdown source, skipping
// fenced code blocks so `# comment` lines inside ``` don't become entries. Ids are
// assigned by document order (manual-h-0, -1, …) and mirrored onto the rendered
// headings via a matching counter below — so navigation never depends on DOM/raf
// timing. h4+ are intentionally excluded (kept out of both the list and the count).
function parseToc(md: string): TocItem[] {
  const items: TocItem[] = [];
  let inFence = false;
  let i = 0;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "").trim();
    if (text) items.push({ id: `manual-h-${i}`, text, level: m[1].length });
    i++;
  }
  return items;
}

// Tailwind arbitrary-variant styling for the rendered markdown (headings, tables,
// lists, code, links, blockquotes) — the manual is table-heavy. scroll-mt keeps a
// heading clear of the top edge when jumped to from the contents panel.
const MARKDOWN_CLASS = [
  "text-sm leading-6 text-foreground/85",
  "[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground",
  "[&_h4]:mt-3 [&_h4]:font-medium",
  "[&_h1]:scroll-mt-3 [&_h2]:scroll-mt-3 [&_h3]:scroll-mt-3",
  "[&_p]:my-2",
  "[&_a]:text-sky-400 [&_a:hover]:underline",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
  "[&_hr]:my-4 [&_hr]:border-white/10",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-3 [&_blockquote]:text-foreground/75",
  "[&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[12px]",
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-white/[0.03] [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:my-3 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse",
  "[&_th]:border [&_th]:border-white/10 [&_th]:bg-white/[0.04] [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium",
  "[&_td]:border [&_td]:border-white/10 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
].join(" ");

export function UserManualDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || content !== null) return;
    let cancelled = false;
    fetch(MANUAL_URL)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, content]);

  const toc = useMemo(() => (content ? parseToc(content) : []), [content]);

  const filteredToc = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return toc;
    return toc.filter((it) => fold(it.text).includes(q));
  }, [toc, query]);

  // Tag rendered headings with document-order ids matching parseToc's counter,
  // so a contents click can find them. Done as a post-commit DOM pass (not via
  // custom markdown components) to avoid render-counter drift under StrictMode /
  // re-renders; it's an idempotent id assignment, no React state involved.
  useLayoutEffect(() => {
    if (!open || content === null) return;
    const root = contentRef.current;
    if (!root) return;
    root.querySelectorAll("h1, h2, h3").forEach((el, i) => {
      (el as HTMLElement).id = `manual-h-${i}`;
    });
  }, [open, content]);

  const jumpTo = (itemId: string) => {
    const el = contentRef.current?.querySelector(`#${CSS.escape(itemId)}`) as HTMLElement | null;
    if (!el) return;
    // scrollIntoView doesn't reliably drive the base-ui ScrollArea viewport, so
    // scroll the viewport directly to the heading's offset within it.
    const viewport = el.closest('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (!viewport) {
      el.scrollIntoView({ block: "start" });
      return;
    }
    // Sum offsetTop up the offsetParent chain (layout px) rather than deriving
    // from getBoundingClientRect (visual px) — the viewport content can be scaled
    // and the two coordinate spaces then disagree. base-ui also ignores
    // behavior:"smooth", so jump instantly.
    let top = 0;
    let node: HTMLElement | null = el;
    while (node && node !== viewport && viewport.contains(node)) {
      top += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    viewport.scrollTo({ top: Math.max(0, top - 8), behavior: "auto" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl rounded-lg bg-black sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t("userManual.title")}</DialogTitle>
        </DialogHeader>

        {error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("userManual.loadError")}
          </p>
        ) : content === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("userManual.loading")}
          </p>
        ) : (
          <div className="flex min-h-0 gap-4">
            {/* Contents / quick-find panel */}
            <nav className="hidden w-60 shrink-0 flex-col md:flex">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("userManual.toc")}
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("userManual.tocSearch")}
                className="mb-2 w-full rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-white/25"
              />
              <ScrollArea className="max-h-[74vh] flex-1 pr-2 [&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-thumb]]:bg-white/15">
                <ul className="space-y-0.5">
                  {filteredToc.length === 0 ? (
                    <li className="px-1 py-2 text-xs text-muted-foreground">
                      {t("userManual.tocEmpty")}
                    </li>
                  ) : (
                    filteredToc.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => jumpTo(item.id)}
                          className={[
                            "block w-full truncate rounded px-2 py-1 text-left text-xs text-foreground/70 hover:bg-white/[0.06] hover:text-foreground",
                            item.level === 1 && "font-semibold text-foreground/90",
                            item.level === 3 && "pl-4 text-foreground/55",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          title={item.text}
                        >
                          {item.text}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            </nav>

            {/* Manual body */}
            <ScrollArea className="max-h-[82vh] flex-1 [&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-thumb]]:bg-white/15">
              <div ref={contentRef} className={`pr-3 ${MARKDOWN_CLASS}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
