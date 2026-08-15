// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider, initReactI18next } from "react-i18next";
import i18next from "i18next";
import { http, HttpResponse } from "msw";
import ky from "ky";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/__mocks__/msw/server";

vi.mock("@/lib/api", () => ({
  api: ky.create({ baseUrl: "http://localhost:3000/" }),
}));

const taskControllerMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-task-controller", () => ({
  useTaskController: (opts: unknown) => taskControllerMock(opts),
}));

const directorDialogPropsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/viewer-kit/three-d/ThreeDDirectorDialog", () => ({
  ThreeDDirectorDialog: (props: any) => {
    directorDialogPropsMock(props);
    return props.open ? (
      <button
        type="button"
        onClick={() =>
          props.onSaveScene?.(
            {
              schemaVersion: 1,
              world: { activeSourceId: "scene-pano:Hall" },
              actors: [],
              props: [],
              stagings: [],
            },
            "scene-pano:Hall",
          )
        }
      >
        mock-save-scene-world
      </button>
    ) : null;
  },
}));

import { PropsPanel } from "@/components/assets/props-panel";
import { ScenesPanel } from "@/components/assets/scenes-panel";
import {
  AssetHeaderActionsSlotProvider,
  AssetHeaderActionsTarget,
} from "@/components/assets/asset-header-actions-slot";

const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "vi",
    fallbackLng: "vi",
    resources: {
      vi: {
        translation: {
          common: {
            cancel: "Huỷ",
            loading: "Đang tải...",
            refresh: "Làm mới",
            save: "Lưu",
            edit: "Sửa",
          },
          assets: {
            common: {
              delete: "Xoá",
              edit: "Sửa",
              generated: "đã tạo",
              missing: "chưa tạo",
              sortLabel: "Sắp xếp",
            },
            scenes: {
              title: "Quản lý bối cảnh",
              count: "{{count}} bối cảnh",
              build: "Dựng từ đồ thị",
              buildDisabledByDerivedScenes:
                "Hiện đang có bối cảnh phái sinh, tạm chưa hỗ trợ dựng lại toàn bộ.",
              newScene: "Bối cảnh mới",
              newPlate: "Thêm biến thể bối cảnh",
              editScene: "Sửa bối cảnh",
              editPlate: "Sửa biến thể bối cảnh",
              derivedFrom: "Phái sinh từ {{base}}",
              emptyTitle: "Chưa có dữ liệu bối cảnh",
              emptyDescription: "Tạo bối cảnh mới, hoặc tự động trích xuất bối cảnh của dự án từ đồ thị.",
              confirmDelete: "Xoá bối cảnh \"{{name}}\"?",
              deleted: "Đã xoá bối cảnh",
              master: "Ảnh gốc",
              pano: "Toàn cảnh 360",
              reverse: "Mặt sau",
              uploadMaster: "Tải lên ảnh gốc",
              generateMaster: "Tạo ảnh gốc",
              regenerateMaster: "Tạo lại ảnh gốc",
              deleteMaster: "Xoá ảnh gốc",
              generateReverse: "Tạo mặt sau",
              regenerateReverse: "Tạo lại mặt sau",
              uploadPano: "Tải lên/thay 360",
              generatePanoFromText: "Tạo 360",
              generatePanoFromMaster: "Tạo 360",
              generatePanoFromMasterReverse: "Tạo 360",
              deletePano: "Xoá 360",
              selectScene: "Chọn bối cảnh {{name}}",
              generatedPlateName: "Tên tài nguyên",
              generatedPlateNamePlaceholder: "Tự động tạo sau khi điền biến thể hoặc thời gian",
              stage: {
                openWorld: "Mở Director World",
              },
              openPanoViewer: "Mở trình xem 360",
              fields: {
                name: "Tên bối cảnh",
                type: "Loại bối cảnh",
                nameRule:
                  "Bối cảnh độc lập thông thường chỉ điền tên; đừng điền biến thể hay thời gian ở đây. Khi cần bản trạng thái/thời gian, hãy thêm biến thể trong chi tiết bối cảnh.",
                environmentPrompt: "Prompt mô tả môi trường",
                variantPrompt: "Prompt gia tăng cho biến thể",
                variantPlaceholder: "Rò rỉ nước",
                description: "Mô tả tường thuật",
                baseScene: "Bối cảnh cơ sở",
                variant: "Biến thể",
                timeOfDay: "Thời gian",
              },
            },
            props: {
              title: "Quản lý đạo cụ",
              count: "{{count}} đạo cụ",
              newProp: "Đạo cụ mới",
              editProp: "Sửa đạo cụ",
              emptyTitle: "Chưa có dữ liệu đạo cụ",
              emptyDescription: "Tạo đạo cụ mới, hoặc đưa đạo cụ của tập này vào kho chung ở trang beat.",
              confirmDelete: "Xoá đạo cụ \"{{name}}\"?",
              deleted: "Đã xoá đạo cụ",
              reference: "Ảnh tham chiếu",
              noReference: "Chưa tạo ảnh tham chiếu",
              generateReference: "Tạo ảnh tham chiếu",
              regenerateReference: "Tạo lại ảnh tham chiếu",
              owner: "Nhân vật sở hữu",
              types: {
                weapon: "Vũ khí",
                accessory: "Trang sức",
                artifact: "Thần khí/pháp khí",
                document: "Văn thư",
                furniture: "Nội thất",
                object: "Vật thể khác",
              },
              fields: {
                name: "Tên đạo cụ",
                type: "Loại đạo cụ",
                owner: "Nhân vật sở hữu",
                visualPrompt: "Prompt hình ảnh",
              },
            },
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
});

function idleTaskController() {
  return {
    started: false,
    stream: {
      status: "idle",
      progress: 0,
      currentTask: "",
      result: null,
      error: null,
      logs: [],
    },
    logs: [],
    start: vi.fn(),
    stop: vi.fn(),
    stopping: false,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  taskControllerMock.mockReset();
  taskControllerMock.mockImplementation(() => idleTaskController());
});

function renderWithProviders(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>
        <AssetHeaderActionsSlotProvider>
          <AssetHeaderActionsTarget />
          {ui}
        </AssetHeaderActionsSlotProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe("asset panel rename behavior", () => {
  it("sends the edited scene name in PATCH payload", async () => {
    let patchBody: unknown = null;
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [{ name: "Hall", scene_type: "interior", environment_prompt: "wide hall" }],
        }),
      ),
      http.patch("http://localhost:3000/api/v1/projects/demo/scenes/Hall", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({
          ok: true,
          data: { name: "GrandHall", scene_type: "interior", environment_prompt: "wide hall" },
        });
      }),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    expect(await screen.findAllByText("Hall")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByDisplayValue("Hall"), {
      target: { value: "GrandHall" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).toMatchObject({ name: "GrandHall" });
  });

  it("shows scene naming rules and submits the selected Chinese scene type as canonical value", async () => {
    const user = userEvent.setup();
    let postBody: unknown = null;
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({ ok: true, data: [] }),
      ),
      http.post("http://localhost:3000/api/v1/projects/demo/scenes", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({
          ok: true,
          data: { name: "Bathroom_Leak", scene_type: "exterior" },
        });
      }),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    await user.click(await screen.findByRole("button", { name: "Bối cảnh mới" }));
    expect(
      screen.getByText(
        "Bối cảnh độc lập thông thường chỉ điền tên; đừng điền biến thể hay thời gian ở đây. Khi cần bản trạng thái/thời gian, hãy thêm biến thể trong chi tiết bối cảnh.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tên bối cảnh"), {
      target: { value: "Bathroom_Leak" },
    });
    await user.click(screen.getByRole("combobox", { name: "Loại bối cảnh" }));
    await user.click(await screen.findByRole("option", { name: "室外" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(postBody).toBeDefined());
    expect(postBody).toMatchObject({
      name: "Bathroom_Leak",
      scene_type: "exterior",
    });
  });

  it("renders extracted scene type codes as Chinese labels in the scene list", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [{ name: "Hall", scene_type: "interior", environment_prompt: "" }],
        }),
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    expect(await screen.findAllByText("Hall")).not.toHaveLength(0);
    expect(screen.getByText("室内")).toBeInTheDocument();
    expect(screen.queryByText("Loại bối cảnh")).not.toBeInTheDocument();
  });

  it("shows derived scene base labels", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            { name: "Hall", scene_type: "interior", derived_from_scene: "" },
            {
              name: "Hall_Snow",
              scene_type: "interior",
              derived_from_scene: "Hall",
            },
          ],
        }),
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    await screen.findByText("Hall_Snow");
    expect(screen.getByText("Phái sinh từ Hall")).toBeInTheDocument();
  });

  it("keeps scene variant groups compact without repeating a lower count label", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            { name: "Door", scene_type: "interior", environment_prompt: "" },
            { name: "Hall", scene_type: "interior", environment_prompt: "" },
            {
              name: "Hall_Night",
              scene_type: "interior",
              base_scene_id: "Hall",
              time_of_day: "夜晚",
              environment_prompt: "",
            },
          ],
        }),
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    expect(await screen.findAllByText("Door")).not.toHaveLength(0);
    expect(screen.queryByText("1 biến thể bối cảnh")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Chọn bối cảnh Hall" }));
    expect(screen.queryByText("2 biến thể bối cảnh")).not.toBeInTheDocument();
  });

  it("uses a character-tab style split view for scene bases and selected variants", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            { name: "Door", scene_type: "interior", environment_prompt: "" },
            { name: "Hall", scene_type: "interior", environment_prompt: "" },
            {
              name: "Hall_Night",
              scene_type: "interior",
              base_scene_id: "Hall",
              time_of_day: "夜晚",
              environment_prompt: "",
            },
          ],
        }),
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    expect(await screen.findByRole("button", { name: "Chọn bối cảnh Door" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chọn bối cảnh Hall" })).toBeInTheDocument();
    expect(screen.queryByText("Hall_Night")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Chọn bối cảnh Hall" }));

    expect(screen.getByText("Hall_Night")).toBeInTheDocument();
    expect(screen.queryByText("Door_Sáng sớm")).not.toBeInTheDocument();
  });

  it("remembers the selected scene group after the scene panel unmounts", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            { name: "Door", scene_type: "interior", environment_prompt: "" },
            { name: "Hall", scene_type: "interior", environment_prompt: "" },
            {
              name: "Hall_Night",
              scene_type: "interior",
              base_scene_id: "Hall",
              time_of_day: "夜晚",
              environment_prompt: "",
            },
          ],
        }),
      ),
    );

    const firstRender = renderWithProviders(<ScenesPanel project="demo" />);

    await screen.findByRole("button", { name: "Chọn bối cảnh Door" });
    await user.click(screen.getByRole("button", { name: "Chọn bối cảnh Hall" }));
    expect(screen.getByText("Hall_Night")).toBeInTheDocument();

    firstRender.unmount();
    renderWithProviders(<ScenesPanel project="demo" />);

    await screen.findByRole("button", { name: "Chọn bối cảnh Door" });
    expect(screen.getByRole("button", { name: "Chọn bối cảnh Hall" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Hall_Night")).toBeInTheDocument();
  });

  it("keeps the new scene dialog focused on base scenes", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({ ok: true, data: [] }),
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    await user.click(await screen.findByRole("button", { name: "Bối cảnh mới" }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByLabelText("Tên bối cảnh")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Bối cảnh cơ sở")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Biến thể")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Thời gian")).not.toBeInTheDocument();
  });

  it("creates scene variants from the selected base scene and stores only variant delta prompt", async () => {
    const user = userEvent.setup();
    let postBody: unknown = null;
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            {
              name: "Hall",
              scene_type: "interior",
              environment_prompt: "正面：wide hall\n光源：soft skylight",
              description: "base hall description",
            },
          ],
        }),
      ),
      http.post("http://localhost:3000/api/v1/projects/demo/scenes", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({
          ok: true,
          data: { name: "Hall_漏水_夜晚", scene_type: "interior" },
        });
      }),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    await screen.findByRole("button", { name: "Chọn bối cảnh Hall" });
    await user.click(screen.getByRole("button", { name: "Thêm biến thể bối cảnh" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Tự động tạo sau khi điền biến thể hoặc thời gian")).toBeInTheDocument();
    expect(within(dialog).queryByDisplayValue("wide hall")).not.toBeInTheDocument();
    expect(within(dialog).queryByDisplayValue("soft skylight")).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Biến thể"), {
      target: { value: "漏水" },
    });
    fireEvent.change(within(dialog).getByLabelText("Prompt gia tăng cho biến thể"), {
      target: { value: "floor water and dripping ceiling" },
    });
    await user.click(within(dialog).getByRole("combobox", { name: "Thời gian" }));
    await user.click(await screen.findByRole("option", { name: "夜晚" }));
    expect(within(dialog).getByText("Hall_漏水_夜晚")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(postBody).toBeDefined());
    expect(postBody).toMatchObject({
      name: "Hall_漏水_夜晚",
      base_scene_id: "Hall",
      variant_id: "漏水",
      time_of_day: "夜晚",
      variant_prompt: "floor water and dripping ceiling",
      description: "",
    });
    expect(String((postBody as { environment_prompt?: string }).environment_prompt)).not.toContain(
      "wide hall",
    );
  });

  it("allows graph scene rebuild when derived scenes exist", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            { name: "Hall", scene_type: "interior", derived_from_scene: "" },
            {
              name: "Hall_Snow",
              scene_type: "interior",
              derived_from_scene: "Hall",
            },
          ],
        }),
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    await screen.findByText("Hall_Snow");
    const buildButton = screen.getByRole("button", { name: "Dựng từ đồ thị" });
    expect(buildButton).not.toBeDisabled();
    expect(buildButton).not.toHaveAttribute("title");
  });

  it("sends the edited prop name in PATCH payload", async () => {
    let patchBody: unknown = null;
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/props", () =>
        HttpResponse.json({
          ok: true,
          data: [{ name: "Sword", prop_type: "weapon", visual_prompt: "silver sword" }],
        }),
      ),
      http.patch("http://localhost:3000/api/v1/projects/demo/props/Sword", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({
          ok: true,
          data: { name: "MoonSword", prop_type: "weapon", visual_prompt: "moonlit sword" },
        });
      }),
    );

    renderWithProviders(<PropsPanel project="demo" />);

    await screen.findByText("Sword");
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    fireEvent.change(screen.getByDisplayValue("Sword"), {
      target: { value: "MoonSword" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(patchBody).toBeDefined());
    expect(patchBody).toMatchObject({ name: "MoonSword" });
  });

  it("shows the NiceGUI prop type select label in the edit dialog", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/props", () =>
        HttpResponse.json({
          ok: true,
          data: [{ name: "TOKEN", prop_type: "artifact", visual_prompt: "digital token" }],
        }),
      ),
    );

    renderWithProviders(<PropsPanel project="demo" />);

    await screen.findByText("TOKEN");
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Thần khí/pháp khí")).toBeInTheDocument();
  });


  it("saves the asset scene Director World snapshot to the scene-level endpoint", async () => {
    const user = userEvent.setup();
    let saveBody: unknown = null;
    server.use(
      http.get("http://localhost:3000/api/v1/projects/demo/scenes", () =>
        HttpResponse.json({
          ok: true,
          data: [
            {
              name: "Hall",
              scene_type: "interior",
              pano_url: "/static/projects/demo/director_worlds/Hall/v1/pano_360.png",
              stage_3gs: {
                active_source: "",
                active: { ready: false, size_mb: 0 },
                custom: { ready: false },
                master: { ready: false },
                reverse: { ready: false },
                pano: { ready: true, size_mb: 7.7 },
              },
            },
          ],
        }),
      ),
      http.get(
        "http://localhost:3000/api/v1/projects/demo/scenes/Hall/director-stage/manifest",
        () =>
          HttpResponse.json({
            ok: false,
            error: "no 3gs",
          }),
      ),
      http.post(
        "http://localhost:3000/api/v1/projects/demo/scenes/Hall/director-stage/world",
        async ({ request }) => {
          saveBody = await request.json();
          return HttpResponse.json({
            ok: true,
            data: {
              active_source_id: "scene-pano:Hall",
              scenes_by_source_id: {},
            },
          });
        },
      ),
    );

    renderWithProviders(<ScenesPanel project="demo" />);

    expect(await screen.findAllByText("Hall")).not.toHaveLength(0);
    const openWorldButtons = screen.getAllByRole("button", { name: "Mở Director World" });
    await user.click(openWorldButtons[openWorldButtons.length - 1]);
    await user.click(await screen.findByRole("button", { name: "mock-save-scene-world" }));

    await waitFor(() => expect(saveBody).toBeDefined());
    expect(saveBody).toMatchObject({
      active_source_id: "scene-pano:Hall",
      snapshot: { world: { activeSourceId: "scene-pano:Hall" } },
    });
    expect(screen.queryByText(/hiện tại/)).not.toBeInTheDocument();
  });

});
