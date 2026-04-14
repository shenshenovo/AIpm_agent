import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/profile-service";
import type { ApiResponse, Profile } from "@/types/capability-profile";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const userKey = request.nextUrl.searchParams.get("user_key");
  if (!userKey) {
    return badRequest("缺少 user_key");
  }

  const profile = await getProfile(userKey);
  return NextResponse.json<ApiResponse<Profile>>({ success: true, data: profile });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Profile;
  if (!body?.user_key) {
    return badRequest("缺少 user_key");
  }

  const profile = await saveProfile(body);
  return NextResponse.json<ApiResponse<Profile>>({ success: true, data: profile });
}
