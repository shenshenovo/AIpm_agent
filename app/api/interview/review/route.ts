import { NextRequest, NextResponse } from "next/server";
import { reviewInterviewAnswer } from "@/lib/interview-service";
import type { ApiResponse } from "@/types/capability-profile";
import type { ReviewInterviewAnswerRequest, ReviewInterviewAnswerResponse } from "@/types/interview";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ReviewInterviewAnswerRequest>;

    if (!body.current_question || typeof body.current_question !== "string") {
      return badRequest("缺少 current_question");
    }

    if (!body.currentquestionpoint || typeof body.currentquestionpoint !== "string") {
      return badRequest("缺少 currentquestionpoint");
    }

    if (!body.question_type || typeof body.question_type !== "string") {
      return badRequest("缺少 question_type");
    }

    if (!body.user_answer || typeof body.user_answer !== "string") {
      return badRequest("缺少 user_answer");
    }

    if (!body.workflow2_result || typeof body.workflow2_result !== "string") {
      return badRequest("缺少 workflow2_result");
    }

    const result = await reviewInterviewAnswer({
      current_question: body.current_question,
      currentquestionpoint: body.currentquestionpoint,
      question_type: body.question_type,
      user_answer: body.user_answer,
      target_role_direction: typeof body.target_role_direction === "string" ? body.target_role_direction : "",
      workflow2_result: body.workflow2_result
    });

    return NextResponse.json<ApiResponse<ReviewInterviewAnswerResponse>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "面试答案点评失败");
  }
}
