import { NextRequest, NextResponse } from "next/server";
import { generateStudyPlan } from "@/lib/study-plan-service";
import type { ApiResponse } from "@/types/capability-profile";
import type { StudyPlanRequest, StudyPlanResponse } from "@/types/study-plan";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<StudyPlanRequest>;

    if (!body.workflow2_result || typeof body.workflow2_result !== "string") {
      return badRequest("缺少 workflow2_result");
    }

    if (typeof body.study_days !== "number" || typeof body.daily_hours !== "number") {
      return badRequest("缺少 study_days 或 daily_hours");
    }

    const result = await generateStudyPlan({
      workflow2_result: body.workflow2_result,
      study_days: body.study_days,
      daily_hours: body.daily_hours
    });

    return NextResponse.json<ApiResponse<StudyPlanResponse>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "生成学习计划失败");
  }
}
