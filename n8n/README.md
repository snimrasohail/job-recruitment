# n8n AI CV analysis workflow

Import `ats-ai-cv-analysis.workflow.json` into n8n.

## Setup

1. Import the workflow.
2. Open the **Gemini** node.
3. Select or create your Google Gemini credential.
4. Select the available stable Gemini Flash model shown by your credential (the tested production workflow uses `models/gemini-3.6-flash`).
5. Save and activate the workflow.
6. Copy the Production URL from the **Webhook** node.

The webhook accepts a POST body with:

```json
{
  "job_requirements": [
    "TypeScript",
    "React",
    "Next.js"
  ],
  "cv_text": "Candidate CV text goes here..."
}
```

It also accepts `job_requirements` as one string.

## Expected response

```json
{
  "input_valid": true,
  "error": null,
  "candidate_summary": "Evidence-based summary.",
  "matching_skills": ["React"],
  "relevant_experience": ["Built production React applications."],
  "missing_required_skills": ["Next.js"],
  "strengths": ["Strong frontend experience."],
  "potential_gaps": ["Next.js was not evidenced in the CV."],
  "overall_match_analysis": "Balanced comparison without a score or hiring recommendation.",
  "ai_generated": true
}
```

For missing or invalid `job_requirements` or `cv_text`, the workflow returns `input_valid: false`, an explanatory `error`, and empty analysis arrays.

## Test requests

Replace the URL with the Production Webhook URL:

```bash
curl -X POST "https://YOUR_N8N_HOST/webhook/ats-ai-cv-analysis" ^
  -H "Content-Type: application/json" ^
  -d "{\"job_requirements\":[\"React\",\"TypeScript\"],\"cv_text\":\"Frontend engineer with four years of React and TypeScript experience.\"}"
```

Invalid input test:

```bash
curl -X POST "https://YOUR_N8N_HOST/webhook/ats-ai-cv-analysis" ^
  -H "Content-Type: application/json" ^
  -d "{\"job_requirements\":[],\"cv_text\":\"\"}"
```

The application should call this webhook from a protected server-side integration, not directly from browser code. The n8n workflow is intentionally inactive until you select your Gemini credential and activate it.
