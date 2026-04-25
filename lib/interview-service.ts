import type {
  GenerateInterviewQuestionRequest,
  GenerateInterviewQuestionResponse,
  InterviewQuestion,
  PracticeMode,
  QuestionType,
  ReviewContent,
  ReviewInterviewAnswerRequest,
  ReviewInterviewAnswerResponse
} from "@/types/interview";

type CozeEnv = {
  apiBaseUrl?: string;
  apiToken?: string;
  workflow4Id?: string;
  workflow5Id?: string;
  workflow4TargetRoleDirectionKey: string;
  workflow4Workflow1ResultKey: string;
  workflow4Workflow2ResultKey: string;
  workflow4PracticeQuestionTypeKey: string;
  workflow4UserProjectsResultKey: string;
  workflow4FocusOnWeaknessKey: string;
  workflow4PracticeModeKey: string;
  workflow5CurrentQuestionKey: string;
  workflow5CurrentQuestionPointKey: string;
  workflow5QuestionTypeKey: string;
  workflow5UserAnswerKey: string;
  workflow5TargetRoleDirectionKey: string;
  workflow5Workflow2ResultKey: string;
};

type CozeMode = "input" | "parameters-object" | "parameters-json-string";

type CozeRequestBody = {
  workflow_id: string;
  input?: Record<string, unknown>;
  parameters?: Record<string, unknown> | string;
};

type CozeRawResponse = unknown;

const questionTypeLabelMap: Record<QuestionType, string> = {
  self_intro: "自我介绍题",
  project: "项目题",
  ai_product: "AI 产品题",
  requirement: "需求分析题",
  behavior: "行为题",
  random: "综合随机题"
};

const questionTypeThinkTimeMap: Record<QuestionType, string> = {
  self_intro: "1分钟",
  project: "2分钟",
  ai_product: "2分钟",
  requirement: "5分钟",
  behavior: "2分钟",
  random: "3分钟"
};

const localQuestionBank: Record<QuestionType, InterviewQuestion> = {
  self_intro: {
    title: "请你用 1 分钟做一个和目标岗位高度相关的自我介绍。",
    type: "self_intro",
    typeLabel: questionTypeLabelMap.self_intro,
    thinkTime: questionTypeThinkTimeMap.self_intro,
    focusPoints: ["求职方向", "核心经历", "岗位匹配"],
    questionPointsText: "求职方向；核心经历；岗位匹配"
  },
  project: {
    title: "挑一个最能体现你产品能力的项目，用 2 分钟讲清背景、动作、结果和复盘。",
    type: "project",
    typeLabel: questionTypeLabelMap.project,
    thinkTime: questionTypeThinkTimeMap.project,
    focusPoints: ["STAR 结构", "个人动作", "结果指标", "复盘"],
    questionPointsText: "STAR 结构；个人动作；结果指标；复盘"
  },
  ai_product: {
    title: "如果让你设计一个 AI/Agent 产品功能，你会如何定义场景、能力边界和验证方式？",
    type: "ai_product",
    typeLabel: questionTypeLabelMap.ai_product,
    thinkTime: questionTypeThinkTimeMap.ai_product,
    focusPoints: ["场景定义", "能力边界", "方案取舍", "验证指标"],
    questionPointsText: "场景定义；能力边界；方案取舍；验证指标"
  },
  requirement: {
    title: "给你一个 GUI Agent 的 JD 方向场景，你会怎么拆需求、定优先级并设计 MVP？",
    type: "requirement",
    typeLabel: questionTypeLabelMap.requirement,
    thinkTime: questionTypeThinkTimeMap.requirement,
    focusPoints: ["用户问题", "优先级", "MVP", "指标设计"],
    questionPointsText: "用户问题；优先级；MVP；指标设计"
  },
  behavior: {
    title: "讲一次你推动跨团队协作并最终把事情落地的经历。",
    type: "behavior",
    typeLabel: questionTypeLabelMap.behavior,
    thinkTime: questionTypeThinkTimeMap.behavior,
    focusPoints: ["协作难点", "推进动作", "结果证明"],
    questionPointsText: "协作难点；推进动作；结果证明"
  },
  random: {
    title: "如果面试官追问你和目标岗位最不匹配的一点，你会怎么回应？",
    type: "random",
    typeLabel: questionTypeLabelMap.random,
    thinkTime: questionTypeThinkTimeMap.random,
    focusPoints: ["短板回应", "补强动作", "迁移能力"],
    questionPointsText: "短板回应；补强动作；迁移能力"
  }
};

const localQuestionSampleAnswers: Record<string, string> = {
  self_intro:
    "我目前主要在准备 AI 产品经理方向，过去做过需求拆解、方案设计和项目推进相关工作。相比泛泛讲经历，我更想强调两点：一是我能把模糊问题拆成结构化方案，二是我会用案例证明自己如何推动结果落地。这也是我为什么认为自己和目标岗位有较强匹配度。",
  project:
    "这个项目的背景是用户在关键流程中流失较高，目标是提升转化率。我负责把问题拆成可执行方案，先做访谈和数据排查，再提出优化路径，并推动研发和设计一起落地。最终核心指标有明显改善。复盘下来，我最大的收获是学会了把用户问题、业务目标和项目推进节奏同时对齐。",
  ai_product:
    "如果让我设计一个 AI/Agent 功能，我会先明确真实使用场景和用户任务，再界定模型负责什么、规则或人工兜底负责什么。接着我会围绕效果、成本、稳定性做方案取舍，最后用任务成功率、完成时长和坏例率来验证方案是否有效。",
  requirement:
    "我会先确认用户是谁、他们在什么环节遇到问题，再拆解出核心需求和约束条件。然后按用户价值、实现成本和验证速度排优先级，先定义一个最小可行版本，最后补上关键指标和上线后的验证计划。",
  behavior:
    "那次项目里最大的难点不是方案本身，而是不同团队目标不一致。我先把核心目标和优先级对齐，再拆清每个角色的职责和时间点，过程中持续同步风险和进度。最终项目按期落地，也让我意识到沟通不是重复信息，而是降低协作摩擦。",
  random:
    "如果面试官追问我最不匹配的一点，我不会回避。我会先承认当前确实还有差距，再说明我已经做了哪些补强动作，并给出能够迁移的能力证据，让对方看到这不是硬伤，而是一个可被快速弥补的短板。"
};

export async function generateInterviewQuestion(
  input: GenerateInterviewQuestionRequest
): Promise<GenerateInterviewQuestionResponse> {
  const sanitizedInput = normalizeGenerateQuestionRequest(input);
  const env = getCozeEnv();

  if (!hasConfiguredWorkflow4(env)) {
    return {
      question: buildLocalInterviewQuestion(sanitizedInput),
      fallbackNotice: "Coze Flow4 未配置，已使用本地规则生成题目。"
    };
  }

  try {
    const rawResponse = await callCozeWorkflow({
      workflowId: env.workflow4Id,
      payload: buildWorkflow4Payload(sanitizedInput, env),
      env
    });

    return {
      question: parseInterviewQuestion(rawResponse, sanitizedInput)
    };
  } catch (error) {
    if (canUseLocalFallback(error)) {
      return {
        question: buildLocalInterviewQuestion(sanitizedInput),
        fallbackNotice: buildFallbackNotice("Flow4", error)
      };
    }

    throw error;
  }
}

export async function reviewInterviewAnswer(
  input: ReviewInterviewAnswerRequest
): Promise<ReviewInterviewAnswerResponse> {
  const sanitizedInput = normalizeReviewAnswerRequest(input);
  const env = getCozeEnv();

  if (!hasConfiguredWorkflow5(env)) {
    return {
      review: buildLocalReviewContent(sanitizedInput),
      fallbackNotice: "Coze Flow5 未配置，已使用本地规则生成点评。"
    };
  }

  try {
    const rawResponse = await callCozeWorkflow({
      workflowId: env.workflow5Id,
      payload: buildWorkflow5Payload(sanitizedInput, env),
      env
    });

    return {
      review: parseInterviewReview(rawResponse, sanitizedInput)
    };
  } catch (error) {
    if (canUseLocalFallback(error)) {
      return {
        review: buildLocalReviewContent(sanitizedInput),
        fallbackNotice: buildFallbackNotice("Flow5", error)
      };
    }

    throw error;
  }
}

async function callCozeWorkflow({
  workflowId,
  payload,
  env
}: {
  workflowId: string;
  payload: Record<string, unknown>;
  env: { apiBaseUrl: string; apiToken: string };
}): Promise<CozeRawResponse> {
  const modes: CozeMode[] = ["parameters-object", "parameters-json-string", "input"];
  let lastBusinessError: Error | null = null;

  for (const mode of modes) {
    const requestBody = buildCozeRequestBody(workflowId, payload, mode);
    const response = await fetch(env.apiBaseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(
        `Coze workflow request failed in mode ${mode} with status ${response.status}${errorText ? `: ${errorText}` : ""}`
      );
    }

    const result = (await response.json()) as CozeRawResponse;
    if (isMissingParametersError(result) && mode !== "parameters-json-string") {
      lastBusinessError = new Error(buildCozeBusinessErrorMessage(result, mode));
      continue;
    }

    if (isCozeBusinessError(result)) {
      throw new Error(buildCozeBusinessErrorMessage(result, mode));
    }

    return result;
  }

  throw lastBusinessError ?? new Error("Coze workflow request failed for all request body modes.");
}

function getCozeEnv(): CozeEnv {
  return {
    apiBaseUrl: process.env.COZE_API_BASE_URL,
    apiToken: process.env.COZE_API_TOKEN,
    workflow4Id: process.env.COZE_WORKFLOW4_ID,
    workflow5Id: process.env.COZE_WORKFLOW5_ID,
    workflow4TargetRoleDirectionKey:
      process.env.COZE_WORKFLOW4_TARGET_ROLE_DIRECTION_KEY || "targetroledirection",
    workflow4Workflow1ResultKey: process.env.COZE_WORKFLOW4_WORKFLOW1_RESULT_KEY || "workflow1_result",
    workflow4Workflow2ResultKey: process.env.COZE_WORKFLOW4_WORKFLOW2_RESULT_KEY || "workflow2_result",
    workflow4PracticeQuestionTypeKey:
      process.env.COZE_WORKFLOW4_PRACTICE_QUESTION_TYPE_KEY || "practicequestiontype",
    workflow4UserProjectsResultKey:
      process.env.COZE_WORKFLOW4_USER_PROJECTS_RESULT_KEY || "userprojectsresult",
    workflow4FocusOnWeaknessKey:
      process.env.COZE_WORKFLOW4_FOCUS_ON_WEAKNESS_KEY || "focus_on_weakness",
    workflow4PracticeModeKey: process.env.COZE_WORKFLOW4_PRACTICE_MODE_KEY || "practice_mode",
    workflow5CurrentQuestionKey: process.env.COZE_WORKFLOW5_CURRENT_QUESTION_KEY || "current_question",
    workflow5CurrentQuestionPointKey:
      process.env.COZE_WORKFLOW5_CURRENT_QUESTION_POINT_KEY || "currentquestionpoint",
    workflow5QuestionTypeKey: process.env.COZE_WORKFLOW5_QUESTION_TYPE_KEY || "question_type",
    workflow5UserAnswerKey: process.env.COZE_WORKFLOW5_USER_ANSWER_KEY || "user_answer",
    workflow5TargetRoleDirectionKey:
      process.env.COZE_WORKFLOW5_TARGET_ROLE_DIRECTION_KEY || "targetroledirection",
    workflow5Workflow2ResultKey: process.env.COZE_WORKFLOW5_WORKFLOW2_RESULT_KEY || "workflow2_result"
  };
}

function hasConfiguredWorkflow4(
  env: CozeEnv
): env is CozeEnv & { apiBaseUrl: string; apiToken: string; workflow4Id: string } {
  return Boolean(env.apiBaseUrl && env.apiToken && env.workflow4Id);
}

function hasConfiguredWorkflow5(
  env: CozeEnv
): env is CozeEnv & { apiBaseUrl: string; apiToken: string; workflow5Id: string } {
  return Boolean(env.apiBaseUrl && env.apiToken && env.workflow5Id);
}

function buildCozeRequestBody(workflowId: string, payload: Record<string, unknown>, mode: CozeMode): CozeRequestBody {
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

function buildWorkflow4Payload(
  input: GenerateInterviewQuestionRequest,
  env: CozeEnv & { workflow4Id: string }
) {
  return {
    [env.workflow4TargetRoleDirectionKey]: input.target_role_direction ?? "",
    [env.workflow4Workflow1ResultKey]: input.workflow1_result,
    [env.workflow4Workflow2ResultKey]: input.workflow2_result,
    [env.workflow4PracticeQuestionTypeKey]: input.question_type,
    [env.workflow4UserProjectsResultKey]: input.user_projects_result ?? "",
    [env.workflow4FocusOnWeaknessKey]: input.focus_on_weakness ?? input.practice_mode === "weakness",
    [env.workflow4PracticeModeKey]: input.practice_mode
  };
}

function buildWorkflow5Payload(input: ReviewInterviewAnswerRequest, env: CozeEnv & { workflow5Id: string }) {
  return {
    [env.workflow5CurrentQuestionKey]: input.current_question,
    [env.workflow5CurrentQuestionPointKey]: input.currentquestionpoint,
    [env.workflow5QuestionTypeKey]: input.question_type,
    [env.workflow5UserAnswerKey]: input.user_answer,
    [env.workflow5TargetRoleDirectionKey]: input.target_role_direction ?? "",
    [env.workflow5Workflow2ResultKey]: input.workflow2_result
  };
}

function parseInterviewQuestion(
  rawResponse: CozeRawResponse,
  input: GenerateInterviewQuestionRequest
): InterviewQuestion {
  const payload = extractPayloadCandidate(rawResponse);
  const directQuestion = normalizeInterviewQuestion(payload, input);
  if (directQuestion) {
    return directQuestion;
  }

  const textPayload = readString(payload, ["workflow4_result", "result", "output", "answer"]);
  if (textPayload) {
    const parsed = safeParseJsonObject(textPayload);
    if (parsed) {
      const parsedQuestion = normalizeInterviewQuestion(parsed, input);
      if (parsedQuestion) {
        return parsedQuestion;
      }
    }
  }

  throw new Error("Failed to parse Flow4 response.");
}

function parseInterviewReview(rawResponse: CozeRawResponse, input: ReviewInterviewAnswerRequest): ReviewContent {
  const payload = extractPayloadCandidate(rawResponse);
  const directReview = normalizeReviewContent(payload);
  if (directReview) {
    return directReview;
  }

  const textPayload = readString(payload, ["workflow5_result", "result", "output", "answer"]);
  if (textPayload) {
    const parsed = safeParseJsonObject(textPayload);
    if (parsed) {
      const parsedReview = normalizeReviewContent(parsed);
      if (parsedReview) {
        return parsedReview;
      }
    }
  }

  throw new Error(`Failed to parse Flow5 response for question type ${input.question_type}.`);
}

function normalizeInterviewQuestion(
  source: Record<string, unknown>,
  input: GenerateInterviewQuestionRequest
): InterviewQuestion | null {
  const localQuestion = buildLocalInterviewQuestion(input);
  const title = readString(source, ["current_question", "question", "title"])?.trim();
  if (!title) {
    return null;
  }

  const type = readString(source, ["question_type", "type"]) || input.question_type;
  const typeKey = isQuestionType(type) ? type : input.question_type;
  const focusPoints =
    readStringArray(source, ["focus_points", "focusPoints"]) ??
    splitPoints(readString(source, ["currentquestionpoint", "question_points", "question_point"]) ?? "");
  const questionPointsText =
    readString(source, ["currentquestionpoint", "question_points", "question_point"]) ??
    focusPoints.join("；");

  return {
    title,
    type,
    typeLabel:
      readString(source, ["question_type_label", "type_label"]) ??
      questionTypeLabelMap[typeKey] ??
      questionTypeLabelMap.project,
    thinkTime: readString(source, ["think_time", "thinkTime"]) ?? questionTypeThinkTimeMap[typeKey],
    focusPoints: focusPoints.length > 0 ? focusPoints : localQuestion.focusPoints,
    questionPointsText: questionPointsText || localQuestion.questionPointsText
  };
}

function normalizeReviewContent(source: Record<string, unknown>): ReviewContent | null {
  const sampleAnswer = readString(source, ["sampleAnswer", "sample_answer"]);
  if (!sampleAnswer) {
    return null;
  }

  return {
    strengths: readFlexibleStringArray(source, ["strengths"]),
    answerKeyPoints: readFlexibleStringArray(source, ["answerKeyPoints", "answer_key_points"]),
    answerFramework: readFlexibleStringArray(source, ["answerFramework", "answer_framework"]),
    misses: readFlexibleStringArray(source, ["misses"]),
    suggestions: readFlexibleStringArray(source, ["suggestions"]),
    sampleAnswer
  };
}

function buildLocalInterviewQuestion(input: GenerateInterviewQuestionRequest): InterviewQuestion {
  if (input.practice_mode === "weakness" || input.focus_on_weakness) {
    const weaknessFocus = inferWeaknessFocus(input.workflow2_result);
    return {
      title: weaknessFocus.title,
      type: weaknessFocus.type,
      typeLabel: questionTypeLabelMap[weaknessFocus.type],
      thinkTime: questionTypeThinkTimeMap[weaknessFocus.type],
      focusPoints: weaknessFocus.focusPoints,
      questionPointsText: weaknessFocus.focusPoints.join("；")
    };
  }

  return localQuestionBank[input.question_type];
}

function buildLocalReviewContent(input: ReviewInterviewAnswerRequest): ReviewContent {
  const answer = normalizeInlineText(input.user_answer);
  const shortAnswer = answer.length < 30;
  const focusPoints = splitPoints(input.currentquestionpoint);
  const framework = buildFrameworkByType(input.question_type);
  const strengths = shortAnswer
    ? []
    : [
        "回答没有完全跑题，基本围绕当前题目展开。",
        /我/.test(answer) ? "有一定的个人视角，不是纯粹描述团队动作。" : "回答语气比较自然，口语化表达还可以。"
      ];
  const misses = [
    !/\d/.test(answer) ? "缺少量化结果，面试官很难判断你的产出强度。" : "",
    !/我/.test(answer) ? "没有充分突出你自己的动作和责任边界。" : "",
    shortAnswer ? "回答过短，信息量不足，难以支撑岗位匹配判断。" : ""
  ].filter(Boolean);
  const suggestions = [
    "先给结论，再按 2 到 4 个重点展开，避免一上来铺背景。",
    "每个重点尽量补一个具体动作或结果，不要只说“负责了”“参与了”。",
    focusPoints.length > 0 ? `这道题重点要答到：${focusPoints.join("、")}。` : "把回答结构稳定成固定模板，面试时会更顺。"
  ];

  return {
    strengths,
    answerKeyPoints: focusPoints.length > 0 ? focusPoints : framework,
    answerFramework: framework,
    misses,
    suggestions,
    sampleAnswer: buildLocalSampleAnswer(input.question_type)
  };
}

function inferWeaknessFocus(workflow2Result: string) {
  const text = workflow2Result.toLowerCase();
  if (includesAny(text, ["数据", "sql", "指标", "归因", "分析"])) {
    return {
      type: "project" as QuestionType,
      title: "你提到自己有数据分析能力，那请讲一个你真正用数据拆指标、做归因并给出产品动作的案例。",
      focusPoints: ["指标拆解", "归因过程", "你的判断", "结果或下一步动作"]
    };
  }

  if (includesAny(text, ["ai", "agent", "prompt", "rag", "模型"])) {
    return {
      type: "ai_product" as QuestionType,
      title: "如果让你介绍一个最能体现你 AI/Agent 产品理解的案例，你会怎么讲清场景、边界和方案取舍？",
      focusPoints: ["场景问题", "能力边界", "方案取舍", "落地风险"]
    };
  }

  if (includesAny(text, ["项目", "star", "表达", "复盘", "协作"])) {
    return {
      type: "behavior" as QuestionType,
      title: "讲一个你推进复杂项目的经历，重点说你本人做了什么、怎么推进以及最后结果如何。",
      focusPoints: ["个人动作", "推进难点", "结果证明", "复盘"]
    };
  }

  return {
    type: "project" as QuestionType,
    title: "请讲一个最能证明你与目标岗位匹配的项目，重点说清你本人动作和结果。",
    focusPoints: ["岗位匹配", "个人动作", "结果证明", "复盘"]
  };
}

function buildFrameworkByType(questionType: string) {
  if (questionType === "project") {
    return ["背景", "目标", "动作", "结果", "复盘"];
  }

  if (questionType === "requirement") {
    return ["用户问题", "需求拆解", "优先级", "MVP", "验证指标"];
  }

  if (questionType === "behavior") {
    return ["场景", "冲突或难点", "你的推进动作", "结果"];
  }

  if (questionType === "ai_product") {
    return ["场景", "能力边界", "方案", "验证方式"];
  }

  return ["结论", "重点一", "重点二", "结果或总结"];
}

function buildLocalSampleAnswer(questionType: string) {
  return localQuestionSampleAnswers[questionType] ?? localQuestionSampleAnswers.project;
}

function normalizeGenerateQuestionRequest(input: GenerateInterviewQuestionRequest): GenerateInterviewQuestionRequest {
  return {
    practice_mode: input.practice_mode,
    question_type: input.question_type,
    workflow1_result: input.workflow1_result.trim(),
    workflow2_result: input.workflow2_result.trim(),
    target_role_direction: input.target_role_direction?.trim() ?? "",
    user_projects_result: input.user_projects_result?.trim() ?? "",
    focus_on_weakness: Boolean(input.focus_on_weakness),
    user_key: input.user_key?.trim() ?? ""
  };
}

function normalizeReviewAnswerRequest(input: ReviewInterviewAnswerRequest): ReviewInterviewAnswerRequest {
  return {
    current_question: input.current_question.trim(),
    currentquestionpoint: input.currentquestionpoint.trim(),
    question_type: input.question_type.trim(),
    user_answer: input.user_answer.trim(),
    target_role_direction: input.target_role_direction?.trim() ?? "",
    workflow2_result: input.workflow2_result.trim()
  };
}

function extractPayloadCandidate(rawResponse: CozeRawResponse): Record<string, unknown> {
  if (!isRecord(rawResponse)) {
    throw new Error("Coze response is not an object.");
  }

  const candidates: Array<Record<string, unknown>> = [rawResponse];
  for (const key of ["data", "output", "outputs", "detail"]) {
    const value = rawResponse[key];
    if (isRecord(value)) {
      candidates.push(value);
    }
    if (typeof value === "string") {
      const parsed = safeParseJsonObject(value);
      if (parsed) {
        candidates.push(parsed);
      }
    }
  }

  for (const candidate of candidates) {
    if (
      readString(candidate, ["current_question", "question", "title", "sampleAnswer", "sample_answer"]) ||
      readString(candidate, ["workflow4_result", "workflow5_result", "result", "output", "answer"])
    ) {
      return candidate;
    }
  }

  return candidates[0];
}

function splitPoints(value: string) {
  return value
    .split(/[；;、,，]/g)
    .map((item) => normalizeInlineText(item))
    .filter(Boolean)
    .slice(0, 6);
}

function readString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readStringArray(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value.map((item) => item.trim()).filter(Boolean);
    }
  }

  return null;
}

function readFlexibleStringArray(source: Record<string, unknown>, keys: string[]) {
  const directArray = readStringArray(source, keys);
  if (directArray) {
    return directArray;
  }

  const text = readString(source, keys);
  if (!text) {
    return [];
  }

  return text
    .split(/\n|[；;]/g)
    .map((item) => normalizeInlineText(item.replace(/^[-*•\d.\s]+/g, "")))
    .filter(Boolean);
}

function safeParseJsonObject(value: string) {
  const direct = tryParseObject(value);
  if (direct) {
    return direct;
  }

  const fencedMatch = value.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    const fenced = tryParseObject(fencedMatch[1]);
    if (fenced) {
      return fenced;
    }
  }

  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return tryParseObject(value.slice(firstBrace, lastBrace + 1));
  }

  return null;
}

function tryParseObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildFallbackNotice(flowName: string, error: unknown) {
  return `${flowName} 暂时不可用，已回退到本地规则。原始错误：${getErrorMessage(error).slice(0, 180)}`;
}

function canUseLocalFallback(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("[4028]") ||
    message.includes("[4000]") ||
    message.includes("quota") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
}

function buildCozeBusinessErrorMessage(
  value: Record<string, unknown> & { code: number; msg: string },
  mode: CozeMode
) {
  return `Coze business error in mode ${mode}: [${value.code}] ${value.msg}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeInlineText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function isQuestionType(value: string): value is QuestionType {
  return value in questionTypeLabelMap;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCozeBusinessError(value: unknown): value is Record<string, unknown> & { code: number; msg: string } {
  return isRecord(value) && typeof value.code === "number" && value.code !== 0 && typeof value.msg === "string";
}

function isMissingParametersError(value: unknown): value is Record<string, unknown> & { code: number; msg: string } {
  return isCozeBusinessError(value) && value.code === 4000;
}

async function safeReadText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}
