import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/profile-service";
import { getProjects } from "@/lib/projects-service";
import { generateInterviewQuestion } from "@/lib/interview-service";
import type { ApiResponse } from "@/types/capability-profile";
import type {
  GenerateInterviewQuestionRequest,
  GenerateInterviewQuestionResponse,
  PracticeMode,
  QuestionType
} from "@/types/interview";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 500 });
}

function isPracticeMode(value: string): value is PracticeMode {
  return value === "standard" || value === "weakness";
}

function isQuestionType(value: string): value is QuestionType {
  return ["self_intro", "project", "ai_product", "requirement", "behavior", "random"].includes(value);
}

function formatProjectsSummary(projects: Awaited<ReturnType<typeof getProjects>>) {
  return projects
    .map((project) => {
      const status = project.project_status === "completed" ? "已完成" : "进行中";
      const tags = project.tags.join("、");
      return `${project.project_name}（${status}）${tags ? `：${tags}` : ""}`;
    })
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateInterviewQuestionRequest>;

    if (!body.workflow2_result || typeof body.workflow2_result !== "string") {
      return badRequest("缺少 workflow2_result");
    }

    if (!body.practice_mode || typeof body.practice_mode !== "string" || !isPracticeMode(body.practice_mode)) {
      return badRequest("practice_mode 不合法");
    }

    if (!body.question_type || typeof body.question_type !== "string" || !isQuestionType(body.question_type)) {
      return badRequest("question_type 不合法");
    }

    const userKey = typeof body.user_key === "string" ? body.user_key.trim() : "";
    const [profile, projects] = userKey ? await Promise.all([getProfile(userKey), getProjects(userKey)]) : [null, []];

    const result = await generateInterviewQuestion({
      practice_mode: body.practice_mode,
      question_type: body.question_type,
      workflow1_result: typeof body.workflow1_result === "string" ? body.workflow1_result : "",
      workflow2_result: body.workflow2_result,
      target_role_direction:
        typeof body.target_role_direction === "string" && body.target_role_direction.trim()
          ? body.target_role_direction
          : profile?.target_job_direction ?? "",
      user_projects_result:
        typeof body.user_projects_result === "string" && body.user_projects_result.trim()
          ? body.user_projects_result
          : formatProjectsSummary(projects),
      focus_on_weakness:
        typeof body.focus_on_weakness === "boolean" ? body.focus_on_weakness : body.practice_mode === "weakness",
      user_key: userKey
    });

    return NextResponse.json<ApiResponse<GenerateInterviewQuestionResponse>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "生成面试题失败");
  }
}
