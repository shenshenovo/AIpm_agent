import { db, ensureProfileRow, generateId } from "@/lib/sqlite-db";
import type { Project } from "@/types/capability-profile";

type CreateProjectInput = Omit<Project, "id">;
type UpdateProjectInput = Project;

function parseTags(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapProject(row: {
  id: string;
  user_key: string;
  project_name: string;
  project_status: string;
  tags_json: string;
}): Project {
  return {
    id: row.id,
    user_key: row.user_key,
    project_name: row.project_name,
    project_status: row.project_status as Project["project_status"],
    tags: parseTags(row.tags_json)
  };
}

export async function getProjects(userKey: string): Promise<Project[]> {
  const rows = db
    .prepare(
      `
        SELECT id, user_key, project_name, project_status, tags_json
        FROM projects
        WHERE user_key = ?
        ORDER BY created_at ASC
      `
    )
    .all(userKey) as Array<{
    id: string;
    user_key: string;
    project_name: string;
    project_status: string;
    tags_json: string;
  }>;

  return rows.map(mapProject);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  ensureProfileRow(input.user_key);
  const id = generateId("project");

  db.prepare(
    `
      INSERT INTO projects (
        id,
        user_key,
        project_name,
        project_status,
        tags_json
      )
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(id, input.user_key, input.project_name, input.project_status, JSON.stringify(input.tags));

  const created = db
    .prepare(
      `
        SELECT id, user_key, project_name, project_status, tags_json
        FROM projects
        WHERE id = ?
      `
    )
    .get(id);

  return mapProject(created as Parameters<typeof mapProject>[0]);
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  const result = db.prepare(`SELECT id FROM projects WHERE id = ? AND user_key = ?`).get(input.id, input.user_key);
  if (!result) {
    throw new Error("项目不存在");
  }

  db.prepare(
    `
      UPDATE projects
      SET
        project_name = ?,
        project_status = ?,
        tags_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_key = ?
    `
  ).run(input.project_name, input.project_status, JSON.stringify(input.tags), input.id, input.user_key);

  const updated = db
    .prepare(
      `
        SELECT id, user_key, project_name, project_status, tags_json
        FROM projects
        WHERE id = ?
      `
    )
    .get(input.id);

  return mapProject(updated as Parameters<typeof mapProject>[0]);
}

export async function deleteProject(userKey: string, id: string): Promise<{ id: string }> {
  const result = db.prepare(`DELETE FROM projects WHERE id = ? AND user_key = ?`).run(id, userKey) as { changes?: number };
  if (!result.changes) {
    throw new Error("项目不存在");
  }
  return { id };
}
