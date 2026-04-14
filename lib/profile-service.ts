import { db, ensureProfileRow } from "@/lib/sqlite-db";
import type { Profile } from "@/types/capability-profile";

export async function getProfile(userKey: string): Promise<Profile> {
  ensureProfileRow(userKey);

  const profile = db
    .prepare(
      `
        SELECT user_key, target_job_direction, work_type, target_company_type, preparation_stage
        FROM profiles
        WHERE user_key = ?
      `
    )
    .get(userKey) as Profile | undefined;

  if (!profile) {
    throw new Error("用户档案读取失败");
  }

  return profile;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  ensureProfileRow(profile.user_key);

  db.prepare(
    `
      UPDATE profiles
      SET
        target_job_direction = ?,
        work_type = ?,
        target_company_type = ?,
        preparation_stage = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_key = ?
    `
  ).run(
    profile.target_job_direction,
    profile.work_type,
    profile.target_company_type,
    profile.preparation_stage,
    profile.user_key
  );

  return getProfile(profile.user_key);
}
