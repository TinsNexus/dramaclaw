// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockTranslations: Record<string, string> = {
  "freezone.nodeContextBadges.labels.directorCombined": "Ảnh dựng đạo diễn",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => mockTranslations[key] || key,
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

import { NodeContextBadges } from "@/features/freezone/context/NodeContextBadges";

describe("NodeContextBadges", () => {
  it("does not repeat the primary context in the detail badge row", () => {
    render(
      <NodeContextBadges
        contexts={[
          {
            kind: "director_combined",
            projectId: "project-1",
            episode: 1,
            beat: 3,
            role: "director_combined",
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Ảnh dựng đạo diễn · EP1/B3")).toHaveLength(1);
  });
});
