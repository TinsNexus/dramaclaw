// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { useEffect, useState } from "react";
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

// Tailwind arbitrary-variant styling for the rendered markdown (headings, tables,
// lists, code, links, blockquotes) — the manual is table-heavy.
const MARKDOWN_CLASS = [
  "text-sm leading-6 text-foreground/85",
  "[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground",
  "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground",
  "[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground",
  "[&_h4]:mt-3 [&_h4]:font-medium",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-lg bg-black sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("userManual.title")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[72vh] [&_[data-slot=scroll-area-scrollbar]]:w-1.5 [&_[data-slot=scroll-area-thumb]]:bg-white/15">
          <div className="pr-3">
            {error ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("userManual.loadError")}
              </p>
            ) : content === null ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("userManual.loading")}
              </p>
            ) : (
              <div className={MARKDOWN_CLASS}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
