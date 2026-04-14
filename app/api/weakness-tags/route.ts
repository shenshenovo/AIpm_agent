import { NextRequest, NextResponse } from "next/server";
import { createWeaknessTag, deleteWeaknessTag, getWeaknessTags } from "@/lib/weakness-tags-service";
import type { ApiResponse, WeaknessTag } from "@/types/capability-profile";

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

  const tags = await getWeaknessTags(userKey);
  return NextResponse.json<ApiResponse<WeaknessTag[]>>({ success: true, data: tags });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Omit<WeaknessTag, "id">;
    if (!body?.user_key || !body?.tag_name) {
      return badRequest("缺少必要字段");
    }
    const tag = await createWeaknessTag(body);
    return NextResponse.json<ApiResponse<WeaknessTag>>({ success: true, data: tag });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "新增标签失败");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { user_key?: string; id?: string };
    if (!body?.user_key || !body?.id) {
      return badRequest("缺少必要字段");
    }
    const result = await deleteWeaknessTag(body.user_key, body.id);
    return NextResponse.json<ApiResponse<{ id: string }>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "删除标签失败");
  }
}
