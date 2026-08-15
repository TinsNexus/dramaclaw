// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { describe, expect, it } from "vitest";

import { videoModeDisabledReason } from "@/features/canvas/nodes/VideoOperationsPanel";

const NONE = { videos: 0, images: 0, audios: 0 };
/** i18n-ized: the function now returns i18n keys; assert on keys via an identity t. */
const t = (key: string): string => key;

/** 目录里声明了 video_edit 的非 HappyHorse 模型（seedance-2.0-mini / 2.5 这一类）。 */
const WITH_VIDEO_EDIT = [
  "text_to_video",
  "first_frame",
  "first_last_frame",
  "all_reference",
  "image_reference",
  "video_edit",
];
/** 没有 video_edit 的 Seedance 2.0。 */
const WITHOUT_VIDEO_EDIT = [
  "text_to_video",
  "first_frame",
  "first_last_frame",
  "all_reference",
  "image_reference",
];

describe("videoModeDisabledReason — 上游接了视频时的模式可用性", () => {
  it("接 1 个视频时「视频编辑」可选（模型声明了 video_edit）", () => {
    expect(
      videoModeDisabledReason(
        "videoEdit",
        "seedance-2.0-mini",
        { ...NONE, videos: 1 },
        WITH_VIDEO_EDIT,
        t,
      ),
    ).toBeNull();
  });

  it("接了视频时其余模式仍被拦，且提示里带上「视频编辑」这条出路", () => {
    for (const mode of ["textToVideo", "firstFrame", "firstLastFrame", "imageReference"] as const) {
      expect(
        videoModeDisabledReason(mode, "seedance-2.0-mini", { ...NONE, videos: 1 }, WITH_VIDEO_EDIT, t),
      ).toBe("node.operationPanel.modeError.videoOnlyAllRefOrEdit");
    }
    expect(
      videoModeDisabledReason(
        "allReference",
        "seedance-2.0-mini",
        { ...NONE, videos: 1 },
        WITH_VIDEO_EDIT,
        t,
      ),
    ).toBeNull();
  });

  it("模型没有 video_edit 时提示不提这条出路", () => {
    expect(
      videoModeDisabledReason(
        "textToVideo",
        "seedance-2.0",
        { ...NONE, videos: 1 },
        WITHOUT_VIDEO_EDIT,
        t,
      ),
    ).toBe("node.operationPanel.modeError.videoOnlyAllRef");
  });

  it("没接视频时「视频编辑」提示去连一个", () => {
    expect(
      videoModeDisabledReason("videoEdit", "seedance-2.0-mini", NONE, WITH_VIDEO_EDIT, t),
    ).toBe("node.operationPanel.modeError.videoRequired.single");
  });

  it("接了多个视频时「视频编辑」不可用", () => {
    expect(
      videoModeDisabledReason(
        "videoEdit",
        "seedance-2.0-mini",
        { ...NONE, videos: 2 },
        WITH_VIDEO_EDIT,
        t,
      ),
    ).toBe("node.operationPanel.modeError.videoTooMany");
  });

  it("模型不支持视频编辑时说清楚是模型的事，不是上游的事", () => {
    expect(
      videoModeDisabledReason(
        "videoEdit",
        "seedance-2.0",
        { ...NONE, videos: 1 },
        WITHOUT_VIDEO_EDIT,
        t,
      ),
    ).toBe("node.operationPanel.modeError.modelNotSupportVideoEdit");
  });

  /** HappyHorse 走它自己那套分支，这次改动不能动到它。 */
  it("HappyHorse 的既有判定不受影响", () => {
    expect(
      videoModeDisabledReason("videoEdit", "happyhorse-1.0", { ...NONE, videos: 1 }, undefined, t),
    ).toBeNull();
    expect(videoModeDisabledReason("videoEdit", "happyhorse-1.0", NONE, undefined, t)).toBe(
      "node.operationPanel.modeError.videoRequired.single",
    );
    expect(
      videoModeDisabledReason("textToVideo", "happyhorse-1.0", { ...NONE, videos: 1 }, undefined, t),
    ).toBe("node.operationPanel.modeError.videoConnected.useVideoEdit");
  });
});
