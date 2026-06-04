import { prisma } from "@/lib/prisma";
import { slugifyId } from "@/lib/api-utils";

async function withNumericSuffix(
  base: string,
  exists: (candidate: string) => Promise<boolean>
) {
  let candidate = base;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function ensureUniqueCharacterId(projectId: string, name: string) {
  const base = `char_${slugifyId(name, "character")}`;
  return withNumericSuffix(base, async (characterId) => {
    const existing = await prisma.characterBible.findUnique({
      where: { projectId_characterId: { projectId, characterId } },
      select: { id: true },
    });
    return Boolean(existing);
  });
}

export async function ensureUniquePropId(projectId: string, name: string) {
  const base = `prop_${slugifyId(name, "prop")}`;
  return withNumericSuffix(base, async (propId) => {
    const existing = await prisma.propBible.findUnique({
      where: { projectId_propId: { projectId, propId } },
      select: { id: true },
    });
    return Boolean(existing);
  });
}

export async function ensureUniqueSceneId(projectId: string, name: string) {
  const base = `scene_${slugifyId(name, "scene")}`;
  return withNumericSuffix(base, async (sceneId) => {
    const existing = await prisma.worldBible.findUnique({
      where: { projectId_sceneId: { projectId, sceneId } },
      select: { id: true },
    });
    return Boolean(existing);
  });
}
