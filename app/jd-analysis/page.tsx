"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";

type AnalysisResult = {
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

type AbilityCategory = {
  title: string;
  description: string;
  tags: string[];
};

type GapItem = {
  name: string;
  currentState: string;
  targetState: string;
  priority: "高优先级" | "中优先级" | "低优先级";
};

type GapAnalysis = {
  conclusion: string;
  overview: string;
  items: GapItem[];
};

const maxJdLength = 1000;

const abilityCatalog: Record<string, AbilityCategory> = {
  product: {
    title: "产品基础能力",
    description: "需求理解、方案设计、产品判断与用户视角等基础产品能力。",
    tags: ["需求分析", "产品思维", "用户洞察"]
  },
  ai: {
    title: "AI相关能力",
    description: "对 AI 产品、Agent、Prompt 或 AI 场景化落地的理解与表达能力。",
    tags: ["AI产品理解", "GUI Agent", "Prompt 设计"]
  },
  data: {
    title: "数据能力",
    description: "指标拆解、基础数据分析、结果归因与验证能力。",
    tags: ["指标拆解", "SQL / Excel", "数据分析"]
  },
  project: {
    title: "项目与表达能力",
    description: "项目梳理、STAR 表达、复盘总结和跨团队沟通能力。",
    tags: ["项目复盘", "STAR 表达", "沟通协作"]
  },
  other: {
    title: "其他能力",
    description: "执行力、学习速度、行业关注度等对求职有帮助的补充能力。",
    tags: ["主动学习", "行业关注", "执行推进"]
  }
};

function analyzeJd(jdText: string, jobType: string, companyType: string): AnalysisResult {
  const lowerText = jdText.toLowerCase();
  const tags = new Set<string>();
  const explicitRequirements: string[] = [];
  const implicitRequirements: string[] = [];
  const abilityKeys = new Set<keyof typeof abilityCatalog>();
  const coreAbilities: string[] = [];

  const roleTitle = lowerText.includes("ai") || jdText.includes("AI") ? "AI 产品经理 / AI 产品实习" : "产品经理 / 产品实习";

  if (jdText.includes("Agent") || jdText.includes("智能体") || jdText.includes("GUI")) {
    tags.add("GUI Agent");
    tags.add("AI 产品");
    abilityKeys.add("ai");
    explicitRequirements.push("需要理解 Agent 或 AI 产品的核心概念、场景与产品逻辑。");
    implicitRequirements.push("面试中大概率会追问你对 AI 产品边界、落地难点和典型案例的理解。");
    coreAbilities.push("GUI Agent 理解");
  }

  if (jdText.includes("指标") || jdText.includes("数据") || lowerText.includes("sql")) {
    tags.add("数据分析");
    abilityKeys.add("data");
    explicitRequirements.push("需要具备基础指标拆解、数据分析或 SQL / Excel 处理能力。");
    implicitRequirements.push("不仅要会看数据，还要能把指标和业务动作串起来。");
    coreAbilities.push("指标拆解");
  }

  if (jdText.includes("项目") || jdText.includes("推进") || jdText.includes("落地")) {
    tags.add("项目推进");
    abilityKeys.add("project");
    explicitRequirements.push("需要能独立梳理项目背景、推进过程、产出结果与复盘。");
    implicitRequirements.push("项目表达必须结构化，最好能清楚说明个人贡献和结果验证。");
    coreAbilities.push("项目表达");
  }

  if (jdText.includes("用户") || jdText.includes("需求") || jdText.includes("竞品") || jdText.includes("原型")) {
    tags.add("产品基础");
    abilityKeys.add("product");
    explicitRequirements.push("需要具备基础的需求分析、用户理解、竞品分析或方案设计能力。");
    implicitRequirements.push("岗位更看重产品判断，而不是只会写文档。");
    coreAbilities.push("产品基础能力");
  }

  if (jdText.includes("沟通") || jdText.includes("协作") || jdText.includes("学习能力")) {
    tags.add("协作沟通");
    abilityKeys.add("other");
    implicitRequirements.push("团队会期待你能快速学习并和研发、设计等角色顺畅协作。");
  }

  if (explicitRequirements.length === 0) {
    abilityKeys.add("product");
    explicitRequirements.push("需要具备基础产品能力，包括需求理解、方案设计和用户视角。");
    explicitRequirements.push("需要具备较好的项目表达与沟通能力。");
    implicitRequirements.push("岗位默认你能快速上手业务并形成结构化表达。");
    implicitRequirements.push("面试中很可能会考察项目深挖与产品判断。");
    coreAbilities.push("产品基础能力", "项目表达");
  }

  const uniqueCoreAbilities = Array.from(new Set(coreAbilities)).slice(0, 5);
  const abilityCategories = Array.from(abilityKeys).map((key) => abilityCatalog[key]);

  if (jobType.trim()) {
    tags.add(jobType.trim());
  }

  if (companyType.trim()) {
    tags.add(companyType.trim());
  }

  return {
    rolePositioning: {
      title: roleTitle,
      description: "这个岗位更偏向需要兼顾产品基础、业务理解和项目表达的复合型产品岗位，若 JD 中包含 AI / Agent 相关内容，则会额外关注 AI 方向认知与场景化理解。",
      tags: Array.from(tags).slice(0, 6)
    },
    explicitRequirements: explicitRequirements.slice(0, 5),
    implicitRequirements: implicitRequirements.slice(0, 5),
    abilityCategories,
    coreAbilities: uniqueCoreAbilities
  };
}

function buildGapAnalysis(result: AnalysisResult): GapAnalysis {
  const items: GapItem[] = [];

  if (result.coreAbilities.includes("GUI Agent 理解")) {
    items.push({
      name: "AI / GUI Agent 认知",
      currentState: "对概念有基础了解，但缺少系统化表达和案例储备。",
      targetState: "能清晰讲清核心概念、典型场景、价值与落地难点。",
      priority: "高优先级"
    });
  }

  if (result.coreAbilities.includes("指标拆解")) {
    items.push({
      name: "指标拆解能力",
      currentState: "会泛泛而谈数据，但还不够结构化。",
      targetState: "能独立完成核心指标、过程指标和归因思路拆解。",
      priority: "高优先级"
    });
  }

  if (result.coreAbilities.includes("项目表达")) {
    items.push({
      name: "项目与表达能力",
      currentState: "项目经历有内容，但缺少结构化的 STAR 表达。",
      targetState: "能在 2-3 分钟内清晰讲清项目背景、动作、结果和复盘。",
      priority: "中优先级"
    });
  }

  if (result.coreAbilities.includes("产品基础能力")) {
    items.push({
      name: "产品基础能力",
      currentState: "具备基础产品认知，但对需求判断和竞品分析表达还不够稳定。",
      targetState: "能围绕用户、场景和方案进行更完整的产品分析。",
      priority: "中优先级"
    });
  }

  if (items.length === 0) {
    items.push({
      name: "综合表达能力",
      currentState: "具备一定素材，但对岗位要求的映射还不够聚焦。",
      targetState: "能针对 JD 要求快速调整表达重点并完成高频问题回答。",
      priority: "中优先级"
    });
  }

  return {
    conclusion: "当前短板主要集中在岗位要求的高频核心能力上，先补最影响面试表现的能力最有效。",
    overview:
      "建议优先围绕 JD 中最明确出现的核心要求做补齐，再把这些内容转化为项目表达和面试回答。先抓高频、再抓完整度，准备效率会更高。",
    items
  };
}

export default function JDAnalysisPage() {
  const [jdText, setJdText] = useState("");
  const [jobType, setJobType] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingGap, setIsGeneratingGap] = useState(false);
  const [error, setError] = useState("");

  const canAnalyze = jdText.trim().length > 0 && !isAnalyzing;
  const canGoToStudyPlan = Boolean(analysisResult && gapAnalysis && !isGeneratingGap);

  const positioningTags = useMemo(() => analysisResult?.rolePositioning.tags ?? [], [analysisResult]);

  async function handleAnalyze() {
    if (!jdText.trim()) {
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setGapAnalysis(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const nextAnalysis = analyzeJd(jdText, jobType, companyType);
      setAnalysisResult(nextAnalysis);

      setIsGeneratingGap(true);
      await new Promise((resolve) => setTimeout(resolve, 700));
      setGapAnalysis(buildGapAnalysis(nextAnalysis));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "JD 分析失败，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingGap(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-ink">
      <TopNav />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-[#f1f0f7]">
          <div className="mx-auto max-w-[1280px] px-6 py-8 lg:px-8 lg:py-10">
            <h1 className="text-4xl font-semibold tracking-tight text-ink">
              JD 分析
              <span className="ml-3 text-3xl font-normal uppercase tracking-[0.04em] text-[#3d3d45]">
                JD Analysis
              </span>
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
              快速看懂产品经理岗位需要什么。
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-6 lg:px-8 lg:py-7">
          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">输入区</h2>
              <span className="text-xs text-muted">{jdText.length}/{maxJdLength}</span>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_180px_180px_148px]">
              <div>
                <textarea
                  value={jdText}
                  onChange={(event) => setJdText(event.target.value.slice(0, maxJdLength))}
                  placeholder="JD 文本输入，1000字以内"
                  className="h-[88px] w-full resize-none rounded-2xl border border-[#d8dbe3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#9ab3e8]"
                />
                <p className="mt-1 text-xs text-muted">先把你想分析的 JD 粘贴进来。</p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#555]">岗位类型</span>
                <input
                  value={jobType}
                  onChange={(event) => setJobType(event.target.value)}
                  placeholder="eg实习，非必填"
                  className="h-12 w-full rounded-2xl border border-[#d8dbe3] bg-white px-4 text-sm outline-none transition focus:border-[#9ab3e8]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#555]">公司类型</span>
                <input
                  value={companyType}
                  onChange={(event) => setCompanyType(event.target.value)}
                  placeholder="eg大厂，非必填"
                  className="h-12 w-full rounded-2xl border border-[#d8dbe3] bg-white px-4 text-sm outline-none transition focus:border-[#9ab3e8]"
                />
              </label>

              <button
                type="button"
                disabled={!canAnalyze}
                onClick={handleAnalyze}
                className="mt-6 h-12 rounded-2xl bg-[#1f3f73] px-5 text-sm font-medium text-white transition hover:bg-[#1a3560] disabled:cursor-not-allowed disabled:bg-[#b6bfd0]"
              >
                {isAnalyzing ? "开始分析中..." : "开始分析"}
              </button>
            </div>

            {error ? <p className="mt-2 text-sm text-[#c24545]">{error}</p> : null}
          </section>

          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <h2 className="text-xl font-semibold">JD 分析结果</h2>
            {analysisResult ? (
              <div className="mt-3 grid gap-3 xl:grid-cols-[1.05fr_1fr_1fr]">
                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">岗位定位</h3>
                  <p className="mt-2 text-sm font-medium text-ink">{analysisResult.rolePositioning.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{analysisResult.rolePositioning.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {positioningTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#d8e3f8] bg-[#f2f7ff] px-3 py-1 text-xs text-[#315a95]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">显性要求</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {analysisResult.explicitRequirements.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[#1f3f73]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">隐性要求</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {analysisResult.implicitRequirements.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-[#8db400]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            ) : (
              <EmptyState text="完成 JD 输入并点击开始分析后，这里会自动生成岗位定位、显性要求和隐性要求。" />
            )}
          </section>

          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <h2 className="text-xl font-semibold">能力分类</h2>
            {analysisResult ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {analysisResult.abilityCategories.map((item) => (
                  <article key={item.title} className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#ece6d2] bg-[#fff8e8] px-3 py-1 text-xs text-[#8b6b1f]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">最值得优先准备的 {analysisResult.coreAbilities.length} 项核心能力</h3>
                  <ol className="mt-3 space-y-2 text-sm leading-6 text-muted">
                    {analysisResult.coreAbilities.map((item, index) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-[#1f3f73] text-[11px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              </div>
            ) : (
              <EmptyState text="分析出相关能力后，会按能力类别自动显示卡片；未匹配到的类别不会展示。" />
            )}
          </section>

          <section className="rounded-[24px] border border-[#f0ddad] bg-[#fff9ec] p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#7b5d14]">差距分析</h2>
              {isGeneratingGap ? <span className="text-sm text-[#8a6c20]">正在生成差距分析...</span> : null}
            </div>

            {gapAnalysis ? (
              <div className="mt-3 grid gap-3 xl:grid-cols-[0.95fr_1.25fr]">
                <article className="rounded-2xl border border-[#f0e2bf] bg-white/90 p-4">
                  <h3 className="text-base font-semibold">总体判断</h3>
                  <p className="mt-2 text-sm font-medium text-ink">{gapAnalysis.conclusion}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{gapAnalysis.overview}</p>
                </article>

                <article className="rounded-2xl border border-[#f0e2bf] bg-white/90 p-4">
                  <h3 className="text-base font-semibold">差距项列表</h3>
                  <div className="mt-3 space-y-3">
                    {gapAnalysis.items.map((item) => (
                      <div key={item.name} className="rounded-2xl border border-[#ece4cf] bg-[#fffdfa] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold text-ink">{item.name}</h4>
                          <span className="rounded-full bg-[#fff2c8] px-3 py-1 text-xs text-[#8b6b1f]">
                            {item.priority}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          <span className="font-medium text-ink">当前如何：</span>
                          {item.currentState}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          <span className="font-medium text-ink">目标如何：</span>
                          {item.targetState}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            ) : (
              <EmptyState text="完成 JD 分析后，这里会自动开始生成差距分析，并给出总体判断和优先级列表。" tone="warm" />
            )}
          </section>

          <div className="flex justify-center pt-1">
            <div className="flex flex-col items-center gap-2">
              <Link
                href={canGoToStudyPlan ? "/learning-plan" : "#"}
                aria-disabled={!canGoToStudyPlan}
                className={`inline-flex h-12 items-center justify-center rounded-2xl px-7 text-sm font-medium transition ${
                  canGoToStudyPlan
                    ? "bg-[#1f3f73] text-white hover:bg-[#1a3560]"
                    : "cursor-not-allowed bg-[#c9cfdb] text-white"
                }`}
              >
                去制定学习计划
              </Link>
              <p className="text-sm text-muted">请先完成 JD 分析和差距分析哦</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ text, tone = "default" }: { text: string; tone?: "default" | "warm" }) {
  return (
    <div
      className={`mt-3 rounded-2xl border border-dashed p-5 text-sm leading-6 ${
        tone === "warm"
          ? "border-[#ecd7a8] bg-white/60 text-[#8a6c20]"
          : "border-[#d9dce4] bg-[#fafbfd] text-muted"
      }`}
    >
      {text}
    </div>
  );
}
