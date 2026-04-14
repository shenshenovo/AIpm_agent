import { NextRequest, NextResponse } from "next/server";
import { createSkill, deleteSkill, getSkills, updateSkill } from "@/lib/skills-service";
import type { ApiResponse, Skill } from "@/types/capability-profile";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const userKey = request.nextUrl.searchParams.get("user_key");
  if (!userKey) {
    return badRequest("缺少 user_key");
  }

  const skills = await getSkills(userKey);
  return NextResponse.json<ApiResponse<Skill[]>>({ success: true, data: skills });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Omit<Skill, "id">;
    if (!body?.user_key) {
      return badRequest("缺少 user_key");
    }
    const skill = await createSkill(body);
    return NextResponse.json<ApiResponse<Skill>>({ success: true, data: skill });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "新增技能失败");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Skill;
    if (!body?.user_key || !body?.id) {
      return badRequest("缺少必要字段");
    }
    const skill = await updateSkill(body);
    return NextResponse.json<ApiResponse<Skill>>({ success: true, data: skill });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "更新技能失败");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_key?: string; id?: string };
    if (!body?.user_key || !body?.id) {
      return badRequest("缺少必要字段");
    }
    const result = await deleteSkill(body.user_key, body.id);
    return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "删除技能失败");
  }
}
