"use client";

import { useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";

type PracticeMode = "standard" | "weakness";
type QuestionType =
  | "self_intro"
  | "project"
  | "ai_product"
  | "requirement"
  | "behavior"
  | "random";

type InterviewQuestion = {
  title: string;
  typeLabel: string;
  thinkTime: string;
  focusPoints: string[];
};

type ReviewContent = {
  strengths: string[];
  answerKeyPoints: string[];
  answerFramework: string[];
  misses: string[];
  suggestions: string[];
  sampleAnswer: string;
};

const practiceModeOptions = [
  { value: "standard" as const, label: "标准模拟" },
  { value: "weakness" as const, label: "薄弱项强化" }
];

const questionTypeOptions = [
  { value: "self_intro" as const, label: "自我介绍题" },
  { value: "project" as const, label: "项目题" },
  { value: "ai_product" as const, label: "AI产品理解题" },
  { value: "requirement" as const, label: "需求分析题" },
  { value: "behavior" as const, label: "行为面试题" },
  { value: "random" as const, label: "随机选项" }
];

const standardQuestionBank: Record<QuestionType, InterviewQuestion> = {
  self_intro: {
    title: "请用 1 分钟做一个和目标岗位高度相关的自我介绍，重点说明你为什么适合这个 AI 产品岗位。",
    typeLabel: "自我介绍题",
    thinkTime: "1 分钟",
    focusPoints: ["岗位匹配度", "经历提炼", "表达结构"]
  },
  project: {
    title:
      "如果让你介绍一个最能体现产品能力的项目，你会怎么在 2 分钟内讲清背景、动作、结果，以及你个人的关键贡献？",
    typeLabel: "项目题",
    thinkTime: "2 分钟",
    focusPoints: ["STAR 表达", "个人贡献", "结果量化"]
  },
  ai_product: {
    title:
      "你如何理解 GUI Agent 这类 AI 产品的价值？如果让你概括它和传统自动化工具的区别，你会怎么回答？",
    typeLabel: "AI产品理解题",
    thinkTime: "2 分钟",
    focusPoints: ["AI 产品理解", "场景判断", "产品边界"]
  },
  requirement: {
    title:
      "如果让你为求职中的应届生设计一个 GUI Agent，帮助他们完成 JD 分析和备考计划生成，你会如何做需求分析，并决定第一版先做什么、不做什么？",
    typeLabel: "需求分析题",
    thinkTime: "6 分钟",
    focusPoints: ["用户问题拆解", "需求优先级", "MVP 边界", "场景落地感"]
  },
  behavior: {
    title:
      "讲一个你在项目推进中遇到分歧的经历。你是如何和他人对齐目标、推动决策并保证结果落地的？",
    typeLabel: "行为面试题",
    thinkTime: "2 分钟",
    focusPoints: ["沟通协作", "冲突处理", "推进力"]
  },
  random: {
    title:
      "假设你负责一个 AI 功能上线后的复盘，发现使用率很高但完成率偏低，你会怎么分析问题并提出优化方向？",
    typeLabel: "随机题",
    thinkTime: "3 分钟",
    focusPoints: ["数据分析", "问题归因", "优化思路"]
  }
};

const weaknessQuestion: InterviewQuestion = {
  title:
    "如果面试官追问你：你对 GUI Agent 的理解还不够系统，项目表达里也缺少指标拆解，你会如何在回答中补齐这两个短板并证明自己能快速胜任岗位？",
  typeLabel: "薄弱项强化题",
  thinkTime: "4 分钟",
  focusPoints: ["短板自证", "指标拆解", "AI 产品理解", "表达补强"]
};

function buildReviewContent(question: InterviewQuestion, answer: string): ReviewContent {
  const trimmedAnswer = answer.trim();
  const tooShort = trimmedAnswer.length < 20;
  const noisyAnswer = /^[a-z0-9\s.,!?]+$/i.test(trimmedAnswer) === false && trimmedAnswer.length < 12;
  const shouldHideStrengthsAndMisses = !trimmedAnswer || tooShort || noisyAnswer;

  const answerKeyPoints =
    question.typeLabel === "需求分析题"
      ? [
          "先明确目标用户、核心场景和最痛的需求。",
          "再拆需求优先级，解释为什么第一版只做 MVP。",
          "最后补充验证方式、边界和后续扩展方向。"
        ]
      : [
          "回答里要先给清晰结论，再展开核心论据。",
          "用项目或具体场景支撑观点，不要只说抽象概念。",
          "最后补一句结果、复盘或岗位适配度。"
        ];

  const answerFramework =
    question.typeLabel === "项目题"
      ? ["背景和目标", "我的动作", "结果和量化", "复盘和迁移"]
      : ["先给结论", "拆 2-3 个关键点", "补案例或数据", "收束到岗位价值"];

  const strengths = shouldHideStrengthsAndMisses
    ? []
    : [
        "回答整体有主线，能围绕题目中心展开。",
        "已经出现岗位相关关键词，说明你有意识往目标岗位靠。"
      ];

  const misses = shouldHideStrengthsAndMisses
    ? []
    : [
        "答案里还缺少更明确的结构标记，容易让面试官抓不到重点。",
        "举例和结果不够具体，缺少更强的说服力。"
      ];

  return {
    strengths,
    answerKeyPoints,
    answerFramework,
    misses,
    suggestions: [
      "先用一句话回答结论，再展开细节。",
      "补一个更具体的项目或场景例子。",
      "如果涉及项目，尽量讲清你的动作和结果，不要只讲团队。",
      "把回答收束回岗位要求，体现匹配度。"
    ],
    sampleAnswer:
      question.typeLabel === "需求分析题"
        ? "我会先确认目标用户是正在求职的产品候选人，核心问题不是“信息不够多”，而是“无法把 JD 要求转成可执行准备动作”。所以第一版我会只做三个核心能力：JD 解析、差距识别、学习计划生成。优先不做复杂的社区、题库推荐和长链路协同，因为这些对 MVP 不是刚需。验证上我会先看用户是否能在 10 分钟内完成一次分析并拿到清晰备考行动项，再看学习计划的完成率和用户主观满意度。"
        : "我会先给出结论，再用 2 到 3 个重点展开。如果是项目题，我会先交代背景和目标，再突出我个人负责的关键动作，用一两个数据结果证明价值，最后补一句复盘，说明我从这个项目里学到了什么，以及为什么这些经验能迁移到目标岗位。这样的回答更容易让面试官快速判断我的能力和岗位匹配度。"
  };
}

export default function InterviewTrainingPage() {
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("standard");
  const [questionType, setQuestionType] = useState<QuestionType>("project");
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState<ReviewContent | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !isSubmitting;

  const showQuestionTypeSelector = practiceMode === "standard";
  const questionMeta = useMemo(() => currentQuestion?.focusPoints ?? [], [currentQuestion]);

  async function handleGenerateQuestion() {
    setIsGeneratingQuestion(true);
    setReview(null);

    await new Promise((resolve) => setTimeout(resolve, 380));

    const nextQuestion =
      practiceMode === "weakness" ? weaknessQuestion : standardQuestionBank[questionType];

    setCurrentQuestion(nextQuestion);
    setAnswer("");
    setIsGeneratingQuestion(false);
  }

  async function handleSubmitAnswer() {
    if (!currentQuestion) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 280));
    setReview(buildReviewContent(currentQuestion, answer));
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-ink">
      <TopNav />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-[#f1f0f7]">
          <div className="mx-auto max-w-[1280px] px-6 py-8 lg:px-8 lg:py-10">
            <h1 className="text-4xl font-semibold tracking-tight text-ink">
              面试训练
              <span className="ml-3 text-3xl font-normal uppercase tracking-[0.04em] text-[#3d3d45]">
                Interview Training
              </span>
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
              根据岗位要求和你的短板，生成更适合你的面试题。
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-6 lg:px-8 lg:py-7">
          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)_144px]">
              <div>
                <p className="text-sm font-medium text-[#555]">练习模式选择</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {practiceModeOptions.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPracticeMode(item.value)}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        practiceMode === item.value
                          ? "bg-[#1f3f73] text-white"
                          : "border border-[#d8dbe3] bg-white text-muted hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[#555]">题目选择</p>
                {showQuestionTypeSelector ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {questionTypeOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setQuestionType(item.value)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          questionType === item.value
                            ? "bg-[#1f3f73] text-white"
                            : "border border-[#d8dbe3] bg-white text-muted hover:text-ink"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-2xl border border-dashed border-[#d9dce4] bg-[#fafbfd] px-4 py-3 text-sm text-muted">
                    薄弱项强化模式下将根据薄弱项自动生成题目。
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateQuestion}
                className="mt-6 h-12 rounded-2xl bg-[#1f3f73] px-5 text-sm font-medium text-white transition hover:bg-[#1a3560]"
              >
                {isGeneratingQuestion ? "生成中..." : "生成题目"}
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <h2 className="text-xl font-semibold">面试题目</h2>
            {currentQuestion ? (
              <>
                <p className="mt-3 text-[22px] font-semibold leading-9 text-ink">{currentQuestion.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                  <span>题目类型：{currentQuestion.typeLabel}</span>
                  <span>建议思考时间：{currentQuestion.thinkTime}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>本题考查点：</span>
                    {questionMeta.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#e4e7ef] bg-[#f7f9fc] px-3 py-1 text-xs text-[#55637f]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState text="点击生成题目后，这里会展示题目正文、题目类型、建议思考时间和本题考查点。" />
            )}
          </section>

          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <h2 className="text-xl font-semibold">回答输入区</h2>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="请输入你的回答"
              className="mt-3 h-[116px] w-full resize-none rounded-2xl border border-[#d8dbe3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#9ab3e8]"
            />
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!currentQuestion || !canSubmit}
              className="mt-3 h-12 w-full rounded-2xl bg-[#1f3f73] px-5 text-sm font-medium text-white transition hover:bg-[#1a3560] disabled:cursor-not-allowed disabled:bg-[#b6bfd0]"
            >
              {isSubmitting ? "提交中..." : "提交点评"}
            </button>
          </section>

          {review ? (
            <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
              <h2 className="text-xl font-semibold">答案点评区</h2>

              {review.strengths.length > 0 ? (
                <article className="mt-3 rounded-2xl border border-[#f0e2a4] bg-[#fff7c8] p-4">
                  <h3 className="text-base font-semibold text-[#7f6519]">回答亮点</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[#6d5a1f]">
                    {review.strengths.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">答案重点</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {review.answerKeyPoints.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">答题思路</h3>
                  <ol className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {review.answerFramework.map((item, index) => (
                      <li key={item}>
                        {index + 1}. {item}
                      </li>
                    ))}
                  </ol>
                </article>
              </div>

              {review.misses.length > 0 ? (
                <article className="mt-3 rounded-2xl border border-[#f0b2b7] bg-[#ffe7ea] p-4">
                  <h3 className="text-base font-semibold text-[#9e3741]">错处漏处</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[#8d3d44]">
                    {review.misses.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              <div className="mt-3 grid gap-3 xl:grid-cols-[0.78fr_1.22fr]">
                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">改进建议</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {review.suggestions.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">示例优化回答</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{review.sampleAnswer}</p>
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-[#d9dce4] bg-[#fafbfd] p-5 text-sm leading-6 text-muted">
      {text}
    </div>
  );
}
