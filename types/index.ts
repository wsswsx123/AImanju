// ============================================================
// AI Manga Drama Platform 鈥?TypeScript Type Definitions
// Auto-generated from prisma/schema.prisma
// ============================================================

import type {
  ProjectStatus,
  Project as PrismaProject,
  Script as PrismaScript,
  CharacterBible as PrismaCharacterBible,
  PropBible as PrismaPropBible,
  WorldBible as PrismaWorldBible,
  StoryboardShot as PrismaStoryboardShot,
  ConsistencyPrompt as PrismaConsistencyPrompt,
  GeneratedAsset as PrismaGeneratedAsset,
  RenderTask as PrismaRenderTask,
  ExportJob as PrismaExportJob,
} from "@prisma/client";

// ============================================================
// Re-export Prisma Enums
// ============================================================

export {
  AssetType,
  AssetStatus,
  RenderStatus,
  ExportFormat,
  ExportStatus,
  StoryboardShotStatus,
  ConsistencyPromptType,
  DialogueEmotion,
  ProjectStatus,
} from "@prisma/client";

// ============================================================
// Re-export Prisma Entity Types (Read-only / Full entities)
// ============================================================

export type Project = PrismaProject;
export type Script = PrismaScript;
export type CharacterBible = PrismaCharacterBible;
export type PropBible = PrismaPropBible;
export type WorldBible = PrismaWorldBible;
export type StoryboardShot = PrismaStoryboardShot;
export type ConsistencyPrompt = PrismaConsistencyPrompt;
export type GeneratedAsset = PrismaGeneratedAsset;
export type RenderTask = PrismaRenderTask;
export type ExportJob = PrismaExportJob;

// ============================================================
// Utility Types
// ============================================================

/** Fields managed by the server 鈥?stripped from all create inputs */
type ServerManaged = "id" | "createdAt" | "updatedAt";

/** Make listed keys optional */
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================================
// Base API Response Wrappers
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================
// Pagination, Sorting & Filtering
// ============================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams<T extends string = string> {
  sortBy?: T;
  sortOrder?: "asc" | "desc";
}

export interface BaseFilterParams {
  search?: string;
  status?: string;
  fromDate?: string; // ISO date string
  toDate?: string;   // ISO date string
}

export type QueryParams<T extends string = string> =
  PaginationParams & SortParams<T> & BaseFilterParams;

// ============================================================
// Project Types
// ============================================================

export interface ProjectCreateInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  coverUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  coverUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProjectListParams
  extends QueryParams<"name" | "createdAt" | "updatedAt"> {
  status?: ProjectStatus;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  coverUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    scripts: number;
    characterBibles: number;
    storyboardShots: number;
    generatedAssets: number;
  };
}

// ============================================================
// Script Types
// ============================================================

export interface ScriptCreateInput {
  projectId: string;
  title: string;
  content: string;
  parsedData?: Record<string, unknown>;
  notes?: string;
}

export interface ScriptUpdateInput {
  title?: string;
  content?: string;
  parsedData?: Record<string, unknown> | null;
  notes?: string | null;
  version?: number;
}

export interface ScriptListParams
  extends QueryParams<"title" | "createdAt" | "updatedAt"> {}

/** Parsed script data structure returned by DeepSeek analysis */
export interface ScriptParsedData {
  characters: {
    name: string;
    roleType: string;
    description: string;
    appearance: string;
    personality: string;
    background: string;
  }[];
  props: {
    name: string;
    category: string;
    description: string;
    appearance: string;
    significance: string;
  }[];
  worlds: {
    name: string;
    description: string;
    setting: string;
    atmosphere: string;
    timePeriod: string;
    location: string;
  }[];
  scenes: {
    sceneNumber: number;
    location: string;
    description: string;
    shots: {
      shotNumber: number;
      description: string;
      dialogue: string;
      dialogueEmotion: string;
      camera: string;
      cameraAngle: string;
      lighting: string;
      duration: number;
    }[];
  }[];
}

// ============================================================
// CharacterBible Types
// ============================================================

export type CharacterRoleType =
  | "protagonist"
  | "antagonist"
  | "supporting"
  | "minor"
  | "background";

export interface CharacterRelationship {
  targetCharacterId: string;
  targetName: string;
  relationType: string; // friend, enemy, family, lover, rival, mentor, etc.
  description: string;
}

export interface CharacterBibleCreateInput {
  projectId: string;
  scriptId?: string | null;
  name: string;
  displayName?: string;
  alias?: string;
  roleType?: CharacterRoleType;
  description?: string;
  appearance?: string;
  hair?: string;
  costume?: string;
  personality?: string;
  background?: string;
  relationships?: CharacterRelationship[];
  age?: number;
  gender?: string;
  voiceProfile?: string;
  imagePrompt?: string;
  negativePrompt?: string;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface CharacterBibleUpdateInput {
  name?: string;
  displayName?: string | null;
  roleType?: CharacterRoleType | null;
  description?: string | null;
  appearance?: string | null;
  personality?: string | null;
  background?: string | null;
  relationships?: CharacterRelationship[];
  age?: number | null;
  gender?: string | null;
  imagePrompt?: string | null;
  negativePrompt?: string | null;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface CharacterBibleListParams
  extends QueryParams<"name" | "roleType" | "createdAt"> {
  roleType?: CharacterRoleType;
  scriptId?: string;
}

// ============================================================
// PropBible Types
// ============================================================

export type PropCategory =
  | "weapon"
  | "jewelry"
  | "vehicle"
  | "tool"
  | "clothing"
  | "accessory"
  | "furniture"
  | "technology"
  | "artifact"
  | "food"
  | "other";

export interface PropBibleCreateInput {
  projectId: string;
  scriptId?: string | null;
  name: string;
  description?: string;
  appearance?: string;
  significance?: string;
  category?: PropCategory;
  propType?: string;
  purpose?: string;
  material?: string;
  color?: string;
  shape?: string;
  size?: string;
  imagePrompt?: string;
  negativePrompt?: string;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface PropBibleUpdateInput {
  name?: string;
  description?: string | null;
  appearance?: string | null;
  significance?: string | null;
  category?: PropCategory | null;
  imagePrompt?: string | null;
  negativePrompt?: string | null;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface PropBibleListParams
  extends QueryParams<"name" | "category" | "createdAt"> {
  category?: PropCategory;
  scriptId?: string;
}

// ============================================================
// WorldBible Types
// ============================================================

export interface WorldBibleCreateInput {
  projectId: string;
  scriptId?: string | null;
  name: string;
  description?: string;
  sceneType?: string;
  setting?: string;
  layout?: string;
  atmosphere?: string;
  timePeriod?: string;
  location?: string;
  colorPalette?: string;
  lighting?: string;
  weather?: string;
  mood?: string;
  keyObjects?: string;
  architecture?: string;
  floraAndFauna?: string;
  cultureAndSociety?: string;
  imagePrompt?: string;
  negativePrompt?: string;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface WorldBibleUpdateInput {
  name?: string;
  description?: string | null;
  setting?: string | null;
  atmosphere?: string | null;
  timePeriod?: string | null;
  location?: string | null;
  architecture?: string | null;
  floraAndFauna?: string | null;
  cultureAndSociety?: string | null;
  imagePrompt?: string | null;
  negativePrompt?: string | null;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface WorldBibleListParams
  extends QueryParams<"name" | "createdAt"> {
  scriptId?: string;
}

// ============================================================
// StoryboardShot Types
// ============================================================

export interface StoryboardShotCreateInput {
  projectId: string;
  scriptId?: string | null;
  shotNumber: number;
  sceneNumber: number;
  panelNumber?: number;
  description?: string;
  dialogue?: string;
  dialogueEmotion?: string;
  camera?: string;
  cameraAngle?: string;
  lighting?: string;
  moodPrompt?: string;
  compositionNotes?: string;
  duration?: number;
  status?: string;
  consistencyPromptId?: string | null;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface StoryboardShotUpdateInput {
  shotNumber?: number;
  sceneNumber?: number;
  panelNumber?: number | null;
  description?: string | null;
  dialogue?: string | null;
  dialogueEmotion?: string | null;
  camera?: string | null;
  cameraAngle?: string | null;
  lighting?: string | null;
  moodPrompt?: string | null;
  compositionNotes?: string | null;
  duration?: number | null;
  status?: string;
  consistencyPromptId?: string | null;
  referenceImageUrls?: string[];
  customFields?: Record<string, unknown>;
}

export interface StoryboardShotListParams
  extends QueryParams<"shotNumber" | "sceneNumber" | "createdAt"> {
  status?: string;
  scriptId?: string;
  sceneNumber?: number;
}

export interface StoryboardShotBatchCreateInput {
  projectId: string;
  scriptId?: string;
  shots: Omit<StoryboardShotCreateInput, "projectId" | "scriptId">[];
}

// ============================================================
// ConsistencyPrompt Types
// ============================================================

export interface ConsistencyPromptVariable {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  defaultValue: string;
  options?: string[]; // for select type
  description?: string;
}

export interface ConsistencyPromptCreateInput {
  projectId: string;
  name: string;
  promptType?: string;
  description?: string;
  content: string;
  variables?: ConsistencyPromptVariable[];
  tags?: string[];
}

export interface ConsistencyPromptUpdateInput {
  name?: string;
  promptType?: string;
  description?: string | null;
  content?: string;
  variables?: ConsistencyPromptVariable[];
  tags?: string[];
}

export interface ConsistencyPromptListParams
  extends QueryParams<"name" | "promptType" | "createdAt"> {
  promptType?: string;
  tags?: string[];
}

/** Rendered prompt with all variables resolved */
export interface RenderedPrompt {
  id: string;
  name: string;
  renderedContent: string;
  resolvedVariables: Record<string, string>;
}

// ============================================================
// GeneratedAsset Types
// ============================================================

export interface GeneratedAssetCreateInput {
  projectId: string;
  assetType: string;
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  modelVersion?: string;
  seed?: number;
  parameters?: Record<string, unknown>;
  imageUrl?: string;
  thumbnailUrl?: string;
  localPath?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  format?: string;
  status?: string;
  characterBibleId?: string | null;
  propBibleId?: string | null;
  worldBibleId?: string | null;
  storyboardShotId?: string | null;
  batchId?: string;
  sortOrder?: number;
}

export interface GeneratedAssetUpdateInput {
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  localPath?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  format?: string | null;
  status?: string;
  errorMessage?: string | null;
  generationTimeMs?: number | null;
  sortOrder?: number;
}

export interface GeneratedAssetListParams
  extends QueryParams<"createdAt"> {
  assetType?: string;
  status?: string;
  characterBibleId?: string;
  propBibleId?: string;
  worldBibleId?: string;
  storyboardShotId?: string;
  batchId?: string;
}

export interface GeneratedAssetBatchCreateInput {
  projectId: string;
  assets: Omit<GeneratedAssetCreateInput, "projectId">[];
}

// ============================================================
// RenderTask Types
// ============================================================

export interface RenderTaskCreateInput {
  projectId: string;
  generatedAssetId?: string | null;
  priority?: number;
  settings?: Record<string, unknown>;
  outputFormat?: string;
  outputPath?: string;
  maxRetries?: number;
  estimatedTimeMs?: number;
}

export interface RenderTaskUpdateInput {
  status?: string;
  priority?: number;
  progress?: number;
  settings?: Record<string, unknown>;
  outputFormat?: string | null;
  outputPath?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  maxRetries?: number;
  actualTimeMs?: number | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface RenderTaskListParams
  extends QueryParams<"priority" | "createdAt"> {
  status?: string;
  generatedAssetId?: string;
}

// ============================================================
// ExportJob Types
// ============================================================

export interface ExportJobCreateInput {
  projectId: string;
  renderTaskId?: string | null;
  name?: string;
  format?: string;
  settings?: Record<string, unknown>;
  resolution?: string;
  fps?: number;
  maxRetries?: number;
}

export interface ExportJobUpdateInput {
  name?: string | null;
  status?: string;
  progress?: number;
  settings?: Record<string, unknown>;
  fileUrl?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  duration?: number | null;
  frameCount?: number | null;
  resolution?: string | null;
  fps?: number;
  errorMessage?: string | null;
  retryCount?: number;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface ExportJobListParams
  extends QueryParams<"format" | "createdAt"> {
  format?: string;
  status?: string;
  renderTaskId?: string;
}

// ============================================================
// API Route-Specific Request/Response Types
// ============================================================

// --- Project Routes ---
export type ProjectCreateResponse = ApiResponse<Project>;
export type ProjectListResponse = PaginatedResponse<ProjectSummary>;
export type ProjectDetailResponse = ApiResponse<
  Project & {
    scripts: Script[];
    characterBibles: CharacterBible[];
    propBibles: PropBible[];
    worldBibles: WorldBible[];
    storyboardShots: StoryboardShot[];
    generatedAssets: GeneratedAsset[];
    renderTasks: RenderTask[];
    exportJobs: ExportJob[];
  }
>;

// --- Script Routes ---
export type ScriptCreateResponse = ApiResponse<Script>;
export type ScriptDetailResponse = ApiResponse<
  Script & {
    characterBibles: CharacterBible[];
    propBibles: PropBible[];
    worldBibles: WorldBible[];
    storyboardShots: StoryboardShot[];
  }
>;

// --- DeepSeek Analyze Route ---
export interface AnalyzeScriptRequest {
  scriptId: string;
  options?: {
    generatePrompts?: boolean;     // also generate image prompts
    analyzeCharacters?: boolean;   // default: true
    analyzeProps?: boolean;        // default: true
    analyzeWorlds?: boolean;       // default: true
    generateStoryboard?: boolean;  // default: true
    targetLanguage?: string;       // default: "zh"
  };
}

export interface AnalyzeScriptResponse {
  success: true;
  data: {
    scriptId: string;
    parsedData: ScriptParsedData;
    generatedBibles: {
      characterBibles: CharacterBible[];
      propBibles: PropBible[];
      worldBibles: WorldBible[];
    };
    storyboardShots: StoryboardShot[];
    consistencyPrompts: ConsistencyPrompt[];
    summary: {
      characterCount: number;
      propCount: number;
      worldCount: number;
      shotCount: number;
      estimatedDuration: number; // seconds
    };
  };
}

// --- Bible Routes ---
export type CharacterBibleListResponse = PaginatedResponse<CharacterBible>;
export type PropBibleListResponse = PaginatedResponse<PropBible>;
export type WorldBibleListResponse = PaginatedResponse<WorldBible>;

// --- Storyboard Routes ---
export type StoryboardShotListResponse = PaginatedResponse<StoryboardShot>;
export type StoryboardShotBatchCreateResponse = ApiResponse<StoryboardShot[]>;

// --- Asset Routes ---
export type GeneratedAssetListResponse = PaginatedResponse<GeneratedAsset>;
export type GeneratedAssetBatchCreateResponse = ApiResponse<GeneratedAsset[]>;

// --- Render Routes ---
export type RenderTaskListResponse = PaginatedResponse<RenderTask>;
export interface RenderTaskStatusResponse {
  success: true;
  data: {
    task: RenderTask;
    generatedAsset?: GeneratedAsset | null;
    exportJob?: ExportJob | null;
  };
}

// --- Export Routes ---
export type ExportJobListResponse = PaginatedResponse<ExportJob>;
export interface ExportJobDownloadResponse {
  success: true;
  data: {
    job: ExportJob;
    downloadUrl: string;
    expiresAt: string; // ISO date string
  };
}

// ============================================================
// WebSocket / Real-time Event Types
// ============================================================

export type WsEventType =
  | "render.progress"
  | "render.completed"
  | "render.failed"
  | "export.progress"
  | "export.completed"
  | "export.failed"
  | "asset.generated"
  | "asset.failed"
  | "project.status_changed";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  projectId: string;
  timestamp: string;
  data: T;
}

export interface RenderProgressEvent {
  taskId: string;
  progress: number; // 0-100
  status: string;
  estimatedTimeRemaining?: number; // ms
}

export interface AssetGeneratedEvent {
  assetId: string;
  assetType: string;
  imageUrl: string;
  thumbnailUrl: string;
  parentType: string; // characterBible, propBible, worldBible, storyboardShot
  parentId: string;
}

// ============================================================
// Dashboard / Stats Types
// ============================================================

export interface ProjectStats {
  projectId: string;
  totalScripts: number;
  totalCharacterBibles: number;
  totalPropBibles: number;
  totalWorldBibles: number;
  totalStoryboardShots: number;
  totalGeneratedAssets: number;
  completedAssets: number;
  failedAssets: number;
  pendingAssets: number;
  totalRenderTasks: number;
  completedRenderTasks: number;
  totalExportJobs: number;
  completedExportJobs: number;
}

export interface AssetGenerationSummary {
  total: number;
  completed: number;
  pending: number;
  generating: number;
  failed: number;
  rejected: number;
  averageGenerationTimeMs: number;
}

// ============================================================
// Bulk Operations
// ============================================================

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkStatusUpdateRequest {
  ids: string[];
  status: string;
}

export interface BulkOperationResponse {
  success: true;
  data: {
    succeeded: string[];
    failed: { id: string; reason: string }[];
  };
}

// ============================================================
// Type Guards (Runtime helpers)
// ============================================================

export const ASSET_TYPE_LABELS: Record<string, string> = {
  CHARACTER_PORTRAIT: "角色肖像",
  PROP_IMAGE: "道具图像",
  WORLD_BACKGROUND: "世界背景",
  STORYBOARD_SHOT: "分镜画面",
  REFERENCE_IMAGE: "参考图片",
  EXPORT_FRAME: "导出帧",
  OTHER: "其他",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  SCRIPT_ANALYZING: "剧本分析中",
  SCRIPT_ANALYZED: "剧本已分析",
  BIBLE_GENERATING: "设定集生成中",
  BIBLE_GENERATED: "设定集已生成",
  STORYBOARD_GENERATING: "分镜生成中",
  STORYBOARD_GENERATED: "分镜已生成",
  ASSET_GENERATING: "素材生成中",
  ASSET_GENERATED: "素材已生成",
  COMPLETED: "已完成",
  ARCHIVED: "已归档",
};

export const RENDER_STATUS_LABELS: Record<string, string> = {
  QUEUED: "排队中",
  PROCESSING: "处理中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELLED: "已取消",
};

export const EXPORT_FORMAT_LABELS: Record<string, string> = {
  MP4: "MP4 视频",
  GIF: "GIF 动图",
  WEBM: "WebM 视频",
  PNG_SEQUENCE: "PNG 序列帧",
  PDF: "PDF 文档",
};
