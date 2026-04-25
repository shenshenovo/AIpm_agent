import type { Profile, Project, Skill, WeaknessTag } from "@/types/capability-profile";

export type AbilityCategory = {
  title: string;
  description: string;
  tags: string[];
};

export type AnalysisResult = {
  rolePositioning: {
    title: string;
    description: string;
    tags: string[];
  };
  explicitRequirements: string[];
  implicitRequirements: string[];
  abilityCategories: AbilityCategory[];
  coreAbilities: string[];
};

export type GapItem = {
  name: string;
  currentState: string;
  targetState: string;
  priority: "高优先级" | "中优先级" | "低优先级" | string;
};

export type GapAnalysis = {
  conclusion: string;
  overview: string;
  items: GapItem[];
};

export type CandidateProfileSnapshot = {
  user_key: string;
  profile: Profile | null;
  skills: Skill[];
  projects: Project[];
  weakness_tags: WeaknessTag[];
};

export type JDAnalysisRequest = {
  jd_text: string;
  job_type?: string;
  company_type?: string;
  user_key?: string;
  candidate_profile?: CandidateProfileSnapshot;
};

export type JDAnalysisResponse = {
  analysisResult: AnalysisResult;
  gapAnalysis: GapAnalysis;
  workflow1_result: string;
  workflow2_result: string;
  fallbackNotice?: string;
};
