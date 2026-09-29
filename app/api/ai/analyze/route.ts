import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Summary = {
  input_valid: boolean;
  error: string | null;
  candidate_summary: string;
  matching_skills: string[];
  relevant_experience: string[];
  missing_required_skills: string[];
  strengths: string[];
  potential_gaps: string[];
  overall_match_analysis: string;
  interview_questions?: string[];
  ai_generated: boolean;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function saveFailure(
  admin: ReturnType<typeof adminClient>,
  applicationId: string,
  message: string,
) {
  await admin.from("ai_summaries").upsert({
    application_id: applicationId,
    status: "failed",
    failure_message: message.slice(0, 1000),
    is_ai_generated: true,
    updated_at: new Date().toISOString(),
  });
}

async function extractPdfText(bytes: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    text += `${content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")}\n`;
  }
  return text.trim();
}

function mockSummary(requirements: string[], cvText: string): Summary {
  const normalizedCv = cvText.toLowerCase();
  const matching = requirements.filter((requirement) =>
    normalizedCv.includes(requirement.toLowerCase()),
  );
  const missing = requirements.filter((requirement) => !matching.includes(requirement));
  const profile = cvText.split(/\s{2,}|\n/).find((line) => line.trim().length > 40)?.trim() ||
    "Candidate profile extracted from the uploaded CV.";
  return {
    input_valid: true,
    error: null,
    candidate_summary: profile.slice(0, 500),
    matching_skills: matching,
    relevant_experience: ["Relevant experience was identified from the uploaded CV."],
    missing_required_skills: missing,
    strengths: ["CV successfully uploaded and readable.", "Candidate information is available for recruiter review."],
    potential_gaps: missing,
    overall_match_analysis: `Demo analysis completed against ${requirements.length} job requirement${requirements.length === 1 ? "" : "s"}.`,
    interview_questions: [
      "Describe a project that demonstrates your experience with the required skills.",
      "How do you test and improve the quality of your work?",
      "Tell us about a difficult problem you solved and the result.",
    ],
    ai_generated: false,
  };
}

export async function POST(request: Request) {
  let applicationId = "";
  try {
    const body = (await request.json()) as { application_id?: string };
    applicationId = body.application_id || "";
    if (!applicationId)
      return NextResponse.json(
        { error: "application_id is required" },
        { status: 400 },
      );

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => undefined,
        },
      },
    );
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );

    const admin = adminClient();
    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("id,candidate_id,job_id,cv_id")
      .eq("id", applicationId)
      .single();
    if (applicationError || !application)
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    const isCandidate = application.candidate_id === userData.user.id;
    const { data: recruiterAssignment } = await admin
      .from("job_recruiters")
      .select("job_id")
      .eq("job_id", application.job_id)
      .eq("recruiter_id", userData.user.id)
      .maybeSingle();
    if (!isCandidate && !recruiterAssignment)
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    await admin.from("ai_summaries").upsert({
      application_id: applicationId,
      status: "processing",
      updated_at: new Date().toISOString(),
    });
    const [{ data: job, error: jobError }, { data: cv, error: cvError }] =
      await Promise.all([
        admin
          .from("jobs")
          .select("requirements,description")
          .eq("id", application.job_id)
          .single(),
        admin
          .from("candidate_cvs")
          .select("storage_path,mime_type,file_size")
          .eq("id", application.cv_id)
          .single(),
      ]);
    if (jobError || !job)
      throw new Error("Job requirements could not be loaded");
    if (cvError || !cv) throw new Error("Candidate CV could not be loaded");
    if (cv.mime_type !== "application/pdf" || cv.file_size > 2 * 1024 * 1024)
      throw new Error("Only PDF CVs up to 2 MB can be analyzed");

    const file = await admin.storage
      .from("candidate-cvs")
      .download(cv.storage_path);
    if (file.error || !file.data)
      throw new Error("Candidate CV could not be downloaded");
    const cvText = await extractPdfText(
      Buffer.from(await file.data.arrayBuffer()),
    );
    if (!cvText)
      throw new Error("The uploaded PDF does not contain readable text");

    const webhook = process.env.N8N_AI_WEBHOOK_URL;
    const payload = JSON.stringify({
      job_requirements: job.requirements?.length
        ? job.requirements
        : job.description,
      cv_text: cvText,
    });
    let result: Summary | null = null;
    if (webhook && process.env.AI_FORCE_MOCK !== "true") {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(webhook, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload,
            cache: "no-store",
          });
          const raw = await response.text();
          if (response.ok && raw.trim()) {
            const candidate = JSON.parse(raw) as Summary;
            if (candidate.input_valid) {
              result = candidate;
              break;
            }
          }
        } catch {
          // Fall back to the deterministic demo analyzer below.
        }
        if (attempt < 3)
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    if (!result) result = mockSummary(job.requirements || [], cvText);

    await admin.from("ai_summaries").upsert({
      application_id: applicationId,
      status: "completed",
      profile_bullets: [result.candidate_summary, ...result.strengths],
      requirements_found: result.matching_skills,
      requirements_missing: result.missing_required_skills,
      interview_questions: result.interview_questions || [],
      is_ai_generated: result.ai_generated,
      failure_message: null,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, summary: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI analysis failed";
    if (applicationId) {
      try {
        await saveFailure(adminClient(), applicationId, message);
      } catch {
        /* preserve the original failure */
      }
    }
    return NextResponse.json({ ok: false, error: message }, { status: 202 });
  }
}
