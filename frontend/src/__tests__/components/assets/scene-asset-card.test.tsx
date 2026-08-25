// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18next from "i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { SceneAssetCard } from "@/components/assets/scene-asset-card";
import type { SceneAsset } from "@/types/scene";

const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "vi",
    fallbackLng: "vi",
    resources: {
      vi: {
        translation: {
          common: {
            cancel: "取消",
          },
          assets: {
            common: {
              edit: "Sửa",
              delete: "Xoá",
              generated: "đã tạo",
              missing: "chưa tạo",
            },
            scenes: {
              master: "Ảnh gốc",
              pano: "Toàn cảnh 360",
              uploadMaster: "Tải lên ảnh gốc",
              generateMaster: "Tạo ảnh gốc",
              regenerateMaster: "Tạo lại ảnh gốc",
              deleteMaster: "Xoá ảnh gốc",
              reverse: "Mặt sau",
              generateReverse: "Tạo mặt sau",
              regenerateReverse: "Tạo lại mặt sau",
              uploadPano: "Tải lên/thay 360",
              generatePanoFromText: "Tạo 360",
              generatePanoFromMaster: "Tạo 360",
              generatePanoFromMasterReverse: "Tạo 360",
              deletePano: "Xoá 360",
              openPanoViewer: "Mở trình xem 360",
              noMaster: "Chưa tạo ảnh mặt trước",
              noReverse: "Chưa tạo ảnh mặt sau",
              noPano: "Chưa tạo ảnh toàn cảnh 360",
              stage: {
                title: "Director World",
                customWorld: "Director World tuỳ chỉnh ✅",
                masterWorld: "Director World mặt trước ✅",
                reverseWorld: "Director World mặt sau ✅",
                panoWorld: "Director World 360 ✅",
                uploadCustom: "Tải lên/thay gói tuỳ chỉnh",
                deleteCustom: "Xoá gói tuỳ chỉnh",
                masterToPly: "Mặt trước→Director World",
                reverseToPly: "Mặt sau→Director World",
                panoToPly: "360→Director World",
                singleFaceFeature: "场景单面转 SOG",
                panoFeature: "场景全景转 SOG",
                confirmTitle: "确认启动转换",
                confirmDescription: "{{feature}}，确认后将立即启动任务。",
                confirmAction: "确认并启动",
                openWorld: "Mở Director World",
                worldNotReady: "Director World (phim trường chưa sẵn sàng)",
              },
            },
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
});

function renderCard(scene: SceneAsset, overrides = {}) {
  const handlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onUploadMaster: vi.fn(),
    onGenerateMaster: vi.fn(),
    onDeleteMaster: vi.fn(),
    onGenerateReverse: vi.fn(),
    onUploadPano: vi.fn(),
    onGeneratePano: vi.fn(),
    onDeletePano: vi.fn(),
    onOpenPanoViewer: vi.fn(),
    onOpenStageViewer: vi.fn(),
    onOpenFreezone: vi.fn(),
    onUploadCustomPackage: vi.fn(),
    onDeleteCustomPackage: vi.fn(),
    onGenerateStagePly: vi.fn(),
    singleFaceStageCost: "6",
    panoStageCost: "8",
    ...overrides,
  };
  render(
    <I18nextProvider i18n={i18n}>
      <SceneAssetCard scene={scene} {...handlers} />
    </I18nextProvider>,
  );
  return handlers;
}

describe("SceneAssetCard", () => {
  it("renders master, 360, and active Director World controls", () => {
    const handlers = renderCard({
      name: "皇宫大殿",
      scene_type: "interior",
      environment_prompt: "金色宫灯、朱红立柱、纵深空间",
      description: "",
      aliases: [],
      notes: "",
      master_url: "/static/u/p/assets/scenes/hall/master.png",
      reverse_master_url: "/static/u/p/assets/scenes/hall/reverse_master.png",
      pano_url: "/static/u/p/director_worlds/hall/v1/pano_360.png",
      stage_3gs: {
        stage_dir: "/tmp/director_worlds/hall/v1",
        manifest_ready: true,
        source: "custom_scene",
        active_source: "custom",
        active: {
          ready: true,
          path: "/tmp/director_worlds/hall/v1/custom.sog",
          url: "/static/u/p/director_worlds/hall/v1/custom.sog",
          size_bytes: 1048576,
          size_mb: 1,
        },
        custom: {
          ready: true,
          path: "/tmp/director_worlds/hall/v1/custom.sog",
          url: "/static/u/p/director_worlds/hall/v1/custom.sog",
          size_bytes: 1048576,
          size_mb: 1,
        },
        master: {
          ready: true,
          path: "/tmp/director_worlds/hall/v1/master_sharp.ply",
          url: "/static/u/p/director_worlds/hall/v1/master_sharp.ply",
          size_bytes: 2048,
          size_mb: 0,
        },
        reverse: {
          ready: false,
          path: "",
          url: "",
          size_bytes: 0,
          size_mb: 0,
        },
        pano: {
          ready: true,
          path: "/tmp/director_worlds/hall/v1/pano_depth.ply",
          url: "/static/u/p/director_worlds/hall/v1/pano_depth.ply",
          size_bytes: 4096,
          size_mb: 0,
        },
      },
    });

    expect(screen.getByText("皇宫大殿")).toBeInTheDocument();
    expect(screen.getByText("Ảnh gốc")).toBeInTheDocument();
    expect(screen.getByText("Mặt sau")).toBeInTheDocument();
    expect(screen.getByText("Toàn cảnh 360")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lên ảnh gốc" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo lại ảnh gốc" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo lại mặt sau" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lên/thay 360" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo 360" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xoá 360" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở trình xem 360" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở Director World" })).toBeInTheDocument();
    expect(screen.getByText("Director World")).toBeInTheDocument();
    expect(screen.queryByText(/hiện tại/)).not.toBeInTheDocument();
    expect(screen.getByText("Director World tuỳ chỉnh ✅")).toBeInTheDocument();
    expect(screen.getByText("Director World mặt trước ✅")).toBeInTheDocument();
    expect(screen.getByText("Director World 360 ✅")).toBeInTheDocument();
    expect(screen.queryByText("/tmp/director_worlds/hall/v1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lên/thay gói tuỳ chỉnh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xoá gói tuỳ chỉnh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mặt trước→Director World" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mặt sau→Director World" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "360→Director World" })).toBeInTheDocument();
    expect(screen.queryByText(/voxel/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DirectorStage/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tạo lại mặt sau" }));
    expect(handlers.onGenerateReverse).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Tạo 360" }));
    expect(handlers.onGeneratePano).toHaveBeenCalledWith("master");

    fireEvent.click(screen.getByRole("button", { name: "Xoá 360" }));
    expect(handlers.onDeletePano).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Mở trình xem 360" }));
    expect(handlers.onOpenPanoViewer).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Mở Director World" }));
    expect(handlers.onOpenStageViewer).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Mặt trước→Director World" }));
    expect(handlers.onGenerateStagePly).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "场景单面转 SOG，确认后将立即启动任务。",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("6");
    fireEvent.click(screen.getByRole("button", { name: "确认并启动" }));
    expect(handlers.onGenerateStagePly).toHaveBeenCalledWith("master");

    fireEvent.click(screen.getByRole("button", { name: "360→Director World" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "场景全景转 SOG，确认后将立即启动任务。",
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent("8");
    fireEvent.click(screen.getByRole("button", { name: "确认并启动" }));
    expect(handlers.onGenerateStagePly).toHaveBeenCalledWith("pano");
  });

  it("disables Director World conversion when the organization price is unavailable", () => {
    renderCard(
      {
        name: "皇宫大殿",
        scene_type: "interior",
        environment_prompt: "",
        description: "",
        aliases: [],
        notes: "",
        master_url: "/static/master.png",
        reverse_master_url: "/static/reverse.png",
        pano_url: "/static/pano.png",
      },
      {
        singleFaceStageCost: "需配置",
        singleFaceStageDisabledReason: "计费规则未配置，请联系管理员设置积分规则",
        panoStageCost: "需配置",
        panoStageDisabledReason: "计费规则未配置，请联系管理员设置积分规则",
      },
    );

    expect(screen.getByRole("button", { name: "master→导演世界" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "reverse→导演世界" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "360→导演世界" })).toBeDisabled();
  });

  it("falls back to text-to-360 when master is missing", () => {
    const handlers = renderCard({
      name: "雨夜巷口",
      scene_type: "exterior",
      environment_prompt: "",
      description: "潮湿的巷口和霓虹灯",
      aliases: [],
      notes: "",
    });

    expect(screen.getByText("Chưa tạo ảnh mặt trước")).toBeInTheDocument();
    expect(screen.getByText("Chưa tạo ảnh mặt sau")).toBeInTheDocument();
    expect(screen.getByText("Chưa tạo ảnh toàn cảnh 360")).toBeInTheDocument();
    const generate = screen.getByRole("button", { name: "Tạo 360" });
    fireEvent.click(generate);
    expect(handlers.onGeneratePano).toHaveBeenCalledWith("text");
  });

  it("allows opening Director World even when no scene source exists yet", () => {
    const handlers = renderCard({
      name: "公寓楼家门口",
      scene_type: "exterior",
      environment_prompt: "",
      description: "",
      aliases: [],
      notes: "",
    });

    expect(screen.queryByText(/hiện tại/)).not.toBeInTheDocument();
    expect(screen.queryByText("Director World (phim trường chưa sẵn sàng)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mở Director World" }));
    expect(handlers.onOpenStageViewer).toHaveBeenCalledOnce();
  });

  it("renders scene type badges in Chinese", () => {
    renderCard({
      name: "雨夜巷口",
      scene_type: "exterior",
      environment_prompt: "",
      description: "",
      aliases: [],
      notes: "",
    });

    expect(screen.getByText("室外")).toBeInTheDocument();
    expect(screen.queryByText("exterior")).not.toBeInTheDocument();
  });
});
