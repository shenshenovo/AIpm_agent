"use client";

import { useMemo, useState } from "react";
import { TopNav } from "@/components/top-nav";
import type { ApiResponse } from "@/types/capability-profile";
import type { DailyPlanItem, StudyPlanResponse } from "@/types/study-plan";

type PlanTask = {
  id: string;
  text: string;
  completed: boolean;
};

type StudyDayPlan = {
  id: string;
  dayNumber: number;
  dateKey: string;
  durationHours: number;
  tasks: PlanTask[];
};

const today = new Date(2026, 3, 12);
const defaultStudyDays = 7;
const defaultHoursPerDay = 2.5;
const maxTaskLength = 15;
const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];
const monthLabels = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const workflow2ResultMock =
  "能力分析结果：当前重点短板包括 GUI Agent 认知不足、项目表达偏弱、指标拆解不熟，需要通过结构化学习和项目输出补齐。";

const initialResponse: StudyPlanResponse = {
  summary:
    "在 7 天内，围绕目标岗位完成结构化补强：巩固核心技能、推进至少一个代表性项目、补齐表达与拆解能力短板。",
  scheduleAdvice:
    "建议每天先做一项高优先级核心任务，再安排一项复盘或输出任务。前半程偏重知识补齐，后半程偏重项目推进与表达训练。",
  dailyPlans: [
    { day: 1, hours: 2.3, tasks: ["梳理核心岗位要求", "阅读 3 份 AI PM JD", "整理能力差距", "输出学习笔记"] },
    { day: 2, hours: 2.5, tasks: ["拆解竞品和案例", "整理产品分析模板", "补齐指标理解", "复盘学习结果"] },
    { day: 3, hours: 2.7, tasks: ["推进项目页面表达", "整理项目亮点", "模拟项目介绍", "记录复盘问题"] },
    { day: 4, hours: 2.3, tasks: ["补齐 Agent 基础认知", "阅读工作流案例", "提炼产品化思路", "输出专题总结"] },
    { day: 5, hours: 2.5, tasks: ["练习需求拆解", "完成原型复盘", "整理验证方法", "归档任务清单"] },
    { day: 6, hours: 2.7, tasks: ["准备面试表达", "整理高频问题", "完成口述练习", "记录待加强点"] },
    { day: 7, hours: 2.3, tasks: ["查漏补缺", "回顾本周重点", "修正文档表达", "确认下一阶段目标"] }
  ],
  suggestions: [
    "优先完成和目标岗位最相关的任务",
    "每天至少留 15 分钟做复盘",
    "把学习成果转成项目表达或面试答案"
  ]
};

export default function LearningPlanPage() {
  const [studyDays, setStudyDays] = useState(defaultStudyDays);
  const [hoursPerDay, setHoursPerDay] = useState(defaultHoursPerDay);
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [studyPlanResponse, setStudyPlanResponse] = useState<StudyPlanResponse>(initialResponse);
  const [planDays, setPlanDays] = useState<StudyDayPlan[]>(() => mapResponseToPlanDays(initialResponse.dailyPlans));
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatDateKey(today));
  const [currentPlanPage, setCurrentPlanPage] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = isValidStudyDays(studyDays) && isValidStudyHours(hoursPerDay);
  const calendarCells = useMemo(() => buildCalendarCells(calendarMonth), [calendarMonth]);
  const totalPages = Math.max(1, Math.ceil(planDays.length / 7));
  const visiblePlans = useMemo(() => {
    const start = currentPlanPage * 7;
    return planDays.slice(start, start + 7);
  }, [currentPlanPage, planDays]);

  async function handleGeneratePlan() {
    if (!canGenerate) {
      setError("请输入 1-14 天的学习天数，以及有效的每日学习时间。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchJson<StudyPlanResponse>("/api/study-plan", {
        method: "POST",
        body: JSON.stringify({
          workflow2_result: workflow2ResultMock,
          study_days: studyDays,
          daily_hours: hoursPerDay
        })
      });

      const nextPlanDays = mapResponseToPlanDays(response.dailyPlans);
      setStudyPlanResponse(response);
      setPlanDays(nextPlanDays);
      setSelectedDateKey(nextPlanDays[0]?.dateKey ?? formatDateKey(today));
      setCurrentPlanPage(0);
      setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成学习计划失败");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDate(dateKey: string) {
    if (!planDays.some((item) => item.dateKey === dateKey)) {
      return;
    }
    setSelectedDateKey(dateKey);
    const index = planDays.findIndex((item) => item.dateKey === dateKey);
    if (index >= 0) {
      setCurrentPlanPage(Math.floor(index / 7));
    }
  }

  function updateDayPlan(dayId: string, updater: (plan: StudyDayPlan) => StudyDayPlan) {
    setPlanDays((current) => current.map((item) => (item.id === dayId ? updater(item) : item)));
  }

  function toggleTask(dayId: string, taskId: string) {
    updateDayPlan(dayId, (plan) => ({
      ...plan,
      tasks: plan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));
  }

  function deleteTask(dayId: string, taskId: string) {
    updateDayPlan(dayId, (plan) => ({
      ...plan,
      tasks: plan.tasks.filter((task) => task.id !== taskId)
    }));
  }

  function addTask(dayId: string) {
    const taskId = `task_${Date.now()}`;
    updateDayPlan(dayId, (plan) => ({
      ...plan,
      tasks: [...plan.tasks, { id: taskId, text: "", completed: false }]
    }));
    setEditingTaskId(taskId);
    setEditingTaskText("");
  }

  function startEditingTask(task: PlanTask) {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  }

  function commitTaskEdit(dayId: string, taskId: string) {
    updateDayPlan(dayId, (plan) => ({
      ...plan,
      tasks: plan.tasks
        .map((task) =>
          task.id === taskId ? { ...task, text: editingTaskText.trim().slice(0, maxTaskLength) } : task
        )
        .filter((task) => task.text.trim().length > 0)
    }));
    setEditingTaskId(null);
    setEditingTaskText("");
  }

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-ink">
      <TopNav />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-[#f1f0f7]">
          <div className="mx-auto max-w-[1280px] px-6 py-9 lg:px-8 lg:py-11">
            <h1 className="text-4xl font-semibold tracking-tight text-ink">
              我的学习计划
              <span className="ml-3 text-3xl font-normal uppercase tracking-[0.04em] text-[#3d3d45]">
                Study Plan
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
              把差距分析转化为可执行的每日学习计划。
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-6 py-8 lg:px-8 lg:py-10">
          <section className="rounded-[24px] border border-line bg-white p-5 shadow-card">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Input Area</p>
            <div className="mt-3 grid gap-3 lg:grid-cols-[200px_236px_160px]">
              <InputField
                label="学习天数输入"
                value={studyDays}
                onChange={(value) => setStudyDays(clampInteger(Number(value), 1, 14))}
                min={1}
                max={14}
                step={1}
                suffix="天"
              />
              <InputField
                label="每天投入时间"
                value={hoursPerDay}
                onChange={(value) => setHoursPerDay(clampDecimal(Number(value), 0.5, 24))}
                min={0.5}
                max={24}
                step={0.5}
                suffix="小时 / 天"
              />
              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={!canGenerate || loading}
                className="mt-6 h-11 rounded-xl bg-[#1f3f73] px-5 text-sm font-medium text-white transition hover:bg-[#1a3560] disabled:cursor-not-allowed disabled:bg-[#a4aec0]"
              >
                {loading ? "生成中..." : "生成计划"}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-[#c24545]">{error}</p> : null}
          </section>

          <div className="grid items-start gap-5 xl:grid-cols-[1.78fr_1.22fr]">
            <div className="flex flex-col gap-5">
              <section className="rounded-[24px] border border-line bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-[28px] font-semibold leading-none text-ink">
                    {calendarMonth.getFullYear()} 年 {monthLabels[calendarMonth.getMonth()]}
                  </p>
                  <div className="flex items-center gap-3 text-lg text-[#8e8e8e]">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                      }
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[#f3f4f8] hover:text-ink"
                    >
                      ‹
                    </button>
                    <span className="text-xl font-medium text-ink">{monthLabels[calendarMonth.getMonth()]}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                      }
                      className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[#f3f4f8] hover:text-ink"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-2xl border border-[#e8edf5]">
                  {weekLabels.map((label) => (
                    <div
                      key={label}
                      className="border-b border-r border-[#eef2f7] bg-[#fafcff] px-2 py-2 text-center text-xs font-medium text-muted last:border-r-0"
                    >
                      {label}
                    </div>
                  ))}

                  {calendarCells.map((cell, index) => {
                    const linkedPlan = planDays.find((item) => item.dateKey === cell.dateKey);
                    const finishedCount = linkedPlan?.tasks.filter((task) => task.completed).length ?? 0;
                    const totalCount = linkedPlan?.tasks.length ?? 0;
                    const isSelected = linkedPlan?.dateKey === selectedDateKey;
                    const isToday = cell.dateKey === formatDateKey(today);

                    return (
                      <button
                        key={`${cell.dateKey}-${index}`}
                        type="button"
                        onClick={() => linkedPlan && handleSelectDate(linkedPlan.dateKey)}
                        className={`relative min-h-[86px] border-b border-r border-[#eef2f7] px-1.5 py-1.5 text-left transition last:border-r-0 ${
                          cell.isCurrentMonth ? "bg-white" : "bg-[#fbfbfb]"
                        } ${isSelected ? "ring-2 ring-[#6e9ef5] ring-inset" : ""}`}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                              isToday
                                ? "bg-[#e95555] font-semibold text-white"
                                : cell.isCurrentMonth
                                  ? "text-ink"
                                  : "text-[#b5b5b5]"
                            }`}
                          >
                            {cell.date.getDate()}
                          </span>
                        </div>

                        {linkedPlan ? (
                          <div className="mt-1.5 rounded-lg border border-[#dce7fa] bg-[#f8fbff] px-1.5 py-1.5">
                            <div className="mb-1 h-5 rounded-md bg-[#5d96e5] px-1.5 text-[10px] font-semibold leading-5 text-white">
                              {linkedPlan.dayNumber}
                            </div>
                            <div className="flex items-center justify-between whitespace-nowrap text-[9px] leading-none text-muted">
                              <span>已完成的任务:</span>
                              <span>{finishedCount}/{totalCount}</span>
                            </div>
                            <div className="mt-1 flex h-4 items-center">
                              {finishedCount === totalCount && totalCount > 0 ? (
                                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#96e600] text-[9px] font-bold text-white">
                                  ✓
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[24px] border border-line bg-white p-5 shadow-card">
                <h2 className="text-2xl font-semibold">计划建议</h2>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <article className="rounded-2xl bg-[#f6f7fb] p-4">
                    <h3 className="text-lg font-semibold text-ink">计划总目标</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{studyPlanResponse.summary}</p>
                    <ul className="mt-3 space-y-1 text-sm text-muted">
                      {studyPlanResponse.suggestions.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="rounded-2xl bg-[#f6f7fb] p-4">
                    <h3 className="text-lg font-semibold text-ink">学习节奏建议</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{studyPlanResponse.scheduleAdvice}</p>
                  </article>
                </div>
              </section>
            </div>

            <section className="rounded-[24px] border border-line bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[30px] font-semibold leading-none text-ink">每日学习计划</h2>
                  <p className="mt-1 text-sm uppercase tracking-[0.12em] text-muted">Daily Study Plan</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPlanPage((page) => Math.max(0, page - 1))}
                    disabled={currentPlanPage === 0}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-muted">
                    {currentPlanPage + 1}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPlanPage((page) => Math.min(totalPages - 1, page + 1))}
                    disabled={currentPlanPage >= totalPages - 1}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    下一页
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {visiblePlans.map((dayPlan) => {
                  const allDone = dayPlan.tasks.length > 0 && dayPlan.tasks.every((task) => task.completed);

                  return (
                    <article
                      key={dayPlan.id}
                      className={`rounded-2xl border bg-[#fcfdff] p-3 shadow-sm transition ${
                        selectedDateKey === dayPlan.dateKey ? "border-[#7ca9f4] shadow-card" : "border-[#e5e8ef]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="inline-flex rounded-md bg-[#213a6d] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                          Day {dayPlan.dayNumber}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                          {allDone ? (
                            <span className="grid h-4 w-4 place-items-center rounded-full bg-[#97e600] text-[10px] text-white">
                              ✓
                            </span>
                          ) : null}
                          <span>{formatHours(dayPlan.durationHours)}</span>
                        </div>
                      </div>

                      <div className="mt-3 max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
                        {dayPlan.tasks.map((task) => {
                          const editing = editingTaskId === task.id;

                          return (
                            <div
                              key={task.id}
                              className="group flex items-center gap-1.5 rounded-xl bg-white pl-1.5 pr-2 py-1.5 transition hover:bg-[#faf6e8]"
                            >
                              <button
                                type="button"
                                onClick={() => toggleTask(dayPlan.id, task.id)}
                                className={`grid h-4 w-4 flex-none place-items-center rounded-md border text-[10px] transition ${
                                  task.completed
                                    ? "border-[#f0cb54] bg-[#f0cb54] text-white"
                                    : "border-[#d5d8df] bg-transparent text-transparent"
                                }`}
                              >
                                ✓
                              </button>

                              {editing ? (
                                <input
                                  autoFocus
                                  value={editingTaskText}
                                  onChange={(event) => setEditingTaskText(event.target.value.slice(0, maxTaskLength))}
                                  onBlur={() => commitTaskEdit(dayPlan.id, task.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      commitTaskEdit(dayPlan.id, task.id);
                                    }
                                  }}
                                  placeholder="新建一条学习记录吧，不超过15字噢~"
                                  className="w-full flex-1 bg-transparent text-xs outline-none placeholder:text-[#b1b1b1]"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditingTask(task)}
                                  className={`min-w-0 flex-1 text-left text-xs leading-5 ${
                                    task.completed ? "text-[#b39b54] line-through" : "text-ink"
                                  }`}
                                >
                                  {task.text}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => deleteTask(dayPlan.id, task.id)}
                                className="ml-1 text-sm leading-none text-[#d84a4a] opacity-0 transition group-hover:opacity-100"
                                aria-label="删除任务"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => addTask(dayPlan.id)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-[#97e600] text-base font-semibold text-white transition hover:bg-[#87d000]"
                        >
                          +
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
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

function InputField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#555]">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-[#d8d8d8] bg-white px-4 pr-24 text-sm outline-none transition focus:border-[#b7bcc8]"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function mapResponseToPlanDays(dailyPlans: DailyPlanItem[]) {
  return dailyPlans.map((item, index) => {
    const date = addDays(today, index);
    return {
      id: `plan_day_${item.day}`,
      dayNumber: item.day,
      dateKey: formatDateKey(date),
      durationHours: item.hours,
      tasks: item.tasks.map((task, taskIndex) => ({
        id: `task_${item.day}_${taskIndex + 1}`,
        text: task.slice(0, maxTaskLength),
        completed: index === 0 && taskIndex < 1
      }))
    } satisfies StudyDayPlan;
  });
}

function buildCalendarCells(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      dateKey: formatDateKey(date),
      isCurrentMonth: date.getMonth() === month.getMonth()
    };
  });
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidStudyDays(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 14;
}

function isValidStudyHours(value: number) {
  return Number.isFinite(value) && value > 0;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampDecimal(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value * 10) / 10));
}

function formatHours(value: number) {
  return `${Math.max(0.5, Math.round(value * 10) / 10)} 小时`;
}
