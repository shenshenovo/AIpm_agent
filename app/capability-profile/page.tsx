"use client";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/top-nav";
import type { ApiResponse, Profile, Project, ProjectStatus, Skill, WeaknessTag } from "@/types/capability-profile";

const userKey = "user001";
const maxSkills = 15;
const maxSkillDescriptionLength = 25;
const maxProjectNameLength = 20;

type Notice = { type: "success" | "error"; message: string } | null;
type SkillDraft = { skill_name: string; proficiency_level: number; proficiency_desc: string; need_strengthen: boolean };
type ProjectDraft = { project_name: string; project_status: ProjectStatus; tagsText: string };

const defaultProfile: Profile = {
  user_key: userKey,
  target_job_direction: "AI产品",
  work_type: "实习",
  target_company_type: "大厂",
  preparation_stage: "准备面试"
};
const emptySkillDraft: SkillDraft = { skill_name: "", proficiency_level: 0, proficiency_desc: "", need_strengthen: false };
const emptyProjectDraft: ProjectDraft = { project_name: "", project_status: "not_completed", tagsText: "需求分析, PRD" };

export default function CapabilityProfilePage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [weaknessTags, setWeaknessTags] = useState<WeaknessTag[]>([]);
  const [skillDraft, setSkillDraft] = useState(emptySkillDraft);
  const [projectDraft, setProjectDraft] = useState(emptyProjectDraft);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingSkillDraft, setEditingSkillDraft] = useState(emptySkillDraft);
  const [editingProjectDraft, setEditingProjectDraft] = useState(emptyProjectDraft);
  const [newTagName, setNewTagName] = useState("");
  const [showSkillCreator, setShowSkillCreator] = useState(false);
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [skillLoadingId, setSkillLoadingId] = useState<string | null>(null);
  const [projectLoadingId, setProjectLoadingId] = useState<string | null>(null);
  const [tagLoadingId, setTagLoadingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    void loadPageData();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadPageData() {
    setLoadingPage(true);
    setPageError("");
    try {
      const [profileData, skillsData, projectsData, tagsData] = await Promise.all([
        fetchJson<Profile>(`/api/profile?user_key=${userKey}`),
        fetchJson<Skill[]>(`/api/skills?user_key=${userKey}`),
        fetchJson<Project[]>(`/api/projects?user_key=${userKey}`),
        fetchJson<WeaknessTag[]>(`/api/weakness-tags?user_key=${userKey}`)
      ]);
      setProfile(profileData);
      setSkills(skillsData);
      setProjects(projectsData);
      setWeaknessTags(tagsData);
    } catch (error) {
      setPageError(getErrorMessage(error, "页面数据加载失败"));
    } finally {
      setLoadingPage(false);
    }
  }

  async function saveProfileInfo() {
    setSavingProfile(true);
    try {
      setProfile(await fetchJson<Profile>("/api/profile", { method: "POST", body: JSON.stringify(profile) }));
      setNotice({ type: "success", message: "基础信息已保存" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "保存失败") });
    } finally {
      setSavingProfile(false);
    }
  }

  async function createSkill() {
    if (skills.length >= maxSkills) return setNotice({ type: "error", message: "技能库已达到上限" });
    if (!skillDraft.skill_name.trim() || !skillDraft.proficiency_desc.trim()) {
      return setNotice({ type: "error", message: "请填写完整技能信息" });
    }
    setCreatingSkill(true);
    try {
      const created = await fetchJson<Skill>("/api/skills", {
        method: "POST",
        body: JSON.stringify({ ...skillDraft, user_key: userKey, skill_name: skillDraft.skill_name.trim(), proficiency_desc: skillDraft.proficiency_desc.trim() })
      });
      setSkills((v) => [...v, created]);
      setSkillDraft(emptySkillDraft);
      setShowSkillCreator(false);
      setNotice({ type: "success", message: "技能已新增" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "新增技能失败") });
    } finally {
      setCreatingSkill(false);
    }
  }

  function startEditSkill(skill: Skill) {
    setEditingSkillId(skill.id);
    setEditingSkillDraft({
      skill_name: skill.skill_name,
      proficiency_level: skill.proficiency_level,
      proficiency_desc: skill.proficiency_desc,
      need_strengthen: skill.need_strengthen
    });
  }

  async function updateSkillItem(skill: Skill) {
    if (!editingSkillDraft.skill_name.trim() || !editingSkillDraft.proficiency_desc.trim()) {
      return setNotice({ type: "error", message: "请填写完整技能信息" });
    }
    setSkillLoadingId(skill.id);
    try {
      const updated = await fetchJson<Skill>("/api/skills", {
        method: "PUT",
        body: JSON.stringify({ ...skill, ...editingSkillDraft, skill_name: editingSkillDraft.skill_name.trim(), proficiency_desc: editingSkillDraft.proficiency_desc.trim() })
      });
      setSkills((v) => v.map((item) => (item.id === updated.id ? updated : item)));
      setEditingSkillId(null);
      setNotice({ type: "success", message: "技能已更新" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "更新技能失败") });
    } finally {
      setSkillLoadingId(null);
    }
  }

  async function deleteSkillItem(id: string) {
    setSkillLoadingId(id);
    try {
      await fetchJson<{ id: string }>("/api/skills", { method: "DELETE", body: JSON.stringify({ user_key: userKey, id }) });
      setSkills((v) => v.filter((item) => item.id !== id));
      if (editingSkillId === id) setEditingSkillId(null);
      setNotice({ type: "success", message: "技能已删除" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "删除技能失败") });
    } finally {
      setSkillLoadingId(null);
    }
  }

  async function createProject() {
    if (!projectDraft.project_name.trim()) return setNotice({ type: "error", message: "请填写项目名称" });
    setCreatingProject(true);
    try {
      const created = await fetchJson<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ user_key: userKey, project_name: projectDraft.project_name.trim(), project_status: projectDraft.project_status, tags: parseTags(projectDraft.tagsText) })
      });
      setProjects((v) => [...v, created]);
      setProjectDraft(emptyProjectDraft);
      setShowProjectCreator(false);
      setNotice({ type: "success", message: "项目已新增" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "新增项目失败") });
    } finally {
      setCreatingProject(false);
    }
  }

  function startEditProject(project: Project) {
    setEditingProjectId(project.id);
    setEditingProjectDraft({ project_name: project.project_name, project_status: project.project_status, tagsText: project.tags.join(", ") });
  }

  async function updateProjectItem(project: Project) {
    if (!editingProjectDraft.project_name.trim()) return setNotice({ type: "error", message: "请填写项目名称" });
    setProjectLoadingId(project.id);
    try {
      const updated = await fetchJson<Project>("/api/projects", {
        method: "PUT",
        body: JSON.stringify({ ...project, project_name: editingProjectDraft.project_name.trim(), project_status: editingProjectDraft.project_status, tags: parseTags(editingProjectDraft.tagsText) })
      });
      setProjects((v) => v.map((item) => (item.id === updated.id ? updated : item)));
      setEditingProjectId(null);
      setNotice({ type: "success", message: "项目已更新" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "更新项目失败") });
    } finally {
      setProjectLoadingId(null);
    }
  }

  async function deleteProjectItem(id: string) {
    setProjectLoadingId(id);
    try {
      await fetchJson<{ id: string }>("/api/projects", { method: "DELETE", body: JSON.stringify({ user_key: userKey, id }) });
      setProjects((v) => v.filter((item) => item.id !== id));
      if (editingProjectId === id) setEditingProjectId(null);
      setNotice({ type: "success", message: "项目已删除" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "删除项目失败") });
    } finally {
      setProjectLoadingId(null);
    }
  }

  async function createTag() {
    const tagName = newTagName.trim();
    if (!tagName) return setNotice({ type: "error", message: "请输入标签名称" });
    setCreatingTag(true);
    try {
      const created = await fetchJson<WeaknessTag>("/api/weakness-tags", { method: "POST", body: JSON.stringify({ user_key: userKey, tag_name: tagName }) });
      setWeaknessTags((v) => (v.some((item) => item.id === created.id) ? v : [...v, created]));
      setNewTagName("");
      setNotice({ type: "success", message: "标签已添加" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "新增标签失败") });
    } finally {
      setCreatingTag(false);
    }
  }

  async function deleteTag(id: string) {
    setTagLoadingId(id);
    try {
      await fetchJson<{ id: string }>("/api/weakness-tags", { method: "DELETE", body: JSON.stringify({ user_key: userKey, id }) });
      setWeaknessTags((v) => v.filter((item) => item.id !== id));
      setNotice({ type: "success", message: "标签已删除" });
    } catch (error) {
      setNotice({ type: "error", message: getErrorMessage(error, "删除标签失败") });
    } finally {
      setTagLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-ink">
      <TopNav />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-[#f1f0f7]">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10 lg:py-12">
            <h1 className="text-4xl font-semibold tracking-tight text-ink">我的能力档案<span className="ml-3 text-3xl font-normal uppercase tracking-[0.04em] text-[#3d3d45]">Capability Profile</span></h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">维护你的技能、项目和当前准备状态，帮助系统生成更个性化的分析和训练结果。</p>
          </div>
        </section>
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10 lg:px-10 lg:py-14">
          {loadingPage ? <Banner tone="neutral" text="页面数据加载中..." /> : null}
          {pageError ? <Banner tone="error" text={pageError} /> : null}
          {notice ? <Banner tone={notice.type} text={notice.message} /> : null}

          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">基础信息</h2>
              <button type="button" onClick={saveProfileInfo} disabled={savingProfile || loadingPage} className="rounded-xl bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#8f8f8f]">{savingProfile ? "保存中..." : "保存基础信息"}</button>
            </div>
            <div className="mt-5 grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card md:grid-cols-4">
              <InfoField label="目标岗位方向" value={profile.target_job_direction} onChange={(value) => setProfile((v) => ({ ...v, target_job_direction: value }))} options={["AI产品", "策略产品", "数据产品", "增长产品"]} />
              <InfoField label="工作类型" value={profile.work_type} onChange={(value) => setProfile((v) => ({ ...v, work_type: value }))} options={["实习", "正职"]} />
              <InfoField label="目标公司类型" value={profile.target_company_type} onChange={(value) => setProfile((v) => ({ ...v, target_company_type: value }))} options={["大厂", "外企", "央国企", "创业公司"]} />
              <InfoField label="准备阶段" value={profile.preparation_stage} onChange={(value) => setProfile((v) => ({ ...v, preparation_stage: value }))} options={["准备面试", "正在面试"]} />
            </div>
          </section>

          <section>
            <SectionHeader title="技能库" desc={`以列表维护当前技能强弱，最多 ${maxSkills} 条，描述不超过 ${maxSkillDescriptionLength} 个字。`}>
              <button type="button" onClick={() => setShowSkillCreator((v) => !v)} disabled={skills.length >= maxSkills} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-ink disabled:cursor-not-allowed disabled:bg-[#ececec] disabled:text-[#9d9d9d]">新增技能</button>
            </SectionHeader>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              {skills.map((skill) => {
                const editing = editingSkillId === skill.id;
                const busy = skillLoadingId === skill.id;
                return (
                  <div key={skill.id} className="grid gap-4 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)_180px_64px_160px]">
                    {editing ? (
                      <>
                        <CompactInput value={editingSkillDraft.skill_name} onChange={(v) => setEditingSkillDraft((d) => ({ ...d, skill_name: v.slice(0, 12) }))} placeholder="名称" />
                        <CompactCountedInput value={editingSkillDraft.proficiency_desc} onChange={(v) => setEditingSkillDraft((d) => ({ ...d, proficiency_desc: v.slice(0, maxSkillDescriptionLength) }))} placeholder="添加对技能的描述，不超过25个字" count={editingSkillDraft.proficiency_desc.length} max={maxSkillDescriptionLength} />
                        <CompactLevelBar level={editingSkillDraft.proficiency_level} />
                        <CompactNumberInput value={editingSkillDraft.proficiency_level} onChange={(v) => setEditingSkillDraft((d) => ({ ...d, proficiency_level: Math.max(0, Math.min(5, v)) }))} />
                        <div className="flex items-center gap-2">
                          <ActionButton label={busy ? "保存中..." : "确定"} tone="confirm" onClick={() => updateSkillItem(skill)} disabled={busy} />
                          <ActionButton label="取消" onClick={() => setEditingSkillId(null)} disabled={busy} />
                        </div>
                      </>
                    ) : (
                      <>
                        <CompactDisplay>{skill.skill_name}</CompactDisplay>
                        <CompactDescription>{skill.proficiency_desc}</CompactDescription>
                        <CompactLevelBar level={skill.proficiency_level} />
                        <CompactNumberInput value={skill.proficiency_level} onChange={() => undefined} readOnly />
                        <div className="flex items-center gap-2">
                          <ActionButton label="编辑" onClick={() => startEditSkill(skill)} disabled={busy} />
                          <ActionButton label={busy ? "删除中..." : "删除"} tone="danger" onClick={() => deleteSkillItem(skill.id)} disabled={busy} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {showSkillCreator ? (
                <div className="grid gap-4 bg-[#fbfbfb] px-5 py-4 md:grid-cols-[160px_minmax(0,1fr)_180px_64px_160px]">
                  <CompactInput value={skillDraft.skill_name} onChange={(v) => setSkillDraft((d) => ({ ...d, skill_name: v.slice(0, 12) }))} placeholder="名称" />
                  <CompactCountedInput value={skillDraft.proficiency_desc} onChange={(v) => setSkillDraft((d) => ({ ...d, proficiency_desc: v.slice(0, maxSkillDescriptionLength) }))} placeholder="添加对技能的描述，不超过25个字" count={skillDraft.proficiency_desc.length} max={maxSkillDescriptionLength} />
                  <CompactLevelBar level={skillDraft.proficiency_level} />
                  <CompactNumberInput value={skillDraft.proficiency_level} onChange={(v) => setSkillDraft((d) => ({ ...d, proficiency_level: Math.max(0, Math.min(5, v)) }))} />
                  <div className="flex items-center gap-2">
                    <ActionButton label={creatingSkill ? "保存中..." : "确定"} tone="confirm" onClick={createSkill} disabled={creatingSkill} />
                    <ActionButton label="取消" onClick={() => { setShowSkillCreator(false); setSkillDraft(emptySkillDraft); }} disabled={creatingSkill} />
                  </div>
                </div>
              ) : null}
            </div>
            {skills.length >= maxSkills ? <p className="mt-3 text-sm text-[#9c6c00]">当前技能已到上限，无法继续新增。</p> : null}
          </section>

          <section>
            <SectionHeader title="项目库" desc={`每个项目展示名称、完成状态和标签，项目名称不超过 ${maxProjectNameLength} 个字。`}>
              <button type="button" onClick={() => setShowProjectCreator((v) => !v)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-ink">新增项目</button>
            </SectionHeader>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              {projects.map((project) => {
                const editing = editingProjectId === project.id;
                const busy = projectLoadingId === project.id;
                return (
                  <div key={project.id} className="grid gap-4 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[240px_120px_1fr_180px] md:items-center">
                    {editing ? (
                      <>
                        <input value={editingProjectDraft.project_name} onChange={(e) => setEditingProjectDraft((d) => ({ ...d, project_name: e.target.value.slice(0, maxProjectNameLength) }))} className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-ink" />
                        <select value={editingProjectDraft.project_status} onChange={(e) => setEditingProjectDraft((d) => ({ ...d, project_status: e.target.value as ProjectStatus }))} className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-ink"><option value="completed">已完成</option><option value="not_completed">未完成</option></select>
                        <input value={editingProjectDraft.tagsText} onChange={(e) => setEditingProjectDraft((d) => ({ ...d, tagsText: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-ink" placeholder="标签用英文逗号分隔" />
                        <div className="flex flex-wrap gap-2">
                          <ActionButton label={busy ? "保存中..." : "确定"} tone="confirm" onClick={() => updateProjectItem(project)} disabled={busy} />
                          <ActionButton label="取消" onClick={() => setEditingProjectId(null)} disabled={busy} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold">{project.project_name}</div>
                        <StatusPill completed={project.project_status === "completed"} />
                        <div className="flex flex-wrap gap-2">{project.tags.map((tag) => <span key={`${project.id}-${tag}`} className="rounded-lg bg-[#f2f0ff] px-3 py-2 text-xs font-medium text-[#5f5f78]">{tag}</span>)}</div>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton label="编辑" onClick={() => startEditProject(project)} disabled={busy} />
                          <ActionButton label={busy ? "删除中..." : "删除"} tone="danger" onClick={() => deleteProjectItem(project.id)} disabled={busy} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {showProjectCreator ? (
                <div className="grid gap-4 bg-[#fbfbfb] px-5 py-4 md:grid-cols-[240px_120px_1fr_180px] md:items-center">
                  <input value={projectDraft.project_name} onChange={(e) => setProjectDraft((d) => ({ ...d, project_name: e.target.value.slice(0, maxProjectNameLength) }))} className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-ink" placeholder="项目名称" />
                  <select value={projectDraft.project_status} onChange={(e) => setProjectDraft((d) => ({ ...d, project_status: e.target.value as ProjectStatus }))} className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-ink"><option value="completed">已完成</option><option value="not_completed">未完成</option></select>
                  <input value={projectDraft.tagsText} onChange={(e) => setProjectDraft((d) => ({ ...d, tagsText: e.target.value }))} className="rounded-lg border border-line px-3 py-2 text-sm outline-none transition focus:border-ink" placeholder="标签用英文逗号分隔" />
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label={creatingProject ? "保存中..." : "确定"} tone="confirm" onClick={createProject} disabled={creatingProject} />
                    <ActionButton label="取消" onClick={() => { setShowProjectCreator(false); setProjectDraft(emptyProjectDraft); }} disabled={creatingProject} />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">薄弱项标签</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">展示系统识别出的当前待补齐方向，便于后续关联学习计划和面试训练。</p>
            <div className="mt-5 rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex flex-wrap gap-3">{weaknessTags.map((tag) => <div key={tag.id} className="flex items-center gap-2 rounded-xl border border-[#f0c79f] bg-[#fff3e5] px-3 py-2 text-sm text-[#a7661f]"><span>{tag.tag_name}</span><button type="button" onClick={() => deleteTag(tag.id)} disabled={tagLoadingId === tag.id} className="rounded-md border border-[#d6a5a5] bg-white px-2 py-1 text-xs text-[#9d3d3d]">{tagLoadingId === tag.id ? "删除中..." : "删除"}</button></div>)}</div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="flex-1 rounded-xl border border-line px-4 py-3 text-sm outline-none transition focus:border-ink" placeholder="新增薄弱项标签" />
                <button type="button" onClick={createTag} disabled={creatingTag} className="rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#8f8f8f]">{creatingTag ? "添加中..." : "添加标签"}</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !result.success) throw new Error(result.success ? "请求失败" : result.error);
  return result.data;
}
function parseTags(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function getErrorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

function Banner({ tone, text }: { tone: "neutral" | "success" | "error"; text: string }) {
  const classes = tone === "neutral" ? "border-line bg-white text-muted" : tone === "success" ? "border border-[#d3e9a7] bg-[#f5ffde] text-[#476500]" : "border border-[#f0b8b8] bg-[#fff5f5] text-[#b43c3c]";
  return <div className={`rounded-2xl px-5 py-4 text-sm shadow-card ${classes}`}>{text}</div>;
}
function SectionHeader({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-2 text-sm text-muted">{desc}</p></div>{children}</div>;
}
function InfoField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-[#555]">{label}</span><div className="relative"><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-xl border border-[#cfcfcf] bg-white px-4 py-3 pr-11 text-sm outline-none transition focus:border-[#ababab]">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#666]"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 5.75L8 10.25L12.5 5.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span></div></label>;
}
function CompactInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-sm outline-none transition placeholder:text-[#a0a0a0] focus:border-[#bdbdbd]" placeholder={placeholder} />;
}
function CompactCountedInput({ value, onChange, placeholder, count, max }: { value: string; onChange: (value: string) => void; placeholder: string; count: number; max: number }) {
  return <div className="relative"><input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 pr-12 text-sm outline-none transition placeholder:text-[#a0a0a0] focus:border-[#bdbdbd]" placeholder={placeholder} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#888]">{count}/{max}</span></div>;
}
function CompactDescription({ children }: { children: React.ReactNode }) { return <div className="flex h-10 items-center px-1 text-sm text-muted"><span className="truncate">{children}</span></div>; }
function CompactDisplay({ children }: { children: React.ReactNode }) { return <div className="flex h-10 items-center text-sm font-semibold text-ink">{children}</div>; }
function CompactNumberInput({ value, onChange, readOnly = false }: { value: number; onChange: (value: number) => void; readOnly?: boolean }) {
  return <input type="number" min={0} max={5} readOnly={readOnly} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-sm outline-none transition focus:border-[#bdbdbd] read-only:bg-[#fafafa]" />;
}
function CompactLevelBar({ level }: { level: number }) { return <div className="flex h-10 items-center"><div className="h-2 w-full overflow-hidden rounded-full bg-[#efefef]"><div className="h-full rounded-full bg-[#97e600]" style={{ width: `${(Math.max(0, Math.min(level, 5)) / 5) * 100}%` }} /></div></div>; }
function ActionButton({ label, onClick, tone = "default", disabled = false }: { label: string; onClick: () => void; tone?: "default" | "danger" | "confirm"; disabled?: boolean }) {
  const styles = { default: "border-line bg-[#2f2f2f] text-white hover:bg-black", danger: "border-[#d8d8d8] bg-white text-[#3d3d3d] hover:border-[#bdbdbd]", confirm: "border-[#92e600] bg-[#92e600] text-[#202020] hover:bg-[#84d100]" };
  return <button type="button" onClick={onClick} disabled={disabled} className={`h-10 min-w-[66px] rounded-lg border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[tone]}`}>{label}</button>;
}
function StatusPill({ completed }: { completed: boolean }) { return <span className={`inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-medium ${completed ? "bg-[#97e600] text-[#1d2b00]" : "bg-[#bdbdbd] text-white"}`}>{completed ? "已完成" : "未完成"}</span>; }
