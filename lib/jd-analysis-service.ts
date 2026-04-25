import type {
  AnalysisResult,
  CandidateProfileSnapshot,
  GapAnalysis,
  GapItem,
  JDAnalysisRequest,
  JDAnalysisResponse
} from "@/types/jd-analysis";

type CozeWorkflowEnv = {
  apiBaseUrl?: string;
  apiToken?: string;
  workflow1Id?: string;
  workflow2Id?: string;
  workflow1JdTextKey: string;
  workflow1JobTypeKey: string;
  workflow1CompanyTypeKey: string;
  workflow2InputKey: string;
  workflow2TargetRoleDirectionKey: string;
  workflow2UserKeyKey: string;
  defaultUserKey: string;
};

type CozeRequestMode = "input" | "parameters-object" | "parameters-json-string";

type CozeRequestBody = {
  workflow_id: string;
  input?: Record<string, string>;
  parameters?: Record<string, string> | string;
};

type CozeRawResponse = unknown;

export async function analyzeJD(input: JDAnalysisRequest): Promise<JDAnalysisResponse> {
  const sanitizedInput = normalizeJDAnalysisRequest(input);
  const env = getCozeWorkflowEnv();

  if (!hasConfiguredCozeJDWorkflows(env)) {
    return buildLocalJDAnalysisResponse(
      sanitizedInput,
      "Coze JD analysis environment variables are incomplete, so a local fallback result was generated."
    );
  }

  const workflow1Payload = buildWorkflow1Payload(sanitizedInput, env);
  let workflow1RawResponse: CozeRawResponse;
  try {
    workflow1RawResponse = await callCozeWorkflow({
      workflowName: "Workflow1",
      workflowId: env.workflow1Id,
      payload: workflow1Payload,
      env
    });
  } catch (error) {
    if (canUseLocalFallback(error)) {
      return buildLocalJDAnalysisResponse(sanitizedInput, buildFallbackNotice("Workflow1", error));
    }
    throw error;
  }

  const workflow1Result = extractWorkflowText(workflow1RawResponse, [
    "workflow1_result",
    "jd_analysis_result",
    "result",
    "output",
    "answer"
  ]);
  const analysisResult = parseAnalysisResult(workflow1RawResponse, workflow1Result);

  let workflow2RawResponse: CozeRawResponse;
  try {
    workflow2RawResponse = await callCozeWorkflow({
      workflowName: "Workflow2",
      workflowId: env.workflow2Id,
      payload: {
        [env.workflow2InputKey]: workflow1Result,
        [env.workflow2TargetRoleDirectionKey]: sanitizedInput.job_type ?? "",
        [env.workflow2UserKeyKey]: sanitizedInput.user_key || env.defaultUserKey
      },
      env
    });
  } catch (error) {
    if (canUseLocalFallback(error)) {
      const gapAnalysis = reconcileGapAnalysisWithCandidate(
        buildLocalGapAnalysis(analysisResult, sanitizedInput),
        sanitizedInput.candidate_profile
      );
      return {
        analysisResult,
        gapAnalysis,
        workflow1_result: workflow1Result,
        workflow2_result: stringifyForDisplay(gapAnalysis),
        fallbackNotice: buildFallbackNotice("Workflow2", error)
      };
    }
    throw error;
  }

  const workflow2Result = extractWorkflowText(workflow2RawResponse, [
    "workflow2_result",
    "gap_analysis_result",
    "result",
    "output",
    "answer"
  ]);
  const gapAnalysis = reconcileGapAnalysisWithCandidate(
    parseGapAnalysis(workflow2RawResponse, workflow2Result),
    sanitizedInput.candidate_profile
  );

  return {
    analysisResult,
    gapAnalysis,
    workflow1_result: workflow1Result,
    workflow2_result: workflow2Result
  };
}

async function callCozeWorkflow({
  workflowName,
  workflowId,
  payload,
  env
}: {
  workflowName: string;
  workflowId: string;
  payload: Record<string, string>;
  env: RequiredCozeWorkflowEnv;
}): Promise<CozeRawResponse> {
  const modes: CozeRequestMode[] = ["parameters-object", "parameters-json-string", "input"];
  let lastBusinessError: Error | null = null;
  const attemptedModes: CozeRequestMode[] = [];

  for (const mode of modes) {
    attemptedModes.push(mode);
    const requestBody = buildCozeRequestBody(workflowId, payload, mode);
    const result = await executeCozeRequest({
      workflowName,
      apiBaseUrl: env.apiBaseUrl,
      apiToken: env.apiToken,
      requestBody,
      mode
    });

    if (isMissingParametersError(result) && mode !== "parameters-json-string") {
      lastBusinessError = new Error(buildCozeBusinessErrorMessage(workflowName, result, mode));
      continue;
    }

    if (isCozeBusinessError(result)) {
      throw new Error(buildCozeBusinessErrorMessage(workflowName, result, mode, payload));
    }

    return result;
  }

  const payloadKeys = Object.keys(payload).join(", ");
  throw new Error(
    `${lastBusinessError?.message ?? `${workflowName} request failed for all request body modes.`} Payload keys sent to ${workflowName}: [${payloadKeys}]. Payload value lengths: ${formatPayloadValueLengths(payload)}. Modes tried: ${attemptedModes.join(", ")}. Please make sure these keys exactly match the Coze workflow start node input variable names.`
  );
}

function getCozeWorkflowEnv(): CozeWorkflowEnv {
  return {
    apiBaseUrl: process.env.COZE_API_BASE_URL,
    apiToken: process.env.COZE_API_TOKEN,
    workflow1Id: process.env.COZE_WORKFLOW1_ID,
    workflow2Id: process.env.COZE_WORKFLOW2_ID,
    workflow1JdTextKey: process.env.COZE_WORKFLOW1_JD_TEXT_KEY || "jd_text",
    workflow1JobTypeKey: process.env.COZE_WORKFLOW1_JOB_TYPE_KEY || "job_type",
    workflow1CompanyTypeKey: process.env.COZE_WORKFLOW1_COMPANY_TYPE_KEY || "company_type",
    workflow2InputKey: process.env.COZE_WORKFLOW2_INPUT_KEY || "workflow1_result",
    workflow2TargetRoleDirectionKey:
      process.env.COZE_WORKFLOW2_TARGET_ROLE_DIRECTION_KEY || "targetroledirection",
    workflow2UserKeyKey: process.env.COZE_WORKFLOW2_USER_KEY_KEY || "user_key",
    defaultUserKey: process.env.DEFAULT_USER_KEY || "default_user"
  };
}

type RequiredCozeWorkflowEnv = Required<CozeWorkflowEnv>;

function hasConfiguredCozeJDWorkflows(env: CozeWorkflowEnv): env is RequiredCozeWorkflowEnv {
  return Boolean(env.apiBaseUrl && env.apiToken && env.workflow1Id && env.workflow2Id);
}

function buildWorkflow1Payload(input: JDAnalysisRequest, env: RequiredCozeWorkflowEnv) {
  const payload: Record<string, string> = {
    [env.workflow1JdTextKey]: input.jd_text,
    [env.workflow1JobTypeKey]: input.job_type ?? ""
  };

  if (input.company_type) {
    payload[env.workflow1CompanyTypeKey] = input.company_type;
  }

  return payload;
}

function buildLocalJDAnalysisResponse(input: JDAnalysisRequest, fallbackNotice: string): JDAnalysisResponse {
  const analysisResult = buildLocalAnalysisResult(input);
  const gapAnalysis = reconcileGapAnalysisWithCandidate(
    buildLocalGapAnalysis(analysisResult, input),
    input.candidate_profile
  );

  return {
    analysisResult,
    gapAnalysis,
    workflow1_result: stringifyForDisplay(analysisResult),
    workflow2_result: stringifyForDisplay(gapAnalysis),
    fallbackNotice
  };
}

const localAbilityCatalog: Record<string, AnalysisResult["abilityCategories"][number]> = {
  product: {
    title: "产品基础能力",
    description: "需求理解、用户场景拆解、竞品分析、PRD/原型表达和产品判断。",
    tags: ["需求分析", "产品判断", "PRD"]
  },
  ai: {
    title: "AI 产品能力",
    description: "AI/Agent/LLM 场景理解、Prompt 设计、模型能力边界和产品化落地表达。",
    tags: ["AI 产品", "Agent", "Prompt"]
  },
  data: {
    title: "数据分析能力",
    description: "指标拆解、SQL/Excel 基础分析、badcase 归因和基于数据的决策表达。",
    tags: ["指标拆解", "SQL", "归因分析"]
  },
  project: {
    title: "项目推进与表达",
    description: "跨团队协作、任务推进、项目复盘、STAR 表达和结果证明。",
    tags: ["项目推进", "STAR", "复盘"]
  },
  research: {
    title: "行业与用户研究",
    description: "目标用户理解、市场/行业认知、竞品洞察和业务模式分析。",
    tags: ["用户研究", "行业认知", "竞品洞察"]
  },
  qualification: {
    title: "基础资质匹配",
    description: "学历、专业、实习周期、到岗时间、语言或工具等硬性筛选条件。",
    tags: ["学历专业", "实习周期", "工具基础"]
  }
};

function buildLocalAnalysisResult(input: JDAnalysisRequest): AnalysisResult {
  const jdText = input.jd_text;
  const lowerText = jdText.toLowerCase();
  const tags = new Set<string>();
  const explicitRequirements: string[] = [];
  const implicitRequirements: string[] = [];
  const abilityKeys = new Set<keyof typeof localAbilityCatalog>();
  const coreAbilities: string[] = [];

  if (includesAny(lowerText, ["ai", "agent", "llm", "rag", "prompt"]) || includesAny(jdText, ["智能体", "大模型", "模型", "算法"])) {
    tags.add("AI 产品");
    abilityKeys.add("ai");
    explicitRequirements.push("需要理解 AI/Agent 类产品的核心概念、典型场景、能力边界和落地流程。");
    implicitRequirements.push("面试中大概率会追问你对 AI 产品价值、失败边界、Prompt/工具调用/RAG 等模块的理解。");
    coreAbilities.push("AI 产品理解");
  }

  if (includesAny(lowerText, ["sql", "excel", "data"]) || includesAny(jdText, ["数据", "指标", "归因", "分析", "评测", "badcase"])) {
    tags.add("数据分析");
    abilityKeys.add("data");
    explicitRequirements.push("需要具备指标拆解、基础数据分析、结果归因或评测分析能力。");
    implicitRequirements.push("岗位不只要求会看数据，还要求能把指标变化和产品/业务动作连接起来。");
    coreAbilities.push("数据分析与指标拆解");
  }

  if (includesAny(lowerText, ["prd", "prototype"]) || includesAny(jdText, ["需求", "用户", "竞品", "原型", "方案", "文档", "产品设计"])) {
    tags.add("产品基础");
    abilityKeys.add("product");
    explicitRequirements.push("需要具备需求分析、用户场景拆解、竞品分析、方案设计或 PRD 表达能力。");
    implicitRequirements.push("岗位会看重你能否从业务目标和用户问题出发，而不是只完成文档产出。");
    coreAbilities.push("产品基础能力");
  }

  if (includesAny(jdText, ["项目", "推动", "推进", "落地", "协作", "沟通", "跨团队", "复盘", "执行"])) {
    tags.add("项目推进");
    abilityKeys.add("project");
    explicitRequirements.push("需要能拆解任务、推进协作、同步风险，并沉淀可复盘的项目结果。");
    implicitRequirements.push("面试会关注你在项目中的真实职责、个人贡献、协作难点和结果证明。");
    coreAbilities.push("项目推进与结构化表达");
  }

  if (includesAny(jdText, ["行业", "市场", "用户研究", "调研", "竞品", "商业", "游戏", "电商", "教育", "金融"])) {
    tags.add("行业认知");
    abilityKeys.add("research");
    explicitRequirements.push("需要对目标行业、用户特征、竞品格局或业务模式有基本理解。");
    implicitRequirements.push("只复述 JD 不够，需要能结合行业案例说出自己的判断。");
    coreAbilities.push("行业与用户研究");
  }

  if (includesAny(jdText, ["本科", "硕士", "专业", "计算机", "实习", "到岗", "每周", "英语", "学历"])) {
    tags.add("基础资质");
    abilityKeys.add("qualification");
    explicitRequirements.push("需要满足学历、专业背景、实习周期、到岗时间或工具/语言等硬性条件。");
    implicitRequirements.push("这些条件会先影响简历筛选，需要在简历或自我介绍中直接给出证明。");
    coreAbilities.push("基础资质证明");
  }

  if (explicitRequirements.length === 0) {
    tags.add("产品岗位");
    abilityKeys.add("product");
    abilityKeys.add("project");
    explicitRequirements.push("需要具备基础产品能力，包括需求理解、方案设计、用户视角和文档表达。");
    explicitRequirements.push("需要具备项目表达和沟通协作能力，能说明自己如何推进问题解决。");
    implicitRequirements.push("岗位默认你能快速理解业务，并把零散经历转化成结构化面试表达。");
    coreAbilities.push("产品基础能力", "项目推进与结构化表达");
  }

  if (input.job_type) {
    tags.add(input.job_type);
  }
  if (input.company_type) {
    tags.add(input.company_type);
  }

  return {
    rolePositioning: {
      title: inferLocalRoleTitle(input, lowerText),
      description: "本地规则已根据 JD 关键词抽取岗位定位、显性要求、隐性要求和高优先级能力。由于缺少候选人的完整履历，差距项会偏向“需要准备或补证据”的方向。",
      tags: Array.from(tags).slice(0, 8)
    },
    explicitRequirements: uniqueStrings(explicitRequirements).slice(0, 8),
    implicitRequirements: uniqueStrings(implicitRequirements).slice(0, 8),
    abilityCategories: Array.from(abilityKeys).map((key) => localAbilityCatalog[key]),
    coreAbilities: uniqueStrings(coreAbilities).slice(0, 6)
  };
}

function buildLocalGapAnalysis(result: AnalysisResult, input: JDAnalysisRequest): GapAnalysis {
  const items: GapItem[] = [];
  const coreText = result.coreAbilities.join(" ");
  const categoryText = result.abilityCategories.map((item) => `${item.title} ${item.description}`).join(" ");

  if (/AI|Agent|Prompt|大模型|模型/i.test(coreText + categoryText)) {
    items.push({
      name: "AI 产品理解与案例表达",
      currentState: "当前输入只提供了 JD，暂未看到你能证明 AI/Agent 产品理解的项目或案例。",
      targetState: "准备 1-2 个 AI 产品案例，讲清场景、用户问题、模型/Agent 能力边界、产品方案和落地风险。",
      priority: "高优先级"
    });
  }

  if (/产品|需求|PRD|竞品|用户/.test(coreText + categoryText)) {
    items.push({
      name: "产品基础方法论",
      currentState: "暂未看到完整的需求分析、用户场景拆解、竞品分析或 PRD 产出证明。",
      targetState: "围绕 JD 中的目标场景补一份结构化作品，至少覆盖用户问题、需求优先级、方案设计和验证指标。",
      priority: "高优先级"
    });
  }

  if (/数据|指标|SQL|归因|评测/i.test(coreText + categoryText)) {
    items.push({
      name: "数据分析与指标拆解",
      currentState: "暂未看到你能把指标、业务动作和产品判断串起来的证据。",
      targetState: "准备一个指标拆解案例，说明北极星指标、过程指标、异常归因、结论和下一步动作。",
      priority: "高优先级"
    });
  }

  if (/项目|推进|表达|协作|复盘/.test(coreText + categoryText)) {
    items.push({
      name: "项目经历结构化表达",
      currentState: "暂未看到可直接用于面试展开的 STAR 项目故事。",
      targetState: "把 1-2 个经历整理成 STAR 结构，明确背景、目标、个人动作、协作难点、结果指标和复盘收获。",
      priority: "中优先级"
    });
  }

  if (/行业|用户研究|市场|竞品|业务/.test(coreText + categoryText)) {
    items.push({
      name: "行业与用户认知",
      currentState: "暂未看到你对目标行业、用户群体和竞品格局的独立判断。",
      targetState: "补齐目标行业的 3 个代表产品、核心用户、业务模式和岗位关注点，并形成可面试表达的观点。",
      priority: "中优先级"
    });
  }

  if (/资质|学历|专业|实习|到岗/.test(coreText + categoryText + input.jd_text)) {
    items.push({
      name: "基础资质证明",
      currentState: "暂未看到学历、专业、实习周期、到岗时间等硬性条件的明确证明。",
      targetState: "在简历和自我介绍中直接呈现学历专业、可实习时长、到岗时间、工具基础等筛选信息。",
      priority: "高优先级"
    });
  }

  const normalizedItems = dedupeGapItems(items.length > 0 ? items : [
    {
      name: "岗位匹配表达",
      currentState: "当前材料尚未把个人经历和 JD 要求建立清晰映射。",
      targetState: "把 JD 要求拆成 3-5 个能力点，并为每个能力点准备一个可验证的经历或作品证据。",
      priority: "中优先级"
    }
  ]);

  return {
    conclusion: "当前最需要补的是 JD 高优先级要求对应的证明材料，而不只是泛泛学习概念。",
    overview: "由于 Coze 暂时不可用，本结果由本地规则兜底生成。它会优先把 JD 要求转成可准备、可证明、可面试表达的差距项。",
    items: normalizedItems
  };
}

type AbilityBucket = "ai" | "data" | "product" | "project" | "research" | "qualification";

const abilityKeywordMap: Record<AbilityBucket, string[]> = {
  ai: ["ai", "agent", "llm", "rag", "prompt", "模型", "大模型", "智能体", "gui agent"],
  data: ["数据", "数据分析", "sql", "excel", "指标", "归因", "评测", "badcase"],
  product: ["产品", "需求", "prd", "原型", "竞品", "用户", "方案"],
  project: ["项目", "star", "推进", "协作", "沟通", "复盘", "落地"],
  research: ["行业", "市场", "用户研究", "调研", "业务"],
  qualification: ["学历", "专业", "实习", "到岗", "英语", "资质"]
};

const abilityLabelMap: Record<AbilityBucket, string> = {
  ai: "AI 产品能力",
  data: "数据分析能力",
  product: "产品基础能力",
  project: "项目推进与表达能力",
  research: "行业与用户认知",
  qualification: "基础资质"
};

function reconcileGapAnalysisWithCandidate(
  gapAnalysis: GapAnalysis,
  candidateProfile?: CandidateProfileSnapshot
): GapAnalysis {
  const snapshot = normalizeCandidateProfile(candidateProfile);
  if (!snapshot) {
    return gapAnalysis;
  }

  let hasAdjustedItem = false;
  const nextItems = gapAnalysis.items.map((item) => {
    const buckets = detectAbilityBuckets(`${item.name} ${item.currentState} ${item.targetState}`);
    if (buckets.length === 0) {
      return item;
    }

    const matchedBuckets = buckets.filter((bucket) => hasCandidateEvidence(snapshot, bucket));
    if (matchedBuckets.length === 0) {
      return item;
    }

    hasAdjustedItem = true;
    const hasWeakness = matchedBuckets.some((bucket) => hasCandidateWeakness(snapshot, bucket));

    return {
      ...item,
      currentState: buildMatchedCurrentState(matchedBuckets, hasWeakness),
      targetState: buildMatchedTargetState(matchedBuckets[0], hasWeakness, item.targetState),
      priority: hasWeakness ? item.priority : downgradeGapPriority(item.priority)
    };
  });

  if (!hasAdjustedItem) {
    return gapAnalysis;
  }

  return {
    ...gapAnalysis,
    conclusion: "差距分析已结合能力档案校正，已具备的能力不会再按“从零缺失”处理。",
    overview: appendProfileAdjustmentNote(gapAnalysis.overview),
    items: dedupeGapItems(nextItems)
  };
}

function normalizeCandidateProfile(candidateProfile?: CandidateProfileSnapshot): CandidateProfileSnapshot | null {
  if (!candidateProfile || !candidateProfile.user_key.trim()) {
    return null;
  }

  return {
    user_key: candidateProfile.user_key.trim(),
    profile: candidateProfile.profile ?? null,
    skills: Array.isArray(candidateProfile.skills) ? candidateProfile.skills : [],
    projects: Array.isArray(candidateProfile.projects) ? candidateProfile.projects : [],
    weakness_tags: Array.isArray(candidateProfile.weakness_tags) ? candidateProfile.weakness_tags : []
  };
}

function detectAbilityBuckets(text: string): AbilityBucket[] {
  return (Object.keys(abilityKeywordMap) as AbilityBucket[]).filter((bucket) =>
    matchesAnyAbilityKeyword(text, abilityKeywordMap[bucket])
  );
}

function hasCandidateEvidence(candidateProfile: CandidateProfileSnapshot, bucket: AbilityBucket) {
  const evidenceTexts = [
    ...candidateProfile.skills
      .filter((skill) => !skill.need_strengthen)
      .map((skill) => `${skill.skill_name} ${skill.proficiency_desc} ${skill.proficiency_level}`),
    ...candidateProfile.projects.map((project) => `${project.project_name} ${project.tags.join(" ")} ${project.project_status}`)
  ];

  return evidenceTexts.some((text) => matchesAnyAbilityKeyword(text, abilityKeywordMap[bucket]));
}

function hasCandidateWeakness(candidateProfile: CandidateProfileSnapshot, bucket: AbilityBucket) {
  const weaknessTexts = [
    ...candidateProfile.skills
      .filter((skill) => skill.need_strengthen)
      .map((skill) => `${skill.skill_name} ${skill.proficiency_desc}`),
    ...candidateProfile.weakness_tags.map((tag) => tag.tag_name)
  ];

  return weaknessTexts.some((text) => matchesAnyAbilityKeyword(text, abilityKeywordMap[bucket]));
}

function matchesAnyAbilityKeyword(text: string, keywords: string[]) {
  const normalizedText = normalizeAbilityMatchText(text);
  return keywords.some((keyword) => normalizedText.includes(normalizeAbilityMatchText(keyword)));
}

function normalizeAbilityMatchText(text: string) {
  return text.toLowerCase().replace(/[\s/_,.;:|()[\]{}\-+，。；：、【】（）]+/g, "");
}

function buildMatchedCurrentState(buckets: AbilityBucket[], hasWeakness: boolean) {
  const labels = uniqueStrings(buckets.map((bucket) => abilityLabelMap[bucket])).join("、");
  if (hasWeakness) {
    return `能力档案显示你已有${labels}基础，但当前仍被标记为待加强，差距更偏向深度补强，不是从零开始。`;
  }

  return `能力档案显示你已具备${labels}基础，当前差距更偏向案例证据、场景深度或面试表达，而不是“不会这项能力”。`;
}

function buildMatchedTargetState(bucket: AbilityBucket, hasWeakness: boolean, fallbackTargetState: string) {
  if (hasWeakness) {
    return fallbackTargetState;
  }

  if (bucket === "data") {
    return "补一个可验证的数据分析案例，讲清指标拆解、归因过程、结论和对应的产品动作，证明这项能力能稳定用于目标岗位。";
  }

  if (bucket === "ai") {
    return "补一个 AI/Agent 场景案例，讲清问题定义、能力边界、方案取舍和落地风险，证明不是只停留在概念层。";
  }

  if (bucket === "product") {
    return "补一份结构化产品作品或案例，把需求拆解、方案设计、优先级判断和验证指标讲完整。";
  }

  if (bucket === "project") {
    return "把已有项目整理成 STAR，突出你的个人动作、协作推进、结果指标和复盘，让已有能力被面试官直接看见。";
  }

  if (bucket === "research") {
    return "把行业、用户和竞品认知整理成可表达观点，并结合一个真实案例说明你的判断过程。";
  }

  return fallbackTargetState;
}

function downgradeGapPriority(priority: string) {
  if (priority.includes("高")) {
    return "中优先级";
  }

  return priority;
}

function appendProfileAdjustmentNote(overview: string) {
  const note = "已按能力档案中的技能、项目和短板标签对结果做校正。";
  return overview.includes(note) ? overview : `${overview}${overview ? " " : ""}${note}`;
}

function inferLocalRoleTitle(input: JDAnalysisRequest, lowerText: string) {
  const normalizedJobType = normalizeInlineText(input.job_type ?? "");
  if (normalizedJobType) {
    return normalizedJobType;
  }

  if (includesAny(lowerText, ["ai", "agent", "llm", "prompt"])) {
    return "AI 产品经理 / AI 产品实习";
  }

  return "产品经理 / 产品实习";
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeInlineText(value)).filter(Boolean)));
}

function canUseLocalFallback(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("[4028]") ||
    message.includes("insufficient coze credits") ||
    message.includes("credits balance") ||
    message.includes("quota refresh") ||
    message.includes("quota") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
}

function buildFallbackNotice(workflowName: string, error: unknown) {
  const message = getErrorMessage(error).replace(/\s+/g, " ").slice(0, 220);
  return `${workflowName} 暂时不可用，已使用本地规则生成 JD 分析和差距项。原始错误：${message}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildCozeRequestBody(
  workflowId: string,
  payload: Record<string, string>,
  mode: CozeRequestMode
): CozeRequestBody {
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

async function executeCozeRequest({
  workflowName,
  apiBaseUrl,
  apiToken,
  requestBody,
  mode
}: {
  workflowName: string;
  apiBaseUrl: string;
  apiToken: string;
  requestBody: CozeRequestBody;
  mode: CozeRequestMode;
}): Promise<CozeRawResponse> {
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
    throw new Error(
      `${workflowName} request failed in mode ${mode} with status ${response.status}${errorText ? `: ${errorText}` : ""}`
    );
  }

  return (await response.json()) as CozeRawResponse;
}

function parseAnalysisResult(rawResponse: CozeRawResponse, workflowText: string): AnalysisResult {
  const payload = extractPayloadCandidate(rawResponse);
  const embeddedJson = parseFirstJsonText(payload);

  return (
    readAnalysisResult(payload) ??
    (embeddedJson ? readAnalysisResult(embeddedJson) ?? normalizeAnalysisResult(embeddedJson) : null) ??
    buildAnalysisResultFromWorkflowText(workflowText)
  );
}

function parseGapAnalysis(rawResponse: CozeRawResponse, workflowText: string): GapAnalysis {
  const payload = extractPayloadCandidate(rawResponse);
  const embeddedJson = parseFirstJsonText(payload);

  return (
    readGapAnalysis(payload) ??
    (embeddedJson ? readGapAnalysis(embeddedJson) ?? normalizeGapAnalysis(embeddedJson) : null) ??
    buildGapAnalysisFromWorkflowText(workflowText)
  );
}

function extractWorkflowText(rawResponse: CozeRawResponse, preferredKeys: string[]): string {
  const payload = extractPayloadCandidate(rawResponse);
  const text = readString(payload, preferredKeys);
  if (text) {
    return text;
  }

  const embeddedJson = parseFirstJsonText(payload);
  if (embeddedJson) {
    const embeddedText = readString(embeddedJson, preferredKeys);
    if (embeddedText) {
      return embeddedText;
    }
  }

  return stringifyForDisplay(payload);
}

function extractPayloadCandidate(rawResponse: CozeRawResponse): Record<string, unknown> {
  if (!isRecord(rawResponse)) {
    throw new Error("Failed to parse Coze response: response is not an object.");
  }

  const candidates: Array<Record<string, unknown>> = [rawResponse];
  for (const key of ["data", "output", "outputs", "detail"]) {
    const nested = rawResponse[key];
    if (isRecord(nested)) {
      candidates.push(nested);
    }
    if (typeof nested === "string") {
      const parsed = safeParseJsonObject(nested);
      if (parsed) {
        candidates.push(parsed);
      }
    }
  }

  for (const candidate of candidates) {
    if (
      readAnalysisResult(candidate) ||
      readGapAnalysis(candidate) ||
      readString(candidate, [
        "workflow1_result",
        "workflow2_result",
        "jd_analysis_result",
        "gap_analysis_result",
        "result",
        "output",
        "answer"
      ])
    ) {
      return candidate;
    }
  }

  return candidates[0];
}

function readAnalysisResult(source: Record<string, unknown>): AnalysisResult | null {
  const value = source.analysisResult ?? source.analysis_result;
  if (!isRecord(value)) {
    return null;
  }

  return normalizeAnalysisResult(value);
}

function readGapAnalysis(source: Record<string, unknown>): GapAnalysis | null {
  const value = source.gapAnalysis ?? source.gap_analysis;
  if (!isRecord(value)) {
    return null;
  }

  return normalizeGapAnalysis(value);
}

function parseFirstJsonText(source: Record<string, unknown>): Record<string, unknown> | null {
  for (const key of [
    "workflow1_result",
    "workflow2_result",
    "jd_analysis_result",
    "gap_analysis_result",
    "result",
    "output",
    "answer",
    "data"
  ]) {
    const value = source[key];
    if (typeof value === "string") {
      const parsed = safeParseJsonObject(value);
      if (parsed) {
        return parsed;
      }
    }
  }
  return null;
}

function normalizeAnalysisResult(source: Record<string, unknown>): AnalysisResult | null {
  const rolePositioning = source.rolePositioning ?? source.role_positioning;
  if (!isRecord(rolePositioning)) {
    return null;
  }

  return {
    rolePositioning: {
      title: readString(rolePositioning, ["title"]) ?? "JD Analysis Result",
      description: readString(rolePositioning, ["description"]) ?? "",
      tags: readStringArray(rolePositioning, ["tags"]) ?? []
    },
    explicitRequirements: readStringArray(source, ["explicitRequirements", "explicit_requirements"]) ?? [],
    implicitRequirements: readStringArray(source, ["implicitRequirements", "implicit_requirements"]) ?? [],
    abilityCategories: readAbilityCategories(source),
    coreAbilities: readStringArray(source, ["coreAbilities", "core_abilities"]) ?? []
  };
}

function normalizeGapAnalysis(source: Record<string, unknown>): GapAnalysis {
  return {
    conclusion: readString(source, ["conclusion"]) ?? "Gap analysis completed.",
    overview: readString(source, ["overview"]) ?? "",
    items: readGapItems(source)
  };
}

function readAbilityCategories(source: Record<string, unknown>) {
  const raw = source.abilityCategories ?? source.ability_categories;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isRecord).map((item) => ({
    title: readString(item, ["title"]) ?? "Ability",
    description: readString(item, ["description"]) ?? "",
    tags: readStringArray(item, ["tags"]) ?? []
  }));
}

function readGapItems(source: Record<string, unknown>) {
  const raw = source.items;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isRecord).map((item) => ({
    name: readString(item, ["name"]) ?? "Gap",
    currentState: readString(item, ["currentState", "current_state"]) ?? "",
    targetState: readString(item, ["targetState", "target_state"]) ?? "",
    priority: readString(item, ["priority"]) ?? "medium"
  }));
}

function buildAnalysisResultFromWorkflowText(text: string): AnalysisResult {
  const rolePositioning = extractBracketSection(text, "岗位定位", ["岗位偏好专业", "岗位工资", "显性要求", "隐性要求"]);
  const explicitRequirements = extractRequirementList(text, "显性要求", ["隐性要求"]);
  const implicitRequirements = extractRequirementList(text, "隐性要求", []);
  const abilityCategories = extractAbilityCategories(text);
  const coreAbilities = extractCoreAbilities([...explicitRequirements, ...implicitRequirements].join("\n"));

  return {
    rolePositioning: {
      title: "",
      description: rolePositioning || text,
      tags: []
    },
    explicitRequirements,
    implicitRequirements,
    abilityCategories,
    coreAbilities
  };
}

function buildGapAnalysisFromWorkflowText(text: string): GapAnalysis {
  const currentState = extractBracketSection(text, "当前匹配情况", ["已匹配能力", "缺失技能", "必学技能"]);
  const matchedAbilities = extractBracketSection(text, "已匹配能力", ["缺失技能", "必学技能"]);
  const missingSkills = extractRequirementList(text, "缺失技能", ["必学技能"]);
  const requiredSkills = extractRequirementList(text, "必学技能", []);

  return {
    conclusion: currentState || "Coze Workflow2 returned a result.",
    overview: matchedAbilities || "The result was parsed from Workflow2 text.",
    items: dedupeGapItems([
      ...missingSkills.map(cleanGapItemText).filter(isUsefulGapItem).map((skill) => ({
        name: extractGapCategoryName(skill),
        currentState: buildGapCurrentState(skill),
        targetState: buildGapTargetState(skill),
        priority: "高优先级"
      })),
      ...requiredSkills.map(cleanGapItemText).filter(isUsefulGapItem).map((skill) => ({
        name: extractGapCategoryName(skill),
        currentState: buildGapCurrentState(skill),
        targetState: buildGapTargetState(skill),
        priority: "中优先级"
      }))
    ])
  };
}

function extractBracketSection(text: string, sectionName: string, nextSectionNames: string[]): string {
  const startToken = `【${sectionName}】`;
  const startIndex = text.indexOf(startToken);
  if (startIndex < 0) {
    return "";
  }

  const contentStart = startIndex + startToken.length;
  const rest = text.slice(contentStart);
  const endIndexes = nextSectionNames
    .map((name) => rest.indexOf(`【${name}】`))
    .filter((index) => index >= 0);
  const contentEnd = endIndexes.length > 0 ? Math.min(...endIndexes) : rest.length;

  return normalizeInlineText(rest.slice(0, contentEnd));
}

function extractRequirementList(text: string, sectionName: string, nextSectionNames: string[]): string[] {
  const rawSection = extractBracketSection(text, sectionName, nextSectionNames);
  const section = stripTrailingKnownSections(rawSection);
  if (!section) {
    return [];
  }

  const numberedItems = section
    .split(/(?=\s*\d+[.．、]\s*)/g)
    .map((item) => normalizeInlineText(item.replace(/^\s*\d+[.．、]\s*/, "")))
    .filter(Boolean);

  if (numberedItems.length > 1) {
    return numberedItems.slice(0, 8);
  }

  return section
    .split(/[；;]/g)
    .map((item) => normalizeInlineText(item))
    .filter(Boolean)
    .slice(0, 8);
}

function extractCoreAbilities(text: string): string[] {
  const keywords = ["AI产品", "GUI Agent", "数据分析", "Prompt Engineering", "竞品调研", "问题拆解", "文案撰写", "协作沟通"];
  return keywords.filter((keyword) => text.includes(keyword)).slice(0, 5);
}

function extractAbilityCategories(text: string): AnalysisResult["abilityCategories"] {
  const section = extractBracketSection(text, "能力分类", []);
  const cleanedSection = stripTrailingKnownSections(section);
  if (!cleanedSection) {
    return [];
  }

  return cleanedSection
    .split(/(?=\s*[\u4e00-\u9fa5A-Za-z]+[类類]\s*[：:])/g)
    .map((item) => normalizeInlineText(item))
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^(.+?[类類])\s*[：:]\s*(.+)$/);
      if (!match) {
        return {
          title: "能力分类",
          description: item,
          tags: []
        };
      }

      return {
        title: match[1].trim(),
        description: match[2].trim(),
        tags: match[2]
          .split(/[、，,－\-]/g)
          .map((tag) => normalizeInlineText(tag))
          .filter(Boolean)
          .slice(0, 6)
      };
    })
    .slice(0, 6);
}

function cleanGapItemText(value: string) {
  return normalizeInlineText(
    value
      .replace(/原因是[\s\S]*$/g, "")
      .replace(/共\s*\d+\s*项[\s\S]*$/g, "")
      .replace(/按优先级排序[\s\S]*$/g, "")
      .replace(/^[：:，,；;\s]+/g, "")
  );
}

function extractGapCategoryName(value: string) {
  const normalizedForCategory = normalizeInlineText(value);
  return normalizeGapCategoryName(normalizedForCategory.split(/[:：]/)[0] || normalizedForCategory);
}

function normalizeGapCategoryName(value: string) {
  if (/项目|案例|经历|组织|活动/i.test(value)) {
    return "项目经验表达";
  }

  const preNormalized = normalizeInlineText(value);
  if (/学历|在读|本科|专业|实习|资质|身份|证明/i.test(preNormalized)) {
    return "基础资质类";
  }
  if (/AI|Agent|LLM|RAG|Prompt|GUI/i.test(preNormalized)) {
    return "AI领域能力";
  }
  const source = normalizeInlineText(value.replace(/[（(][^）)]*[）)]/g, ""));

  if (/PRD|需求|竞品|产品|文档|方案/i.test(source)) {
    return "产品基础能力";
  }

  if (/数据|badcase|评测|指标|归因|分析/i.test(source)) {
    return "数据分析能力";
  }

  if (/沟通|协作|推进|执行|抗压|优先级|跨团队/i.test(source)) {
    return "协作与推进能力";
  }

  if (/行业|游戏|业务|市场|用户/i.test(source)) {
    return "行业认知";
  }

  if (/项目|实习|案例|经历|组织/i.test(source)) {
    return "项目经验表达";
  }

  return source
    .replace(/[，,、；;].*$/g, "")
    .slice(0, 32)
    .trim();
}

function extractGapCategoryNameLegacy(value: string) {
  const normalized = normalizeInlineText(value);
  const match = normalized.match(/^([^：:]+)[：:]\s*(.+)$/);
  if (!match) {
    return normalized.slice(0, 32);
  }

  return match[1].trim();
}

function extractGapTargetState(value: string) {
  const normalized = normalizeInlineText(value);
  const match = normalized.match(/^([^：:]+)[：:]\s*(.+)$/);
  if (!match) {
    return normalized;
  }

  return normalizeInlineText(match[2]);
}

function buildGapTargetState(value: string, _priority?: "high" | "medium") {
  return inferGapTargetState(extractGapCategoryName(value), extractGapTargetState(value));
}

function buildGapTargetStateLegacy(value: string, priority: "high" | "medium") {
  const target = extractGapTargetState(value);
  const prefix =
    priority === "high"
      ? "达到能独立解释、结合项目案例说明，并在面试中清晰作答的程度："
      : "达到能理解核心概念、完成基础表达，并可用于简历/面试准备的程度：";

  return `${prefix}${target}`;
}

function buildGapCurrentState(_value: string) {
  return "暂无明确证明。";
}

function inferGapTargetState(category: string, detail: string) {
  if (/项目|实习|案例|经历|组织/i.test(category)) {
    return "能用 STAR 结构讲清项目背景、个人动作、结果指标和复盘收获，证明项目经验与岗位要求匹配。";
  }

  if (/当前未体现|当前未提供|未体现|未提供|无法确认|缺少证明|暂无证明/i.test(detail)) {
    return buildEvidenceTargetFromDetail(detail);
  }
  if (/基础资质|学历|在读|本科|专业|实习|资质|身份|证明/i.test(category) || /未提供|无法确认|缺少|暂无|学历|在读|本科|专业|实习|资质|身份|证明/i.test(detail)) {
    return "提供本科及以上在读身份、计算机/AI 相关专业背景、可长期实习等证明，以确认满足岗位入门门槛。";
  }

  if (/AI|Agent|LLM|RAG|Prompt|GUI/i.test(category)) {
    return "掌握 GUI Agent 核心概念、工作流程、工具调用/RAG 等关键模块，并能结合产品场景说明落地方式。";
  }
  const usefulDetail = cleanGapDetail(detail, category);

  if (/产品|PRD|需求|竞品|方案/i.test(category)) {
    return "能熟练完成需求分析、竞品分析和方案拆解，并输出结构清晰的 PRD/产品文档。";
  }

  if (/数据|badcase|评测|指标|归因|分析/i.test(category)) {
    return "能独立完成指标拆解、badcase 归因、评测结果分析，并形成结构化结论。";
  }

  if (/沟通|协作|推进|执行|抗压|优先级|跨团队/i.test(category)) {
    return "能在跨团队协作中拆清优先级、推动任务落地，并清晰同步风险、进度和结果。";
  }

  if (/行业|游戏|业务|市场|用户/i.test(category)) {
    return "能说明目标行业的业务模式、用户特征、产品形态和岗位关注点，并结合案例表达。";
  }

  if (/项目|实习|案例|经历|组织/i.test(category)) {
    return "能用 STAR 结构讲清项目背景、个人动作、结果指标和复盘收获。";
  }

  if (usefulDetail) {
    return `能清楚理解并结合案例说明：${usefulDetail}。`;
  }

  return "能围绕该能力准备至少 1 个可验证案例，并在面试中清晰说明方法、动作和结果。";
}

function buildEvidenceTargetFromDetail(detail: string) {
  const cleaned = normalizeInlineText(detail)
    .replace(/当前未体现/g, "")
    .replace(/当前未提供/g, "")
    .replace(/未体现/g, "")
    .replace(/未提供/g, "")
    .replace(/无法确认是否满足/g, "满足")
    .replace(/无法确认/g, "")
    .replace(/缺少证明/g, "")
    .replace(/暂无证明/g, "")
    .replace(/等岗位核心能力/g, "等岗位核心能力")
    .replace(/^[：:，,、\s]+/g, "")
    .replace(/[。.]\s*$/g, "");

  if (/学历|在读|本科|专业|实习|资质|身份|证明|入门门槛/i.test(cleaned)) {
    return "提供本科及以上在读身份、计算机/AI 相关专业背景、可长期实习等证明，以确认满足岗位入门门槛。";
  }

  if (cleaned) {
    return `能结合案例说明本人具备${cleaned}。`;
  }

  return "能结合案例说明本人具备该岗位要求的关键能力。";
}

function cleanGapDetail(detail: string, category: string) {
  const cleaned = normalizeInlineText(detail)
    .replace(/^达到能[^：:]*[：:]/g, "")
    .replace(/原因是[\s\S]*$/g, "")
    .replace(/[。.]\s*$/g, "");

  if (!cleaned || cleaned === category || cleaned.includes(category)) {
    return "";
  }

  return cleaned;
}

function dedupeGapItems(items: GapItem[]) {
  const byName = new Map<string, GapItem>();

  for (const item of items) {
    const name = item.name.trim();
    if (!name) {
      continue;
    }

    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, { ...item, name });
      continue;
    }

    const existingIsHigh = /高/.test(existing.priority);
    const itemIsHigh = /高/.test(item.priority);
    byName.set(name, {
      ...existing,
      targetState: existing.targetState.length >= item.targetState.length ? existing.targetState : item.targetState,
      priority: existingIsHigh ? existing.priority : itemIsHigh ? item.priority : existing.priority
    });
  }

  const seenTargets = new Set<string>();
  return Array.from(byName.values())
    .slice(0, 8)
    .map((item) => {
      if (!seenTargets.has(item.targetState)) {
        seenTargets.add(item.targetState);
        return item;
      }

      const targetState = buildFallbackTargetForCategory(item.name);
      seenTargets.add(targetState);
      return { ...item, targetState };
    });
}

function buildFallbackTargetForCategory(category: string) {
  if (/基础资质|学历|在读|本科|专业|实习|资质|身份|证明/i.test(category)) {
    return "补齐学历、专业、在读状态、实习周期等基础信息证明，确保满足岗位硬性筛选条件。";
  }

  if (/项目|案例|经历|组织|活动/i.test(category)) {
    return "准备 1-2 个可展开的项目案例，讲清背景、目标、个人职责、关键动作、结果和复盘。";
  }

  if (/核心|沟通|协作|推进|执行|抗压|优先级|跨角色|多任务/i.test(category)) {
    return "能结合真实经历说明本人具备跨角色沟通、任务推进、复盘总结、多任务优先级判断和抗压能力。";
  }

  if (/工具|TAPD|飞书|Jira/i.test(category)) {
    return "能说明并演示常见项目管理工具的基础用法，包括任务拆解、进度跟踪、问题记录和协作同步。";
  }

  return "能结合具体案例说明该能力的使用场景、个人动作和可验证结果。";
}

function isUsefulGapItem(value: string) {
  if (!value) {
    return false;
  }

  return !/(^共\s*\d+\s*项|按优先级排序|原因是)/.test(value);
}

function stripTrailingKnownSections(text: string) {
  const markers = ["【能力分类】", "【能力类别】", "【核心能力】", "【高频面试考点预测】", "【面试考点预测】"];
  const markerIndexes = markers.map((marker) => text.indexOf(marker)).filter((index) => index >= 0);
  if (markerIndexes.length === 0) {
    return text;
  }

  return text.slice(0, Math.min(...markerIndexes));
}

function normalizeInlineText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeJDAnalysisRequest(input: JDAnalysisRequest): JDAnalysisRequest {
  return {
    jd_text: input.jd_text.trim().slice(0, 5000),
    job_type: input.job_type?.trim() ?? "",
    company_type: input.company_type?.trim() ?? "",
    user_key: input.user_key?.trim() ?? "",
    candidate_profile: normalizeCandidateProfile(input.candidate_profile) ?? undefined
  };
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

function readStringArray(source: Record<string, unknown>, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCozeBusinessError(value: unknown): value is Record<string, unknown> & { code: number; msg: string } {
  return isRecord(value) && typeof value.code === "number" && value.code !== 0 && typeof value.msg === "string";
}

function isMissingParametersError(value: unknown): value is Record<string, unknown> & { code: number; msg: string } {
  return isCozeBusinessError(value) && value.code === 4000;
}

function buildCozeBusinessErrorMessage(
  workflowName: string,
  value: Record<string, unknown> & { code: number; msg: string },
  mode: CozeRequestMode,
  payload?: Record<string, string>
) {
  const payloadHint = payload
    ? ` Payload keys: [${Object.keys(payload).join(", ")}]. Payload value lengths: ${JSON.stringify(formatPayloadValueLengths(payload))}.`
    : "";
  const detailHint = value.detail ? ` Detail: ${previewUnknown(value.detail)}.` : "";
  return `${workflowName} business error in mode ${mode}: [${value.code}] ${value.msg}${payloadHint}${detailHint}`;
}

function formatPayloadValueLengths(payload: Record<string, string>) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, value.length]));
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

function stringifyForDisplay(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function safeReadText(response: Response) {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

