# Recruitment System Review

## Project

Hireflow — Nowshera Digital ATS.

## Verification status

- End-to-end flow: **14 passed, 0 failed**.
- TypeScript typecheck: **passed**.
- The tested flow covers website loading, admin login, job creation, opening a job, recruiter assignment, candidate application with a PDF CV, AI analysis, recruiter access, and application stage changes.

## Test Case 4 — Openings Filled

### A. Create the job

1. Sign in as Admin.
2. Create a job titled **Frontend Engineer**.
3. Use **Engineering** as the department and **Remote** as the location.
4. Set **Openings** to `1`.
5. Set a future deadline, for example `2099-12-31`.
6. Add this description:

   > Build and maintain responsive web applications using React and Next.js.

7. Add these requirements, one per line:

   ```text
   React
   TypeScript
   Next.js
   JavaScript
   Git
   ```

8. Click **Create draft**.
9. Select the draft and click **Open job**.
10. Assign the job to the recruiter.

### B. Add two applicants

1. Sign in as Candidate 1.
2. Apply for the job and upload a valid PDF CV.
3. Sign out and sign in as Candidate 2.
4. Apply for the same job and upload a valid PDF CV.
5. Confirm both applications are visible to the recruiter.

### C. Hire the first applicant

1. Sign in as Recruiter.
2. Select Candidate 1.
3. Move the application through:

   `Applied → Shortlisted → Interview → Offer → Hired`

4. Confirm Candidate 1 is **Hired**.
5. Confirm the job closes automatically because its only opening is filled.

### D. Verify blocking and rejection

1. Try to submit another application for the filled job.
2. Confirm the new application is blocked with a filled-openings error.
3. Select Candidate 2, who is at **Offer**.
4. Try to move Candidate 2 to **Hired**.
5. Confirm the second hire is blocked.
6. Click **Reject** for Candidate 2.
7. Confirm Candidate 2 changes to **Rejected**.

## Expected final state

- Candidate 1: **Hired**
- Candidate 2: **Rejected**
- Job: **Closed**
- Additional application: **Blocked**
- Second hire: **Blocked**

## Create-draft troubleshooting

The Create draft handler requires:

- An authenticated Admin session.
- A non-empty title, department, location, deadline, description, and openings value.
- A future deadline.
- Openings greater than or equal to `1`.

The expected confirmation message is **Draft job created**.
