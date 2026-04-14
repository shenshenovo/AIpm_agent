import type { DailyPlanItem, StudyPlanRequest, StudyPlanResponse } from "@/types/study-plan";

type CozeWorkflow3Env = {
  apiBaseUrl?: string;
  apiToken?: string;
  workflowId?: string;
};

type WorkflowInputPayload = {
  workflow2_result: string;
  study_days: number;
  daily_hours: number;
};

type CozeRequestMode = "input" | "parameters-object" | "parameters-json-string";

type CozeWorkflow3RequestBody = {
  workflow_id: string;
  input?: WorkflowInputPayload;
  parameters?: WorkflowInputPayload | string;
};

type CozeWorkflow3RawResponse = unknown;

const mockTaskTemplates = [
  ["梳理核心岗位要求", "阅读 3 份 AI PM JD", "整理能力差距", "输出学习笔记"],
  ["拆解竞品案例", "整理产品分析模板", "补齐指标理解", "复盘学习结果"],
  ["推进项目表达", "整理项目亮点", "模拟项目介绍", "记录复盘问题"],
  ["补齐 Agent 认知", "阅读工作流案例", "提炼产品化思路", "输出专题总结"],
  ["练习需求拆解", "完成原型复盘", "整理验证方法", "归档任务清单"],
  ["准备面试表达", "整理高频问题", "完成口述练习", "记录待加强点"],
  ["查漏补缺", "回顾本周重点", "修正文档表达", "确认下阶段目标"]
];

export async function generateStudyPlan(input: StudyPlanRequest): Promise<StudyPlanResponse> {
  const sanitizedInput = normalizeStudyPlanRequest(input);
  const env = getCozeWorkflow3Env();

  console.log("[study-plan-service] Coze env detected", {
    hasApiBaseUrl: Boolean(env.apiBaseUrl),
    hasApiToken: Boolean(env.apiToken),
    hasWorkflowId: Boolean(env.workflowId)
  });

  if (!hasConfiguredCozeWorkflow3(env)) {
    console.log("[study-plan-service] Missing Coze env, falling back to mock study plan.");
    return buildMockStudyPlan(sanitizedInput);
  }

  const rawResponse = await callCozeWorkflow3(sanitizedInput, env);
  return parseCozeWorkflow3Response(rawResponse);
}

export async function callCozeWorkflow3(
  input: StudyPlanRequest,
  env = getCozeWorkflow3Env()
): Promise<CozeWorkflow3RawResponse> {
  if (!hasConfiguredCozeWorkflow3(env)) {
    throw new Error(
      "Coze Workflow3 environment variables are incomplete. Please set COZE_API_BASE_URL, COZE_API_TOKEN, and COZE_WORKFLOW3_ID."
    );
  }

  console.log("[study-plan-service] Calling Coze Workflow3", {
    apiBaseUrl: env.apiBaseUrl,
    workflowId: env.workflowId,
    tokenPreview: maskToken(env.apiToken),
    study_days: input.study_days,
    daily_hours: input.daily_hours
  });

  const modes: CozeRequestMode[] = ["input", "parameters-object", "parameters-json-string"];
  let lastBusinessError: Error | null = null;

  for (const mode of modes) {
    const requestBody = buildCozeWorkflow3RequestBody(input, env.workflowId, mode);

    console.log("[study-plan-service] Trying Coze Workflow3 request mode", {
      mode,
      bodyPreview: previewUnknown(requestBody)
    });

    const result = await executeCozeWorkflow3Request({
      apiBaseUrl: env.apiBaseUrl,
      apiToken: env.apiToken,
      requestBody,
      mode
    });

    if (isMissingParametersError(result) && mode !== "parameters-json-string") {
      console.warn("[study-plan-service] Coze reported missing parameters, retrying next mode", {
        mode,
        code: result.code,
        msg: result.msg
      });
      lastBusinessError = new Error(buildCozeBusinessErrorMessage(result, mode));
      continue;
    }

    if (isCozeBusinessError(result)) {
      throw new Error(buildCozeBusinessErrorMessage(result, mode));
    }

    return result;
  }

  throw lastBusinessError ?? new Error("Coze Workflow3 request failed for all request body modes.");
}

function getCozeWorkflow3Env(): CozeWorkflow3Env {
  return {
    apiBaseUrl: process.env.COZE_API_BASE_URL,
    apiToken: process.env.COZE_API_TOKEN,
    workflowId: process.env.COZE_WORKFLOW3_ID
  };
}

function hasConfiguredCozeWorkflow3(env: CozeWorkflow3Env): env is Required<CozeWorkflow3Env> {
  return Boolean(env.apiBaseUrl && env.apiToken && env.workflowId);
}

function buildCozeWorkflow3RequestBody(
  input: StudyPlanRequest,
  workflowId: string | undefined,
  mode: CozeRequestMode
): CozeWorkflow3RequestBody {
  if (!workflowId) {
    throw new Error("COZE_WORKFLOW3_ID is missing.");
  }

  const payload: WorkflowInputPayload = {
    workflow2_result: input.workflow2_result,
    study_days: input.study_days,
    daily_hours: input.daily_hours
  };

  if (mode === "parameters-object") {
    return {
      workflow_id: workflowId,
      parameters: payload
    };
  }

  if (mode === "parameters-json-string") {
    return {
      workflow_id: workflowId,
      parameters: JSON.stringify(payload)
    };
  }

  return {
    workflow_id: workflowId,
    input: payload
  };
}

async function executeCozeWorkflow3Request({
  apiBaseUrl,
  apiToken,
  requestBody,
  mode
}: {
  apiBaseUrl: string;
  apiToken: string;
  requestBody: CozeWorkflow3RequestBody;
  mode: CozeRequestMode;
}): Promise<CozeWorkflow3RawResponse> {
  // TODO: replace with real Coze Workflow3 API call
  const response = await fetch(apiBaseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    console.error("[study-plan-service] Coze Workflow3 request failed", {
      mode,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: errorText.slice(0, 500)
    });
    throw new Error(
      `Coze Workflow3 request failed in mode ${mode} with status ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
  }

  const result = (await response.json()) as CozeWorkflow3RawResponse;

  console.log("[study-plan-service] Coze Workflow3 request succeeded", {
    mode,
    topLevelKeys: isRecord(result) ? Object.keys(result).slice(0, 20) : []
  });
  console.log("[study-plan-service] Coze Workflow3 full response", stringifyForLog(result));

  if (isRecord(result)) {
    console.log("[study-plan-service] Coze Workflow3 raw envelope", {
      mode,
      code: result.code,
      msg: result.msg,
      detailType: typeof result.detail,
      detailPreview: previewUnknown(result.detail)
    });
  }

  return result;
}

function parseCozeWorkflow3Response(rawResponse: CozeWorkflow3RawResponse): StudyPlanResponse {
  const payload = extractPayloadCandidate(rawResponse);
  const workflow3Result = readString(payload, ["workflow3_result"]);

  if (workflow3Result) {
    const parsedFromText = parseWorkflow3ResultText(workflow3Result);
    console.log("[study-plan-service] Parsed workflow3_result text", {
      hasSummary: Boolean(parsedFromText.summary),
      hasScheduleAdvice: Boolean(parsedFromText.scheduleAdvice),
      dailyPlanCount: parsedFromText.dailyPlans.length
    });
    return {
      ...parsedFromText,
      suggestions: []
    };
  }

  const summary = readString(payload, ["summary"]);
  const scheduleAdvice = readString(payload, ["scheduleAdvice", "schedule_advice"]);
  const dailyPlans = readDailyPlans(payload);

  console.log("[study-plan-service] Parsing Coze Workflow3 response", {
    payloadKeys: Object.keys(payload).slice(0, 20),
    hasSummary: Boolean(summary),
    hasScheduleAdvice: Boolean(scheduleAdvice),
    hasDailyPlans: Boolean(dailyPlans)
  });

  if (!summary) {
    throw new Error("Failed to parse Coze Workflow3 response: missing summary.");
  }

  if (!scheduleAdvice) {
    throw new Error("Failed to parse Coze Workflow3 response: missing scheduleAdvice.");
  }

  if (!dailyPlans) {
    throw new Error("Failed to parse Coze Workflow3 response: missing or invalid dailyPlans.");
  }

  return {
    summary,
    scheduleAdvice,
    dailyPlans,
    suggestions: []
  };
}

function extractPayloadCandidate(rawResponse: CozeWorkflow3RawResponse): Record<string, unknown> {
  if (!isRecord(rawResponse)) {
    throw new Error("Failed to parse Coze Workflow3 response: response is not an object.");
  }

  const directPayload = findStudyPlanPayload(rawResponse);
  if (directPayload) {
    return directPayload;
  }

  const nestedData = readNestedRecord(rawResponse, ["data"]);
  if (nestedData) {
    const nestedPayload = findStudyPlanPayload(nestedData);
    if (nestedPayload) {
      return nestedPayload;
    }
  }

  const detailPayload = extractFromDetail(rawResponse.detail);
  if (detailPayload) {
    return detailPayload;
  }

  throw new Error(
    "Failed to parse Coze Workflow3 response: could not locate summary, scheduleAdvice, dailyPlans, or workflow3_result."
  );
}

function findStudyPlanPayload(source: Record<string, unknown>): Record<string, unknown> | null {
  const candidates: Array<Record<string, unknown>> = [source];

  const nestedRecords = [
    readNestedRecord(source, ["data"]),
    readNestedRecord(source, ["output"]),
    readNestedRecord(source, ["outputs"]),
    readNestedRecord(source, ["detail"])
  ].filter(Boolean) as Array<Record<string, unknown>>;

  candidates.push(...nestedRecords);

  const stringCandidates: unknown[] = [
    source.data,
    source.output,
    source.outputs,
    source.result,
    source.detail
  ];

  for (const value of stringCandidates) {
    if (typeof value === "string") {
      const parsedObject = safeParseJsonObject(value);
      if (parsedObject) {
        candidates.push(parsedObject);
      }

      const parsedArray = safeParseJsonArray(value);
      if (parsedArray) {
        for (const item of parsedArray) {
          if (isRecord(item)) {
            candidates.push(item);
          }
        }
      }
    }
  }

  for (const candidate of candidates) {
    const normalizedCandidate = unwrapEmbeddedPayload(candidate);
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return null;
}

function extractFromDetail(detail: unknown): Record<string, unknown> | null {
  if (!detail) {
    return null;
  }

  if (isRecord(detail)) {
    return findStudyPlanPayload(detail);
  }

  if (typeof detail === "string") {
    const parsedObject = safeParseJsonObject(detail);
    if (parsedObject) {
      return findStudyPlanPayload(parsedObject);
    }
  }

  return null;
}

function unwrapEmbeddedPayload(source: Record<string, unknown>): Record<string, unknown> | null {
  if (looksLikeStudyPlanPayload(source)) {
    return source;
  }

  const nested = [
    readNestedRecord(source, ["data"]),
    readNestedRecord(source, ["output"]),
    readNestedRecord(source, ["outputs"]),
    readNestedRecord(source, ["detail"])
  ].filter(Boolean) as Array<Record<string, unknown>>;

  for (const item of nested) {
    if (looksLikeStudyPlanPayload(item)) {
      return item;
    }
  }

  for (const key of ["data", "output", "outputs", "result", "detail"]) {
    const value = source[key];
    if (typeof value === "string") {
      const parsed = safeParseJsonObject(value);
      if (parsed && looksLikeStudyPlanPayload(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function looksLikeStudyPlanPayload(source: Record<string, unknown>) {
  return Boolean(
    readString(source, ["workflow3_result"]) ||
      (readString(source, ["summary"]) &&
        readString(source, ["scheduleAdvice", "schedule_advice"]) &&
        readDailyPlans(source))
  );
}

function readDailyPlans(payload: Record<string, unknown>): DailyPlanItem[] | null {
  const rawDailyPlans = payload.dailyPlans ?? payload.daily_plans;

  if (!Array.isArray(rawDailyPlans)) {
    return null;
  }

  const dailyPlans = rawDailyPlans.map((item, index) => normalizeDailyPlanItem(item, index));
  return dailyPlans.every(Boolean) ? (dailyPlans as DailyPlanItem[]) : null;
}

function normalizeDailyPlanItem(item: unknown, index: number): DailyPlanItem | null {
  if (!isRecord(item)) {
    return null;
  }

  const day = readNumber(item, ["day"]) ?? index + 1;
  const hours = readNumber(item, ["hours", "daily_hours"]);
  const tasks = readTasks(item);

  if (!Number.isFinite(day) || hours === null || !Number.isFinite(hours) || !tasks) {
    return null;
  }

  return {
    day: Math.max(1, Math.round(day)),
    hours: Math.max(0.5, Math.round(hours * 10) / 10),
    tasks: tasks.map((task) => task.slice(0, 15))
  };
}

function readTasks(source: Record<string, unknown>): string[] | null {
  const directTasks = readStringArray(source, ["tasks"]);
  if (directTasks) {
    return directTasks;
  }

  const rawTasks = source.tasks;
  if (typeof rawTasks === "string") {
    const parsed = safeParseJsonArray(rawTasks);
    if (parsed && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  }

  return null;
}

function readString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readStringArray(source: Record<string, unknown>, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
  }
  return null;
}

function readNestedRecord(source: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = source[key];
    if (isRecord(value)) {
      return value;
    }
  }
  return null;
}

function safeParseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function safeParseJsonArray(value: string): unknown[] | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStudyPlanRequest(input: StudyPlanRequest): StudyPlanRequest {
  return {
    workflow2_result: input.workflow2_result.trim(),
    study_days: Math.max(1, Math.min(14, Math.round(input.study_days))),
    daily_hours: Math.max(0.5, Math.round(input.daily_hours * 10) / 10)
  };
}

function buildMockStudyPlan(input: StudyPlanRequest): StudyPlanResponse {
  const dailyPlans: DailyPlanItem[] = Array.from({ length: input.study_days }, (_, index) => {
    const template = mockTaskTemplates[index % mockTaskTemplates.length];
    const taskCount = Math.max(3, Math.min(5, Math.round(input.daily_hours + 1)));

    return {
      day: index + 1,
      hours: Math.max(0.5, Math.round((input.daily_hours + ((index % 3) - 1) * 0.2) * 10) / 10),
      tasks: template.slice(0, taskCount).map((item) => item.slice(0, 15))
    };
  });

  return {
    summary: `结合当前能力分析结果，在 ${input.study_days} 天内围绕核心技能补齐、项目推进和表达训练三条主线完成强化。`,
    scheduleAdvice: `建议每天投入约 ${input.daily_hours} 小时，优先完成 1 项主任务，再安排 1 项复盘或输出任务。`,
    dailyPlans,
    suggestions: []
  };
}

function parseWorkflow3ResultText(text: string): Omit<StudyPlanResponse, "suggestions"> {
  const summary =
    extractSection(text, "计划总目标", ["学习节奏建议", "每日学习计划", "阶段复盘提醒", "计划执行建议"]) ||
    "已生成学习计划，请根据下方每日计划执行。";
  const scheduleAdvice =
    extractSection(text, "学习节奏建议", ["每日学习计划", "阶段复盘提醒", "计划执行建议"]) ||
    "建议按计划逐日推进，并在执行后及时复盘。";
  const dailyPlanSection =
    extractSection(text, "每日学习计划", ["阶段复盘提醒", "计划执行建议"]) || "";
  const dailyPlans = parseDailyPlansFromText(dailyPlanSection);

  if (dailyPlans.length === 0) {
    throw new Error("Failed to parse Coze Workflow3 response: workflow3_result did not contain valid daily plans.");
  }

  return {
    summary: normalizeInlineText(summary),
    scheduleAdvice: normalizeInlineText(scheduleAdvice),
    dailyPlans
  };
}

function extractSection(text: string, sectionName: string, nextSectionNames: string[]) {
  const titlePattern = new RegExp(`【${escapeRegExp(sectionName)}】`);
  const titleMatch = text.match(titlePattern);

  if (!titleMatch || titleMatch.index === undefined) {
    return "";
  }

  const start = titleMatch.index + titleMatch[0].length;
  const rest = text.slice(start);

  let end = rest.length;
  for (const nextName of nextSectionNames) {
    const nextPattern = new RegExp(`【${escapeRegExp(nextName)}】`);
    const nextMatch = rest.match(nextPattern);
    if (nextMatch && nextMatch.index !== undefined) {
      end = Math.min(end, nextMatch.index);
    }
  }

  return rest.slice(0, end).trim();
}

function parseDailyPlansFromText(text: string): DailyPlanItem[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const dayPattern = /^###\s*Day\s*(\d+)\s*$/gim;
  const matches = Array.from(normalized.matchAll(dayPattern));

  return matches
    .map((match, index) => {
      const day = Number(match[1]);
      const start = match.index ?? 0;
      const contentStart = start + match[0].length;
      const end = index < matches.length - 1 ? matches[index + 1].index ?? normalized.length : normalized.length;
      const block = normalized.slice(contentStart, end).trim();

      const hours = parseHoursFromDayBlock(block);
      const tasks = parseTasksFromDayBlock(block);

      if (!Number.isFinite(day) || tasks.length === 0) {
        return null;
      }

      return {
        day,
        hours,
        tasks
      };
    })
    .filter((item): item is DailyPlanItem => Boolean(item));
}

function parseHoursFromDayBlock(block: string) {
  const match =
    block.match(/预计耗时[:：][^\d]*([0-9]+(?:\.[0-9]+)?)\s*h/i) ??
    block.match(/预计耗时[:：][^\d]*([0-9]+(?:\.[0-9]+)?)/);
  const parsed = match ? Number(match[1]) : 2;
  return Number.isFinite(parsed) ? Math.max(0.5, Math.round(parsed * 10) / 10) : 2;
}

function parseTasksFromDayBlock(block: string) {
  const taskSectionMatch = block.match(/今日任务[:：]\s*([\s\S]*?)(?:\n\s*\d+\.\s*预计耗时[:：]|\n\s*3\.\s*预计耗时[:：]|\n\s*4\.\s*每日产出物[:：]|$)/);
  const taskSection = taskSectionMatch ? taskSectionMatch[1] : block;

  const splitByOrderedMarks = taskSection
    .split(/(?=①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/)
    .map((item) => normalizeInlineText(item.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")))
    .filter(Boolean);

  if (splitByOrderedMarks.length > 1) {
    return splitByOrderedMarks.slice(0, 5).map((item) => item.slice(0, 15));
  }

  const bulletTasks = taskSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => normalizeInlineText(line.replace(/^-+\s*/, "")))
    .map((line) => line.slice(0, 15))
    .filter(Boolean);

  if (bulletTasks.length > 0) {
    return bulletTasks;
  }

  return taskSection
    .split("\n")
    .map((line) => normalizeInlineText(line))
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => line.slice(0, 15));
}

function normalizeInlineText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskToken(token: string) {
  if (token.length <= 8) {
    return "***";
  }
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

function previewUnknown(value: unknown) {
  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  if (Array.isArray(value) || isRecord(value)) {
    try {
      return JSON.stringify(value).slice(0, 500);
    } catch {
      return "[unserializable]";
    }
  }

  return String(value);
}

function stringifyForLog(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
}

function isCozeBusinessError(value: unknown): value is Record<string, unknown> & { code: number; msg: string } {
  return (
    isRecord(value) &&
    typeof value.code === "number" &&
    value.code !== 0 &&
    typeof value.msg === "string"
  );
}

function isMissingParametersError(
  value: unknown
): value is Record<string, unknown> & { code: number; msg: string } {
  return isCozeBusinessError(value) && value.code === 4000;
}

function buildCozeBusinessErrorMessage(
  value: Record<string, unknown> & { code: number; msg: string },
  mode: CozeRequestMode
) {
  const logId = extractLogId(value.detail);
  return `Coze Workflow3 business error in mode ${mode}: [${value.code}] ${value.msg}${logId ? ` (logid: ${logId})` : ""}`;
}

function extractLogId(detail: unknown) {
  if (isRecord(detail) && typeof detail.logid === "string") {
    return detail.logid;
  }
  return "";
}

async function safeReadText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}
