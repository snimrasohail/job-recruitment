"use client";

import { useEffect, useMemo, useState } from "react";
import { demoApplications, demoJobs } from "../lib/demo-data";
import type { Application, Job, Role, Stage } from "../lib/types";
import { createSupabaseBrowserClient } from "../lib/supabase-client";

const iconMap = {
  grid: "⌘",
  briefcase: "▣",
  users: "♙",
  calendar: "◷",
  settings: "⚙",
  search: "⌕",
  bell: "♢",
  arrow: "→",
  plus: "+",
  download: "↓",
  sparkle: "✦",
};
function Icon({ name }: { name: keyof typeof iconMap }) {
  return <span className={`icon icon-${name}`}>{iconMap[name]}</span>;
}
const stageColors: Record<string, string> = {
  Applied: "blue",
  Shortlisted: "purple",
  Interview: "amber",
  Offer: "teal",
  Hired: "green",
  Rejected: "red",
  Withdrawn: "gray",
  Open: "open",
  Draft: "draft",
  Closed: "closed",
};
function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${stageColors[value] || "gray"}`}>{value}</span>
  );
}
function Avatar({ text, tone = "violet" }: { text: string; tone?: string }) {
  return <span className={`avatar ${tone}`}>{text}</span>;
}
function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
function mapJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    title: String(row.title),
    department: String(row.department),
    location: String(row.location),
    type: row.type as Job["type"],
    status: row.status as Job["status"],
    applicants: 0,
    openings: Number(row.openings),
    deadline: String(row.deadline),
    description: String(row.description),
    requirements: (row.requirements as string[]) || [],
  };
}

export default function Home() {
  const supabase = createSupabaseBrowserClient();
  const [role, setRole] = useState<Role | null>("admin");
  const [jobs, setJobs] = useState<Job[]>(demoJobs);
  const [applications, setApplications] =
    useState<Application[]>(demoApplications);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState("");
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  async function refresh() {
    if (!supabase) return;
    const { data: session } = await supabase.auth.getSession();
    const user = session.session?.user;
    if (!user) {
      setLive(false);
      setUserId(null);
      setEmail(null);
      setRole("admin");
      return;
    }
    setLive(true);
    setUserId(user.id);
    setEmail(user.email || null);
    setRole(null);
    // Do not let demo records remain selectable while live records load.
    setJobs([]);
    setApplications([]);
    const profile = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const metadataRole = user.app_metadata?.role as Role | undefined;
    setRole((profile.data?.role as Role) || metadataRole || "candidate");
    const jobRows = await supabase
      .from("jobs")
      .select(
        "id,title,department,location,type,status,openings,deadline,description,requirements",
      )
      .order("created_at", { ascending: false });
    const currentJobs = (jobRows.data || []).map((row) =>
      mapJob(row as Record<string, unknown>),
    );
    setJobs(currentJobs);
    const appRows = await supabase
      .from("applications")
      .select("id,stage,applied_at,job_id,candidate_id,cv_id")
      .order("applied_at", { ascending: false });
    if (!appRows.data?.length) {
      setApplications([]);
      return;
    }
    const ids = [...new Set(appRows.data.map((row) => row.candidate_id))];
    const profiles = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", ids);
    const profileMap = Object.fromEntries(
      (profiles.data || []).map((row) => [row.id, row]),
    );
    const jobMap = Object.fromEntries(currentJobs.map((job) => [job.id, job]));
    const summaryRows = await supabase
      .from("ai_summaries")
      .select(
        "application_id,status,profile_bullets,requirements_found,requirements_missing,interview_questions,failure_message",
      )
      .in(
        "application_id",
        appRows.data.map((row) => row.id),
      );
    const summaryMap = Object.fromEntries(
      (summaryRows.data || []).map((row) => [row.application_id, row]),
    );
    setApplications(
      appRows.data.map((row) => {
        const person = profileMap[row.candidate_id] || {
          full_name: "Candidate",
          email: "",
        };
        const summary = summaryMap[row.id];
        return {
          id: row.id,
          candidate: person.full_name,
          initials: initials(person.full_name),
          job: jobMap[row.job_id]?.title || "Job",
          jobId: row.job_id,
          stage: row.stage as Stage,
          applied: new Date(row.applied_at).toLocaleDateString(),
          cv: "Application CV",
          cvId: row.cv_id,
          summary:
            summary?.status === "completed"
              ? "ready"
              : summary?.status === "pending" ||
                  summary?.status === "processing"
                ? "pending"
                : "missing",
          summaryDetails: summary
            ? {
                profile_bullets: (summary.profile_bullets as string[]) || [],
                requirements_found:
                  (summary.requirements_found as string[]) || [],
                requirements_missing:
                  (summary.requirements_missing as string[]) || [],
                interview_questions:
                  (summary.interview_questions as string[]) || [],
                failure_message: summary.failure_message,
              }
            : undefined,
          email: person.email,
        };
      }),
    );
  }
  useEffect(() => {
    if (!supabase) return;
    refresh();
    const listener = supabase.auth.onAuthStateChange(() => refresh());
    return () => listener.data.subscription.unsubscribe();
  }, []);

  async function createJob(input: {
    title: string;
    department: string;
    location: string;
    type: Job["type"];
    description: string;
    requirements: string[];
    deadline: string;
    openings: number;
  }): Promise<boolean> {
    if (!supabase || !userId) {
      notify("Sign in as admin first");
      return false;
    }
    const result = await supabase
      .from("jobs")
      .insert({ ...input, status: "Draft", created_by: userId });
    if (result.error) {
      notify(result.error.message);
      return false;
    }
    await refresh();
    notify("Draft job created");
    return true;
  }

  const content =
    role === null ? (
      <section className="panel loading-state">
        <span className="spinner-dot">•</span>
        <h2>Loading your workspace</h2>
        <p className="muted">Checking your account permissions…</p>
      </section>
    ) : role === "admin" ? (
      <AdminView
        jobs={jobs}
        live={live}
        applications={applications}
        notify={notify}
        onRefresh={refresh}
        onCreateJob={createJob}
      />
    ) : role === "recruiter" ? (
      <RecruiterView jobs={jobs} applications={applications} live={live} notify={notify} />
    ) : (
      <CandidateView
        jobs={jobs}
        applications={applications}
        userId={userId}
        live={live}
        notify={notify}
        onRefresh={refresh}
      />
    );
  return (
    <div className="app-shell">
      <Sidebar role={role || "admin"} live={live} email={email} />
      <main className="main">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">H</span> hireflow
          </div>
          <div className="breadcrumbs">
            <span>Workspace</span>
            <b>/</b>
            <strong>{role}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button">
              <Icon name="search" />
            </button>
            <button className="icon-button notification">
              <Icon name="bell" />
              <i />
            </button>
            {email ? (
              <button
                type="button"
                className="session-chip"
                title={email}
                onClick={() => {
                  void supabase?.auth.signOut();
                  window.location.assign("/login");
                }}
              >
                Sign out
              </button>
            ) : (
              <a className="auth-link" href="/login">
                Sign in
              </a>
            )}
            {live ? (
              <span className="connected-chip">
                <span className="demo-dot" /> Live
              </span>
            ) : (
              <div className="role-switcher">
                <span className="demo-dot" /> Demo{" "}
                <select
                  value={role || "admin"}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  <option value="admin">Admin</option>
                  <option value="recruiter">Recruiter</option>
                  <option value="candidate">Candidate</option>
                </select>
              </div>
            )}
          </div>
        </header>
        <div className="content">
          {content}
          {live && role && (
            <LiveActions
              role={role}
              jobs={jobs}
              applications={applications}
              notify={notify}
              onRefresh={refresh}
            />
          )}
        </div>
      </main>
      {toast && (
        <div className="toast">
          <span className="toast-check">✓</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function Sidebar({
  role,
  live,
  email,
}: {
  role: Role;
  live: boolean;
  email: string | null;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">H</span>
        <span>
          hire<span>flow</span>
        </span>
      </div>
      <div className="workspace">
        <span className="workspace-dot" /> Nowshera Digital{" "}
        <span className="chevron">⌄</span>
      </div>
      <p className="nav-label">Workspace</p>
      <nav>
        {[
          ["Overview", "grid"],
          ["Jobs", "briefcase"],
          ["Applications", "users"],
          ["Interviews", "calendar"],
          ["Recruiters", "users"],
        ].map(([label, icon]) => (
          <button
            key={label}
            className={`nav-item ${label === "Overview" ? "active" : ""}`}
          >
            <Icon name={icon as keyof typeof iconMap} />
            {label}
          </button>
        ))}
      </nav>
      <p className="nav-label bottom-label">Manage</p>
      <button className="nav-item">
        <Icon name="settings" />
        Settings
      </button>
      <div className="sidebar-bottom">
        <div className="help-card">
          <span className="help-icon">?</span>
          <strong>Need a hand?</strong>
          <span>Read our quick guide</span>
        </div>
        <div className="profile-mini">
          <Avatar
            text={email ? initials(email.split("@")[0]) : "NS"}
            tone="navy"
          />
          <div>
            <strong>{email || "Demo workspace"}</strong>
            <span>{live ? role : "Preview mode"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AdminView({
  jobs,
  applications,
  live,
  notify,
  onRefresh,
  onCreateJob,
}: {
  jobs: Job[];
  applications: Application[];
  live: boolean;
  notify: (message: string) => void;
  onRefresh: () => Promise<void>;
  onCreateJob: (input: {
    title: string;
    department: string;
    location: string;
    type: Job["type"];
    description: string;
    requirements: string[];
    deadline: string;
    openings: number;
  }) => Promise<boolean>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "Engineering",
    location: "Remote",
    type: "Full-time" as Job["type"],
    description: "",
    requirements: "",
    deadline: "",
    openings: 1,
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await onCreateJob({
      ...form,
      requirements: form.requirements
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    if (created) setShowForm(false);
  };
  async function openDraft(job: Job) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return notify("Sign in as Admin first");
    const result = await supabase
      .from("jobs")
      .update({ status: "Open" })
      .eq("id", job.id);
    if (result.error) return notify(result.error.message);
    await onRefresh();
    notify("Job opened");
  }
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      setShowForm(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  return (
    <>
      <SectionTitle
        eyebrow={live ? "Live admin workspace" : "Demo workspace"}
        title="Good morning, Nimra"
        description="Manage roles, recruiters, and the hiring pipeline."
        action={
          live ? (
            <button
              id="create-job-button"
              data-testid="create-job-button"
              className="button primary"
              onClick={() => setShowForm(true)}
            >
              <Icon name="plus" />
              Create a job
            </button>
          ) : (
            <a className="button primary" href="/login?next=create-job">
              <Icon name="plus" />
              Sign in to create
            </a>
          )
        }
      />
      {showForm && (
        <form className="panel job-form" onSubmit={submit}>
          <div className="panel-head">
            <div>
              <h2>Create a job</h2>
              <p className="muted">It starts as Draft.</p>
            </div>
            <button
              type="button"
              className="more-button"
              onClick={() => setShowForm(false)}
            >
              ×
            </button>
          </div>
          <div className="form-grid">
            <label>
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Department
              <input
                required
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </label>
            <label>
              Location
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as Job["type"] })
                }
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Internship</option>
              </select>
            </label>
            <label>
              Deadline
              <input
                required
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>
            <label>
              Openings
              <input
                required
                min="1"
                type="number"
                value={form.openings}
                onChange={(e) =>
                  setForm({ ...form, openings: Number(e.target.value) })
                }
              />
            </label>
            <label className="full-field">
              Description
              <textarea
                required
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label className="full-field">
              Requirements
              <textarea
                value={form.requirements}
                onChange={(e) =>
                  setForm({ ...form, requirements: e.target.value })
                }
              />
            </label>
          </div>
          <div className="detail-footer">
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              id="create-draft-button"
              data-testid="create-draft-button"
              type="submit"
              className="button primary"
            >
              Create draft
            </button>
          </div>
        </form>
      )}
      <div className="metric-grid">
        <Metric
          label="Open roles"
          value={String(jobs.filter((job) => job.status === "Open").length)}
          change={live ? "Live" : "Demo"}
          tone="blue"
          icon="briefcase"
        />
        <Metric
          label="Applicants"
          value={live ? String(applications.length) : "124"}
          change="All stages"
          tone="purple"
          icon="users"
        />
        <Metric
          label="Interviews"
          value={
            live
              ? String(
                  applications.filter((app) => app.stage === "Interview")
                    .length,
                )
              : "12"
          }
          change="Scheduled"
          tone="amber"
          icon="calendar"
        />
        <Metric
          label="Final decisions"
          value={
            live
              ? String(
                  applications.filter((app) =>
                    ["Hired", "Rejected"].includes(app.stage),
                  ).length,
                )
              : "—"
          }
          change="Hired or rejected"
          tone="green"
          icon="sparkle"
        />
      </div>
      <section className="panel jobs-panel">
        <div className="panel-head">
          <div>
            <h2>Jobs at a glance</h2>
            <p className="muted">
              {live ? "Live records from Supabase" : "Demo records"}
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>OPENINGS</th>
                <th>DEADLINE</th>
                {live && <th>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className="job-cell">
                      <span className="job-icon">
                        <Icon name="briefcase" />
                      </span>
                      <div>
                        <strong>{job.title}</strong>
                        <span>
                          {job.department} · {job.location}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge value={job.status} />
                  </td>
                  <td>{job.openings}</td>
                  <td>{job.deadline}</td>
                  {live && (
                    <td>
                      {job.status === "Draft" && (
                        <button
                          type="button"
                          className="button secondary small"
                          data-testid={`table-open-job-${job.id}`}
                          onClick={() => openDraft(job)}
                        >
                          Open job
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function RecruiterView({
  jobs,
  applications,
  live,
  notify,
}: {
  jobs: Job[];
  applications: Application[];
  live: boolean;
  notify: (message: string) => void;
}) {
  const [selected, setSelected] = useState<Application | null>(
    applications[0] || null,
  );
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    setSelected(applications[0] || null);
  }, [applications.length]);
  if (!selected)
    return (
      <>
        <SectionTitle
          eyebrow="Recruiter workspace"
          title="Your applicant queue"
          description="Assigned applications will appear here."
        />
        <div className="panel empty-state">
          <h2>Waiting for candidates</h2>
          <p className="muted">No assigned applications yet.</p>
        </div>
      </>
    );
  const current = selected;
  const currentJob = jobs.find((item) => item.id === current.jobId);
  const stages: Stage[] = [
    "Applied",
    "Shortlisted",
    "Interview",
    "Offer",
    "Hired",
  ];
  const next = stages[stages.indexOf(current.stage) + 1];
  async function changeStage(stage: Stage) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const result = await supabase
      .from("applications")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", current.id);
    if (result.error) return notify(result.error.message);
    if (stage === "Hired" && current.jobId) {
      const closedJob = await supabase
        .from("jobs")
        .select("status")
        .eq("id", current.jobId)
        .maybeSingle();
      if (closedJob.data?.status === "Closed") {
        notify("Application moved to Hired · Job closed automatically");
      } else {
        notify(`Application moved to ${stage}`);
      }
    } else {
      notify(`Application moved to ${stage}`);
    }
    setSelected({ ...current, stage });
  }
  async function retryAiSummary() {
    setRetrying(true);
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ application_id: current.id }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      error?: string;
    };
    setRetrying(false);
    if (!response.ok || !result.ok)
      return notify(result.error || "AI analysis failed");
    notify("AI summary updated");
    window.location.reload();
  }
  return (
    <>
      <SectionTitle
        eyebrow={live ? "Live recruiter workspace" : "Demo workspace"}
        title="Your applicant queue"
        description="Review candidates and keep every next step moving."
      />
      <div className="recruiter-layout">
        <section className="panel applicants-panel">
          <div className="panel-head">
            <div>
              <h2>
                Applicants{" "}
                <span className="count-pill">{applications.length}</span>
              </h2>
              <p className="muted">Assigned applications</p>
            </div>
          </div>
          <div className="applicant-list">
            {applications.map((app) => (
              <button
                className={`applicant-row ${current.id === app.id ? "selected" : ""}`}
                key={app.id}
                onClick={() => setSelected(app)}
              >
                <Avatar text={app.initials} />
                <span className="applicant-info">
                  <strong>{app.candidate}</strong>
                  <small>{app.job} · {app.applied}</small>
                </span>
                <Badge value={app.stage} />
                <span className="row-arrow">›</span>
              </button>
            ))}
          </div>
        </section>
        <section className="panel candidate-detail">
          <div className="candidate-hero">
            <Avatar text={current.initials} />
            <div>
              <p className="eyebrow">Candidate profile</p>
              <h2>{current.candidate}</h2>
              <p className="muted">
                {current.email} · {current.job}
              </p>
            </div>
          </div>
          <div className="detail-actions">
            <Badge value={current.stage} />
            {next && (
              <button
                className="button primary small"
                onClick={() => changeStage(next)}
              >
                Move to {next} <Icon name="arrow" />
              </button>
            )}
            {current.stage !== "Hired" &&
              current.stage !== "Rejected" &&
              current.stage !== "Withdrawn" && (
                <button
                  className="button danger-ghost"
                  onClick={() => changeStage("Rejected")}
                >
                  Reject
                </button>
              )}
          </div>
          {currentJob?.status === "Closed" && (
            <div className="job-closed-notice">
              <strong>Job closed automatically</strong>
              <span>All openings are filled, so no new applications or hires are allowed.</span>
            </div>
          )}
          <div className="detail-section ai-card">
            <div className="ai-heading">
              <span className="ai-icon">✦</span>
              <div>
                <h3>
                  AI summary <span>Assistant</span>
                </h3>
                <p className="muted">
                  {current.summary === "ready"
                    ? "Evidence-based recruiter summary"
                    : current.summary === "pending"
                      ? "AI analysis is processing"
                      : "Summary unavailable"}
                </p>
              </div>
            </div>
            {current.summary === "ready" ? (
              <div className="summary-content">
                <p>{current.summaryDetails?.profile_bullets?.[0]}</p>
                <div className="summary-columns">
                  <div>
                    <strong>Matching skills</strong>
                    <span>
                      {current.summaryDetails?.requirements_found?.join(", ") ||
                        "None recorded"}
                    </span>
                  </div>
                  <div>
                    <strong>Missing requirements</strong>
                    <span>
                      {current.summaryDetails?.requirements_missing?.join(
                        ", ",
                      ) || "None recorded"}
                    </span>
                  </div>
                </div>
                {current.summaryDetails?.interview_questions?.length ? (
                  <div className="summary-questions">
                    <strong>Interview questions</strong>
                    <ol>
                      {current.summaryDetails.interview_questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="empty-summary">
                <strong>
                  {current.summary === "pending"
                    ? "Summary is processing"
                    : "Summary not available yet"}
                </strong>
                <p>
                  {current.summaryDetails?.failure_message ||
                    "The application is saved safely without AI."}
                </p>
                <button
                  className="button secondary small"
                  disabled={retrying}
                  onClick={retryAiSummary}
                >
                  {retrying ? "Trying again…" : "Try again"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function CandidateView({
  jobs,
  applications,
  userId,
  live,
  notify,
  onRefresh,
}: {
  jobs: Job[];
  applications: Application[];
  userId: string | null;
  live: boolean;
  notify: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  async function apply() {
    if (submitting) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !userId || !job || !file)
      return notify("Choose a PDF CV first");
    if (file.type !== "application/pdf" || file.size > 2 * 1024 * 1024)
      return notify("CV must be a PDF no larger than 2 MB");

    setSubmitting(true);
    try {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const upload = await supabase.storage
        .from("candidate-cvs")
        .upload(path, file, { contentType: "application/pdf" });
      if (upload.error) throw new Error(upload.error.message);

      const cv = await supabase
        .from("candidate_cvs")
        .insert({
          candidate_id: userId,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select("id")
        .single();
      if (cv.error) throw new Error(cv.error.message);

      const result = await supabase
        .from("applications")
        .insert({ job_id: job.id, candidate_id: userId, cv_id: cv.data.id })
        .select("id")
        .single();
      if (result.error) throw new Error(result.error.message);

      // The application is complete as soon as the database insert succeeds.
      // AI analysis is intentionally non-blocking so a slow/optional AI service
      // cannot make the Submit button appear stuck.
      const submittedApplicationId = result.data.id;
      void fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ application_id: submittedApplicationId }),
      }).catch(() => undefined);
      setJob(null);
      setFile(null);
      setSubmitting(false);
      notify("Application submitted");
      // Refresh the list in the background; a slow read must not delay the
      // success feedback after the application has already been saved.
      void onRefresh().catch(() => undefined);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Application could not be submitted");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <>
      <SectionTitle
        eyebrow={live ? "Live candidate portal" : "Demo portal"}
        title="Welcome back"
        description="Track applications and discover your next opportunity."
        action={
          <a className="button primary" href="#open-jobs">
            <Icon name="plus" />
            Browse jobs
          </a>
        }
      />
      <section className="panel jobs-panel">
        <div className="panel-head">
          <div>
            <h2>My applications</h2>
            <p className="muted">
              {live ? "Live applications" : "Demo applications"}
            </p>
          </div>
        </div>
        <div className="candidate-applications">
          {applications.length ? (
            applications.map((app) => (
              <div className="candidate-application" key={app.id}>
                <div className="application-main">
                  <span className="job-icon">
                    <Icon name="briefcase" />
                  </span>
                  <div>
                    <strong>{app.job}</strong>
                    <span>{app.applied}</span>
                  </div>
                </div>
                <Badge value={app.stage} />
              </div>
            ))
          ) : (
            <div className="empty-state compact">
              <h3>No applications yet</h3>
              <p className="muted">Browse an open job below to apply.</p>
            </div>
          )}
        </div>
      </section>
      <section id="open-jobs" className="panel jobs-panel job-browser">
        <div className="panel-head">
          <div>
          <h2>Jobs</h2>
            <p className="muted">Open jobs accept applications with a PDF CV.</p>
          </div>
        </div>
        <div className="job-cards">
          {jobs.map((item) => {
            const expired = item.deadline < today;
            const unavailable = item.status !== "Open" || expired;
            const label = expired ? "Expired" : item.status;
            return (
            <div className="job-card" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.department} · {item.location}
                </p>
                <Badge value={label} />
              </div>
              <button
                className="button secondary small"
                disabled={unavailable}
                onClick={() => setJob(item)}
              >
                {unavailable ? label : <>Apply <Icon name="arrow" /></>}
              </button>
            </div>
            );
          })}
        </div>
      </section>
      {job && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-head">
              <div>
                <h2>Apply for {job.title}</h2>
                <p className="muted">Your CV is saved with this application.</p>
              </div>
              <button className="more-button" onClick={() => setJob(null)}>
                ×
              </button>
            </div>
            <label className="upload-box">
              Upload PDF CV
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <span>{file.name}</span>}
            </label>
            <div className="detail-footer">
              <button className="button secondary" onClick={() => setJob(null)}>
                Cancel
              </button>
              <button className="button primary" onClick={apply} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LiveActions({
  role,
  jobs,
  applications,
  notify,
  onRefresh,
}: {
  role: Role;
  jobs: Job[];
  applications: Application[];
  notify: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const supabase = createSupabaseBrowserClient();
  const [jobId, setJobId] = useState(jobs[0]?.id || "");
  const [appId, setAppId] = useState(applications[0]?.id || "");
  const [email, setEmail] = useState("");
  const [starts, setStarts] = useState("");
  const [link, setLink] = useState("");
  const [workflowError, setWorkflowError] = useState("");
  useEffect(() => {
    if (!jobs.some((item) => item.id === jobId)) setJobId(jobs[0]?.id || "");
  }, [jobs, jobId]);
  useEffect(() => {
    if (!applications.some((item) => item.id === appId))
      setAppId(applications[0]?.id || "");
  }, [applications, appId]);
  const job = jobs.find((item) => item.id === jobId);
  const app = applications.find((item) => item.id === appId);
  async function status() {
    setWorkflowError("");
    if (!supabase || !job) {
      setWorkflowError("Select a job first");
      return;
    }
    const next = job.status === "Draft" ? "Open" : "Closed";
    const result = await supabase
      .from("jobs")
      .update({ status: next })
      .eq("id", job.id);
    if (result.error) {
      setWorkflowError(result.error.message);
      return notify(result.error.message);
    }
    await onRefresh();
    notify(`Job ${next.toLowerCase()}`);
  }
  async function assign() {
    const recruiterEmail = email.trim().toLowerCase();
    if (!supabase || !job || !recruiterEmail)
      return notify("Enter a recruiter email");
    const person = await supabase
      .from("profiles")
      .select("id")
      .eq("email", recruiterEmail)
      .eq("role", "recruiter")
      .single();
    if (person.error) return notify("Recruiter not found");
    const result = await supabase
      .from("job_recruiters")
      .upsert({ job_id: job.id, recruiter_id: person.data.id });
    if (result.error) return notify(result.error.message);
    setEmail("");
    notify("Recruiter assigned");
  }
  async function schedule() {
    setWorkflowError("");
    if (!supabase || !app || !starts) {
      const message = "Choose an interview time";
      setWorkflowError(message);
      return notify(message);
    }
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      const message = "Sign in again";
      setWorkflowError(message);
      return notify(message);
    }
    const start = new Date(starts);
    const result = await supabase.from("interviews").insert({
      application_id: app.id,
      recruiter_id: user.data.user.id,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 3600000).toISOString(),
      meeting_url: link || null,
    });
    if (result.error) {
      setWorkflowError(result.error.message);
      return notify(result.error.message);
    }
    const update = await supabase
      .from("applications")
      .update({ stage: "Interview", updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (update.error) {
      setWorkflowError(update.error.message);
      return notify(update.error.message);
    }
    await onRefresh();
    notify("Interview scheduled");
  }
  async function withdraw() {
    if (!supabase || !app) return;
    const result = await supabase
      .from("applications")
      .update({ stage: "Withdrawn", updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (result.error) return notify(result.error.message);
    await onRefresh();
    notify("Application withdrawn");
  }
  async function preview() {
    if (!supabase || !app?.cvId) return notify("CV is not available");
    const row = await supabase
      .from("candidate_cvs")
      .select("storage_path")
      .eq("id", app.cvId)
      .single();
    if (row.error) return notify(row.error.message);
    const url = await supabase.storage
      .from("candidate-cvs")
      .createSignedUrl(row.data.storage_path, 60);
    if (url.error) return notify(url.error.message);
    window.open(url.data.signedUrl, "_blank", "noopener,noreferrer");
  }
  if (role === "admin")
    return (
      <section className="panel workflow-actions">
        <div className="workflow-head">
          <div>
            <p className="eyebrow">Live controls</p>
            <h2>Job operations</h2>
            <p className="muted">Open or close jobs and assign recruiters.</p>
          </div>
        </div>
        {job ? (
          <div className="workflow-grid">
            {workflowError && <p className="workflow-error">{workflowError}</p>}
            <label>
              Job
              <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                {jobs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="workflow-buttons">
              <button
                id="open-job-button"
                data-testid="open-job-button"
                type="button"
                className="button primary small"
                onClick={status}
              >
                {job.status === "Draft" ? "Open job" : "Close job"}
              </button>
            </div>
            <label>
              Recruiter email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@test.com"
              />
            </label>
            <div className="workflow-buttons">
              <button className="button secondary small" onClick={assign}>
                Assign recruiter
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">Create a job first.</p>
        )}
      </section>
    );
  if (role === "recruiter")
    return (
      <section className="panel workflow-actions">
        <div className="workflow-head">
          <div>
            <p className="eyebrow">Live controls</p>
            <h2>Interview and CV tools</h2>
            <p className="muted">
              Schedule a one-hour interview or preview a private CV.
            </p>
          </div>
        </div>
        {app ? (
          <div className="workflow-grid">
            {workflowError && <p className="workflow-error">{workflowError}</p>}
            <label>
              Application
              <select value={appId} onChange={(e) => setAppId(e.target.value)}>
                {applications.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.candidate} · {item.stage}
                  </option>
                ))}
              </select>
            </label>
            <div className="workflow-buttons">
              <button className="button secondary small" onClick={preview}>
                Preview private CV
              </button>
            </div>
            {app.stage === "Shortlisted" && (
              <>
                <label>
                  Interview time
                  <input
                    type="datetime-local"
                    value={starts}
                    onChange={(e) => setStarts(e.target.value)}
                  />
                </label>
                <label>
                  Meeting link
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://meet.example.com/..."
                  />
                </label>
                <div className="workflow-buttons">
                  <button className="button primary small" onClick={schedule}>
                    Schedule interview
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="muted">No assigned applications.</p>
        )}
      </section>
    );
  if (role === "candidate")
    return (
      <section className="panel workflow-actions">
        <div className="workflow-head">
          <div>
            <p className="eyebrow">Live controls</p>
            <h2>Application actions</h2>
            <p className="muted">Withdraw an active application when needed.</p>
          </div>
        </div>
        {app && !["Hired", "Rejected", "Withdrawn"].includes(app.stage) ? (
          <div className="workflow-grid">
            <label>
              Application
              <select value={appId} onChange={(e) => setAppId(e.target.value)}>
                {applications.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.job} · {item.stage}
                  </option>
                ))}
              </select>
            </label>
            <div className="workflow-buttons">
              <button className="button danger-ghost small" onClick={withdraw}>
                Withdraw application
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">No withdrawable applications.</p>
        )}
      </section>
    );
  return null;
}

function Metric({
  label,
  value,
  change,
  tone,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  tone: string;
  icon: keyof typeof iconMap;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <span className="metric-label">{label}</span>
        <strong className="metric-value">{value}</strong>
        <span className={`metric-change ${tone}`}>{change}</span>
      </div>
    </div>
  );
}
