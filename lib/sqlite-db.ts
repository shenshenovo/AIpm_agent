import fs from "node:fs";
import path from "node:path";

const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (location: string) => {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      get: (...params: unknown[]) => any;
      all: (...params: unknown[]) => any[];
      run: (...params: unknown[]) => any;
    };
  };
};

function resolveDatabasePath() {
  const configured = process.env.DATABASE_URL?.trim();

  if (!configured) {
    return path.join(process.cwd(), "data", "app.db");
  }

  if (configured.startsWith("file:")) {
    const relativePath = configured.slice("file:".length).replace(/^\/+/, "");
    return path.resolve(process.cwd(), relativePath);
  }

  return path.resolve(process.cwd(), configured);
}

const databasePath = resolveDatabasePath();
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");
db.exec("PRAGMA synchronous = NORMAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    user_key TEXT PRIMARY KEY,
    target_job_direction TEXT NOT NULL DEFAULT '',
    work_type TEXT NOT NULL DEFAULT '',
    target_company_type TEXT NOT NULL DEFAULT '',
    preparation_stage TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    proficiency_level INTEGER NOT NULL,
    proficiency_desc TEXT NOT NULL,
    need_strengthen INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL,
    project_name TEXT NOT NULL,
    project_status TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS weakness_tags (
    id TEXT PRIMARY KEY,
    user_key TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_weakness_user_tag ON weakness_tags (user_key, tag_name)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_skills_user_key ON skills (user_key)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_user_key ON projects (user_key)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_weakness_tags_user_key ON weakness_tags (user_key)`);

export { db, databasePath };

export function ensureProfileRow(userKey: string) {
  db.prepare(
    `
      INSERT INTO profiles (
        user_key,
        target_job_direction,
        work_type,
        target_company_type,
        preparation_stage
      )
      VALUES (?, '', '', '', '')
      ON CONFLICT(user_key) DO NOTHING
    `
  ).run(userKey);
}

export function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
