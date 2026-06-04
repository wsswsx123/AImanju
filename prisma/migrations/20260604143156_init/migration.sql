-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coverUrl" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parsedData" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterBible" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "roleType" TEXT,
    "description" TEXT,
    "appearance" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "relationships" JSONB,
    "age" INTEGER,
    "gender" TEXT,
    "imagePrompt" TEXT,
    "negativePrompt" TEXT,
    "referenceImageUrls" JSONB,
    "customFields" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterBible_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PropBible" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appearance" TEXT,
    "significance" TEXT,
    "category" TEXT,
    "imagePrompt" TEXT,
    "negativePrompt" TEXT,
    "referenceImageUrls" JSONB,
    "customFields" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PropBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PropBible_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldBible" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "setting" TEXT,
    "atmosphere" TEXT,
    "timePeriod" TEXT,
    "location" TEXT,
    "architecture" TEXT,
    "floraAndFauna" TEXT,
    "cultureAndSociety" TEXT,
    "imagePrompt" TEXT,
    "negativePrompt" TEXT,
    "referenceImageUrls" JSONB,
    "customFields" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorldBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorldBible_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryboardShot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT,
    "shotNumber" INTEGER NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "panelNumber" INTEGER,
    "description" TEXT,
    "dialogue" TEXT,
    "dialogueEmotion" TEXT DEFAULT 'NEUTRAL',
    "camera" TEXT,
    "cameraAngle" TEXT,
    "lighting" TEXT,
    "moodPrompt" TEXT,
    "compositionNotes" TEXT,
    "duration" REAL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "consistencyPromptId" TEXT,
    "referenceImageUrls" JSONB,
    "customFields" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoryboardShot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoryboardShot_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoryboardShot_consistencyPromptId_fkey" FOREIGN KEY ("consistencyPromptId") REFERENCES "ConsistencyPrompt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsistencyPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "promptType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "tags" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConsistencyPrompt_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "prompt" TEXT,
    "negativePrompt" TEXT,
    "model" TEXT,
    "modelVersion" TEXT,
    "seed" INTEGER,
    "parameters" JSONB,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "localPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "format" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "generationTimeMs" INTEGER,
    "batchId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "characterBibleId" TEXT,
    "propBibleId" TEXT,
    "worldBibleId" TEXT,
    "storyboardShotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedAsset_characterBibleId_fkey" FOREIGN KEY ("characterBibleId") REFERENCES "CharacterBible" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedAsset_propBibleId_fkey" FOREIGN KEY ("propBibleId") REFERENCES "PropBible" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedAsset_worldBibleId_fkey" FOREIGN KEY ("worldBibleId") REFERENCES "WorldBible" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GeneratedAsset_storyboardShotId_fkey" FOREIGN KEY ("storyboardShotId") REFERENCES "StoryboardShot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RenderTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "generatedAssetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "progress" REAL NOT NULL DEFAULT 0,
    "settings" JSONB,
    "outputFormat" TEXT,
    "outputPath" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "estimatedTimeMs" INTEGER,
    "actualTimeMs" INTEGER,
    "queuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RenderTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RenderTask_generatedAssetId_fkey" FOREIGN KEY ("generatedAssetId") REFERENCES "GeneratedAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "renderTaskId" TEXT,
    "name" TEXT,
    "format" TEXT NOT NULL DEFAULT 'MP4',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" REAL NOT NULL DEFAULT 0,
    "settings" JSONB,
    "fileUrl" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "duration" REAL,
    "frameCount" INTEGER,
    "resolution" TEXT,
    "fps" INTEGER DEFAULT 24,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExportJob_renderTaskId_fkey" FOREIGN KEY ("renderTaskId") REFERENCES "RenderTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Script_projectId_idx" ON "Script"("projectId");

-- CreateIndex
CREATE INDEX "Script_updatedAt_idx" ON "Script"("updatedAt");

-- CreateIndex
CREATE INDEX "CharacterBible_projectId_idx" ON "CharacterBible"("projectId");

-- CreateIndex
CREATE INDEX "CharacterBible_scriptId_idx" ON "CharacterBible"("scriptId");

-- CreateIndex
CREATE INDEX "CharacterBible_name_idx" ON "CharacterBible"("name");

-- CreateIndex
CREATE INDEX "CharacterBible_roleType_idx" ON "CharacterBible"("roleType");

-- CreateIndex
CREATE INDEX "PropBible_projectId_idx" ON "PropBible"("projectId");

-- CreateIndex
CREATE INDEX "PropBible_scriptId_idx" ON "PropBible"("scriptId");

-- CreateIndex
CREATE INDEX "PropBible_name_idx" ON "PropBible"("name");

-- CreateIndex
CREATE INDEX "PropBible_category_idx" ON "PropBible"("category");

-- CreateIndex
CREATE INDEX "WorldBible_projectId_idx" ON "WorldBible"("projectId");

-- CreateIndex
CREATE INDEX "WorldBible_scriptId_idx" ON "WorldBible"("scriptId");

-- CreateIndex
CREATE INDEX "WorldBible_name_idx" ON "WorldBible"("name");

-- CreateIndex
CREATE INDEX "StoryboardShot_projectId_idx" ON "StoryboardShot"("projectId");

-- CreateIndex
CREATE INDEX "StoryboardShot_scriptId_idx" ON "StoryboardShot"("scriptId");

-- CreateIndex
CREATE INDEX "StoryboardShot_sceneNumber_idx" ON "StoryboardShot"("sceneNumber");

-- CreateIndex
CREATE INDEX "StoryboardShot_status_idx" ON "StoryboardShot"("status");

-- CreateIndex
CREATE INDEX "StoryboardShot_consistencyPromptId_idx" ON "StoryboardShot"("consistencyPromptId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryboardShot_projectId_shotNumber_key" ON "StoryboardShot"("projectId", "shotNumber");

-- CreateIndex
CREATE INDEX "ConsistencyPrompt_projectId_idx" ON "ConsistencyPrompt"("projectId");

-- CreateIndex
CREATE INDEX "ConsistencyPrompt_promptType_idx" ON "ConsistencyPrompt"("promptType");

-- CreateIndex
CREATE INDEX "ConsistencyPrompt_name_idx" ON "ConsistencyPrompt"("name");

-- CreateIndex
CREATE INDEX "GeneratedAsset_projectId_idx" ON "GeneratedAsset"("projectId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_assetType_idx" ON "GeneratedAsset"("assetType");

-- CreateIndex
CREATE INDEX "GeneratedAsset_status_idx" ON "GeneratedAsset"("status");

-- CreateIndex
CREATE INDEX "GeneratedAsset_characterBibleId_idx" ON "GeneratedAsset"("characterBibleId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_propBibleId_idx" ON "GeneratedAsset"("propBibleId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_worldBibleId_idx" ON "GeneratedAsset"("worldBibleId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_storyboardShotId_idx" ON "GeneratedAsset"("storyboardShotId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_batchId_idx" ON "GeneratedAsset"("batchId");

-- CreateIndex
CREATE INDEX "GeneratedAsset_createdAt_idx" ON "GeneratedAsset"("createdAt");

-- CreateIndex
CREATE INDEX "RenderTask_projectId_idx" ON "RenderTask"("projectId");

-- CreateIndex
CREATE INDEX "RenderTask_generatedAssetId_idx" ON "RenderTask"("generatedAssetId");

-- CreateIndex
CREATE INDEX "RenderTask_status_idx" ON "RenderTask"("status");

-- CreateIndex
CREATE INDEX "RenderTask_priority_idx" ON "RenderTask"("priority");

-- CreateIndex
CREATE INDEX "RenderTask_createdAt_idx" ON "RenderTask"("createdAt");

-- CreateIndex
CREATE INDEX "ExportJob_projectId_idx" ON "ExportJob"("projectId");

-- CreateIndex
CREATE INDEX "ExportJob_renderTaskId_idx" ON "ExportJob"("renderTaskId");

-- CreateIndex
CREATE INDEX "ExportJob_format_idx" ON "ExportJob"("format");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");

-- CreateIndex
CREATE INDEX "ExportJob_createdAt_idx" ON "ExportJob"("createdAt");
