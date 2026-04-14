import { NextRequest, NextResponse } from "next/server";
import { createProject, deleteProject, getProjects, updateProject } from "@/lib/projects-service";
import type { ApiResponse, Project } from "@/types/capability-profile";

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

  const projects = await getProjects(userKey);
  return NextResponse.json<ApiResponse<Project[]>>({ success: true, data: projects });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Omit<Project, "id">;
    if (!body?.user_key) {
      return badRequest("缺少 user_key");
    }
    const project = await createProject(body);
    return NextResponse.json<ApiResponse<Project>>({ success: true, data: project });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "新增项目失败");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Project;
    if (!body?.user_key || !body?.id) {
      return badRequest("缺少必要字段");
    }
    const project = await updateProject(body);
    return NextResponse.json<ApiResponse<Project>>({ success: true, data: project });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "更新项目失败");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_key?: string; id?: string };
    if (!body?.user_key || !body?.id) {
      return badRequest("缺少必要字段");
    }
    const result = await deleteProject(body.user_key, body.id);
    return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "删除项目失败");
  }
}
