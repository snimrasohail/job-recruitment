import { chromium } from "playwright-core";
import PDFDocument from "pdfkit";

const base = "http://localhost:3000";
const password = "test123";
const jobTitle = `Video Demo - Openings Filled ${Date.now()}`;
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(20000);

async function login(email) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${base}/`);
  await page.locator("header .connected-chip").getByText("Live", { exact: true }).waitFor();
}

async function logout() {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForTimeout(500);
}

async function cvBuffer(name) {
  return await new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "LETTER", compress: false });
    const chunks = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    pdf.fontSize(16).text(`${name} - QA Engineer CV`, 72, 72);
    pdf.fontSize(11).text("Manual testing, API testing, regression testing, SQL, Postman", 72, 110);
    pdf.end();
  });
}

async function applyAs(email, displayName) {
  await login(email);
  const card = page.locator(".job-card").filter({ hasText: jobTitle }).first();
  await card.getByRole("button", { name: /Apply/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: `${displayName.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`,
    mimeType: "application/pdf",
    buffer: await cvBuffer(displayName),
  });
  await page.getByRole("button", { name: "Submit application" }).click();
  await page.getByText("Application submitted").waitFor({ timeout: 20000 });
  await page.waitForTimeout(700);
  await logout();
}

async function moveTo(stage) {
  await page.getByRole("button", { name: new RegExp(`Move to ${stage}`) }).click();
  await page.waitForTimeout(450);
}

try {
  await login("admin@test.com");
  await page.getByRole("button", { name: "Create a job" }).click();
  await page.getByLabel("Title").fill(jobTitle);
  await page.getByLabel("Department").fill("Engineering");
  await page.getByLabel("Location").fill("Remote");
  await page.getByLabel("Deadline").fill("2026-10-10");
  await page.getByRole("spinbutton", { name: "Openings" }).fill("1");
  await page.getByLabel("Description").fill("One opening for a closed-job video demonstration.");
  await page.getByLabel("Requirements").fill("Manual testing\nAPI testing\nSQL");
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.getByText("Draft job created").waitFor();
  const row = page.locator("tr").filter({ hasText: jobTitle }).first();
  await row.getByRole("button", { name: "Open job" }).click();
  await page.getByRole("button", { name: "Close job" }).waitFor();
  await page.getByPlaceholder("recruiter@test.com").fill("recruiter@test.com");
  await page.getByRole("button", { name: "Assign recruiter" }).click();
  await page.waitForTimeout(700);
  await logout();

  await applyAs("candidate@test.com", "Candidate A");
  await applyAs("candidate2@test.com", "Candidate B");

  await login("recruiter@test.com");
  await page.getByText("Your applicant queue").waitFor();
  const candidateA = page.locator(".applicant-row").filter({ hasText: jobTitle }).filter({ hasText: "candidate" }).filter({ hasNotText: "candidate2" }).first();
  await candidateA.click();
  await moveTo("Shortlisted");
  await moveTo("Interview");
  await moveTo("Offer");
  await moveTo("Hired");
  await page.getByText("Job closed automatically", { exact: false }).waitFor();

  const candidateB = page.locator(".applicant-row").filter({ hasText: jobTitle }).filter({ hasText: "candidate2" }).first();
  await candidateB.click();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page.locator(".candidate-detail .detail-actions .badge").filter({ hasText: "Rejected" }).waitFor();
  await page.screenshot({ path: "artifacts/openings-filled-video-state.png", fullPage: true });
  console.log(JSON.stringify({ ok: true, jobTitle, evidence: "artifacts/openings-filled-video-state.png" }));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => undefined);
}
