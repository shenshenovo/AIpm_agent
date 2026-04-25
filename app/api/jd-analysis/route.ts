import { NextRequest, NextResponse } from "next/server";
import { analyzeJD } from "@/lib/jd-analysis-service";
import { getProfile } from "@/lib/profile-service";
import { getProjects } from "@/lib/projects-service";
import { getSkills } from "@/lib/skills-service";
import { getWeaknessTags, upsertWeaknessTags } from "@/lib/weakness-tags-service";
import type { ApiResponse } from "@/types/capability-profile";
import type { CandidateProfileSnapshot, JDAnalysisRequest, JDAnalysisResponse } from "@/types/jd-analysis";

export const dynamic = "force-dynamic";

function mergeFallbackNotice(primary: string | undefined, extra: string) {
  const normalizedPrimary = primary?.trim();
  if (!normalizedPrimary) {
    return extra;
  }

  return `${normalizedPrimary} ${extra}`;
}

function badRequest(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json<ApiResponse<null>>({ success: false, error: message }, { status: 500 });
}

async function buildCandidateProfile(userKey: string): Promise<CandidateProfileSnapshot> {
  const [profile, skills, projects, weaknessTags] = await Promise.all([
    getProfile(userKey),
    getSkills(userKey),
    getProjects(userKey),
    getWeaknessTags(userKey)
  ]);

  return {
    user_key: userKey,
    profile,
    skills,
    projects,
    weakness_tags: weaknessTags
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<JDAnalysisRequest>;

    if (!body.jd_text || typeof body.jd_text !== "string") {
      return badRequest("缺少 jd_text");
    }

    const userKey = typeof body.user_key === "string" ? body.user_key.trim() : "";
    const candidateProfile = userKey ? await buildCandidateProfile(userKey) : undefined;

    const result = await analyzeJD({
      jd_text: body.jd_text,
      job_type: typeof body.job_type === "string" ? body.job_type : "",
      company_type: typeof body.company_type === "string" ? body.company_type : "",
      user_key: userKey,
      candidate_profile: candidateProfile
    });

    if (userKey) {
      try {
        await upsertWeaknessTags(
          userKey,
          result.gapAnalysis.items.map((item) => item.name)
        );
      } catch (error) {
        console.warn("[jd-analysis] Failed to sync weakness tags after JD analysis.", {
          userKey,
          error: error instanceof Error ? error.message : String(error)
        });
        result.fallbackNotice = mergeFallbackNotice(
          result.fallbackNotice,
          "JD analysis succeeded, but syncing weakness tags to the capability profile failed."
        );
      }
    }

    return NextResponse.json<ApiResponse<JDAnalysisResponse>>({ success: true, data: result });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "JD analysis failed.");
  }
}
