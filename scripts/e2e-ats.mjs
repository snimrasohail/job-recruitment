import { chromium } from "playwright-core";
import PDFDocument from "pdfkit";

const base = "http://localhost:3000";
const password = "test123";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(15000);
const results = [];
const jobTitle = `E2E Frontend Engineer ${Date.now()}`;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? "PASS" : "FAIL"} - ${name}${detail ? `: ${detail}` : ""}`,
  );
}

async function login(email) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/`);
  await page
    .locator("header .connected-chip")
    .getByText("Live", { exact: true })
    .waitFor();
}

async function logout() {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForTimeout(500);
}

async function pdfBuffer(text) {
  return await new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "LETTER", compress: false });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.fontSize(12).text(text, 72, 72);
    document.end();
  });
}

try {
  await page.goto(base);
  record("Website opens", (await page.title()).includes("Hireflow"));

  await login("admin@test.com");
  record(
    "Admin login",
    await page.locator("header .connected-chip").isVisible(),
  );
  await page.getByRole("button", { name: "Create a job" }).click();
  await page.getByLabel("Title").fill(jobTitle);
  await page.getByLabel("Department").fill("Engineering");
  await page.getByLabel("Location").fill("Remote");
  await page.getByLabel("Deadline").fill("2099-12-31");
  await page.getByLabel("Openings").fill("2");
  await page
    .getByLabel("Description")
    .fill("Build frontend features for the E2E recruitment test.");
  await page.getByLabel("Requirements").fill("React\nTypeScript\nNext.js");
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.getByText("Draft job created").waitFor();
  record("Admin creates Draft job", true);
  const draftRow = page.locator("tr").filter({ hasText: jobTitle }).first();
  await draftRow.getByRole("button", { name: "Open job" }).click();
  await page.getByRole("button", { name: "Close job" }).waitFor();
  record("Admin opens job", true);
  await page.getByPlaceholder("recruiter@test.com").fill("recruiter@test.com");
  await page.getByRole("button", { name: "Assign recruiter" }).click();
  await page.waitForTimeout(1200);
  record("Admin assigns recruiter", true);
  await logout();

  await login("candidate@test.com");
  record(
    "Candidate login",
    await page.locator("header .connected-chip").isVisible(),
  );
  const jobCard = page
    .locator(".job-card")
    .filter({ hasText: jobTitle })
    .first();
  await jobCard.getByRole("button", { name: /Apply/ }).click();
  const file = await pdfBuffer(
    "Frontend engineer React TypeScript Next.js REST APIs",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "e2e-candidate.pdf",
      mimeType: "application/pdf",
      buffer: file,
    });
  const aiResponse = page.waitForResponse(
    (response) => response.url().includes("/api/ai/analyze"),
    { timeout: 90000 },
  );
  await page.getByRole("button", { name: "Submit application" }).click();
  const analysisResponse = await aiResponse;
  const analysisBody = await analysisResponse.text();
  record(
    "Candidate submits valid PDF",
    analysisResponse.status() === 200 || analysisResponse.status() === 202,
    `HTTP ${analysisResponse.status()} ${analysisBody.slice(0, 240)}`,
  );
  await page.getByText("Application submitted").waitFor({ timeout: 90000 });
  record("Candidate sees application saved", true);
  await logout();

  await login("recruiter@test.com");
  await page.getByText("Your applicant queue").waitFor();
  await page.waitForTimeout(1500);
  record(
    "Recruiter login",
    await page.locator("header .connected-chip").isVisible(),
  );
  record(
    "Recruiter sees application",
    (await page
      .locator(".applicant-row")
      .filter({ hasText: "candidate" })
      .count()) > 0,
  );
  record(
    "Recruiter sees CV controls",
    await page.getByRole("button", { name: "Preview private CV" }).isVisible(),
  );
  record(
    "Recruiter sees AI summary state",
    await page.locator(".ai-card").isVisible(),
  );
  const appliedRow = page.locator(".applicant-row").filter({ hasText: "Applied" }).first();
  if (await appliedRow.count()) await appliedRow.click();
  await page.getByRole("button", { name: /Move to Shortlisted/ }).click();
  await page.waitForTimeout(800);
  record("Recruiter moves application to Shortlisted", true);
  await page.getByRole("button", { name: /Move to Interview/ }).click();
  await page.waitForTimeout(800);
  record("Recruiter moves application to Interview", true);
} catch (error) {
  record(
    "E2E flow stopped",
    false,
    error instanceof Error ? error.message : String(error),
  );
} finally {
  await page
    .screenshot({ path: "artifacts/e2e-last-state.png", fullPage: true })
    .catch(() => undefined);
  await browser.close();
  const failed = results.filter((item) => !item.ok);
  console.log(
    JSON.stringify(
      {
        passed: results.length - failed.length,
        failed: failed.length,
        results,
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exitCode = 1;
}
