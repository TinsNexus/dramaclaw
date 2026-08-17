// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab

// 语言清单与归一化逻辑单独成模块：`@/i18n` 在导入时就会跑 i18n.init()，
// 组件若为了拿 normalize 而导入它，单测里 mock 掉 react-i18next 就会炸
// （initReactI18next 不存在）。这里保持无副作用，组件只依赖本文件。
export const SUPPORTED = ["vi", "zh", "en"] as const;
export type Supported = (typeof SUPPORTED)[number];

// Ngôn ngữ mặc định của ứng dụng: dùng khi chưa có lựa chọn nào được lưu,
// và làm fallback cho mọi mã ngôn ngữ không nằm trong SUPPORTED.
export const DEFAULT_LANGUAGE: Supported = "vi";

export function normalize(lng: string | undefined): Supported {
  const two = (lng ?? "").slice(0, 2).toLowerCase();
  return (SUPPORTED as readonly string[]).includes(two)
    ? (two as Supported)
    : DEFAULT_LANGUAGE;
}
