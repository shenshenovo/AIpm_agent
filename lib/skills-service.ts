import { db, ensureProfileRow, generateId } from "@/lib/sqlite-db";
import type { Skill } from "@/types/capability-profile";

type CreateSkillInput = Omit<Skill, "id">;
type UpdateSkillInput = Skill;

function mapSkill(row: {
  id: string;
  user_key: string;
  skill_name: string;
  proficiency_level: number;
  proficiency_desc: string;
  need_strengthen: number;
}): Skill {
  return {
    id: row.id,
    user_key: row.user_key,
    skill_name: row.skill_name,
    proficiency_level: row.proficiency_level,
    proficiency_desc: row.proficiency_desc,
    need_strengthen: Boolean(row.need_strengthen)
  };
}

export async function getSkills(userKey: string): Promise<Skill[]> {
  const rows = db
    .prepare(
      `
        SELECT id, user_key, skill_name, proficiency_level, proficiency_desc, need_strengthen
        FROM skills
        WHERE user_key = ?
        ORDER BY created_at ASC
      `
    )
    .all(userKey) as Array<{
    id: string;
    user_key: string;
    skill_name: string;
    proficiency_level: number;
    proficiency_desc: string;
    need_strengthen: number;
  }>;

  return rows.map(mapSkill);
}

export async function createSkill(input: CreateSkillInput): Promise<Skill> {
  ensureProfileRow(input.user_key);
  const id = generateId("skill");

  db.prepare(
    `
      INSERT INTO skills (
        id,
        user_key,
        skill_name,
        proficiency_level,
        proficiency_desc,
        need_strengthen
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    id,
    input.user_key,
    input.skill_name,
    input.proficiency_level,
    input.proficiency_desc,
    input.need_strengthen ? 1 : 0
  );

  const created = db
    .prepare(
      `
        SELECT id, user_key, skill_name, proficiency_level, proficiency_desc, need_strengthen
        FROM skills
        WHERE id = ?
      `
    )
    .get(id);

  return mapSkill(created as Parameters<typeof mapSkill>[0]);
}

export async function updateSkill(input: UpdateSkillInput): Promise<Skill> {
  const result = db.prepare(`SELECT id FROM skills WHERE id = ? AND user_key = ?`).get(input.id, input.user_key);
  if (!result) {
    throw new Error("技能不存在");
  }

  db.prepare(
    `
      UPDATE skills
      SET
        skill_name = ?,
        proficiency_level = ?,
        proficiency_desc = ?,
        need_strengthen = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_key = ?
    `
  ).run(
    input.skill_name,
    input.proficiency_level,
    input.proficiency_desc,
    input.need_strengthen ? 1 : 0,
    input.id,
    input.user_key
  );

  const updated = db
    .prepare(
      `
        SELECT id, user_key, skill_name, proficiency_level, proficiency_desc, need_strengthen
        FROM skills
        WHERE id = ?
      `
    )
    .get(input.id);

  return mapSkill(updated as Parameters<typeof mapSkill>[0]);
}

export async function deleteSkill(userKey: string, id: string): Promise<{ id: string }> {
  const result = db.prepare(`DELETE FROM skills WHERE id = ? AND user_key = ?`).run(id, userKey) as { changes?: number };
  if (!result.changes) {
    throw new Error("技能不存在");
  }
  return { id };
}
