// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { Suspense, type ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";

const listFreezoneCanvases = vi.fn();
const deleteFreezoneCanvas = vi.fn();

vi.mock("@/api/canvas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/canvas")>()),
  listFreezoneCanvases: (...args: unknown[]) => listFreezoneCanvases(...args),
  deleteFreezoneCanvas: (...args: unknown[]) => deleteFreezoneCanvas(...args),
}));

import { CanvasesTab } from "@/features/freezone/CanvasesTab";

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Components now consume i18n; a Suspense boundary lets react-i18next resolve
  // during async i18n init instead of leaving the tree suspended.
  return (
    <QueryClientProvider client={qc}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
}

describe("CanvasesTab queries", () => {
  // Components now consume i18n; ensure it has finished its async init before
  // rendering so react-i18next's useTranslation does not suspend the tree.
  beforeAll(async () => {
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()));
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shares one canvas list request across matching tabs", async () => {
    listFreezoneCanvases.mockResolvedValue([]);

    render(
      <>
        <CanvasesTab project="demo" currentCanvasId="user_admin_demo" hasPresetLabel={false} />
        <CanvasesTab project="demo" currentCanvasId="user_admin_demo" hasPresetLabel={false} />
      </>,
      { wrapper },
    );

    await vi.waitFor(() => expect(listFreezoneCanvases).toHaveBeenCalledTimes(1));
  });
});
