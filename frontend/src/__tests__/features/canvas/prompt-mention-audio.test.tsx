// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock react-i18next before importing components that use it
const mockTranslations = {
  "node.promptMention.doubleClickToReplace": "Nhấp đôi để thay thế tham chiếu",
  "node.promptMention.clickToPlay": "{{label}} · Nhấp để phát",
};

const mockT = (key: string, options?: Record<string, unknown>): string => {
  let text = mockTranslations[key as keyof typeof mockTranslations] ?? key;
  if (options && text.includes("{{")) {
    Object.entries(options).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, String(v));
    });
  }
  return text;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: { changeLanguage: vi.fn() } }),
  initReactI18next: { type: "3rdParty" },
}));

import {
  PromptMentionEditor,
  mentionChipLabel,
  truncateChipLabel,
  type MentionCandidate,
} from "@/features/canvas/nodes/PromptMentionEditor";

const audioCandidate: MentionCandidate = {
  key: "A",
  name: "音频1",
  imageUrl: "",
  index: 1,
  audioUrl: "/static/projects/p/audio/long-voice-clip-name.mp3",
  displayName: "long-voice-clip-name.mp3",
};

describe("PromptMentionEditor — 音频引用 chip", () => {
  it("shows a 10-char-capped label but keeps the backend token (@音频1) unchanged", () => {
    const { container } = render(
      <PromptMentionEditor value="@音频1 " onChange={() => {}} candidates={[audioCandidate]} />,
    );
    const chip = container.querySelector(".mention-chip");
    expect(chip).not.toBeNull();
    // Visible label is capped at 10 chars + ellipsis.
    expect(chip?.querySelector(".mention-chip-label")?.textContent).toBe("音频_long-vo…");
    // ...but the serialized token stays the numbered name (what reaches the backend).
    expect(chip?.getAttribute("data-name")).toBe("音频1");
    // Full name remains available in the tooltip with Vietnamese translation.
    expect(chip?.getAttribute("title")).toBe("音频_long-voice-clip-name.mp3 · Nhấp để phát");
  });

  it("renders a clickable play control carrying the audio url", () => {
    const { container } = render(
      <PromptMentionEditor value="@音频1 " onChange={() => {}} candidates={[audioCandidate]} />,
    );
    const chip = container.querySelector(".mention-chip");
    expect(chip?.querySelector("[data-audio-play]")).not.toBeNull();
    expect(chip?.getAttribute("data-audio-url")).toBe(
      "/static/projects/p/audio/long-voice-clip-name.mp3",
    );
    // Title should be the Vietnamese-translated play prompt
    expect(chip?.getAttribute("title")).toBe("音频_long-voice-clip-name.mp3 · Nhấp để phát");
  });

  it("mentionChipLabel appends filename only for audio; image keeps its base label", () => {
    expect(mentionChipLabel(audioCandidate)).toBe("音频_long-voice-clip-name.mp3");
    expect(
      mentionChipLabel({ key: "I", name: "图片2", imageUrl: "x", index: 2 }),
    ).toBe("图片");
  });

  it("truncateChipLabel caps at 10 chars and leaves short labels intact", () => {
    expect(truncateChipLabel("音频_long-voice-clip-name.mp3")).toBe("音频_long-vo…");
    expect(truncateChipLabel("音频_短")).toBe("音频_短");
    expect(truncateChipLabel("1234567890")).toBe("1234567890"); // exactly 10, no ellipsis
  });
});
