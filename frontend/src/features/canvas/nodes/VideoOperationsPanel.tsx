// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Film,
  Languages,
  Library,
  Loader2,
  Music,
  Pause,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  CANVAS_NODE_TYPES,
  type Seedance2SceneOptimize,
  type VideoGenCount,
  type VideoGenMode,
  type VideoGenQuality,
  type VideoNodeData,
} from "@/features/canvas/domain/canvasNodes";
import { formatResolutionLabel } from "@/features/canvas/domain/mediaModelOptions";
import {
  isHappyHorseVideoModel,
  isVideoModeSupportedByModel,
  videoModeForcesAutomaticAspectRatio,
  videoModelDefaultGenerateAudio,
  videoModelReferenceDisabledReason,
} from "@/features/canvas/nodes/shared/videoModelCapabilities";
import { resolveImageDisplayUrl } from "@/features/canvas/application/imageData";
import { VIDEO_FILE_ACCEPT } from "@/features/canvas/application/videoFileTypes";
import { spawnExternalAssetNodes } from "@/features/canvas/application/spawnExternalAssets";
import { canvasEventBus } from "@/features/canvas/application/canvasServices";
import type { UpstreamContent } from "@/features/canvas/application/ports";
import { ReferenceTextChip } from "@/features/canvas/nodes/shared/ReferenceTextChip";
import { ReferenceDetachButton } from "@/features/canvas/nodes/shared/ReferenceDetachButton";
import {
  PromptMentionEditor,
  type MentionCandidate,
  type PromptMentionEditorHandle,
} from "@/features/canvas/nodes/PromptMentionEditor";
import { NodeContextPromptPaletteButton } from "@/features/canvas/nodes/ContextPromptPaletteButton";
import {
  contextPromptPaletteInsertionText,
  type ContextPromptPaletteEntry,
} from "@/features/canvas/nodes/contextPromptPalette";
import { PanelExpandButton } from "@/features/canvas/ui/PanelExpandButton";
import { OperationPanelShell } from "@/features/canvas/ui/OperationPanelShell";
import {
  CANVAS_NODE_INPUT_PLACEHOLDER_CLASS,
  CANVAS_NODE_OPS_PANEL_CLASS,
} from "@/features/canvas/ui/nodeFrameStyles";
import {
  filterMediaModelParamsForMode,
  MediaModelParameterChip,
} from "@/features/canvas/ui/MediaModelParameterChip";
import {
  NODE_COUNT_POPOVER_CLASS,
  NODE_CONTEXT_CONTROL_TRIGGER_CLASS,
  NODE_CREDIT_PILL_FLAT_CLASS,
  NODE_FLOATING_PANEL_SURFACE_CLASS,
  NODE_GENERATE_BUTTON_BASE_CLASS,
  NODE_GENERATE_BUTTON_DISABLED_CLASS,
  NODE_GENERATE_BUTTON_ENABLED_CLASS,
  NODE_INLINE_ICON_BUTTON_ACTIVE_CLASS,
  NODE_INLINE_ICON_BUTTON_CLASS,
  NODE_REFERENCE_MEDIA_CHIP_CLASS,
  NODE_REFERENCE_MEDIA_DETACH_CLASS,
  NODE_TEXT_CONTROL_ICON_CLASS,
  NODE_TEXT_CONTROL_TRIGGER_CLASS,
} from "@/features/canvas/ui/nodeControlStyles";
import { CameraMovementPickerPopover } from "@/features/canvas/nodes/CameraMovementPickerPopover";
import {
  findCameraMovementPreset,
  type CameraMovementPreset,
} from "@/features/canvas/domain/cameraMovementPresets";
import {
  AssetLibraryModal,
  type AssetLibrarySelection,
} from "@/features/canvas/ui/AssetLibraryModal";
import { useCanvasStore } from "@/stores/canvasStore";
import {
  fetchFreezoneTextTranslateResult,
  submitFreezoneTextTranslate,
  type FreezoneVideoAspectRatio,
} from "@/api/ops";
import { awaitTaskCompletion } from "@/api/tasks";
import { useModelTaskAccess } from "@/lib/model-task-access";
import { readUrl } from "@/lib/url-params";
import {
  ProviderModelPicker,
  type ModelOption,
} from "@/features/canvas/ui/ProviderModelPicker";
import { writeLastVideoModel } from "@/features/canvas/domain/lastVideoModel";
import { CreditCostPill } from "@/components/credits/credit-visual";
import { useGenerationCreditCost } from "@/lib/queries/generation-credit-cost";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { BillingRuleNotConfiguredError } from "@/lib/api-errors";
import {
  ASPECT_RATIOS,
  clampVideoDuration,
  DEFAULT_HEIGHT,
  OPERATIONS_PANEL_GAP,
  OPERATIONS_PANEL_HEIGHT,
  OPERATIONS_PANEL_OVERHANG,
  qualityToResolution,
  VIDEO_GENERATE_FEATURE_KEY,
  type ReferenceMediaItem,
} from "@/features/canvas/nodes/VideoNode";


// 「放大」后用居中弹窗展示，给提示词编辑更舒适的空间。
const OPERATIONS_PANEL_EXPANDED_HEIGHT = 560;
const OPERATIONS_PANEL_EXPANDED_WIDTH = 1040;

const MODE_TABS: ReadonlyArray<{ key: VideoGenMode; labelKey: string }> = [
  { key: "textToVideo", labelKey: "node.videoNode.tabs.textToVideo" },
  { key: "allReference", labelKey: "node.videoNode.tabs.allReference" },
  { key: "firstFrame", labelKey: "node.videoNode.tabs.firstFrame" },
  { key: "imageToVideo", labelKey: "node.videoNode.tabs.imageToVideo" },
  { key: "firstLastFrame", labelKey: "node.videoNode.tabs.firstLastFrame" },
  { key: "imageReference", labelKey: "node.videoNode.tabs.imageReference" },
  { key: "videoEdit", labelKey: "node.videoNode.tabs.videoEdit" },
];

// HappyHorse 的入口顺序：文生视频 → 首帧 → 图生视频 → 图片参考 → 视频编辑。
const HAPPYHORSE_TAB_ORDER: ReadonlyArray<VideoGenMode> = [
  "textToVideo",
  "firstFrame",
  "imageToVideo",
  "imageReference",
  "videoEdit",
];

const COUNT_OPTIONS: ReadonlyArray<VideoGenCount> = [1, 2, 4];
const VIDEO_PARAM_POPOVER_CLASS =
  `nodrag nowheel absolute bottom-full left-0 z-50 mb-2 w-[320px] p-4 ${NODE_FLOATING_PANEL_SURFACE_CLASS}`;
const VIDEO_PARAM_LABEL_CLASS =
  "mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-dark/72";
const VIDEO_PARAM_BUTTON_BASE_CLASS =
  "inline-flex items-center justify-center rounded px-2 py-2 text-xs transition-colors";
const VIDEO_PARAM_ACTIVE_BUTTON_CLASS =
  "bg-white/[0.13] text-text-dark ring-1 ring-white/24";
const VIDEO_PARAM_IDLE_BUTTON_CLASS =
  "bg-white/[0.07] text-text-muted/95 hover:bg-white/[0.11] hover:text-text-dark";
const VIDEO_PARAM_ROW_CLASS = "mb-4 gap-2";
const VIDEO_COUNT_OPTION_BASE_CLASS =
  "block w-full rounded-[6px] px-3 py-1.5 text-left text-xs transition-colors";
const VIDEO_MODE_POPOVER_CLASS =
  `nodrag nowheel fixed z-[10000] w-[132px] overflow-visible p-1 ${NODE_FLOATING_PANEL_SURFACE_CLASS}`;
// 禁用模式的 hover 提示气泡：悬浮在菜单右侧，深色圆角小胶囊，与设计稿一致。
const VIDEO_MODE_TOOLTIP_CLASS =
  "pointer-events-none absolute left-full top-1/2 z-[10001] ml-2 -translate-y-1/2 " +
  "whitespace-nowrap rounded-md bg-[#1f1f22] px-2.5 py-1.5 text-[11px] font-medium " +
  "text-white/90 shadow-lg ring-1 ring-white/10";

// 音频引用 chip 的展示文件名：优先节点的 displayName，否则从 audioUrl 取末段文件名。
// 仅用于前端展示（音频_<文件名>），不影响序列化给后端的 @音频N。
function audioReferenceFileName(item: {
  displayName?: string | null;
  audioUrl: string;
}): string | null {
  const name = item.displayName?.trim();
  if (name) return name;
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const path = new URL(item.audioUrl, origin).pathname;
    const base = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "");
    return base || null;
  } catch {
    return null;
  }
}

interface VideoOperationsPanelProps {
  id: string;
  data: VideoNodeData;
  genMode: VideoGenMode;
  modelId: string;
  selectedVideoModel: ModelOption | undefined;
  availableVideoModels: ModelOption[];
  isHappyHorseModel: boolean;
  upstreamCounts: { images: number; videos: number; audios: number };
  upstreamTypeCounts: { images: number; videos: number; audios: number };
  upstreamContents: UpstreamContent[];
  upstreamTextJoined: string;
  referenceMedia: ReferenceMediaItem[];
  referenceCaps: { image: number; video: number; audio: number } | null;
  cameraTemplates: ReadonlyArray<CameraMovementPreset>;
  cameraTemplatesLoading: boolean;
  configuredAspectRatios: string[];
  aspectRatio: FreezoneVideoAspectRatio;
  quality: VideoGenQuality;
  qualityOptions: readonly VideoGenQuality[];
  durationSec: number;
  durationBounds: { min: number; max: number };
  sceneOptimize: Seedance2SceneOptimize | undefined;
  sceneOptimizeOptions: readonly Seedance2SceneOptimize[];
  generateAudio: boolean;
  supportsHumanReview: boolean;
  humanReview: boolean;
  count: VideoGenCount;
  prompt: string;
  isGenerating: boolean;
  /** 估价用的后端模型 ID；模型目录加载中 / fallback 时为 null（暂不发估价请求）。 */
  videoBackendForCost: string | null;
  videoInputPresent: boolean;
  videoInputBillingReady: boolean;
  inputVideoDurationSeconds: number;
  submitDisabled: boolean;
  selectedModelReferenceError: string | null;
  mediaRejectionReason: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSubmit: () => Promise<void>;
}

export function VideoOperationsPanel({
  id,
  data,
  genMode,
  modelId,
  selectedVideoModel,
  availableVideoModels,
  isHappyHorseModel,
  upstreamCounts,
  upstreamTypeCounts,
  upstreamContents,
  upstreamTextJoined,
  referenceMedia,
  referenceCaps,
  cameraTemplates,
  cameraTemplatesLoading,
  configuredAspectRatios,
  aspectRatio,
  quality,
  qualityOptions,
  durationSec,
  durationBounds,
  sceneOptimize,
  sceneOptimizeOptions,
    // `submitDisabled` already carries the org admission block from VideoNode;
    // this is only for the button's title, so a blocked member is told why.
    const modelTaskAccess = useModelTaskAccess();
    const updateNodeData = useCanvasStore((state) => state.updateNodeData);
    const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
    const addNode = useCanvasStore((state) => state.addNode);
    const addEdge = useCanvasStore((state) => state.addEdge);
    const deleteEdge = useCanvasStore((state) => state.deleteEdge);
    // 与 inputRef 分开:那个是「替换本节点自身的视频」(单选、只收视频),
    // 这个是「添加上游外部素材」(多选、收图片/视频/音频)。
    const externalAssetInputRef = useRef<HTMLInputElement>(null);
    const [isTranslatingPrompt, setIsTranslatingPrompt] = useState(false);
    const [isCharacterLibraryOpen, setIsCharacterLibraryOpen] = useState(false);
    // Local draft + composition guard so IME (中文输入法) candidates stop being
    // wiped by the store-driven re-render. Same fix pattern as
    // `docs/changes/2026-05-12-image-gen-ime-fix.md`.
    const [promptDraft, setPromptDraft] = useState(prompt);
    const isComposingRef = useRef(false);
    const promptEditorRef = useRef<PromptMentionEditorHandle | null>(null);
    useEffect(() => {
      if (isComposingRef.current) return;
      setPromptDraft(prompt);
    }, [prompt]);
    // 卸载前的 IME 合成兜底：合成进行中取消选中会直接卸载本面板，
    // onCompositionEnd 再也没有机会触发，最新草稿只存在于本地 state。
    // 用 ref 镜像 draft，卸载 cleanup 里发现仍在合成就把它落回 data.prompt。
    const promptDraftRef = useRef(promptDraft);
    promptDraftRef.current = promptDraft;
    useEffect(
      () => () => {
        if (!isComposingRef.current) return;
        isComposingRef.current = false;
        updateNodeData(id, { prompt: promptDraftRef.current });
      },
      [id, updateNodeData],
    );
    // 「上下文调色盘」：与图生节点同款，把镜头里人物/道具的标记颜色快速插进提示词。
    // palette 的全量 nodes/edges 订阅下沉到 NodeContextPromptPaletteButton，避免本节点
    // 为它订阅整图、被任意节点拖动牵连重渲染。插入直接走编辑器命令式 API：弹层与编辑器
    // 同在面板里、编辑器恒已挂载，故回调无需依赖 prompt（保持稳定引用）。
    const insertContextPaletteEntry = useCallback(
      (entry: ContextPromptPaletteEntry) => {
        promptEditorRef.current?.insertTextAtCursor(
          contextPromptPaletteInsertionText(entry),
        );
      },
      [],
    );
    const aspectRatioOptions = useMemo(() => {
      return configuredAspectRatios.length > 0 ? configuredAspectRatios : ASPECT_RATIOS;
    }, [configuredAspectRatios]);
    const cameraMovementId =
      typeof data.cameraMovement === "string" ? data.cameraMovement : null;
    // Debounce the cost-estimate inputs: dragging the duration slider (and,
    // to a lesser degree, flipping count/quality/model) churns the query key
    // and TanStack Query aborts each in-flight request, spraying "Canceled"
    // rows across the Network tab. Coalesce to one request once the params
    // settle (~350ms). Primitives only — see useDebouncedValue's contract.
    const debouncedBackend = useDebouncedValue(videoBackendForCost, 350);
    const debouncedCatalogId = useDebouncedValue(
      selectedVideoModel?.catalogId ?? null,
      350,
    );
    const debouncedQuality = useDebouncedValue(quality, 350);
    const debouncedCount = useDebouncedValue(count, 350);
    const debouncedDurationSec = useDebouncedValue(durationSec, 350);
    const debouncedVideoInputPresent = useDebouncedValue(
      videoInputPresent,
      350,
    );
    const debouncedInputVideoDuration = useDebouncedValue(
      inputVideoDurationSeconds,
      350,
    );
    const videoCount = Math.min(Math.max(debouncedCount, 1), 4);
    const videoPricingQuantity =
      videoCount *
      (genMode === "videoEdit"
        ? Math.max(Math.floor(debouncedInputVideoDuration), 1)
        : debouncedDurationSec);
    const videoCreditCost = useGenerationCreditCost(
      "feature",
      debouncedBackend && videoInputBillingReady
        ? VIDEO_GENERATE_FEATURE_KEY
        : null,
      {
        surface: "canvas",
        params: {
          ...(debouncedCatalogId ? { catalog_id: debouncedCatalogId } : {}),
          video_backend: debouncedBackend,
          resolution: qualityToResolution(debouncedQuality),
          pricing_quantity: videoPricingQuantity,
          operation: genMode,
          generate_audio: generateAudio,
          video_input_present: debouncedVideoInputPresent,
          input_video_duration_seconds: debouncedInputVideoDuration,
        },
        quantity: videoCount,
      },
    );
    const videoBillingRuleMissing =
      videoCreditCost.error instanceof BillingRuleNotConfiguredError;
    const totalCreditCostDisplay =
      videoCreditCost.data?.data.display ??
      (videoBillingRuleMissing
        ? t("common.billingRuleNotConfiguredShort")
        : null);
    // 给每个 referenceMedia 条目补上「同类型序号 + 是否在当前模式上限内」。
    // 当前 genMode 在 REFERENCE_CAPS_BY_MODE 里没有条目（如 textToVideo /
    // imageToVideo / imageReference），统一按 within=true 处理；下游 chip /
    // mention 候选会决定是否消费 within。
    const referenceMediaCapInfo = useMemo(() => {
      const counts = { image: 0, video: 0, audio: 0 };
      return referenceMedia.map((item) => {
        counts[item.kind] += 1;
        const cap = referenceCaps?.[item.kind];
        const withinCap = cap == null || counts[item.kind] <= cap;
        return { item, typeIndex: counts[item.kind], withinCap };
      });
    }, [referenceCaps, referenceMedia]);

    // @ 提及候选 —— 图片、音频都可引用，但编号按 *各自类型* 的序号走，
    // *不* 按行内混合位置。后端按上传的图片数量来对应 图片N，若用混合位置编号
    // （音频排第一时图片就成了「图片2」），后端只看到 1 张图却被要求引用图片2
    // 会报错。所以图片用图片序号、音频用音频序号，各自独立计数。
    //
    // 在 REFERENCE_CAPS_BY_MODE 表里有条目的模式，超过 cap 的条目不能进
    // @ 候选 —— 服务端会直接丢弃，留在候选里只会让用户选了之后被静默忽略。
    const mentionCandidates = useMemo<MentionCandidate[]>(() => {
      const out: MentionCandidate[] = [];
      let imageIdx = 0;
      let videoIdx = 0;
      let audioIdx = 0;
      const enforceCap = referenceCaps != null;
      for (const info of referenceMediaCapInfo) {
        const item = info.item;
        if (item.kind === "image") {
          imageIdx += 1;
          if (enforceCap && !info.withinCap) continue;
          out.push({
            key: item.nodeId,
            name: `图片${imageIdx}`,
            imageUrl: resolveImageDisplayUrl(item.imageUrl),
            index: imageIdx,
          });
        } else if (item.kind === "video") {
          videoIdx += 1;
          if (enforceCap && !info.withinCap) continue;
          out.push({
            key: item.nodeId,
            name: `视频${videoIdx}`,
            imageUrl: item.thumbUrl ? resolveImageDisplayUrl(item.thumbUrl) : "",
            videoUrl: resolveImageDisplayUrl(item.videoUrl),
            index: videoIdx,
          });
        } else if (item.kind === "audio") {
          audioIdx += 1;
          if (enforceCap && !info.withinCap) continue;
          out.push({
            key: item.nodeId,
            name: `音频${audioIdx}`,
            imageUrl: "",
            index: audioIdx,
            audioUrl: resolveImageDisplayUrl(item.audioUrl),
            displayName: audioReferenceFileName(item),
          });
        }
      }
      return out;
    }, [referenceCaps, referenceMediaCapInfo]);

    // 取消关联某个上游素材：删掉「该上游节点 → 本节点」的连线。collectInputContents
    // 只走一跳，item.nodeId 就是直接相连的上游节点，可精确定位要删的边。
    const handleDetachUpstream = useCallback(
      (sourceNodeId: string) => {
        useCanvasStore
          .getState()
          .edges.filter((edge) => edge.source === sourceNodeId && edge.target === id)
          .forEach((edge) => deleteEdge(edge.id));
      },
      [id, deleteEdge],
    );

    const upstreamTextContents = useMemo(
      () =>
        upstreamContents.filter(
          (c) => typeof c.text === "string" && c.text.trim().length > 0,
        ),
      [upstreamContents],
    );

    // Spawn reference nodes from selected asset-library entries — one per
    // selection, stacked vertically to the left of this video node, then wired
    // as upstream references so they show up in the operations panel. The node
    // type depends on the media: images/videos become upload nodes carrying
    // imageUrl/videoUrl, audio becomes an audio node carrying audioUrl.
    const spawnCharacterLibraryReferences = useCallback(
      (selections: ReadonlyArray<AssetLibrarySelection>) => {
        if (selections.length === 0) return;
        const state = useCanvasStore.getState();
        const self = state.nodes.find((n) => n.id === id);
        if (!self) return;
        const UPLOAD_WIDTH = 320;
        const UPLOAD_HEIGHT = 240;
        const GAP_X = 40;
        const GAP_Y = 24;
        const baseX = self.position.x - UPLOAD_WIDTH - GAP_X;
        const totalH =
          UPLOAD_HEIGHT * selections.length + GAP_Y * (selections.length - 1);
        const startY =
          self.position.y + ((self.height ?? DEFAULT_HEIGHT) - totalH) / 2;
        const newIds: string[] = [];
        selections.forEach((sel, idx) => {
          const y = startY + idx * (UPLOAD_HEIGHT + GAP_Y);
          const displayName = sel.name || undefined;
          let newId: string;
          if (sel.media === "audio") {
            newId = addNode(
              CANVAS_NODE_TYPES.audio,
              { x: baseX, y },
              { audioUrl: sel.url, displayName },
            );
          } else if (sel.media === "video") {
            // 资产库视频作为「上游视频引用素材」：建 referenceOnly 的 video 节点，
            // 它能播放视频本体、被 isVideoNode 识别、下游自动切 videoEdit。之前建的是
            // 只渲染图片的 upload 节点——即便塞了 videoUrl 也不显示、也不被识别成视频。
            newId = addNode(
              CANVAS_NODE_TYPES.video,
              { x: baseX, y },
              {
                videoUrl: sel.url,
                aspectRatio: data.aspectRatio,
                displayName,
                referenceOnly: true,
              } as Partial<VideoNodeData>,
            );
          } else {
            newId = addNode(
              CANVAS_NODE_TYPES.upload,
              { x: baseX, y },
              {
                imageUrl: sel.url,
                previewImageUrl: sel.url,
                displayName,
              },
            );
          }
          addEdge(newId, id);
          newIds.push(newId);
        });
        state.autoGroupSpawn(id, newIds, { label: t("node.operationPanel.assetReferenceGroup") });
      },
      [addEdge, addNode, data.aspectRatio, id],
    );

    const handleExternalAssetFiles = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        // 先清空,好让用户能连续两次选同一个文件(否则 change 不触发)。
        event.target.value = "";
        if (files.length === 0) return;
        const state = useCanvasStore.getState();
        const self = state.nodes.find((n) => n.id === id);
        // 节点可能在文件选择器打开期间被删掉了。
        if (!self) return;
        spawnExternalAssetNodes(
          {
            id,
            position: self.position,
            // measured 优先、再退 data.height —— 对齐 store duplicateNodeAsSibling
            // (canvasStore.ts:1600)的口径 measured?.height ?? height ?? fallback。
            // 只读 data.height 会漏掉「已重新测量但没写死 height」的常见节点,把整列
            // 排偏(节点实高 280、却按 fallback 380 居中,下移约 50px)。spawn 侧对
            // undefined/0 仍兜底成 380。
            height: self.measured?.height ?? self.height ?? undefined,
          },
          files,
          {
            addNode,
            addEdge,
            // canvasEventBus.publish 是原型方法、用到 this,不能裸传。
            publish: (type, payload) => canvasEventBus.publish(type, payload),
            autoGroupSpawn: (sourceId, spawnedIds, opts) =>
              state.autoGroupSpawn(sourceId, spawnedIds, opts),
          },
        );
      },
      [addEdge, addNode, id],
    );

    const handleTranslatePrompt = useCallback(async () => {
      if (isTranslatingPrompt || isGenerating) return;
      const trimmed = prompt.trim();
      if (trimmed.length === 0) return;
      const project = readUrl().project;
      if (!project) {
        console.error("[video-node] translate: no project in URL");
        return;
      }
      setIsTranslatingPrompt(true);
      try {
        const ref = await submitFreezoneTextTranslate(project, {
          text: prompt,
          nodeType: "video",
          canvasId: readUrl().canvas ?? "default",
          nodeId: id,
        });
        await awaitTaskCompletion(ref.task_key, project, { taskType: ref.task_type });
        const result = await fetchFreezoneTextTranslateResult(
          project,
          ref.job_id,
        );
        if (result.translated_text) {
          updateNodeData(id, { prompt: result.translated_text });
        }
      } catch (error) {
        console.error("[video-node] translate failed", error);
      } finally {
        setIsTranslatingPrompt(false);
      }
    }, [id, isGenerating, isTranslatingPrompt, prompt, updateNodeData]);

    // 收起态浮动面板固定基础尺寸；放大用居中弹窗（见下方 OperationPanelShell）。
    const panelHeight = OPERATIONS_PANEL_HEIGHT;
    const panelOverhang = OPERATIONS_PANEL_OVERHANG;

    return (
      <>
            <OperationPanelShell
              expanded={expanded}
              onCollapse={() => onExpandedChange(false)}
              inlineClassName={`nodrag absolute z-30 flex flex-col rounded-[var(--node-radius)] ${CANVAS_NODE_OPS_PANEL_CLASS}`}
              inlineStyle={{
                top: `calc(100% + ${OPERATIONS_PANEL_GAP}px)`,
                left: -panelOverhang,
                right: -panelOverhang,
                height: panelHeight,
              }}
              modalStyle={{
                width: `min(${OPERATIONS_PANEL_EXPANDED_WIDTH}px, 92vw)`,
                height: `min(${OPERATIONS_PANEL_EXPANDED_HEIGHT}px, 86vh)`,
              }}
            >
              <PanelExpandButton
                expanded={expanded}
                onToggle={() => onExpandedChange(!expanded)}
                className="absolute right-2 top-2 z-20"
              />
              <div className="flex shrink-0 items-center overflow-x-auto px-3 pb-2 pr-10 pt-3">
                <div className="flex shrink-0 items-center gap-2">
                  <CameraMovementChip
                    templates={cameraTemplates}
                    isLoading={cameraTemplatesLoading}
                    selectedId={cameraMovementId}
                    onChange={(nextId) =>
                      updateNodeData(id, { cameraMovement: nextId })
                    }
                  />
                  <CharacterLibraryChip
                    onOpen={() => setIsCharacterLibraryOpen(true)}
                  />
                  <ExternalAssetChip
                    onOpen={() => externalAssetInputRef.current?.click()}
                  />
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-3">
                  <GenModeSelect
                    value={genMode}
                    modelId={selectedVideoModel?.apiModel ?? selectedVideoModel?.id ?? modelId}
                    supportedModes={selectedVideoModel?.supportedModes}
                    // HappyHorse 的可选模式由上游节点类型（含未填图的空节点）决定，
                    // 其余模型仍按已解析素材 URL 计数。
                    upstreamCounts={
                      isHappyHorseModel ? upstreamTypeCounts : upstreamCounts
                    }
                    onChange={(nextMode) =>
                      updateNodeData(id, {
                        genMode: nextMode,
                        modelParams: filterMediaModelParamsForMode(
                          selectedVideoModel?.request?.parameters,
                          data.modelParams,
                          nextMode,
                        ),
                      })
                    }
                  />
                  <NodeContextPromptPaletteButton
                    nodeId={id}
                    onInsert={insertContextPaletteEntry}
                  />
                  {upstreamTextContents.map((content) => (
                    <ReferenceTextChip
                      key={`upstream-text-${content.nodeId}`}
                      nodeId={content.nodeId}
                      text={content.text ?? ""}
                      sourceLabel={content.displayName ?? content.nodeType}
                      onDetach={handleDetachUpstream}
                    />
                  ))}
                </div>
                {referenceMedia.length > 0 && (
                  <ReferenceMediaRow
                    items={referenceMediaCapInfo}
                    caps={referenceCaps}
                    genMode={genMode}
                    onFocus={(nodeId) => setSelectedNode(nodeId)}
                    onDetach={handleDetachUpstream}
                    onReorder={(ids) =>
                      updateNodeData(id, { referenceOrder: ids })
                    }
                  />
                )}
              </div>

              <PromptMentionEditor
                ref={promptEditorRef}
                value={promptDraft}
                onChange={(next) => {
                  setPromptDraft(next);
                  if (!isComposingRef.current) {
                    updateNodeData(id, { prompt: next });
                  }
                }}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={(next) => {
                  isComposingRef.current = false;
                  setPromptDraft(next);
                  updateNodeData(id, { prompt: next });
                }}
                onKeyDown={(event) => event.stopPropagation()}
                candidates={mentionCandidates}
                placeholder={
                  upstreamTextJoined.length > 0
                    ? t("node.operationPanel.promptPlaceholderWithUpstream")
                    : t("node.videoNode.placeholder")
                }
                className={`nodrag nowheel min-h-0 w-full flex-1 overflow-y-auto whitespace-pre-wrap break-words border-none bg-transparent px-3 py-2 text-sm leading-6 text-text-dark outline-none ${CANVAS_NODE_INPUT_PLACEHOLDER_CLASS}`}
              />

              <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ProviderModelPicker
                    selectedModelId={modelId}
                    onChange={(nextModelId) => {
                          nextModel,
                        );
                      updateNodeData(id, {
                        model: nextModelId,
                        modelParams: {},
                    followInputAspectRatio={videoModeForcesAutomaticAspectRatio(genMode)}
                    followInputDuration={genMode === "videoEdit"}
                    aspectRatio={aspectRatio}
                    aspectRatioOptions={aspectRatioOptions}
                    quality={quality}
                    qualityOptions={qualityOptions}
                    durationSec={durationSec}
                    durationBounds={durationBounds}
                    sceneOptimize={sceneOptimize}
                    sceneOptimizeOptions={sceneOptimizeOptions}
                    generateAudio={generateAudio}
                    onChange={(patch) => updateNodeData(id, patch)}
                  />
                  <MediaModelParameterChip
                    parameters={selectedVideoModel?.request?.parameters}
                    values={data.modelParams}
                    mode={genMode}
                    onChange={(modelParams) => updateNodeData(id, { modelParams })}
                  />
                  {supportsHumanReview && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={humanReview}
                      title={t("node.operationPanel.humanReviewTitle")}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateNodeData(id, { humanReview: !humanReview });
                      }}
                      className={`nodrag inline-flex h-7 items-center gap-1.5 rounded px-1 text-xs font-medium transition-colors ${
                        humanReview
                          ? "text-text-dark"
                          : "text-text-dark/72 hover:text-text-dark"
                      }`}
                    >
                      <span>{t("node.operationPanel.humanReview")}</span>
                      <span
                        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
                          humanReview
                            ? "bg-[rgb(var(--accent-rgb))]"
                            : "bg-white/15"
                        }`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                            humanReview ? "translate-x-3" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  )}
                  <CountPicker
                    value={count}
                    onChange={(nextCount) =>
                      updateNodeData(id, { count: nextCount })
                    }
                  />
                  <button
                    type="button"
                    title={t("node.operationPanel.translatePromptTitle")}
                    disabled={
                      isTranslatingPrompt ||
                      isGenerating ||
                      prompt.trim().length === 0
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleTranslatePrompt();
                    }}
                    className={`${NODE_INLINE_ICON_BUTTON_CLASS} ${
                      isTranslatingPrompt
                        ? NODE_INLINE_ICON_BUTTON_ACTIVE_CLASS
                        : ""
                    }`}
                  >
                    {isTranslatingPrompt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CreditCostPill
                    display={totalCreditCostDisplay}
                    promotion={videoCreditCost.data?.data.promotion}
                    disabled={submitDisabled || videoBillingRuleMissing}
                    className={NODE_CREDIT_PILL_FLAT_CLASS}
                  />
                  <button
                    type="button"
                    disabled={submitDisabled || videoBillingRuleMissing}
                    title={
                      selectedModelReferenceError ?? (isGenerating
                        ? t("node.videoNode.submitBusy")
                        : (mediaRejectionReason ?? t("node.videoNode.submit")))
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      void onSubmit();
                    }}
                    className={`${NODE_GENERATE_BUTTON_BASE_CLASS} ${
                      submitDisabled || videoBillingRuleMissing
                        ? NODE_GENERATE_BUTTON_DISABLED_CLASS
                        : NODE_GENERATE_BUTTON_ENABLED_CLASS
                    }`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </OperationPanelShell>
        <input
          ref={externalAssetInputRef}
          type="file"
          multiple
          accept={`image/*,${VIDEO_FILE_ACCEPT},audio/*`}
          className="hidden"
          onChange={handleExternalAssetFiles}
        />

        <AssetLibraryModal
          open={isCharacterLibraryOpen}
          project={readUrl().project ?? null}
          onClose={() => setIsCharacterLibraryOpen(false)}
          onConfirm={(selections) =>
            spawnCharacterLibraryReferences(selections)
          }
        />
      </>
    );
}

interface GenModeSelectProps {
  value: VideoGenMode;
  modelId: string | null | undefined;
  supportedModes?: string[];
  upstreamCounts: { videos: number; images: number; audios: number };
  onChange: (next: VideoGenMode) => void;
}

export function videoModeDisabledReason(
  mode: VideoGenMode,
  modelId: string | null | undefined,
  upstreamCounts: { videos: number; images: number; audios: number },
  supportedModes?: string[],
): string | null {
  // HappyHorse 的模式可用性完全由上游节点类型决定（文档 4 大功能）：
  //   文生视频  — 仅无上游时可用
  //   首帧/图生视频 — 仅上游正好 1 张图片时可用
  //   图片参考  — 上游 1~9 张图片时可用
  //   视频编辑  — 仅上游有 1 个视频时可用
  // 不可用时返回 hover 文案（提示用户需要连接什么）。
  if (isHappyHorseVideoModel(modelId)) {
    const { images, videos } = upstreamCounts;
    switch (mode) {
      case "textToVideo":
        if (videos > 0) return t("node.operationPanel.modeError.videoConnected.useVideoEdit");
        if (images > 0) return t("node.operationPanel.modeError.imageConnected.chooseOtherModes");
            );
            const isDisabled = disabledReason != null && !isActive;
            // 禁用按钮在多数浏览器里不触发 mouse 事件，hover 提示挂在外层 div 上；
            // 提示气泡定位到菜单右侧，与设计稿一致。
            return (
              <div
                key={tab.key}
                className="relative"
                onMouseEnter={() =>
                  isDisabled ? setHoveredKey(tab.key) : setHoveredKey(null)
                }
                onMouseLeave={() =>
                  setHoveredKey((prev) => (prev === tab.key ? null : prev))
                }
              >
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(tab.key);
                    setIsOpen(false);
                  }}
                  className={`block w-full rounded-[6px] px-3 py-1.5 text-left text-xs transition-colors ${
                    isActive
                      ? VIDEO_PARAM_ACTIVE_BUTTON_CLASS
                      : isDisabled
                        ? "cursor-not-allowed text-text-muted/40"
                        : "text-text-muted/95 hover:bg-white/[0.11] hover:text-text-dark"
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
                {isDisabled && hoveredKey === tab.key && disabledReason && (
                  <div className={VIDEO_MODE_TOOLTIP_CLASS}>{disabledReason}</div>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}

interface VideoConfigChipProps {
  followInputAspectRatio: boolean;
  followInputDuration: boolean;
  aspectRatio: FreezoneVideoAspectRatio;
  aspectRatioOptions: readonly FreezoneVideoAspectRatio[];
  quality: VideoGenQuality;
  qualityOptions: readonly VideoGenQuality[];
  durationSec: number;
  durationBounds: { min: number; max: number };
  sceneOptimize?: Seedance2SceneOptimize;
  sceneOptimizeOptions: readonly Seedance2SceneOptimize[];
  followInputAspectRatio,
  followInputDuration,
  aspectRatio,
  aspectRatioOptions,
  quality,
  qualityOptions,
  durationSec,
  durationBounds,
  sceneOptimize,
  sceneOptimizeOptions,
          {followInputAspectRatio || aspectRatio === "auto"
            ? t("node.videoNode.aspect.auto")
            : aspectRatio}
        </span>
        <span className="text-text-muted/80">·</span>
        <span>{formatResolutionLabel(quality)}</span>
        {!followInputDuration && (
          <>
            <span className="text-text-muted/80">·</span>
            <span>{durationSec}s</span>
          </>
        )}
        {supportsGenerateAudio && (
          generateAudio ? (
            <Volume2 className="ml-0.5 h-3.5 w-3.5 text-text-muted/90" />
          ) : (
            <VolumeX className="ml-0.5 h-3.5 w-3.5 text-text-muted/90" />
          )
        )}
        <ChevronDown className="h-3 w-3 text-text-muted/90" />
      </button>
      {isOpen && (
        <div
          ref={popoverRef}
          className={VIDEO_PARAM_POPOVER_CLASS}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={VIDEO_PARAM_LABEL_CLASS}>
            {t("node.videoNode.aspect.title")}
          </div>
          <div className={`grid grid-cols-5 ${VIDEO_PARAM_ROW_CLASS}`}>
            {aspectRatioOptions.map((ratio) => {
              const isActive = aspectRatio === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onChange({ aspectRatio: ratio })}
                  className={`${VIDEO_PARAM_BUTTON_BASE_CLASS} ${
                    isActive
                      ? VIDEO_PARAM_ACTIVE_BUTTON_CLASS
                      : VIDEO_PARAM_IDLE_BUTTON_CLASS
                  }`}
                >
                  {ratio === "auto" ? t("node.videoNode.aspect.auto") : ratio}
                </button>
              );
            })}
          </div>

          <div className={VIDEO_PARAM_LABEL_CLASS}>
            {t("node.videoNode.quality.title")}
          </div>
          <div className={`grid grid-cols-3 ${VIDEO_PARAM_ROW_CLASS}`}>
            {qualityOptions.map((q) => {
              const isActive = quality === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChange({ quality: q })}
                  className={`${VIDEO_PARAM_BUTTON_BASE_CLASS} ${
                    isActive
                      ? VIDEO_PARAM_ACTIVE_BUTTON_CLASS
                      : VIDEO_PARAM_IDLE_BUTTON_CLASS
                  }`}
                >
                  {formatResolutionLabel(q)}
                </button>
              );
            })}
          </div>

          <div className={VIDEO_PARAM_LABEL_CLASS}>
            {t("node.videoNode.duration.title")}
          </div>
          <div className="mb-4 flex items-center gap-3">
            <input
              type="range"
              min={durationBounds.min}
              max={durationBounds.max}
              step={1}
              value={durationSec}
              onChange={(event) =>
                onChange({
                  durationSec: clampVideoDuration(Number(event.target.value), durationBounds),
                })
              }
              className="video-duration-slider min-w-0 flex-1"
            />
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={durationBounds.min}
                max={durationBounds.max}
                step={1}
                value={durationDraft}
                onChange={(event) => handleDurationInput(event.target.value)}
                onBlur={commitDuration}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDuration();
                    event.currentTarget.blur();
                  }
                }}
                aria-label={t("node.videoNode.duration.title")}
                className="h-7 w-12 rounded border border-white/12 bg-white/[0.07] px-1.5 text-center text-xs tabular-nums text-text-dark outline-none transition-colors focus:border-white/28 focus:bg-white/[0.11] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-[11px] text-text-muted/80">s</span>
            </div>
              </div>
            </>
          )}

          {sceneOptimizeOptions.length > 0 && (
            <>
              <div className={VIDEO_PARAM_LABEL_CLASS}>
                {t("node.videoNode.sceneOptimize.title")}
              </div>
              <div className={`grid grid-cols-2 ${VIDEO_PARAM_ROW_CLASS}`}>
                {sceneOptimizeOptions.map((option) => {
                  const isActive = sceneOptimize === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChange({ sceneOptimize: option })}
                      className={`${VIDEO_PARAM_BUTTON_BASE_CLASS} ${
                        isActive
                          ? VIDEO_PARAM_ACTIVE_BUTTON_CLASS
                          : VIDEO_PARAM_IDLE_BUTTON_CLASS
                      }`}
                    >
                      {t(`node.videoNode.sceneOptimize.options.${option}`)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className={VIDEO_PARAM_LABEL_CLASS}>
            {t("node.videoNode.audio.title")}
          </div>
          <div className="flex items-center justify-between rounded-md bg-white/[0.045] px-2.5 py-1.5">
            <span className="text-xs font-medium text-text-dark/88">
              {generateAudio
                ? t("node.videoNode.audio.on")
                : t("node.videoNode.audio.off")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={generateAudio}
              aria-label={t("node.videoNode.audio.title")}
              onClick={() => onChange({ generateAudio: !generateAudio })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                generateAudio
                  ? "border-white/24 bg-white/[0.18]"
                  : "border-white/10 bg-white/[0.08]"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-text-dark shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform ${
                  generateAudio ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CameraMovementChipProps {
  templates: ReadonlyArray<CameraMovementPreset>;
  isLoading: boolean;
  selectedId: string | null;
  onChange: (next: string | null) => void;
}

const CAMERA_MOVEMENT_POPOVER_WIDTH = 640;
const CAMERA_MOVEMENT_POPOVER_MAX_HEIGHT = 560;
const CAMERA_MOVEMENT_POPOVER_GAP = 8;

function CameraMovementChip({
  templates,
  isLoading,
  selectedId,
  onChange,
}: CameraMovementChipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(
    null,
  );

  // Position above the chip whenever it opens or the viewport changes. We
  // render the popover into <body> via portal so it can sit above the
  // react-flow NodeToolbar (z-[120]) — without portal it lives inside the
  // video node's transformed stacking context and gets covered.
  useEffect(() => {
    if (!isOpen) return;
    const updateAnchor = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const popHeight = Math.min(
        CAMERA_MOVEMENT_POPOVER_MAX_HEIGHT,
        rect.top - CAMERA_MOVEMENT_POPOVER_GAP - 8,
      );
      const wantTop = rect.top - popHeight - CAMERA_MOVEMENT_POPOVER_GAP;
      // If we can't fit above, fall back to below.
      const top =
        wantTop < 8 ? rect.bottom + CAMERA_MOVEMENT_POPOVER_GAP : wantTop;
      const wantLeft = rect.left;
      const left = Math.max(
        8,
        Math.min(
          wantLeft,
          window.innerWidth - CAMERA_MOVEMENT_POPOVER_WIDTH - 8,
        ),
      );
      setAnchor({ left, top });
    };
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        triggerRef.current?.contains(event.target as Node) ||
        popoverRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [isOpen]);

  const selectedPreset = findCameraMovementPreset(templates, selectedId);
  const label = selectedPreset?.label ?? t("node.operationPanel.cameraMovement");
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className={`${NODE_TEXT_CONTROL_TRIGGER_CLASS} group/asset px-1.5`}
    >
      <Library className={`${NODE_TEXT_CONTROL_ICON_CLASS} group-hover/asset:text-text-dark`} />
      <span>{t("node.operationPanel.characterLibrary")}</span>
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className={`${NODE_TEXT_CONTROL_TRIGGER_CLASS} group/external px-1.5`}
    >
      <Plus className={`${NODE_TEXT_CONTROL_ICON_CLASS} group-hover/external:text-text-dark`} />
      <span>{t("node.operationPanel.externalAsset")}</span>
  // 同时管理整行音频的「当前播放节点」—— 同一时间只允许一个 audio chip 在
  // 播放。点击另一个会切换；再点同一个会暂停。
  const [playingAudioNodeId, setPlayingAudioNodeId] = useState<string | null>(
    null,
  );
  // 拖拽换位的临时状态：正在被拖的 chip / 当前悬停落点 chip。
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [overNodeId, setOverNodeId] = useState<string | null>(null);

  const clearDrag = useCallback(() => {
    setDragNodeId(null);
    setOverNodeId(null);
  }, []);

  const handleDrop = useCallback(
    (targetNodeId: string) => {
      const sourceId = dragNodeId;
      clearDrag();
      if (!sourceId || sourceId === targetNodeId) return;
      const ids = items.map((entry) => entry.item.nodeId);
      const from = ids.indexOf(sourceId);
      const to = ids.indexOf(targetNodeId);
      if (from === -1 || to === -1) return;
      ids.splice(from, 1);
      ids.splice(to, 0, sourceId);
      onReorder(ids);
    },
    [dragNodeId, items, onReorder, clearDrag],
  );

  return (
    <div className="ml-4 flex shrink-0 items-center gap-1.5">
      {items.map((entry) => {
        const { item, typeIndex, withinCap } = entry;
        // 「超出当前模式上限」只在 REFERENCE_CAPS_BY_MODE 里登记过的模式生效。
        const overCap = caps != null && !withinCap;
        const modeCap = caps?.[item.kind] ?? 0;
        const modeKey = {
          textToVideo: "node.operationPanel.genMode.textToVideo",
          firstFrame: "node.operationPanel.genMode.firstFrame",
          imageToVideo: "node.operationPanel.genMode.imageToVideo",
          imageReference: "node.operationPanel.genMode.imageReference",
          firstLastFrame: "node.operationPanel.genMode.firstLastFrame",
          videoEdit: "node.operationPanel.genMode.videoEdit",
          allReference: "node.operationPanel.genMode.allReference",
        }[genMode] ?? "node.operationPanel.genMode.current";
        const modeLabel = t(modeKey);
        const overCapTitle = overCap
          ? t("node.operationPanel.referenceOverCap", {
              mediaType: item.kind === "image" ? t("node.operationPanel.mediaType.image") : item.kind === "video" ? t("node.operationPanel.mediaType.video") : t("node.operationPanel.mediaType.audio"),
              mode: modeLabel,
              cap: modeCap,
              countUnit: item.kind === "image" ? t("node.operationPanel.countUnit.image") : t("node.operationPanel.countUnit.media")
            })
  const buttonRef = useRef<HTMLButtonElement>(null);
  const PREVIEW_W = 140;
  const { pos, show, hide } = useHoverPreviewPos(buttonRef, PREVIEW_W);
  const label =
    item.displayName?.trim() || slotLabel || t("node.operationPanel.imageReferenceLabel", { index: index + 1 });
  // 用 ref 持有一个 HTMLAudioElement —— 比挂在 DOM 上的 <audio> 简单：可以
  // 直接 .play()/.pause()，也方便处理同时只放一个的逻辑（父层告诉这个
  // chip 它不再是当前正在播的）。
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null && typeof Audio !== "undefined") {
    audioRef.current = new Audio();
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const src = resolveImageDisplayUrl(item.audioUrl);
    if (audio.src !== src) {
      audio.src = src;
    }
  }, [item.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      void audio.play().catch(() => {
        // 自动播放被浏览器拦或资源加载失败 —— 回滚父层状态。
        onToggle(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, onToggle]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => onToggle(false);
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [onToggle]);

  // 卸载时停掉播放，避免脏状态留在浏览器。
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.pause();
      audio.src = "";
    };
  }, []);

  const label = item.displayName?.trim() || t("node.operationPanel.audioReferenceLabel", { index: index + 1 });
