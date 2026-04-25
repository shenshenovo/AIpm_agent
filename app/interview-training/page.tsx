"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";
import type { ApiResponse } from "@/types/capability-profile";
import type {
  GenerateInterviewQuestionResponse,
  InterviewQuestion,
  PracticeMode,
  QuestionType,
  ReviewContent,
  ReviewInterviewAnswerResponse
} from "@/types/interview";

const userKey = "user001";
const workflowStorageKey = "ai_pm_agent.workflow2_result";

const practiceModeOptions: Array<{ value: PracticeMode; label: string }> = [
  { value: "standard", label: "标准练习" },
  { value: "weakness", label: "短板强化" }
];

const questionTypeOptions: Array<{ value: QuestionType; label: string }> = [
  { value: "self_intro", label: "自我介绍" },
  { value: "project", label: "项目题" },
  { value: "ai_product", label: "AI 产品题" },
  { value: "requirement", label: "需求分析题" },
  { value: "behavior", label: "行为题" },
  { value: "random", label: "随机题" }
];

type StoredWorkflowInput = {
  workflow1_result: string;
  workflow2_result: string;
  job_type?: string;
  company_type?: string;
  savedAt?: string;
};

export default function InterviewTrainingPage() {
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("standard");
  const [questionType, setQuestionType] = useState<QuestionType>("project");
  const [workflowInput, setWorkflowInput] = useState<StoredWorkflowInput | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState<ReviewContent | null>(null);
  const [questionFallbackNotice, setQuestionFallbackNotice] = useState("");
  const [reviewFallbackNotice, setReviewFallbackNotice] = useState("");
  const [error, setError] = useState("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canGenerateQuestion = Boolean(workflowInput?.workflow2_result.trim()) && !isGeneratingQuestion;
  const canSubmitAnswer = Boolean(currentQuestion) && answer.trim().length > 0 && !isSubmitting;
  const showQuestionTypeSelector = practiceMode === "standard";
  const questionMeta = useMemo(() => currentQuestion?.focusPoints ?? [], [currentQuestion]);
  const sourceNotice = useMemo(() => buildSourceNotice(workflowInput), [workflowInput]);

  useEffect(() => {
    setWorkflowInput(readStoredWorkflowInput());
  }, []);

  async function handleGenerateQuestion() {
    if (!workflowInput?.workflow2_result.trim()) {
      setError("请先完成 JD 分析，再来生成面试题。");
      return;
    }

    setIsGeneratingQuestion(true);
    setError("");
    setReview(null);
    setQuestionFallbackNotice("");
    setReviewFallbackNotice("");

    try {
      const response = await fetchJson<GenerateInterviewQuestionResponse>("/api/interview/question", {
        method: "POST",
        body: JSON.stringify({
          practice_mode: practiceMode,
          question_type: questionType,
          workflow1_result: workflowInput.workflow1_result,
          workflow2_result: workflowInput.workflow2_result,
          target_role_direction: workflowInput.job_type ?? "",
          user_key: userKey,
          focus_on_weakness: practiceMode === "weakness"
        })
      });

      setCurrentQuestion(response.question);
      setAnswer("");
      setQuestionFallbackNotice(response.fallbackNotice ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成面试题失败");
    } finally {
      setIsGeneratingQuestion(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!currentQuestion || !workflowInput?.workflow2_result.trim()) {
      setError("请先生成题目并确保已带入 JD 分析结果。");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setReviewFallbackNotice("");

    try {
      const response = await fetchJson<ReviewInterviewAnswerResponse>("/api/interview/review", {
        method: "POST",
        body: JSON.stringify({
          current_question: currentQuestion.title,
          currentquestionpoint: currentQuestion.questionPointsText,
          question_type: currentQuestion.type,
          user_answer: answer,
          target_role_direction: workflowInput.job_type ?? "",
          workflow2_result: workflowInput.workflow2_result
        })
      });

      setReview(response.review);
      setReviewFallbackNotice(response.fallbackNotice ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "答案点评失败");
    } finally {
      setIsSubmitting(false);
    }
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
              用 Flow4 生成面试题，用 Flow5 点评你的回答，重点围绕 JD 差距项做针对性练习。
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-6 lg:px-8 lg:py-7">
          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)_156px]">
              <div>
                <p className="text-sm font-medium text-[#555]">练习模式</p>
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
                <p className="text-sm font-medium text-[#555]">题型选择</p>
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
                    短板强化模式会优先围绕差距分析中的高优先级短板出题。
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateQuestion}
                disabled={!canGenerateQuestion}
                className="mt-6 h-12 rounded-2xl bg-[#1f3f73] px-5 text-sm font-medium text-white transition hover:bg-[#1a3560] disabled:cursor-not-allowed disabled:bg-[#b6bfd0]"
              >
                {isGeneratingQuestion ? "生成中..." : "生成题目"}
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted">{sourceNotice}</p>
            {questionFallbackNotice ? <p className="mt-2 text-sm text-[#8a6c20]">{questionFallbackNotice}</p> : null}
            {error ? <p className="mt-2 text-sm text-[#c24545]">{error}</p> : null}
          </section>

          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <h2 className="text-xl font-semibold">当前面试题</h2>
            {currentQuestion ? (
              <>
                <p className="mt-3 text-[22px] font-semibold leading-9 text-ink">{currentQuestion.title}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                  <span>题型：{currentQuestion.typeLabel}</span>
                  <span>建议思考时间：{currentQuestion.thinkTime}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>考点</span>
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
              <EmptyState text="生成题目后，这里会显示当前练习题以及它对应的核心考点。" />
            )}
          </section>

          <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
            <h2 className="text-xl font-semibold">你的回答</h2>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="直接输入你的面试回答，越接近真实口述越好。"
              className="mt-3 h-[132px] w-full resize-none rounded-2xl border border-[#d8dbe3] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#9ab3e8]"
            />
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!canSubmitAnswer}
              className="mt-3 h-12 w-full rounded-2xl bg-[#1f3f73] px-5 text-sm font-medium text-white transition hover:bg-[#1a3560] disabled:cursor-not-allowed disabled:bg-[#b6bfd0]"
            >
              {isSubmitting ? "点评中..." : "提交点评"}
            </button>
            {reviewFallbackNotice ? <p className="mt-2 text-sm text-[#8a6c20]">{reviewFallbackNotice}</p> : null}
          </section>

          {review ? (
            <section className="rounded-[24px] border border-line bg-white p-4 shadow-card">
              <h2 className="text-xl font-semibold">点评结果</h2>

              {review.strengths.length > 0 ? (
                <article className="mt-3 rounded-2xl border border-[#f0e2a4] bg-[#fff7c8] p-4">
                  <h3 className="text-base font-semibold text-[#7f6519]">回答优点</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[#6d5a1f]">
                    {review.strengths.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">这道题应该答到什么</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {review.answerKeyPoints.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">推荐回答框架</h3>
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
                  <h3 className="text-base font-semibold text-[#9e3741]">当前回答的缺口</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[#8d3d44]">
                    {review.misses.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              <div className="mt-3 grid gap-3 xl:grid-cols-[0.82fr_1.18fr]">
                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">优化建议</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
                    {review.suggestions.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>

                <article className="rounded-2xl border border-[#e7e9ef] bg-[#fafbfd] p-4">
                  <h3 className="text-base font-semibold">参考答案</h3>
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

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.success ? "请求失败" : result.error);
  }
  return result.data;
}

function readStoredWorkflowInput(): StoredWorkflowInput | null {
  try {
    const rawValue = window.sessionStorage.getItem(workflowStorageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredWorkflowInput>;
    if (typeof parsed.workflow2_result !== "string" || !parsed.workflow2_result.trim()) {
      return null;
    }

    return {
      workflow1_result: typeof parsed.workflow1_result === "string" ? parsed.workflow1_result : "",
      workflow2_result: parsed.workflow2_result,
      job_type: typeof parsed.job_type === "string" ? parsed.job_type : "",
      company_type: typeof parsed.company_type === "string" ? parsed.company_type : "",
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : ""
    };
  } catch {
    return null;
  }
}

function buildSourceNotice(input: StoredWorkflowInput | null) {
  if (!input?.workflow2_result.trim()) {
    return "请先去 JD 分析页完成分析，面试训练会自动读取 Workflow1 和 Workflow2 的结果。";
  }

  const tags = [input.job_type, input.company_type].map((item) => item?.trim()).filter(Boolean);
  const suffix = tags.length > 0 ? `（${tags.join(" / ")}）` : "";
  return `已读取上一页 JD 分析结果${suffix}，Flow4 会基于这些上下文出题，Flow5 会结合差距分析做点评。`;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-[#d9dce4] bg-[#fafbfd] p-5 text-sm leading-6 text-muted">
      {text}
    </div>
  );
}
