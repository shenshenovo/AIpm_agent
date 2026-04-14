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

export async function createWeaknessTag(input: CreateWeaknessTagInput): Promise<WeaknessTag> {
  ensureProfileRow(input.user_key);

  const existing = db
    .prepare(
      `
        SELECT id, user_key, tag_name
        FROM weakness_tags
        WHERE user_key = ? AND tag_name = ?
      `
    )
    .get(input.user_key, input.tag_name);

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
  ).run(id, input.user_key, input.tag_name);

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

export async function deleteWeaknessTag(userKey: string, id: string): Promise<{ id: string }> {
  const result = db.prepare(`DELETE FROM weakness_tags WHERE id = ? AND user_key = ?`).run(id, userKey) as {
    changes?: number;
  };

  if (!result.changes) {
    throw new Error("薄弱项不存在");
  }

  return { id };
}
