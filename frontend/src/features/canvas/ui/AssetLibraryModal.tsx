// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  Loader2,
  MoreHorizontal,
  Music,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Video as VideoIcon,
  X,
} from 'lucide-react';

import {
  createFreezoneAssetLibraryFolder,
  deleteFreezoneAssetLibraryFolder,
  deleteFreezoneVideoCharacterLibraryItem,
  fetchFreezoneAssetLibraryFolders,
  fetchFreezoneVideoCharacterLibrary,
  submitFreezoneAddVideoCharacterLibraryItem,
  syncFreezoneAssetLibraryFromMainline,
  updateFreezoneAssetLibraryFolder,
  uploadFreezoneImage,
  uploadFreezoneVideo,
  type FreezoneAssetLibraryFolder,
} from '@/api/ops';
import { resolveImageDisplayUrl } from '@/features/canvas/application/imageData';
import { AssetLibraryItemMedia } from './AssetLibraryItemMedia';
import { Button } from '@/components/ui/button';
import { confirmDialog } from '@/components/confirm-dialog-host';
import { AssetLibraryFolderCoverDialog } from './AssetLibraryFolderCoverDialog';
import { AssetLibraryNewFolderDialog } from './AssetLibraryNewFolderDialog';
import {
  AssetLibraryUploadDialog,
  type AssetLibraryUploadPick,
} from './AssetLibraryUploadDialog';
// 条目模型与类目定义和左侧面板的「资产库」tab 共用，见 ./assetLibraryItems
import {
  ALL_CATEGORY_KEY,
  ASSET_CATEGORIES,
  ASSET_LIBRARY_CARD_CLASS,
  ASSET_LIBRARY_CARD_HOVER_CLASS,
  SOURCE_LABEL,
  buildAssetFolders,
  folderCoverUrl,
  formatFolderDate,
  normalizeLibraryList,
  systemFolderLabel,
  type AssetCategory,
  type AssetFolder,
  type AssetFolderKey,
  type AssetLibraryMedia,
  type AssetLibraryTabKey,
  type LibraryItem,
} from './assetLibraryItems';

/** 每页条数可选档位，第一个是默认值。 */
const ASSET_LIBRARY_PAGE_SIZES = [20, 40, 80, 100] as const;

const ASSET_LIBRARY_MODAL_CLASS =
  'relative flex h-[min(880px,90vh)] w-[min(1440px,94vw)] flex-col overflow-hidden rounded-[10px] border border-white/[0.12] bg-[#15161b]/96 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-md';

export type { AssetLibraryMedia };

interface PendingUpload {
  id: string;
  fileName: string;
  previewUrl: string;
  media: AssetLibraryMedia;
export interface AssetLibrarySelection {
  media: AssetLibraryMedia;
  url: string;
  name: string;
}

export interface AssetLibraryModalProps {
  open: boolean;
  project: string | null;
  onClose: () => void;
  onSuccess?: () => void;
  onConfirm?: (selections: AssetLibrarySelection[]) => void;
  maxSelectable?: number;
  /** 允许的媒体类型 Tab;缺省三类都开。生图/图片编辑节点只传 ['image']。 */
  allowedMedia?: AssetLibraryMedia[];
  /**
   * 把整个文件夹的素材发到画布并编成一组（组名 = 文件夹名）。不传时文件夹卡片上
   * 不出现「发送到画布」——节点里打开的选素材弹窗没有「发到画布」这个语义。
   */
  onSendFolderToCanvas?: (folder: AssetFolder) => void;
}

function makeId(): string {
  return `al_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export function AssetLibraryModal({
  open,
  project,
  onClose,
  onSuccess,
  onConfirm,
  maxSelectable = 9,
  allowedMedia,
  onSendFolderToCanvas,
}: AssetLibraryModalProps) {
  // 类目（标签）按用途分，不按媒介分；allowedMedia 只在两个地方起作用：整类都装
  // 不下的类目（如只收音频的「音效」在只要图片的节点里）不出现在 tab 条上，条目
  // 本身再过滤一遍。
  const categories = useMemo(
    () =>
      ASSET_CATEGORIES.filter(
        (category) =>
          !allowedMedia || category.media.some((m) => allowedMedia.includes(m)),
      ),
    [allowedMedia],
  );
  // 把 onSuccess 收进 ref，避免它进 initializeLibrary 依赖后，父组件每次渲染换新
  // 函数身份就触发「打开自动同步」effect 反复重跑。
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeTabKey, setActiveTabKey] =
    useState<AssetLibraryTabKey>(ALL_CATEGORY_KEY);
  // 「全部」下先看文件夹，点进去才看条目；非空即当前打开的文件夹。选中状态跨层级
  // 保留（selectedKeys 与视图无关），所以进出文件夹不会掉勾。
  const [openFolderKey, setOpenFolderKey] = useState<AssetFolderKey | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  // 批量操作 = 管理态：卡片上的勾选改为「选中待删除」，底部换成删除条。平时的勾选
  // 是「挑素材给节点用」，两者各存各的，互不影响。
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  // 文件夹卡片上的「…」菜单与它派生的两个弹窗。都按 key 存而不是存整个 folder
  // 对象——folders 每次刷新都是新对象，存 key 才能跟着最新数据走。
  const [folderMenuKey, setFolderMenuKey] = useState<AssetFolderKey | null>(null);
  const [renameFolderKey, setRenameFolderKey] = useState<AssetFolderKey | null>(
    null,
  );
  const [coverFolderKey, setCoverFolderKey] = useState<AssetFolderKey | null>(
    null,
  );
  // 分页只管当前网格：「全部」顶层分文件夹，其余分条目。切 Tab / 进出文件夹 /
  // 改每页条数都回到第一页——留在第 3 页看一个只有 2 页的目录没有意义。
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(ASSET_LIBRARY_PAGE_SIZES[0]);

  useEffect(() => {
    setPage(1);
  }, [activeTabKey, openFolderKey, pageSize]);

  // allowedMedia 变了(不同节点复用同一弹窗)时，把当前 Tab 收敛回允许集合。
  useEffect(() => {
    if (
      activeTabKey !== ALL_CATEGORY_KEY &&
      !categories.some((category) => category.key === activeTabKey)
    ) {
      setActiveTabKey(ALL_CATEGORY_KEY);
    }
  }, [categories, activeTabKey]);

  // 纯加载已有库：失败不弹红条(缺库文件/后端未就绪都当空处理)，返回加载到的条目。
  const refreshLibrary = useCallback(async (): Promise<LibraryItem[]> => {
    if (!project) return [];
    try {
      const payload = await fetchFreezoneVideoCharacterLibrary(project);
      const items = normalizeLibraryList(payload);
      setLibrary(items);
      return items;
    } catch (err) {
      console.warn('[asset-library] load failed, treat as empty', err);
      setLibrary([]);
      return [];
    }
  }, [project]);

      const [base] = await Promise.all([refreshLibrary(), refreshFolders()]);
      if (isCancelled?.()) return;
      setIsSyncing(true);
      try {
        const items = await syncFreezoneAssetLibraryFromMainline(project);
        if (isCancelled?.()) return;
        setLibrary(normalizeLibraryList(items));
        onSuccessRef.current?.();
      } catch (err) {
        if (isCancelled?.()) return;
        console.warn('[asset-library] auto sync failed', err);
        if (base.length === 0) {
          setLibraryError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!isCancelled?.()) {
          setIsSyncing(false);
          setIsLoadingLibrary(false);
        }
      }
    },
    [project, refreshLibrary, refreshFolders],
  );

  useEffect(() => {
    if (!open || !project) return;
    // 弹窗在自动同步 resolve 前就关闭时，用 cancelled 丢弃过期结果，避免关闭态回填 library
    // 与 240ms 关闭重置 effect 打架。
    let cancelled = false;
    void initializeLibrary(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [open, project, initializeLibrary]);

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingUploads([]);
      setLibrary([]);
      setActiveTabKey(ALL_CATEGORY_KEY);
      setOpenFolderKey(null);
      setCreateMenuOpen(false);
      setNewFolderOpen(false);
      setUploadOpen(false);
      setBulkMode(false);
      setBulkIds([]);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const handleSyncFromMainline = useCallback(async () => {
    if (!project || isSyncing) return;
    setIsSyncing(true);
    setLibraryError(null);
    try {
      const items = await syncFreezoneAssetLibraryFromMainline(project);
      setLibrary(normalizeLibraryList(items));
      onSuccess?.();
    } catch (err) {
      console.error('[asset-library] sync failed', err);
      setLibraryError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  }, [project, isSyncing, onSuccess]);

  const handleCreateFolder = useCallback(
    async (name: string): Promise<AssetFolderKey> => {
      if (!project) throw new Error('项目未就绪');
      const folder = await createFreezoneAssetLibraryFolder(project, name);
      await refreshFolders();
      return folder.id;
    },
    [project, refreshFolders],
  );

  const removePending = useCallback((id: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const uploadOne = useCallback(
    async (entry: PendingUpload, file: File) => {
      if (!project) return;
      try {
        const uploaded =
          entry.media === 'image'
            ? await uploadFreezoneImage(project, file, file.name)
            : await uploadFreezoneVideo(project, file, file.name);
        const cleanUrl = uploaded.url.split('?')[0];
        await submitFreezoneAddVideoCharacterLibraryItem(project, {
          name: stripExtension(file.name),
          media: entry.media,
          imageUrls: entry.media === 'image' ? [cleanUrl] : undefined,
          videoUrl: entry.media === 'video' ? cleanUrl : undefined,
          audioUrl: entry.media === 'audio' ? cleanUrl : undefined,
        });
        URL.revokeObjectURL(entry.previewUrl);
        setPendingUploads((prev) => prev.filter((p) => p.id !== entry.id));
        await refreshLibrary();
        onSuccess?.();
      } catch (err) {
        console.error('[asset-library] upload failed', err);
        const message = err instanceof Error ? err.message : String(err);
        setPendingUploads((prev) =>
          prev.map((p) =>
            p.id === entry.id ? { ...p, status: 'failed', error: message } : p,
          ),
        );
      }
    },
    [project, refreshLibrary, onSuccess],
  );

  const startUploads = useCallback(
    (
      picks: AssetLibraryUploadPick[],
      folder: AssetFolderKey,
      category: AssetCategory | null,
    ) => {
      if (!project || picks.length === 0) return;
      const accepted = picks.map(({ file, media }) => ({
        file,
        entry: {
          id: makeId(),
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          media,
          category,
          folder,
          status: 'uploading' as const,
        },
      }));
      setPendingUploads((prev) => [...prev, ...accepted.map((a) => a.entry)]);
      // 把视图切到目标文件夹，否则上传进度落在用户看不见的地方。
      setActiveTabKey(ALL_CATEGORY_KEY);
      setOpenFolderKey(folder);
      accepted.forEach(({ entry, file }) => {
        void uploadOne(entry, file);
      });
    },
    [project, uploadOne],
  );

  const handleDeleteEntry = useCallback(
    async (entry: LibraryItem) => {
      if (!project || !entry.id) return;
      const confirmed = window.confirm(
        t('canvas.assetLibraryModal.deleteConfirm', {
          name: entry.name || entry.id,
        }),
      );
      if (!confirmed) return;
      setDeletingId(entry.id);
      try {
        await deleteFreezoneVideoCharacterLibraryItem(project, entry.id);
        await refreshLibrary();
      } catch (err) {
        console.error('[asset-library] delete failed', err);
        setLibraryError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingId(null);
      }
    },
    [project, refreshLibrary],
  );

      const files = event.dataTransfer?.files;
      if (!files?.length || !dropTarget) return;
      const picks: AssetLibraryUploadPick[] = [];
      Array.from(files).forEach((file) => {
        const media = file.type.startsWith('image/')
          ? ('image' as const)
          : file.type.startsWith('video/')
            ? ('video' as const)
            : file.type.startsWith('audio/')
              ? ('audio' as const)
              : null;
        if (!media) return;
        if (allowedMedia && !allowedMedia.includes(media)) return;
        picks.push({ file, media });
      });
      startUploads(picks, dropTarget.folder, dropTarget.category);
    },
    [dropTarget, allowedMedia, startUploads],
  );

  const visibleItems = useMemo(() => {
    if (showFolders) return [];
    if (activeTabKey === ALL_CATEGORY_KEY) return openFolder?.items ?? [];
    return allowedItems.filter((entry) => entry.category === activeTabKey);
  }, [showFolders, activeTabKey, openFolder, allowedItems]);

  const visiblePending = useMemo(() => {
    if (showFolders) return [];
    if (activeTabKey === ALL_CATEGORY_KEY) {
      return openFolder
        ? pendingUploads.filter((p) => p.folder === openFolder.key)
        : [];
    }
    return pendingUploads.filter((p) => p.category === activeTabKey);
  }, [showFolders, activeTabKey, openFolder, pendingUploads]);

  const isSelected = useCallback(
    (key: string) => selectedKeys.includes(key),
    [selectedKeys],
  );

  const selectionKey = useCallback(
    (entry: LibraryItem) =>
      `${entry.media}:${entry.id ?? `url:${entry.url}`}`,
    [],
  );

  const toggleSelect = useCallback(
    (key: string) => {
      setSelectedKeys((prev) => {
        if (prev.includes(key)) return prev.filter((k) => k !== key);
        // 每种媒介各自独立的选择配额：切 Tab 时不会被别的媒介占满 maxSelectable
        // 而卡住当前媒介的勾选（selectionKey 前缀即 media）。
        const media = key.split(':', 1)[0];
        const sameMediaCount = prev.filter((k) =>
          k.startsWith(`${media}:`),
        ).length;
        if (sameMediaCount >= maxSelectable) return prev;
        return [...prev, key];
      });
    },
    [maxSelectable],
  );

  // 分页作用在当前网格上。上传中的占位卡不参与分页——它们几秒后就变成正式条目，
  // 被翻到后面反而看不到进度。
  const pagedTotal = showFolders ? folders.length : visibleItems.length;
  const pageCount = Math.max(1, Math.ceil(pagedTotal / pageSize));
  // 删素材会让总页数缩水，停在已经不存在的页上就成空白了，这里兜一下。
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pagedFolders = showFolders
    ? folders.slice(pageStart, pageStart + pageSize)
    : [];
  const pagedItems = showFolders
    ? []
    : visibleItems.slice(pageStart, pageStart + pageSize);
  const selectedCount = selectedKeys.length;
  // 配额按媒介算（selectionKey 前缀即 media），所以「选满禁选」也得按条目自己的
  // 媒介判断——文件夹里图片和视频是混着的。
  const selectedCountOf = (media: AssetLibraryMedia) =>
    selectedKeys.filter((k) => k.startsWith(`${media}:`)).length;
  const hasSelection = selectedCount > 0;
  const tabs: Array<{ key: AssetLibraryTabKey; label: string }> = [
    { key: ALL_CATEGORY_KEY, label: '全部' },
    ...categories.map((category) => ({
      key: category.key,
      label: category.label,
    })),
  ];

  const headerButtonClass =
    'inline-flex h-8 items-center gap-1.5 rounded-md bg-white/[0.08] px-3 text-xs font-medium text-text-dark transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-50';

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div
        className={ASSET_LIBRARY_MODAL_CLASS}
        onClick={(event) => event.stopPropagation()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        {/* Title bar */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-dark">
              {t('canvas.assetLibraryModal.title')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSyncFromMainline()}
              disabled={!project || isSyncing}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/[0.08] px-3 text-xs font-medium text-text-dark transition-colors hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
              title={t('canvas.assetLibraryModal.syncTooltip')}
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {t('canvas.assetLibraryModal.syncButton')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted/90 transition-colors hover:bg-white/[0.08] hover:text-text-dark"
              title={t('canvas.assetLibraryModal.closeButton')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs + counter */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-4">
          <div className="flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTabKey(tab.key);
                  // 换 tab 一律退回文件夹层，免得「全部」里还留着上次点进去的目录。
                  setOpenFolderKey(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab.key === activeTabKey
                    ? 'bg-white/[0.12] text-text-dark'
                    : 'text-text-muted/80 hover:text-text-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted/85">
            <span>
              {t('canvas.assetLibraryModal.totalCount', { count: totalCount })}
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span>
              {t('canvas.assetLibraryModal.selectedCount', {
                count: activeSelectedCount,
                max: maxSelectable,
              })}
            </span>
            {isLoadingLibrary && (
              <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin text-text-muted" />
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="ui-scrollbar relative flex-1 overflow-y-auto px-5 pb-2">
          {isDragging && activeTab?.allowUpload && (
            <div className="pointer-events-none absolute inset-x-5 inset-y-0 z-10 flex items-center justify-center rounded-[8px] border border-dashed border-accent/60 bg-accent/10 text-sm text-text-dark">
              {t('canvas.assetLibraryModal.dragHint', {
                type: activeTab?.label ?? t('canvas.assetLibraryModal.file'),
              })}
            </div>
          )}
          {libraryError && (
            <div className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
              {t('canvas.assetLibraryModal.loadError')}
              {libraryError}
            </div>
          )}
          <div
            className="grid gap-3.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 176px))',
            }}
          >
            {/* Upload card — 场景等只读类目不显示 */}
            {activeTab?.allowUpload && (
              <>
                <div className={ASSET_LIBRARY_UPLOAD_CARD_CLASS}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!project}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-white/[0.10] px-4 text-xs font-medium text-text-dark transition-colors hover:bg-white/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {t('canvas.assetLibraryModal.uploadButton')}
                  </button>
                  <div className="text-[11px] text-text-muted/75">
                    {activeMedia === 'image'
                      ? t('canvas.assetLibraryModal.uploadHintImage')
                      : activeMedia === 'video'
                        ? t('canvas.assetLibraryModal.uploadHintVideo')
                        : t('canvas.assetLibraryModal.uploadHintAudio')}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={activeTab?.accept ?? 'image/*'}
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files) handleFiles(event.target.files);
                    event.target.value = '';
                  }}
                />
              </>
            )}

            {/* In-flight uploads */}
            {visiblePending.map((p) => (
              <div
                key={p.id}
                className={`group relative aspect-square ${ASSET_LIBRARY_CARD_CLASS}`}
              >
                {p.media === 'image' ? (
                  <img
                    src={p.previewUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-70"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03] text-text-muted/50">
                    {p.media === 'video' ? (
                      <VideoIcon className="h-8 w-8" />
                    ) : (
                      <Music className="h-8 w-8" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45">
                  {p.status === 'uploading' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                      <div className="text-[11px] text-white/90">
                        {t('canvas.assetLibraryModal.uploading')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] text-red-300">
                        {t('canvas.assetLibraryModal.uploadFailed')}
                      </div>
                      {p.error && (
                        <div className="px-2 text-[10px] text-red-200/80 line-clamp-2 text-center">
                          {p.error}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {p.status === 'failed' && (
                  <button
                    type="button"
                    onClick={() => removePending(p.id)}
                    className="absolute right-2 bottom-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white transition-colors hover:bg-black/75"
                    title={t('canvas.assetLibraryModal.remove')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Existing items */}
            {pagedItems.map((entry, idx) => {
              const isDeleting = deletingId != null && entry.id === deletingId;
              const key = selectionKey(entry);
              // 批量态下只有本地上传的条目可选——主线条目删了也会被下次同步拉回来。
              const bulkEligible = bulkMode && entry.source === 'upload' && !!entry.id;
              const selected = bulkMode
                ? Boolean(entry.id && bulkIds.includes(entry.id))
                : isSelected(key);
              const disabledSelect = bulkMode
                ? !bulkEligible
                : !selected && selectedCountOf(entry.media) >= maxSelectable;
              const activate = () => {
                if (disabledSelect) return;
                if (bulkMode) {
                  if (entry.id) toggleBulk(entry.id);
                } else {
                  toggleSelect(key);
                }
              };
              return (
                <div
                  key={entry.id ?? `idx-${idx}`}
                  className={`group relative aspect-square ${ASSET_LIBRARY_CARD_CLASS} ${
                    selected
                      ? bulkMode
                        ? 'border-red-400/70 ring-1 ring-red-400/45'
                        : 'border-accent/70 ring-1 ring-accent/45'
                      : ASSET_LIBRARY_CARD_HOVER_CLASS
                  } ${disabledSelect ? 'cursor-default' : 'cursor-pointer'}`}
                  onClick={activate}
                >
                  <AssetLibraryItemMedia entry={entry} />

                  {/* Checkbox top-left */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (disabledSelect) return;
                      toggleSelect(key);
                    }}
                    disabled={disabledSelect}
                    title={
                      disabledSelect
                        ? t('canvas.assetLibraryModal.maxSelectableExceeded', {
                            max: maxSelectable,
                          })
                        : selected
                          ? t('canvas.assetLibraryModal.deselectTooltip')
                          : t('canvas.assetLibraryModal.selectTooltip')
                    }
                    className={`absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                      selected
                        ? 'border-accent bg-accent text-white'
                        : 'border-white/70 bg-black/35 text-transparent hover:border-white'
                    } ${disabledSelect ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </button>

                  {/* Source badge top-right */}
                  {entry.source !== 'upload' && (
                    <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white/90">
                      {SOURCE_LABEL[entry.source]}
                    </span>
                  )}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-xs text-white">
                    <div className="truncate">
                      {entry.name ||
                        t('canvas.assetLibraryModal.unnamedEntry')}
                    </div>
                  </div>
                  {/* 只有本地上传的条目可删；主线同步来的条目删了也会在下次打开自动同步时
                      重新出现，所以不提供删除入口，避免「删不掉」的误导。 */}
                  {entry.source === 'upload' && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteEntry(entry);
                      }}
                      disabled={!entry.id || isDeleting}
                      className="absolute right-2 bottom-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-[opacity,background-color] hover:bg-black/80 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        entry.id
                          ? t('canvas.assetLibraryModal.deleteButton')
                          : t('canvas.assetLibraryModal.deleteNoIdError')
                      }
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!isLoadingLibrary &&
            visibleItems.length === 0 &&
            visiblePending.length === 0 &&
            !libraryError && (
              <div className="mt-3 text-center text-[11px] text-text-muted/70">
                {activeTab?.allowUpload
                  ? t('canvas.assetLibraryModal.emptyStateWithUpload')
                  : t('canvas.assetLibraryModal.emptyStateNoUpload')}
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 px-5 pb-3 pt-2">
          <Button
            size="sm"
            className="bg-white px-4 text-[#15161b] hover:bg-white/90"
            disabled={!hasSelection}
            onClick={handleConfirm}
          >
            {t('canvas.assetLibraryModal.confirmButton')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
