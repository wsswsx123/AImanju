"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ASSET_TYPE_LABELS } from "@/types";

interface CharacterDetail {
  id: string;
  name: string;
  displayName: string | null;
  roleType: string | null;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  background: string | null;
  relationships: Array<{ targetCharacterId?: string; targetName?: string; relationType?: string; description?: string }> | string | null;
  age: number | null;
  gender: string | null;
  imagePrompt: string | null;
  negativePrompt: string | null;
  referenceImageUrls: string[] | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  generatedAssets: Array<{
    id: string;
    assetType: string;
    status: string;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    createdAt: string;
  }>;
}

export default function CharacterDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const characterId = params.characterId as string;

  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/characters/${characterId}`);
        if (!res.ok) throw new Error("角色不存在");
        const json = await res.json();
        setCharacter(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [projectId, characterId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">角色不存在</h1>
        <Link href={`/projects/${projectId}`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">返回项目</Link>
      </div>
    );
  }

  const relationships = Array.isArray(character.relationships)
    ? character.relationships
    : [];

  const displayName = character.displayName ?? character.name;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap">
        <Link href="/" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">项目列表</Link>
        <span className="text-zinc-400">/</span>
        <Link href={`/projects/${projectId}`} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">项目</Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">{displayName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-6 mb-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{displayName}</h1>
          {character.name !== displayName && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">原名: {character.name}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {character.roleType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 capitalize">
                {character.roleType}
              </span>
            )}
            {character.gender && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{character.gender}</span>
            )}
            {character.age && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{character.age}岁</span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-2">v{character.version} · 更新于 {new Date(character.updatedAt).toLocaleDateString("zh-CN")}</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {character.description && (
          <Card title="角色描述" icon="📝">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{character.description}</p>
          </Card>
        )}

        {character.appearance && (
          <Card title="外貌描述" icon="👤">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{character.appearance}</p>
          </Card>
        )}

        {character.personality && (
          <Card title="性格特点" icon="🎭">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{character.personality}</p>
          </Card>
        )}

        {character.background && (
          <Card title="背景故事" icon="📖">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{character.background}</p>
          </Card>
        )}
      </div>

      {/* Relationships */}
      {relationships.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">角色关系</h2>
          <div className="space-y-2">
            {relationships.map((rel, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 capitalize">
                  {rel.relationType ?? "related"}
                </span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{rel.targetName ?? rel.targetCharacterId}</span>
                {rel.description && (
                  <span className="text-xs text-zinc-400">— {rel.description}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Image Prompts */}
      {(character.imagePrompt || character.negativePrompt) && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">AI 绘画提示词</h2>
          {character.imagePrompt && (
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">正向提示词</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed">{character.imagePrompt}</p>
            </div>
          )}
          {character.negativePrompt && (
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">反向提示词</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 font-mono leading-relaxed">{character.negativePrompt}</p>
            </div>
          )}
        </section>
      )}

      {/* Generated Assets */}
      {character.generatedAssets.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            生成素材 ({character.generatedAssets.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {character.generatedAssets.map((asset) => (
              <div key={asset.id} className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  {asset.thumbnailUrl || asset.imageUrl ? (
                    <img
                      src={asset.thumbnailUrl ?? asset.imageUrl!}
                      alt={asset.assetType}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 truncate">{ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${
                    asset.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                    asset.status === "GENERATING" ? "bg-blue-100 text-blue-700" :
                    asset.status === "FAILED" ? "bg-red-100 text-red-700" :
                    "bg-zinc-100 text-zinc-600"
                  }`}>
                    {asset.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}
