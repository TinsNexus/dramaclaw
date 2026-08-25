// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Handle,
  Position,
  useStore,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import {
  isLowDetailZoom,
  setNodeMediaActive,
} from "@/features/canvas/application/canvasLod";
import {
  AlertTriangle,
  ArrowUp,
  Camera,
  ChevronDown,
  Download,
  Film,
  Images,
  Layers,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Upload as UploadIcon,
  Video as VideoIcon,
  Volume2,
  VolumeX,
  X as XIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  CANVAS_NODE_TYPES,
  isAudioNode,
  isExportImageNode,
  isImageEditNode,
  isImageGenNode,
  isStoryboardGenNode,
  isUploadNode,
  isVideoNode,
  type CanvasNode,
  type Seedance2SceneOptimize,
  type VideoGenCount,
  type VideoGenMode,
  type VideoGenQuality,
  type VideoNodeData,
} from "@/features/canvas/domain/canvasNodes";
import {
  audioReferenceDurationRejection,
  formatAudioDurationClips,
  formatAudioDurationSeconds,
  MAX_AUDIO_REFERENCE_DURATION_MS,
  MAX_AUDIO_REFERENCE_TOTAL_DURATION_MS,
  MIN_AUDIO_REFERENCE_DURATION_MS,
  referenceDurationLimitsMs,
  isHappyHorseVideoModel,
  isSeedance2VideoModel,
  isVideoModeSupportedByModel,
  resolveVideoKeyframeUrls,
  videoEmptyStateCtaModes,
  videoModeForcesAutomaticAspectRatio,
  videoModeRequiresMedia,
  videoModeRequiresPrompt,
  videoModelDefaultGenerateAudio,
  videoModelReferenceDisabledReason,
  videoModelSupportsGenerateAudio,
  videoMultiImageAutoSwitchMode,
  videoNoUpstreamResetMode,
  videoReferenceAutoSwitchAction,
  videoSubmitMediaRejectionReason,
  videoUpstreamImageDefaultMode,
  type VideoEmptyStateCtaMode,
} from "@/features/canvas/nodes/shared/videoModelCapabilities";
import {
  VIDEO_GENERATION_ASPECT_RATIOS,
  resolveImageDisplayUrl,
  snapToAllowedAspectRatio,
} from "@/features/canvas/application/imageData";
import {
  captureVideoFrameBlob,
  getLodStill,
  requestLodStill,
  subscribeLodStills,
} from "@/features/canvas/application/videoFrameCapture";
import {
  FALLBACK_VIDEO_ASPECT_OPTIONS,
  FALLBACK_VIDEO_RESOLUTION_OPTIONS,
} from "@/features/canvas/domain/mediaModelOptions";
import { ensureWebSafeVideo } from "@/features/canvas/application/videoTranscode";
import { isVideoFile, VIDEO_FILE_ACCEPT } from "@/features/canvas/application/videoFileTypes";
import { resolveNodeDisplayName } from "@/features/canvas/domain/nodeDisplay";
import { toast } from "sonner";
import { downloadUrlAsFile } from "@/lib/browserDownload";
import { useModelTaskAccess } from "@/lib/model-task-access";
import {
  setAlbumPendingTotal,
  useAlbumPendingTotal,
} from "@/features/canvas/nodes/shared/albumPendingTotals";
import { canvasEventBus } from "@/features/canvas/application/canvasServices";
import { useExternalFileHandoff } from "@/features/canvas/hooks/useExternalFileHandoff";
import {
  extractUpstreamContent,
  joinUpstreamText,
} from "@/features/canvas/application/graphContentResolver";
import { useUpstreamNodes } from "@/features/canvas/application/useUpstreamGraph";
import {
  sortUpstreamByReferenceOrder,
  upstreamNodesInEdgeOrder,
} from "@/features/canvas/nodes/referenceOrdering";
import { useReferenceMentionSync } from "@/features/canvas/nodes/useReferenceMentionSync";
import { useNodeGenerationTaskState } from "@/features/canvas/application/useNodeGenerationTaskState";
import {
  resolveErrorContent,
  showErrorDialog,
  notifyTaskStillRunning,
} from "@/features/canvas/application/errorDialog";
import {
  BillingRuleNotConfiguredError,
  backendErrorToastMessage,
} from "@/lib/api-errors";
import { useGenerationCreditCost } from "@/lib/queries/generation-credit-cost";
import { resolveGenerationErrorDiagnostics } from "@/features/canvas/application/generationErrorReport";
import {
  NodeHeader,
  NODE_HEADER_FLOATING_POSITION_CLASS,
} from "@/features/canvas/ui/NodeHeader";
import { NodeResizeHandle } from "@/features/canvas/ui/NodeResizeHandle";
import { NODE_OPS_PANEL_ENTER_CLASS } from "@/features/canvas/ui/OperationPanelShell";
import { NodeGenerationOverlay } from "@/features/canvas/ui/NodeGenerationOverlay";
import {
  CANVAS_NODE_INPUT_BODY_FRAME_CLASS,
  CANVAS_NODE_INPUT_BODY_SELECTED_FRAME_CLASS,
  CANVAS_NODE_INPUT_SURFACE_CLASS,
  CANVAS_NODE_OPS_PANEL_CLASS,
  CANVAS_NODE_PANEL_SURFACE_CLASS,
  CANVAS_NODE_TOOLBAR_PILL_CLASS,
  canvasNodeFrameClass,
} from "@/features/canvas/ui/nodeFrameStyles";
import {
  hasMainlineContexts,
  NodeContextBadges,
} from "@/features/freezone/context/NodeContextBadges";
import { RegenerateButton } from "@/features/canvas/ui/RegenerateButton";
import {
  NODE_CREDIT_PILL_FLAT_CLASS,
  NODE_GENERATE_BUTTON_BASE_CLASS,
  NODE_GENERATE_BUTTON_DISABLED_CLASS,
  NODE_GENERATE_BUTTON_ENABLED_CLASS,
} from "@/features/canvas/ui/nodeControlStyles";
import {
  NODE_SIDE_ACTION_BUTTON_CLASS,
  NODE_SIDE_ACTION_ICON_CLASS,
  NodeSideActionRail,
} from "@/features/canvas/ui/NodeSideActionRail";
import { VideoClipPanel } from "@/features/canvas/nodes/VideoClipPanel";
import {
  CAMERA_MOVEMENT_PRESETS,
  findCameraMovementPreset,
  type CameraMovementPreset,
} from "@/features/canvas/domain/cameraMovementPresets";
import { useFreezoneVideoCameraTemplates } from "@/features/canvas/hooks/useFreezoneVideoCameraTemplates";
import { useFreezoneVideoModels } from "@/features/canvas/hooks/useFreezoneVideoModels";
import { useCanvasStore, useIsBoxSelecting } from "@/stores/canvasStore";
import {
  fetchFreezoneJobResult,
  submitFreezoneVideoCompose,
  submitFreezoneVideoErase,
  submitFreezoneVideoEdit,
  submitFreezoneVideoGen,
  submitFreezoneVideoI2v,
  submitFreezoneVideoKeyframes,
  submitFreezoneVideoOmniGen,
  uploadFreezoneImage,
  uploadFreezoneVideo,
  type FreezoneJobRef,
  type FreezoneVideoAspectRatio,
  type FreezoneVideoReferenceItem,
  type FreezoneVideoResolution,
} from "@/api/ops";
import {
  awaitTaskCompletion,
  isTaskCancelledError,
  isTaskPollTimeoutError,
} from "@/api/tasks";
import { generationTaskDescriptor } from "@/features/canvas/application/resumeGeneration";
import { useNodeGenerationHistory } from "@/features/canvas/hooks/useNodeGenerationHistory";
import {
  NodeGenerationHistory,
  hasCompletedHistoryRecords,
  historyRecordOutputUrl,
} from "@/features/canvas/ui/NodeGenerationHistory";
import type { FreezoneGenerationHistoryRecord } from "@/api/ops";
import { readUrl } from "@/lib/url-params";
import type { ModelOption } from "@/features/canvas/ui/ProviderModelPicker";
import { CreditCostPill } from "@/components/credits/credit-visual";
import { VideoOperationsPanel } from "@/features/canvas/nodes/VideoOperationsPanel";

type VideoNodeProps = NodeProps & {
  id: string;
  data: VideoNodeData;
  selected?: boolean;
};

const DEFAULT_WIDTH = 580;
export const DEFAULT_HEIGHT = 380;
/**
 * 视频生成的计费 feature key。主体（错误态重试的计费探针）与操作面板（估价
 * 展示 + 提交置灰）共用，必须同一口径——放主体导出、面板 import。
 */
export const VIDEO_GENERATE_FEATURE_KEY = "freezone.video_generate";

const MIN_WIDTH = 480;
const MIN_HEIGHT = 280;
const MAX_WIDTH = 1100;
const MAX_HEIGHT = 1000;

// 图片节点的默认落位尺寸（与 ImageGenNode 的 DEFAULT_WIDTH/HEIGHT 对齐）。
// 「全能参考 / 图片参考」会在视频节点左侧新建一个图片节点，排版要按它的真实尺寸算。
const IMAGE_GEN_NODE_WIDTH = 580;
const IMAGE_GEN_NODE_HEIGHT = 360;

export const OPERATIONS_PANEL_HEIGHT = 280;
export const OPERATIONS_PANEL_GAP = 12;
// Extend the ops panel beyond the node's left/right edges so the textarea +
// chips have more room than the video frame itself.
export const OPERATIONS_PANEL_OVERHANG = 120;

// 空态 CTA 的图标 + 文案：具体展示哪几个模式由 `videoEmptyStateCtaModes(modelId)`
// 按模型能力决定（见 shared/videoModelCapabilities.ts），这里只负责「模式 → 外观」。
const VIDEO_EMPTY_STATE_CTA_META: Record<
  VideoEmptyStateCtaMode,
  { Icon: LucideIcon; label: string }
> = {
  allReference: { Icon: Sparkles, label: "全能参考" },
  imageReference: { Icon: Images, label: "图片参考" },
  firstFrame: { Icon: Film, label: "首帧生成视频" },
  imageToVideo: { Icon: Film, label: "图生视频" },
  firstLastFrame: { Icon: Layers, label: "首尾帧生成视频" },
};

// 各 genMode 对上游引用数量的硬上限。UI 用这张表把后端字段约束（多图 / 多模态
// 场景下）显式表达出来：超额 chip 标灰 + 从 @ 候选剔除，避免「prompt 引用了
// @图片10 但提交时被静默丢掉」。
//
// 表里没出现的模式默认不限制（textToVideo 不消费上游），走原有路径。
//   - allReference (omni)  ：image 1-9 / video 0-3 / audio 0-3。音频另有两条厂商时长
//                            约束——**逐条** 1.8~15.2s 和**总和** ≤15.2s（后台可配
//                            referenceAudioTotalMaxSeconds）——都在提交前单独校验，
//                            见 audioReferenceDurationRejection。时长口径不进这张表：
//                            这里只表达条数。
): string | null {
  const capabilityReason = videoModelReferenceDisabledReason(model, counts);
  if (capabilityReason) return capabilityReason;
  const caps = referenceCapsForMode(model, mode);
  if (!caps) return null;
  if (counts.images > caps.image) {
    return t("node.videoNode.capabilities.maxImages", { count: caps.image });
  }
  if (counts.videos > caps.video) {
    return caps.video === 0
      ? t("node.videoNode.capabilities.noVideo")
      : t("node.videoNode.capabilities.maxVideos", { count: caps.video });
  }
  if (counts.audios > caps.audio) {
    return caps.audio === 0
      ? t("node.videoNode.capabilities.noAudio")
      : t("node.videoNode.capabilities.maxAudios", { count: caps.audio });
          const newId = addNode(
            CANVAS_NODE_TYPES.imageGen,
            { x: baseX, y: baseY },
            {
              displayName: mode === "firstFrame" ? "首帧" : "参考图",
            },
          );
          if (mode === "firstFrame") {
            addEdgeWithData(newId, id, { keyframeSlot: "first" });
          } else {
            addEdge(newId, id);
          }
          const groupLabel =
            mode === "imageReference"
              ? "图片参考组"
              : mode === "firstFrame"
                ? "首帧生成视频组"
                : mode === "imageToVideo"
                  ? "图生视频组"
                : "全能参考组";
          state.autoGroupSpawn(id, [newId], { label: groupLabel });
          // 上游图片直接作为素材喂给对应端点；模式切到用户点的那一个，不预填提示词
          // （尊重用户已写内容）。HappyHorse 下由统一状态机确认（imageToVideo /
          // imageReference 都与「1 张上游图」匹配，不会被改写）；非 HappyHorse 下
          // data.genMode 一旦非空，默认推断 effect 就不再覆盖它。
          updateNodeData(id, { genMode: mode });
          return;
        }
        const totalH = FRAME_HEIGHT * 2 + GAP_Y;
        const startY = self.position.y + (selfHeight - totalH) / 2;
        const firstY = resolveAvailableY(startY);
        const lastY = resolveAvailableY(firstY + stepY);
        const firstId = addNode(
          CANVAS_NODE_TYPES.upload,
          { x: baseX, y: firstY },
          { displayName: t("node.videoNode.spawnedNode.keyframeFirst") },
        );
        addEdgeWithData(firstId, id, { keyframeSlot: "first" });
        const lastId = addNode(
          CANVAS_NODE_TYPES.upload,
          { x: baseX, y: lastY },
          { displayName: t("node.videoNode.spawnedNode.keyframeLast") },
        );
        addEdgeWithData(lastId, id, { keyframeSlot: "last" });
        state.autoGroupSpawn(id, [firstId, lastId], { label: t("node.videoNode.group.firstLastFrame") });
        updateNodeData(id, { genMode: "firstLastFrame" });
      },
      [addEdge, addEdgeWithData, addNode, id, updateNodeData],
    );

    useEffect(() => {
      return canvasEventBus.subscribe("video-node/reupload", ({ nodeId }) => {
        if (nodeId !== id) return;
        inputRef.current?.click();
      });
    }, [id]);

    const consumeExternalFile = useCallback(
      (file: File) => {
        // 走到这里文件已经从暂存里被取走了,直接 return 等于把它丢在地上 ——
        // 留一句警告,别静默。口径参照 UploadNode.tsx 的 `[upload-node] …`。
        if (!isVideoFile(file)) {
          console.warn(
            `[video-node] external file "${file.name}" (${file.type || "no mime"}) is not a video; dropped`,
          );
          return;
        }
        void processFile(file);
      },
      [processFile],
    );
    // File 本体走 pendingExternalFiles 暂存、挂载时补投 —— 低缩放档下本节点先以
    // LOD shell 挂载，只订阅事件会漏掉投递（见 useExternalFileHandoff）。
    useExternalFileHandoff("video-node/external-file", id, consumeExternalFile);

    // First time an upstream image becomes available, flip the gen mode so the
    // video actually consumes it. 默认模式按模型能力选（videoUpstreamImageDefaultMode）：
    // Seedance 2.0 → 全能参考（1-9 图的通用入口，首尾帧仍可经空态 CTA 进入）；
    // Seedance 1.x → 首帧（1.x 不支持全能参考，默认推成它会让提交必 400）。
    // 仅在 data.genMode 未定义时兜底——用户一旦选过任何 tab 就尊重其选择。
    // HappyHorse 走下面的统一状态机，不参与这条默认。
    useEffect(() => {
      if (isHappyHorseModel) return;
      if (data.genMode != null) return;
      if (referenceImages.length === 0) return;
      const defaultMode = videoUpstreamImageDefaultMode(selectedVideoModel);
      if (defaultMode) updateNodeData(id, { genMode: defaultMode });
    }, [
      data.genMode,
      id,
      isHappyHorseModel,
      referenceImages.length,
      selectedVideoModel,
      updateNodeData,
    ]);

    // HappyHorse 的模式完全由上游节点类型决定（文档的 4 大功能一一对应），这里用
    // 一条统一状态机替代分散的兜底 effect，避免多个 effect 互相打架：
    //   - 上游有视频            → 视频编辑 (videoEdit / video_url)
    //   - 上游图片 >1 张        → 图片参考 (imageReference / reference_images 1-9)
    //   - 上游图片 == 1 张      → 按目录能力选择单图默认入口，并尊重用户主动选择的
    //                             首帧 / 图生视频 / 图片参考
    //   - 无上游                → 文生视频 (textToVideo)
    // 每次都纠正，确保 genMode 不会卡在与当前上游不匹配的模式（否则 submit 时会被
    // 静默截断 / 触发上游互斥报错）。
    useEffect(() => {
      if (!isHappyHorseModel) return;
      const { images, videos } = upstreamTypeCounts;
      let target: VideoGenMode;
      if (videos > 0) {
        target = "videoEdit";
      } else if (images > 1) {
        target = "imageReference";
      } else if (images === 1) {
        const currentImageMode = ["firstFrame", "imageToVideo", "imageReference"].includes(
          genMode,
        )
          ? genMode
          : null;
        target =
          currentImageMode && isVideoModeSupportedByModel(currentImageMode, selectedVideoModel)
            ? currentImageMode
            : (videoUpstreamImageDefaultMode(selectedVideoModel) ?? "textToVideo");
      } else {
        target = "textToVideo";
      }
      if (genMode !== target) {
        updateNodeData(id, { genMode: target });
      }
    }, [
      genMode,
      id,
      isHappyHorseModel,
      selectedVideoModel,
      upstreamTypeCounts.images,
      upstreamTypeCounts.videos,
      updateNodeData,
    ]);

    // 音频引用由全能参考消费；媒体目录明确为 video_edit 配置音频上限后，视频编辑也
    // 可以消费。其它模式仍会丢弃音频，因此音频首次接入时切到 allReference。Tracked
    // through a ref so we only fire on the 0 → ≥1 transition; once the user
    // disconnects all audio and reconnects, it fires again.
    // 是否可消费音频由媒体目录的 all_reference 能力决定；未声明该能力的模型由
    // 模型选择器拦截，这里不强推 allReference 以免顶进提交必 400 的模式。
    const prevHasAudioRef = useRef(false);
    const hasAudioUpstream = useMemo(
      () => referenceMedia.some((item) => item.kind === "audio"),
      [referenceMedia],
    );
    useEffect(() => {
      const prev = prevHasAudioRef.current;
      prevHasAudioRef.current = hasAudioUpstream;
      if (
        !prev &&
        hasAudioUpstream &&
        data.genMode !== "allReference" &&
      videoEditAcceptsAudio,
    ]);

    // Seedance 1.x 吃不下视频 / 音频，留在上面只能收获一次必然失败的提交。用户把
    // 视频或音频节点连上来就是明确意图，直接替他换成 Seedance 2.0 + 全能参考。
    // 判定走 upstreamTypeCounts（按节点类型）：空的视频节点也算 —— 先连节点、后生成
    // 是正常顺序，等它出了 URL 再切模型就太迟了（用户中间会看见一个不该出现的 1.x）。
    // 模型和模式必须一次 patch 写完：分两步会先渲染出「2.0 + 图生视频」的中间态，
    // 再被下面那条 videos→allReference 的 effect 纠一次，白闪一帧。
    //
    // 只在「没有 → 有视频/音频」这一次跳变时触发，**不能每次渲染都无条件纠正**：
    // updateNodeData 每次都 pushSnapshot 且清空 future（canvasStore），若持续纠正，
    // 用户 ⌘Z 恢复回 1.x 后边还在，effect 立刻把 2.0 写回去、再压一条 past ——
    // 撤销看起来毫无反应，redo 栈还被清空，等于把「回到连线之前」这条路堵死。改的
    // 又是 model 这种用户显式挑过的值，无声覆盖且撤不回来，性质比 genMode 重得多。
    // 一次性触发也不会被绕过：素材在场期间选择器已经把 1.x 置灰了，切不回去。
    // 与紧邻上面那条音频 → allReference 的 effect 用的是同一套闩锁。
    const autoSwitchedForMediaRef = useRef(false);
    useEffect(() => {
      // 所有判断（加载态、闩锁、该不该换、换成谁）都在 videoReferenceAutoSwitchAction
      // 里，这里只负责改 ref 和发 patch —— 那边是纯函数，异步加载时序才测得到。
      const action = videoReferenceAutoSwitchAction({
        counts: upstreamTypeCounts,
        currentModelId: selectedVideoModelId,
        models: availableVideoModels,
        modelsLoading: videoModelsLoading,
        alreadySwitched: autoSwitchedForMediaRef.current,
      });
      if (action.kind === "release") {
        autoSwitchedForMediaRef.current = false;
        return;
      }
      if (action.kind === "none") return;
      autoSwitchedForMediaRef.current = true;
      const nextModel = availableVideoModels.find(
        (model) => model.id === action.modelId,
      );
      updateNodeData(id, {
        model: action.modelId,
        genMode: action.genMode,
        generateAudio: videoModelDefaultGenerateAudio(nextModel),
      });
      // 刻意不调 writeLastVideoModel：这是替用户救场，不是他表达的偏好，不该顺手
      // 把后续新建视频节点继承的默认模型也改掉。
    }, [
      availableVideoModels,
      id,
      selectedVideoModelId,
      updateNodeData,
      upstreamTypeCounts,
      videoModelsLoading,
    ]);

    // 上游接入视频素材时，「全能参考」和目录声明的「视频编辑」都能消费；其它模式
    // 会把视频丢弃。已经处于合法 videoEdit 时不要再强制改成 allReference。
    // 与音频的「0→≥1 transition」不同，这里每次都纠正，确保视频在场期间无法切走。
    // 是否可消费视频由媒体目录的 all_reference 能力决定；未声明该能力的模型不强推，
    // 以免顶进提交必 400 的模式。
    useEffect(() => {
      if (upstreamCounts.videos === 0) return;
      if (isHappyHorseModel) return;
      supportsVideoEdit,
      updateNodeData,
    ]);

    // 文生视频不接受任何素材引用。即便用户先手动选了 textToVideo 再接入
    // 图片/音频（此时上面两个自动切换 effect 都因 genMode 已显式而 bail），
    // 也要强制切走，否则会停在 textToVideo 把已连素材丢弃。
    // 有图 → 按模型能力选默认（2.0 全能参考 / 1.x 首帧）；仅音频（只有 Seedance 2.0
    // 能消费）→ 全能参考；音频对非 2.0 不可用，由模型选择器拦截，这里不强推。
    useEffect(() => {
      if (isHappyHorseModel) return;
      if (genMode !== "textToVideo") return;
      if (upstreamCounts.images === 0 && upstreamCounts.audios === 0) return;
      if (upstreamCounts.images > 0) {
        const defaultMode = videoUpstreamImageDefaultMode(selectedVideoModel);
        if (defaultMode) updateNodeData(id, { genMode: defaultMode });
      } else if (supportsAllReference) {
        updateNodeData(id, { genMode: "allReference" });
      }
    }, [
      genMode,
      isHappyHorseModel,
      supportsAllReference,
      selectedVideoModel,
      upstreamCounts.images,
      upstreamCounts.audios,
      id,
      updateNodeData,
    ]);

    // 首尾帧只承载「首帧 + 尾帧」两张图。一旦上游图片数 >2，从语义上就不再是
    // 首尾帧场景（应该是多图参考 / 全能参考），自动切到 allReference 跟「视频
    // 上游强制切 allReference」是同一类兜底逻辑。每次都纠正，避免用户在 >2
    // 图状态下被卡在 firstLastFrame 触发 submit 时被静默截断成两张。
    useEffect(() => {
      if (isHappyHorseModel) return;
      if (genMode !== "firstLastFrame") return;
      if (upstreamCounts.images <= 2) return;
      if (!supportsAllReference) return;
      updateNodeData(id, { genMode: "allReference" });
    }, [
      genMode,
      isHappyHorseModel,
      supportsAllReference,
      upstreamCounts.images,
      id,
      updateNodeData,
    ]);

    // 「首帧生成视频」只承载一张图。i2v 端点按图片张数分流（1 张 = 图生视频，
    // 2-9 张 = 图片参考），接上第二张后做的其实已经是图片参考了，模式却还停在
    // 首帧上——所以直接把模式导到它真正在做的事情：全能参考 / 图片参考。
    // 跟上面首尾帧 >2 图那条是同一类兜底，每次都纠正（不做一次性闩锁），
    // 免得用户在多图状态下停在首帧、提交时被静默截断成一张。
    // 该切到哪个、哪些情况不该动，全部收在 videoMultiImageAutoSwitchMode 里。
    useEffect(() => {
      const target = videoMultiImageAutoSwitchMode(
        genMode,
        selectedVideoModel ?? selectedVideoModelId,
        upstreamCounts.images,
      );
      if (!target || target === genMode) return;
      updateNodeData(id, { genMode: target });
    }, [
      genMode,
      selectedVideoModel,
      selectedVideoModelId,
      upstreamCounts.images,
      id,
      updateNodeData,
    ]);

    // 上面几条模式推导都是**单向**的：素材接进来就把模式推到能消费它的那一个，却没有
    // 任何一条负责在素材撤空后把模式推回去。于是「连一张图 → 又把图撤掉」之后节点卡在
    // 全能参考上：界面看不出异常，提交却会被 handleSubmit 的 references.length === 0
    // 静默拦下，用户看到的就是「打了字、点发送没反应」。这里补上反向的那一档 ——
    // 没有任何上游素材 = 文生视频，与 HappyHorse 统一状态机的「无上游 → 文生视频」同规则。
    //
    // 用 upstreamTypeCounts（按节点类型）而非 upstreamCounts（已解析 URL）：空态 CTA
    // 先铺一个还没出图的图片/上传节点、再切模式，按 URL 口径那一瞬间是 0 张，会被这条
    // 当场顶回文生视频。理由同 videoNoUpstreamResetMode 的注释。
    //
    // recordHistory: false —— 这是用户「删掉素材」那一步的**衍生结果**，不是一次独立的
    // 用户改动。若照常压 past，⌘Z 只会撤掉模式回到「无素材 + 全能参考」，本 effect 立刻
    // 又把它改回来并清空 redo 栈，撤销看着毫无反应、也再回不到连线之前（成因见上面
    // 模型自动救场那条 effect 的注释）。不记历史则 ⌘Z 直接回到「有图 + 全能参考」，正向 effect
    // 看到素材还在便不再改写。
    useEffect(() => {
      if (isHappyHorseModel) return;
      const target = videoNoUpstreamResetMode(genMode, upstreamTypeCounts);
      if (!target) return;
      updateNodeData(id, { genMode: target }, { recordHistory: false });
    }, [
      genMode,
      isHappyHorseModel,
      upstreamTypeCounts,
      id,
      updateNodeData,
    ]);

    useEffect(
      () => () => {
        clearTransientPreview();
      },
      [clearTransientPreview],
    );

    const videoSource = useMemo(() => {
      if (data.videoUrl) return resolveImageDisplayUrl(data.videoUrl);
      if (transientPreviewUrl) return transientPreviewUrl;
      return null;
    }, [data.videoUrl, transientPreviewUrl]);

    // 预览专用 src：preload="metadata" 不会绘制任何一帧，又没有 poster，画布上
    // 就是一个纯黑框（视频本身正常，下载可看）。追加 `#t=0.1` 媒体片段，让浏览器
    // seek 到 0.1s 并把那一帧画出来当封面——与 NodeGenerationHistory /
    // CanvasHistoryAssetsModal 的缩略图用法一致。仅用于显示，不影响下载/抓帧/播放。
    const videoPosterSource = useMemo(() => {
      if (!videoSource) return null;
      return videoSource.includes("#t=") ? videoSource : `${videoSource}#t=0.1`;
    }, [videoSource]);

    // 低缩放档要用的静态缩略图，走离屏 <video> + CORS 抓帧（见 videoFrameCapture）。
    // 在节点挂载时就排队，而不是等缩放缩下去才开始：低缩放档下画布上根本不挂
    // <video>，那时才抓的话用户会先盯着一屏占位块；而且首屏视口若恢复在低缩放档，
    // 展示用的 <video> 一次都不会挂载，永远等不到抓帧时机。
    useEffect(() => {
      requestLodStill(videoSource);
    }, [videoSource]);

    // 订阅模块级缓存：节点被 onlyRenderVisibleElements 反复 mount/unmount 后缩略图
    // 仍然在，重挂即用。快照是原始值，抓帧完成前后各渲染一次，不会每帧重渲染。
    const lodStill = useSyncExternalStore(subscribeLodStills, () =>
      getLodStill(videoSource)
    );

    useEffect(() => {
      updateNodeInternals(id);
    }, [id, resolvedHeight, resolvedWidth, updateNodeInternals]);

    const [hasMetadata, setHasMetadata] = useState(false);
    const [videoLoadError, setVideoLoadError] = useState(false);
    useEffect(() => {
      setHasMetadata(false);
      setVideoLoadError(false);
    }, [videoSource]);

    // ---- subtitle erase mode (libtv-style 智能去字幕) ------------------------
    const subtitleEraseMode = data.subtitleEraseMode ?? null;
    const subtitleEraseBox = data.subtitleEraseBox ?? null;
    const [isErasing, setIsErasing] = useState(false);
    // Transient drag state — null when not currently dragging.
    const [eraseDrag, setEraseDrag] = useState<{
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    } | null>(null);

    /**
     * Compute the displayed video frame rect inside its container (object-contain).
     * Returns container-pixel coords. We use this to (a) size the box overlay so
     * it sits on top of the actual video pixels (not the letterbox bars) and (b)
     * convert pointer coords ↔ normalized 0..1 source coords.
     */
    const getDisplayedVideoRect = useCallback(
      (containerW: number, containerH: number) => {
        const vw = data.widthPx ?? 0;
        const vh = data.heightPx ?? 0;
        if (!vw || !vh || containerW <= 0 || containerH <= 0) {
          return { left: 0, top: 0, width: containerW, height: containerH };
        }
        const containerRatio = containerW / containerH;
        const videoRatio = vw / vh;
        if (videoRatio > containerRatio) {
          const w = containerW;
          const h = containerW / videoRatio;
          return { left: 0, top: (containerH - h) / 2, width: w, height: h };
        }
        const h = containerH;
        const w = containerH * videoRatio;
        return { left: (containerW - w) / 2, top: 0, width: w, height: h };
      },
      [data.heightPx, data.widthPx],
    );

    const handleEraseExit = useCallback(() => {
      updateNodeData(id, { subtitleEraseMode: null, subtitleEraseBox: null });
      setEraseDrag(null);
    }, [id, updateNodeData]);

    const handleClipSubmit = useCallback(
      async (startMs: number, endMs: number) => {
        if (isComposingClip) return;
        const sourceUrl = data.videoUrl;
        if (!sourceUrl) return;
        if (endMs <= startMs) return;
        const projectId = readUrl().project;
        if (!projectId) {
          console.error("[video-node] clip: no project in URL");
          return;
        }
        // Compose only supports 720p / 1080p — fall back to 720p for 480P sources.
        const composeResolution = quality.toLowerCase() === "1080p" ? "1080p" : "720p";
        setIsComposingClip(true);
        setClipError(null);
        try {
          const sourceStart = startMs / 1000;
          const sourceEnd = endMs / 1000;
          const ref = await submitFreezoneVideoCompose(projectId, {
            resolution: composeResolution,
            tracks: [
              {
                trackId: `track_${id}_video`,
                kind: "video",
                items: [
                  {
                    itemId: `item_${id}_${Date.now()}`,
                    sourceUrl,
                    timelineStart: 0,
                    sourceStart,
                    sourceEnd,
                  },
                ],
              },
            ],
          });
          await awaitTaskCompletion(ref.task_key, projectId, {
            taskType: ref.task_type,
          });
          const result = await fetchFreezoneJobResult(
            projectId,
            "freezone_video_compose",
            ref.job_id,
          );
          if (result.url) {
            const state = useCanvasStore.getState();
            const position = state.findNodePosition(
              id,
              DEFAULT_WIDTH,
              DEFAULT_HEIGHT,
            );
            const newNodeId = addNode(CANVAS_NODE_TYPES.video, position, {
              videoUrl: result.url,
              durationMs: Math.round((sourceEnd - sourceStart) * 1000),
              displayName: t("node.videoNode.spawnedNode.clip"),
            });
            addEdge(id, newNodeId);
            updateNodeData(id, {
              isClipMode: false,
              clipStartMs: null,
              clipEndMs: null,
            });
          } else {
            console.warn("[video-node] compose completed without url", result);
            setClipError(t("node.videoNode.clip.errorNoUrl"));
          }
        } catch (error) {
          console.error("[video-node] clip compose failed", error);
          setClipError(error instanceof Error ? error.message : String(error));
        } finally {
          setIsComposingClip(false);
        }
      },
      [
        addEdge,
        addNode,
        data.videoUrl,
        id,
        isComposingClip,
        quality,
        updateNodeData,
      ],
    );

    const handleEraseSubmit = useCallback(async () => {
      if (isErasing) return;
      if (!data.videoUrl) return;
      if (subtitleEraseMode === "box" && !subtitleEraseBox) return;
      const projectId = readUrl().project;
      if (!projectId) {
        console.error("[video-node] no project in URL");
        return;
      }
      setIsErasing(true);
      try {
        const ref = await submitFreezoneVideoErase(projectId, {
          sourceUrl: data.videoUrl,
          mode: subtitleEraseMode === "box" ? "box" : "smart_subtitle",
          box: subtitleEraseMode === "box" ? subtitleEraseBox : null,
        });
        await awaitTaskCompletion(ref.task_key, projectId, {
          taskType: ref.task_type,
        });
        const result = await fetchFreezoneJobResult(
          projectId,
          "freezone_video_erase",
          ref.job_id,
        );
        if (result.url) {
          updateNodeData(id, {
            videoUrl: result.url,
            subtitleEraseMode: null,
            subtitleEraseBox: null,
          });
        } else {
          console.warn("[video-node] erase completed without url", result);
        }
      } catch (error) {
        console.error("[video-node] subtitle erase failed", error);
      } finally {
        setIsErasing(false);
      }
    }, [
      data.videoUrl,
      id,
      isErasing,
      subtitleEraseBox,
      subtitleEraseMode,
      updateNodeData,
    ]);

          pricing_quantity:
            Math.min(Math.max(count, 1), 4) *
            (genMode === "videoEdit"
              ? Math.max(Math.floor(videoInputBilling.durationSeconds), 1)
              : durationSec),
          operation: genMode,
          generate_audio: generateAudio,
          video_input_present: videoInputBilling.present,
          input_video_duration_seconds: videoInputBilling.durationSeconds,
        },
        quantity: Math.min(Math.max(count, 1), 4),
      },
    );
    const videoBillingRuleMissing =
      retryBillingProbe.error instanceof BillingRuleNotConfiguredError;
    const modelTaskAccess = useModelTaskAccess();
    const submitDisabled =
      isGenerating ||
      videoBillingRuleMissing ||
      modelTaskAccess.blocked ||
      !selectedVideoModel ||
      selectedModelReferenceError !== null ||
      mediaRejectionReason != null ||
      // 提示词与素材是**两条并列**的要求，不是二选一：全能参考两条都要（后端强校验
      // prompt，omni 端点又没素材可发）。写成三元的时候，全能参考只看提示词，素材撤空后
      // 按钮仍是可点态，点下去被 handleSubmit 的 references.length === 0 静默拦掉。
      (videoModeRequiresPrompt(genMode) && !hasPromptText) ||
      (videoModeRequiresMedia(genMode) && !hasRequiredMediaForMode);

    const handleSubmit = useCallback(async () => {
      if (submitDisabled) return;
      // 在途守卫（与 ImageGenNode 一致）：第 1 条完成就会清 isGenerating，
      // submitDisabled 拦不住「旧批次 N-1 个任务还在跑时重新提交」——旧闭包
      // 会用过期的 completedUrls 覆写新批次的 generationBatch。
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
      const projectId = readUrl().project;
      if (!projectId) {
        console.error("[video-node] no project in URL");
        return;
      }
      updateNodeData(id, {
        isGenerating: true,
        generationStartedAt: Date.now(),
        // Clear any prior failure so the banner reflects only this attempt.
        // 注意 generationBatch 不在这里清：下面还有多条校验失败的早退路径，
        // 在这里清会让一次失败的提交白白毁掉已有画册——批次清空挪到真正开跑前。
        generationError: null,
        generationErrorDetails: null,
        generationErrorRequestId: null,
      });
      // 运镜 fragment 拼接到最终 prompt 的开头；上游 text 在前、用户自己写
      // 的 prompt 在后，两段以 \n\n 隔开（与 ImageGenNode/ImageEditNode 一致）。
      const fragment = cameraMovementPreset?.promptFragment;
      const trimmedPrompt = prompt.trim();
      const userPrompt = [upstreamTextJoined, trimmedPrompt]
        .filter((s) => s.length > 0)
        .join("\n\n");
      const composedPrompt = fragment
        ? userPrompt
          ? `${fragment}，${userPrompt}`
          : fragment
        : userPrompt;
      try {
        // Walk the current edges/nodes once — used by every non-textToVideo
        // branch to collect upstream resources. 必须与 UI 编号侧（useUpstreamNodes）
        // 同源：按连线顺序收集。曾按 state.nodes 顺序（节点创建顺序）收集，先创建
        // 但后连线的节点会排到 references 前面，@图片N 在后端就指向错位的图。
        const collectUpstream = () => {
          const state = useCanvasStore.getState();
          return sortUpstreamByReferenceOrder(
            upstreamNodesInEdgeOrder(state.nodes, state.edges, id),
            data.referenceOrder,
          );
        };
        const collectUpstreamImageUrls = (): string[] => {
          const upstream = collectUpstream();
          const urls: string[] = [];
          for (const node of upstream) {
            const url = submittableImageUrl(node);
            if (typeof url === "string" && url.length > 0) urls.push(url);
          }
          return urls;
        };
        const collectUpstreamKeyframeUrls = (): {
          firstFrameUrl: string | null;
          lastFrameUrl: string | null;
        } => {
          const state = useCanvasStore.getState();
          const candidates: Array<{
            url: string;
            slot?: "first" | "last";
            legacyDisplayName?: string | null;
          }> = [];
          for (const node of collectUpstream()) {
            const url = submittableImageUrl(node);
            if (!url) continue;
            const edge = state.edges.find(
              (candidate) => candidate.source === node.id && candidate.target === id,
            );
            candidates.push({
              url,
              slot: edge?.data?.keyframeSlot,
              legacyDisplayName:
                typeof node.data.displayName === "string" ? node.data.displayName : null,
            });
          }
          return resolveVideoKeyframeUrls(candidates);
        };
          // 视频编辑：1 个源视频，并按媒体目录上限附带参考图片和独立参考音频。
          // 不再是 HappyHorse 专属 —— 目录里声明了 video_edit 的模型都走这条路。
          const upstream = collectUpstream();
          const videoUrl =
            upstream
              .map((node) => referenceVideoUrl(node) ?? "")
              .find((url) => url.length > 0) ?? "";
          if (!videoUrl) {
            console.warn("[video-node] videoEdit submit without upstream video");
            updateNodeData(id, {
              isGenerating: false,
              generationStartedAt: null,
            });
            return;
          }
          const allImageUrls = collectUpstreamImageUrls();
          const imageLimit = referenceCaps?.image ?? 5;
          if (allImageUrls.length > imageLimit) {
            toast.warning(
              t("node.videoNode.videoEdit.tooManyImages", {
                limit: imageLimit,
                used: imageLimit,
                ignored: allImageUrls.length - imageLimit,
              }),
            );
          }
          const imageUrls = allImageUrls.slice(0, imageLimit);
          doSubmit = (targetId) =>
            submitFreezoneVideoEdit(projectId, {
              videoUrl,
              imageUrls,
              audioUrls: audioRefs.map((item) => item.url),
              prompt: composedPrompt,
              cameraTemplateId,
              resolution: qualityToResolution(quality),
              audioSetting: "auto",
              generateAudio,
              model: selectedVideoModel?.catalogId ?? modelId,
              genMode,
              modelParams: data.modelParams,
              canvasId,
              nodeId: targetId,
            });
        } else if (genMode === "allReference") {
          // 全能参考是否可用以媒体目录的 supportedModes 为准。这里前置守卫给出
          // 可读提示，防止切换模型后残留模式打到不支持的端点。
          if (!supportsAllReference) {
            void showErrorDialog(
              isHappyHorseModel
                ? t("node.videoNode.allReference.happyhorseUnsupported")
                : t("node.videoNode.allReference.modelUnsupported"),
              t("common.error"),
            );
            updateNodeData(id, {
              isGenerating: false,
              generationStartedAt: null,
            });
            return;
          }
          // Omni-gen: classify each upstream node by its media type.
          const caps = referenceCaps ?? { image: 9, video: 3, audio: 3 };
          const totalReferenceLimit = hasConfiguredReferenceCaps(selectedVideoModel)
            ? caps.image + caps.video + caps.audio
            : 12;
          const upstream = collectUpstream();
          const references: FreezoneVideoReferenceItem[] = [];
          // 与 references 里 type==="audio" 的项一一对应，用于提交前逐条校验音频时长。
          const audioRefs: {
            url: string;
            label: string;
            durationMs: number | null;
          }[] = [];
          const videoRefs: {
            url: string;
            label: string;
            durationMs: number | null;
          }[] = [];
          let imageCount = 0;
          let videoCount = 0;
          let audioCount = 0;
          for (const node of upstream) {
            if (references.length >= totalReferenceLimit) break;
            const videoRefUrl = referenceVideoUrl(node);
            if (videoRefUrl) {
              // 视频节点或携带 videoUrl 的 upload 节点（资产库视频）统一收集。
              if (videoCount < caps.video) {
                references.push({ type: "video", url: videoRefUrl });
                videoRefs.push({
                  url: videoRefUrl,
                  label: t("node.videoNode.referenceDuration.videoFallbackLabel", {
                    index: videoCount + 1,
                  }),
                  durationMs:
                    typeof node.data.durationMs === "number"
                      ? node.data.durationMs
                      : null,
                });
                videoCount += 1;
              }
            } else if (isAudioNode(node)) {
              const url =
                typeof node.data.audioUrl === "string"
                  ? node.data.audioUrl
                  : "";
              if (url && audioCount < caps.audio) {
                // 音频引用默认走「配乐参考」语义；label 用 sourceFileName /
                // displayName 之一，方便后端日志和后续 UI 展示对得上。
                const rawLabel =
                  (typeof node.data.sourceFileName === "string"
                    ? node.data.sourceFileName
                    : "") ||
                  (typeof node.data.displayName === "string"
                    ? node.data.displayName
                    : "");
                references.push({
                  type: "audio",
                  url,
                  role: t("node.videoNode.audio.roleMusic"),
                  label: rawLabel,
                });
                audioRefs.push({
                  url,
                  // 时长超限时要指名道姓是哪条，所以这里连标签一起留着；没有文件名
                  // 的（TTS 直出等）退回「音频N」。序号按音频自身 1-based 计，与后端
                  // pipeline.py 的 enumerate(audio_paths, start=1) 同口径；标签本身
                  // 只进提示文案、不随 references 发给后端，所以跟随界面语言。
                  label:
                    rawLabel ||
                    t("node.videoNode.audio.clipFallbackLabel", {
                      index: audioCount + 1,
                    }),
                  durationMs:
                    typeof node.data.durationMs === "number"
                      ? node.data.durationMs
                      : null,
                });
                audioCount += 1;
              }
            } else {
              const url = submittableImageUrl(node);
              if (url && imageCount < caps.image) {
                references.push({ type: "image", url });
                imageCount += 1;
              }
            }
          }
          if (references.length === 0) {
            console.warn("[video-node] omni-gen submit without any reference");
            updateNodeData(id, {
              isGenerating: false,
              generationStartedAt: null,
            });
            return;
          }
          if (!(await validateReferenceDurations("audio", audioRefs))) return;
          if (!(await validateReferenceDurations("video", videoRefs))) return;
          doSubmit = (targetId) =>
            submitFreezoneVideoOmniGen(projectId, {
              prompt: composedPrompt,
              cameraTemplateId,
              references,
              aspectRatio: submitAspectRatio,
              resolution: qualityToResolution(quality),
              durationSeconds: durationClamped,
              generateAudio,
              model: selectedVideoModel?.catalogId ?? modelId,
              genMode,
              modelParams: data.modelParams,
              humanReview: supportsHumanReview && humanReview,
              sceneOptimize: sceneOptimize ?? null,
              canvasId,
              nodeId: targetId,
            });
        } else {
          // textToVideo (default).
          doSubmit = (targetId) =>
            submitFreezoneVideoGen(projectId, {
              prompt: composedPrompt,
              cameraTemplateId,
              aspectRatio: submitAspectRatio,
              resolution: qualityToResolution(quality),
              durationSeconds: durationClamped,
              generateAudio,
              model: selectedVideoModel?.catalogId ?? modelId,
              genMode,
              modelParams: data.modelParams,
              humanReview: supportsHumanReview && humanReview,
              sceneOptimize: sceneOptimize ?? null,
              canvasId,
              nodeId: targetId,
            });
        }

        if (!doSubmit) {
          updateNodeData(id, { isGenerating: false, generationStartedAt: null });
          return;
        }
        const submitOnce = doSubmit;

        // 多条生成不再复制兄弟节点：N 个任务并发、全部回填到当前节点的
        // generationBatch（叠卡画册，与图片节点一致）。第 1 条完成的设为主视频，
        // 其余逐条追加。
        const total = Math.min(Math.max(count, 1), 4);
        // 各并发任务完成顺序不定，本地累积已完成的 URL，整组写回（避免读改写竞态）。
        const completedUrls: string[] = [];
        // 收集每个子任务的失败，留到整批 settle 后统一决定是否弹错误框——避免
        // 「N 条里 1 条秒失败（如命中队列上限）、其余正常生成」时一边弹报错一边
        // 又冒加载动画的矛盾观感。
        const runErrors: unknown[] = [];
        const runOne = async (runIndex: number) => {
          try {
            const ref = await submitOnce(id);
            // Persist the task handle so a page refresh can resume this job.
            // N 个并发任务同节点只能存一个句柄——保留第 1 个（主视频）的。
            if (runIndex === 0) {
              updateNodeData(id, generationTaskDescriptor(ref));
            }
            const completed = await awaitTaskCompletion(ref.task_key, projectId, {
              taskType: ref.task_type,
            });
            // Prefer the dedicated result endpoint — SSE `task.result` may only
            // carry metadata (same pattern as reverse_prompt + video_erase).
            let url = resolveOutputUrl(completed.result);
            if (!url) {
              try {
                const result = await fetchFreezoneJobResult(
                  projectId,
                  ref.task_type,
                  ref.job_id,
                );
                url = result.url || null;
              } catch (error) {
                console.error("[video-node] fetch job result failed", error);
              }
            }
            if (url) {
              completedUrls.push(url);
              const isFirstCompleted = completedUrls.length === 1;
              updateNodeData(id, {
                // 第 1 条完成的设为主视频并结束 loading；后续只扩充画册。
                ...(isFirstCompleted
                  ? {
                      videoUrl: url,
                      isGenerating: false,
                      generationStartedAt: null,
                      sourceFileName: null,
                      generationError: null,
                      generationErrorDetails: null,
                      generationErrorRequestId: null,
                    }
                  : {}),
                ...(total > 1 ? { generationBatch: [...completedUrls] } : {}),
              });
            } else {
              console.warn(
                "[video-node] video gen completed without output url",
                completed,
              );
              // 只有 run 0（任务句柄归属者）且尚无任何成功时才终结 loading——
              // 非首个任务先「无 URL 完成」不能把还在跑的整体 loading 掐掉。
              if (runIndex === 0 && completedUrls.length === 0) {
                updateNodeData(id, {
                  isGenerating: false,
                  generationStartedAt: null,
                  generationError: t("node.videoNode.generation.noResultUrl"),
                  generationErrorDetails: null,
                  generationErrorRequestId: null,
                });
              }
            }
          } catch (error) {
            if (isTaskCancelledError(error)) {
              // 用户已在终止确认里知情：不进 runErrors、不弹错误框、不落错误横幅。
              if (runIndex === 0 && completedUrls.length === 0) {
                updateNodeData(id, { isGenerating: false, generationStartedAt: null });
              }
              return;
            }
            console.error("[video-node] video gen failed", error);
            // 先记下错误再决定是否早退 —— settle 后的聚合分支靠 runErrors 判断
            // 「部分失败」并弹 toast；早退前不记会把首个成功之后的失败彻底吞掉。
            runErrors.push(error);
            // 已有同批其它视频完成（主视频已落）时不覆盖成功态为错误——
            // 部分失败只影响画册条数。
            if (completedUrls.length > 0) return;
            // 轮询超时 ≠ 生成失败：后端还在跑。保留 isGenerating 与任务句柄，
            // 刷新页面时 resumeNodeGeneration 会重新接上并回填结果；这里写错误
            // 横幅只会把一个还活着的任务标成失败、并清掉可续接的句柄。
            if (isTaskPollTimeoutError(error)) return;
            const resolved = resolveErrorContent(error, t("node.videoNode.generation.failed"));
            generateAudio={generateAudio}
            supportsHumanReview={supportsHumanReview}
            humanReview={humanReview}
            count={count}
            prompt={prompt}
            isGenerating={isGenerating}
            videoBackendForCost={videoBackendForCost}
            videoInputPresent={videoInputBilling.present}
            videoInputBillingReady={videoInputBilling.ready}
            inputVideoDurationSeconds={videoInputBilling.durationSeconds}
            submitDisabled={submitDisabled}
            selectedModelReferenceError={selectedModelReferenceError}
            mediaRejectionReason={mediaRejectionReason}
            expanded={panelExpanded}
            onExpandedChange={setPanelExpanded}
            onSubmit={handleSubmit}
          />
        )}

        {selected &&
          !isBoxSelecting &&
          !albumExpanded &&
          !isClipMode &&
          !subtitleEraseMode &&
          !data.referenceOnly &&
          hasCompletedHistoryRecords(historyRecords) && (
            <div
              className={`nodrag absolute z-[300] rounded-[var(--node-radius)] ${CANVAS_NODE_OPS_PANEL_CLASS} ${NODE_OPS_PANEL_ENTER_CLASS} px-3 py-2`}
              style={{
                top: `calc(100% + ${OPERATIONS_PANEL_GAP * 2 + panelHeight}px)`,
                left: -panelOverhang,
                right: -panelOverhang,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <NodeGenerationHistory
                records={historyRecords}
                isLoading={historyLoading}
                onRestore={handleRestoreHistory}
                onRefresh={() => void refreshHistory()}
                isActive={(record) => {
                  const url = historyRecordOutputUrl(record);
                  if (!url) return false;
                  // 预览态下高亮正在预览的历史条，否则高亮当前主视频。
                  if (isGenerating && historyPreviewUrl) {
                    return url === historyPreviewUrl;
                  }
                  return url === data.videoUrl;
                }}
              />
            </div>
          )}

        {subtitleEraseMode && (
          <div
            className="nodrag absolute left-0 right-0 z-10 flex justify-center"
            style={{ top: `calc(100% + ${OPERATIONS_PANEL_GAP}px)` }}
            onClick={(event) => event.stopPropagation()}
          >
            <SubtitleEraseOpsPanel
              mode={subtitleEraseMode}
              isErasing={isErasing}
              hasBox={!!subtitleEraseBox}
              onExit={handleEraseExit}
              onResetBox={() => updateNodeData(id, { subtitleEraseBox: null })}
              onSubmit={handleEraseSubmit}
            />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={VIDEO_FILE_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  },
);

VideoNode.displayName = "VideoNode";

export type ReferenceMediaItem =
  | {
      kind: "image";
      nodeId: string;
      imageUrl: string;
      displayName?: string | null;
    }
  | {
      kind: "video";
      nodeId: string;
      videoUrl: string;
      thumbUrl?: string | null;
      displayName?: string | null;
    }
  | {
      kind: "audio";
      nodeId: string;
      audioUrl: string;
      displayName?: string | null;
    };

// --- custom video player controls ------------------------------------------ //
//
// 替代 <video controls>：libtv 风格的浮层（底部一条）。订阅原生 <video>
// 的 play/pause/timeupdate/durationchange/volumechange，写回时直接操作元素，
// 由事件驱动 state 单向同步。隐藏时机：默认显示 0.85 透明度 + hover 加深，
// 不做自动隐藏，避免画布上看不到「这个视频还能控制」。

interface VideoPlayerControlsProps {
  videoEl: HTMLVideoElement | null;
  isCapturingFrame: boolean;
  onCapture: (mode: "first" | "last" | "current") => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoPlayerControls({
  videoEl,
  isCapturingFrame,
  onCapture,
}: VideoPlayerControlsProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHoveringFrame, setIsHoveringFrame] = useState(false);

  useEffect(() => {
    if (!videoEl) return;
    const syncAll = () => {
      setIsPlaying(!videoEl.paused);
      setCurrentTime(videoEl.currentTime);
      setDuration(Number.isFinite(videoEl.duration) ? videoEl.duration : 0);
      setIsMuted(videoEl.muted);
    };
    syncAll();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(videoEl.currentTime);
    const onDur = () => {
      setDuration(Number.isFinite(videoEl.duration) ? videoEl.duration : 0);
    };
    const onVol = () => setIsMuted(videoEl.muted);
    videoEl.addEventListener("play", onPlay);
    videoEl.addEventListener("pause", onPause);
    videoEl.addEventListener("timeupdate", onTime);
    videoEl.addEventListener("durationchange", onDur);
    videoEl.addEventListener("loadedmetadata", onDur);
    videoEl.addEventListener("volumechange", onVol);
    return () => {
      videoEl.removeEventListener("play", onPlay);
      videoEl.removeEventListener("pause", onPause);
      videoEl.removeEventListener("timeupdate", onTime);
      videoEl.removeEventListener("durationchange", onDur);
      videoEl.removeEventListener("loadedmetadata", onDur);
      videoEl.removeEventListener("volumechange", onVol);
    };
  }, [videoEl]);

  const togglePlay = useCallback(() => {
    if (!videoEl) return;
    if (videoEl.paused) {
      void videoEl.play().catch(() => undefined);
    } else {
      videoEl.pause();
    }
  }, [videoEl]);

  const toggleMute = useCallback(() => {
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
  }, [videoEl]);

  const onSeek = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!videoEl) return;
      const next = Number(event.target.value);
      if (!Number.isFinite(next)) return;
      videoEl.currentTime = next;
      setCurrentTime(next);
    },
    [videoEl],
  );

  // 进度百分比（用作 range 背景的渐变锚点）。
  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const sliderBg = `linear-gradient(to right, rgb(var(--accent-rgb)) 0%, rgb(var(--accent-rgb)) ${progressPct}%, rgba(255,255,255,0.18) ${progressPct}%, rgba(255,255,255,0.18) 100%)`;

  return (
    <div className="nodrag absolute inset-x-0 bottom-0 z-20 flex items-center gap-2.5 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-3 pb-2 pt-6 text-text-dark">
      <button
        type="button"
        onClick={(event) => {
          // 唯一的播放/暂停入口:阻止冒泡,避免点它时把节点也选中。
          event.stopPropagation();
          togglePlay();
        }}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-dark/90 transition-colors hover:bg-white/[0.12] hover:text-text-dark"
        title={
          isPlaying
            ? t("node.videoNode.player.pause", { defaultValue: "暂停" })
            : t("node.videoNode.player.play", { defaultValue: "播放" })
        }
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" fill="currentColor" />
        )}
      </button>

      <span className="shrink-0 text-[11px] tabular-nums text-text-dark/85">
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={duration > 0 ? duration : 0}
        step={0.05}
        value={currentTime}
        onChange={onSeek}
        onMouseDown={(event) => event.stopPropagation()}
        className="video-player-scrubber h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full"
        style={{ background: sliderBg }}
      />

      <span className="shrink-0 text-[11px] tabular-nums text-text-dark/85">
        {formatTime(duration)}
      </span>

      <button
        type="button"
        onClick={toggleMute}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-dark/90 transition-colors hover:bg-white/[0.12] hover:text-text-dark"
        title={
          isMuted
            ? t("node.videoNode.player.unmute", { defaultValue: "取消静音" })
            : t("node.videoNode.player.mute", { defaultValue: "静音" })
        }
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      <div
        className="relative shrink-0"
        onMouseEnter={() => setIsHoveringFrame(true)}
        onMouseLeave={() => setIsHoveringFrame(false)}
      >
        <button
          type="button"
          disabled={isCapturingFrame}
          onClick={() => onCapture("current")}
          title={t("node.videoNode.frame.captureCurrent")}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            isCapturingFrame
              ? "cursor-not-allowed text-text-muted/60"
              : "text-text-dark/90 hover:bg-white/[0.12] hover:text-text-dark"
          }`}
        >
          {isCapturingFrame ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>

        {isHoveringFrame && !isCapturingFrame && (
          <div className="absolute bottom-full right-0 flex flex-col gap-1 rounded-lg border border-white/10 bg-surface-dark/95 p-1 text-xs shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => onCapture("first")}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-left text-text-dark transition-colors hover:bg-white/[0.08]"
            >
              {t("node.videoNode.frame.captureFirst")}
            </button>
            <button
              type="button"
              onClick={() => onCapture("last")}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-left text-text-dark transition-colors hover:bg-white/[0.08]"
            >
              {t("node.videoNode.frame.captureLast")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- subtitle erase: box overlay ------------------------------------------- //

interface DisplayedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SubtitleEraseBoxOverlayProps {
  box: { x: number; y: number; width: number; height: number } | null;
  drag: { x0: number; y0: number; x1: number; y1: number } | null;
  disabled: boolean;
  getDisplayedRect: (containerW: number, containerH: number) => DisplayedRect;
  onDragStart: (start: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }) => void;
  onDragMove: (next: { x1: number; y1: number }) => void;
  onDragEnd: (
    final: { x: number; y: number; width: number; height: number } | null,
  ) => void;
}

function SubtitleEraseBoxOverlay({
  box,
  drag,
  disabled,
  getDisplayedRect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: SubtitleEraseBoxOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const displayed = getDisplayedRect(containerSize.w, containerSize.h);

  const toNormalized = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { nx: 0, ny: 0 };
      const rect = el.getBoundingClientRect();
      const localX = clientX - rect.left - displayed.left;
      const localY = clientY - rect.top - displayed.top;
      const nx = displayed.width > 0 ? localX / displayed.width : 0;
      const ny = displayed.height > 0 ? localY / displayed.height : 0;
      return {
        nx: Math.max(0, Math.min(1, nx)),
        ny: Math.max(0, Math.min(1, ny)),
      };
    },
    [displayed.height, displayed.left, displayed.top, displayed.width],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const { nx, ny } = toNormalized(event.clientX, event.clientY);
      onDragStart({ x0: nx, y0: ny, x1: nx, y1: ny });
    },
    [disabled, onDragStart, toNormalized],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || !drag) return;
      const { nx, ny } = toNormalized(event.clientX, event.clientY);
      onDragMove({ x1: nx, y1: ny });
    },
    [disabled, drag, onDragMove, toNormalized],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || !drag) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // pointer may not have been captured
      }
      const x = Math.min(drag.x0, drag.x1);
      const y = Math.min(drag.y0, drag.y1);
      const width = Math.abs(drag.x1 - drag.x0);
      const height = Math.abs(drag.y1 - drag.y0);
      if (width < 0.01 || height < 0.01) {
        onDragEnd(null);
        return;
      }
      onDragEnd({ x, y, width, height });
    },
    [disabled, drag, onDragEnd],
  );

  const effective = drag
    ? {
        x: Math.min(drag.x0, drag.x1),
        y: Math.min(drag.y0, drag.y1),
        width: Math.abs(drag.x1 - drag.x0),
        height: Math.abs(drag.y1 - drag.y0),
      }
    : box;

  return (
    <div
      ref={containerRef}
      className="nodrag absolute inset-0 z-30"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(event) => event.stopPropagation()}
      style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
    >
      {effective && effective.width > 0 && effective.height > 0 && (
        <div
          className="pointer-events-none absolute border-2 border-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.15)]"
          style={{
            left: displayed.left + effective.x * displayed.width,
            top: displayed.top + effective.y * displayed.height,
            width: effective.width * displayed.width,
            height: effective.height * displayed.height,
          }}
        />
      )}
    </div>
  );
}

// --- subtitle erase: ops panel --------------------------------------------- //

interface SubtitleEraseOpsPanelProps {
  mode: "smart" | "box";
  isErasing: boolean;
  hasBox: boolean;
  onExit: () => void;
  onResetBox: () => void;
  onSubmit: () => void;
}

function SubtitleEraseOpsPanel({
  mode,
  isErasing,
  hasBox,
  onExit,
  onResetBox,
  onSubmit,
}: SubtitleEraseOpsPanelProps) {
  const { t } = useTranslation();
  const submitDisabled = isErasing || (mode === "box" && !hasBox);
  const labelKey =
    mode === "box"
      ? "nodeToolbar.video.subtitleRemovalBox"
      : "nodeToolbar.video.subtitleRemovalSmart";
  const icon =
    mode === "box" ? (
      <Square className="h-3.5 w-3.5 shrink-0 text-text-muted" />
    ) : (
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-text-muted" />
    );

  return (
    <div className={`flex min-w-[420px] max-w-[calc(100vw-32px)] items-center gap-2 ${CANVAS_NODE_TOOLBAR_PILL_CLASS}`}>
      <button
        type="button"
        onClick={onExit}
        title={t("node.videoNode.subtitleErase.exit")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-dark/70 text-text-muted transition-colors hover:bg-bg-dark hover:text-text-dark"
      >
        <XIcon className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-xs text-text-dark">
        {icon}
        <span className="truncate font-medium">{t(labelKey)}</span>
      </div>

      {mode === "box" && (
        <button
          type="button"
          onClick={onResetBox}
          title={t("node.videoNode.subtitleErase.tools.reset")}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded px-1 text-text-dark/72 transition-colors hover:text-text-dark"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}

      <CreditCostPill
        display="0"
        disabled={submitDisabled}
        className={NODE_CREDIT_PILL_FLAT_CLASS}
      />

      <button
        type="button"
        disabled={submitDisabled}
        onClick={onSubmit}
        title={t("node.videoNode.subtitleErase.submit")}
        className={`${NODE_GENERATE_BUTTON_BASE_CLASS} shrink-0 ${
          submitDisabled
            ? NODE_GENERATE_BUTTON_DISABLED_CLASS
            : NODE_GENERATE_BUTTON_ENABLED_CLASS
        }`}
      >
        {isErasing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
