// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
//
// Copies the Vietnamese user manual into public/ so the running app can fetch it
// (the in-app "Hướng dẫn sử dụng" dialog loads /docs/user-manual-vi.md).
// Runs at the start of `dev` / `build` so the served copy stays in sync with the
// canonical source in docs/vi/. pnpm disables pre/post scripts by default, so this
// is chained into the scripts directly rather than relying on a `predev` hook.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../docs/vi/product-user-manual.md");
const dest = resolve(here, "../public/docs/user-manual-vi.md");

if (!existsSync(src)) {
  console.warn(`[copy-user-manual] source not found, skipping: ${src}`);
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-user-manual] docs/vi/product-user-manual.md → public/docs/user-manual-vi.md");
