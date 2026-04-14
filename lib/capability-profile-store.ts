import type { Profile, Project, Skill, WeaknessTag } from "@/types/capability-profile";

type Store = {
  profiles: Map<string, Profile>;
  skills: Map<string, Skill[]>;
  projects: Map<string, Project[]>;
  weaknessTags: Map<string, WeaknessTag[]>;
};

const defaultUserKey = "user001";

const store: Store = {
  profiles: new Map<string, Profile>([
    [
      defaultUserKey,
      {
        user_key: defaultUserKey,
        target_job_direction: "AI产品",
        work_type: "实习",
        target_company_type: "大厂",
        preparation_stage: "准备面试"
      }
    ]
  ]),
  skills: new Map<string, Skill[]>([
    [
      defaultUserKey,
      [
        {
          id: "skill_1",
          user_key: defaultUserKey,
          skill_name: "SQL",
          proficiency_level: 2,
          proficiency_desc: "能进行基础数据查询",
          need_strengthen: false
        },
        {
          id: "skill_2",
          user_key: defaultUserKey,
          skill_name: "Axure",
          proficiency_level: 3,
          proficiency_desc: "可独立输出中保真原型",
          need_strengthen: false
        },
        {
          id: "skill_3",
          user_key: defaultUserKey,
          skill_name: "竞品分析",
          proficiency_level: 2,
          proficiency_desc: "能够拆解产品策略亮点",
          need_strengthen: true
        }
      ]
    ]
  ]),
  projects: new Map<string, Project[]>([
    [
      defaultUserKey,
      [
        {
          id: "project_1",
          user_key: defaultUserKey,
          project_name: "AI产品经理求职Agent",
          project_status: "completed",
          tags: ["需求分析", "Coze", "PRD"]
        },
        {
          id: "project_2",
          user_key: defaultUserKey,
          project_name: "校园助手MVP",
          project_status: "not_completed",
          tags: ["用户访谈", "原型", "复盘"]
        }
      ]
    ]
  ]),
  weaknessTags: new Map<string, WeaknessTag[]>([
    [
      defaultUserKey,
      [
        { id: "weakness_1", user_key: defaultUserKey, tag_name: "GUI Agent认知不足" },
        { id: "weakness_2", user_key: defaultUserKey, tag_name: "指标拆解不熟" },
        { id: "weakness_3", user_key: defaultUserKey, tag_name: "项目表达偏弱" }
      ]
    ]
  ])
};

export function generateId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ensureProfile(userKey: string) {
  if (!store.profiles.has(userKey)) {
    store.profiles.set(userKey, {
      user_key: userKey,
      target_job_direction: "AI产品",
      work_type: "实习",
      target_company_type: "大厂",
      preparation_stage: "准备面试"
    });
  }
  return store.profiles.get(userKey)!;
}

export function ensureSkills(userKey: string) {
  if (!store.skills.has(userKey)) {
    store.skills.set(userKey, []);
  }
  return store.skills.get(userKey)!;
}

export function ensureProjects(userKey: string) {
  if (!store.projects.has(userKey)) {
    store.projects.set(userKey, []);
  }
  return store.projects.get(userKey)!;
}

export function ensureWeaknessTags(userKey: string) {
  if (!store.weaknessTags.has(userKey)) {
    store.weaknessTags.set(userKey, []);
  }
  return store.weaknessTags.get(userKey)!;
}
