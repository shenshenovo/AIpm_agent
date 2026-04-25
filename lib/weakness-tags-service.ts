import { db, ensureProfileRow, generateId } from "@/lib/sqlite-db";
import type { WeaknessTag } from "@/types/capability-profile";

type CreateWeaknessTagInput = Omit<WeaknessTag, "id">;

function mapWeaknessTag(row: {
  id: string;
  user_key: string;
  tag_name: string;
}): WeaknessTag {
  return {
    id: row.id,
    user_key: row.user_key,
    tag_name: row.tag_name
  };
}

export async function getWeaknessTags(userKey: string): Promise<WeaknessTag[]> {
  const rows = db
    .prepare(
      `
        SELECT id, user_key, tag_name
        FROM weakness_tags
        WHERE user_key = ?
        ORDER BY created_at ASC
      `
    )
    .all(userKey) as Array<{
    id: string;
    user_key: string;
    tag_name: string;
  }>;

  return rows.map(mapWeaknessTag);
}

export function normalizeWeaknessTagName(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (/AI|Agent|LLM|RAG|Prompt|智能体|模型/i.test(normalized)) {
    return "AI 产品能力";
  }

  if (/数据|SQL|指标|归因|评测|badcase/i.test(normalized)) {
    return "数据分析能力";
  }

  if (/需求|PRD|产品|竞品|用户|MVP|方案/i.test(normalized)) {
    return "产品基础能力";
  }

  if (/项目|STAR|表达|复盘|案例|经历/i.test(normalized)) {
    return "项目表达能力";
  }

  if (/协作|推进|沟通|执行|优先级|跨团队/i.test(normalized)) {
    return "协作推进能力";
  }

  if (/行业|市场|调研|研究|业务/i.test(normalized)) {
    return "行业认知";
  }

  if (/学历|专业|实习|到岗|英语|资质/i.test(normalized)) {
    return "基础资质";
  }

  return normalized;
}

export async function createWeaknessTag(input: CreateWeaknessTagInput): Promise<WeaknessTag> {
  ensureProfileRow(input.user_key);
  const tagName = normalizeWeaknessTagName(input.tag_name);

  if (!tagName) {
    throw new Error("标签不能为空");
  }

  const existing = db
    .prepare(
      `
        SELECT id, user_key, tag_name
        FROM weakness_tags
        WHERE user_key = ? AND tag_name = ?
      `
    )
    .get(input.user_key, tagName);

  if (existing) {
    return mapWeaknessTag(existing as Parameters<typeof mapWeaknessTag>[0]);
  }

  const id = generateId("weakness");
  db.prepare(
    `
      INSERT INTO weakness_tags (
        id,
        user_key,
        tag_name
      )
      VALUES (?, ?, ?)
    `
  ).run(id, input.user_key, tagName);

  const created = db
    .prepare(
      `
        SELECT id, user_key, tag_name
        FROM weakness_tags
        WHERE id = ?
      `
    )
    .get(id);

  return mapWeaknessTag(created as Parameters<typeof mapWeaknessTag>[0]);
}

export async function upsertWeaknessTags(userKey: string, tagNames: string[]): Promise<WeaknessTag[]> {
  const normalizedTagNames = Array.from(
    new Set(
      tagNames
        .map((tagName) => normalizeWeaknessTagName(tagName))
        .filter(Boolean)
    )
  );

  const results: WeaknessTag[] = [];
  for (const tagName of normalizedTagNames) {
    results.push(await createWeaknessTag({ user_key: userKey, tag_name: tagName }));
  }

  return results;
}

export async function deleteWeaknessTag(userKey: string, id: string): Promise<{ id: string }> {
  const result = db.prepare(`DELETE FROM weakness_tags WHERE id = ? AND user_key = ?`).run(id, userKey) as {
    changes?: number;
  };

  if (!result.changes) {
    throw new Error("薄弱项不存在");
  }

  return { id };
}
