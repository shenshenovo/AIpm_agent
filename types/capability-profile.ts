export type Profile = {
  user_key: string;
  target_job_direction: string;
  work_type: string;
  target_company_type: string;
  preparation_stage: string;
};

export type Skill = {
  id: string;
  user_key: string;
  skill_name: string;
  proficiency_level: number;
  proficiency_desc: string;
  need_strengthen: boolean;
};

export type ProjectStatus = "completed" | "not_completed";

export type Project = {
  id: string;
  user_key: string;
  project_name: string;
  project_status: ProjectStatus;
  tags: string[];
};

export type WeaknessTag = {
  id: string;
  user_key: string;
  tag_name: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
