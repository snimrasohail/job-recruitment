export type Role = "admin" | "recruiter" | "candidate";
export type Stage =
  | "Applied"
  | "Shortlisted"
  | "Interview"
  | "Offer"
  | "Hired"
  | "Rejected"
  | "Withdrawn";

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Part-time" | "Internship";
  status: "Draft" | "Open" | "Closed";
  applicants: number;
  openings: number;
  deadline: string;
  description: string;
  requirements: string[];
};

export type Application = {
  id: string;
  candidate: string;
  initials: string;
  job: string;
  jobId?: string;
  stage: Stage;
  applied: string;
  cv: string;
  cvId?: string;
  summary: "ready" | "pending" | "missing";
  summaryDetails?: {
    profile_bullets: string[];
    requirements_found: string[];
    requirements_missing: string[];
    interview_questions: string[];
    failure_message?: string | null;
  };
  interview?: string;
  email: string;
};

export type Recruiter = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  jobs: number;
};
