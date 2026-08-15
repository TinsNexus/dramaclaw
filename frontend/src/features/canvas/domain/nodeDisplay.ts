// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import {
  CANVAS_NODE_TYPES,
  type CanvasNodeData,
  type CanvasNodeType,
  type ExportImageNodeResultKind,
} from './canvasNodes';

export const DEFAULT_NODE_DISPLAY_NAME: Record<CanvasNodeType, string> = {
  [CANVAS_NODE_TYPES.upload]: 'node.displayName.upload',
  [CANVAS_NODE_TYPES.imageEdit]: 'node.displayName.imageEdit',
  [CANVAS_NODE_TYPES.imageGen]: 'node.displayName.imageGen',
  [CANVAS_NODE_TYPES.exportImage]: 'node.displayName.exportImage',
  [CANVAS_NODE_TYPES.beatContext]: 'node.displayName.beatContext',
  [CANVAS_NODE_TYPES.textAnnotation]: 'node.displayName.textAnnotation',
  [CANVAS_NODE_TYPES.group]: 'node.displayName.group',
  [CANVAS_NODE_TYPES.storyboardSplit]: 'node.displayName.storyboardSplit',
  [CANVAS_NODE_TYPES.storyboardGen]: 'node.displayName.storyboardGen',
  [CANVAS_NODE_TYPES.video]: 'node.displayName.video',
  [CANVAS_NODE_TYPES.audio]: 'node.displayName.audio',
  [CANVAS_NODE_TYPES.videoStory]: 'node.displayName.videoStory',
  [CANVAS_NODE_TYPES.videoCompose]: 'node.displayName.videoCompose',
  [CANVAS_NODE_TYPES.script]: 'node.displayName.script',
  [CANVAS_NODE_TYPES.pano360Viewer]: 'node.displayName.pano360Viewer',
  [CANVAS_NODE_TYPES.threeDWorld]: 'node.displayName.threeDWorld',
  [CANVAS_NODE_TYPES.skill]: 'node.displayName.skill',
};

export const EXPORT_RESULT_DISPLAY_NAME: Record<ExportImageNodeResultKind, string> = {
  generic: 'node.displayName.exportGeneric',
  storyboardGenOutput: 'node.displayName.storyboardGenOutput',
  storyboardSplitExport: 'node.displayName.storyboardSplitExport',
  storyboardFrameEdit: 'node.displayName.storyboardFrameEdit',
  matte: 'node.displayName.matte',
  upscale: 'node.displayName.upscale',
};

function resolveExportResultDefault(data: Partial<CanvasNodeData>, t: (key: string) => string = (key) => key): string {
  const resultKind = (data as { resultKind?: ExportImageNodeResultKind }).resultKind ?? 'generic';
  return t(EXPORT_RESULT_DISPLAY_NAME[resultKind]);
}

export function getDefaultNodeDisplayName(type: CanvasNodeType, data: Partial<CanvasNodeData>, t: (key: string) => string = (key) => key): string {
  if (type === CANVAS_NODE_TYPES.exportImage) {
    return resolveExportResultDefault(data, t);
  }
  return t(DEFAULT_NODE_DISPLAY_NAME[type]);
}

export function resolveNodeDisplayName(type: CanvasNodeType, data: Partial<CanvasNodeData>, t: (key: string) => string = (key) => key): string {
  const customTitle = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  if (customTitle) {
    return customTitle;
  }

  if (type === CANVAS_NODE_TYPES.group) {
    const legacyLabel = typeof (data as { label?: string }).label === 'string'
      ? (data as { label?: string }).label?.trim()
      : '';
    if (legacyLabel) {
      return legacyLabel;
    }
  }

  return getDefaultNodeDisplayName(type, data, t);
}

export function isNodeUsingDefaultDisplayName(type: CanvasNodeType, data: Partial<CanvasNodeData>, t: (key: string) => string = (key) => key): boolean {
  const customTitle = typeof data.displayName === 'string' ? data.displayName.trim() : '';
  if (!customTitle) {
    return true;
  }
  return customTitle === getDefaultNodeDisplayName(type, data, t);
}
