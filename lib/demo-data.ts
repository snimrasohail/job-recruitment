import type { Application, Job, Recruiter } from "./types";

export const demoJobs: Job[] = [
  { id: "job-1", title: "Senior Frontend Engineer", department: "Engineering", location: "Islamabad · Hybrid", type: "Full-time", status: "Open", applicants: 24, openings: 2, deadline: "30 Sep 2026", description: "Own thoughtful product experiences across the Hireflow platform.", requirements: ["4+ years React and TypeScript", "Strong product thinking", "Experience with accessible UI"] },
  { id: "job-2", title: "Product Designer", department: "Design", location: "Remote · Pakistan", type: "Full-time", status: "Open", applicants: 18, openings: 1, deadline: "05 Oct 2026", description: "Shape simple, useful workflows for a growing hiring product.", requirements: ["Portfolio of shipped digital products", "Figma fluency", "Strong communication"] },
  { id: "job-3", title: "Customer Support Associate", department: "Support", location: "Nowshera · On-site", type: "Full-time", status: "Draft", applicants: 0, openings: 3, deadline: "15 Oct 2026", description: "Help customers move through hiring with confidence.", requirements: ["Excellent written communication", "Customer-first mindset"] },
];

export const demoApplications: Application[] = [
  { id: "app-1", candidate: "Ayesha Khan", initials: "AK", job: "Senior Frontend Engineer", stage: "Shortlisted", applied: "Today, 9:42 AM", cv: "ayesha-khan-cv.pdf", summary: "ready", email: "ayesha@example.com" },
  { id: "app-2", candidate: "Hamza Ali", initials: "HA", job: "Senior Frontend Engineer", stage: "Interview", applied: "Yesterday", cv: "hamza-ali-cv.pdf", summary: "ready", interview: "24 Sep · 11:00 AM", email: "hamza@example.com" },
  { id: "app-3", candidate: "Sara Ahmed", initials: "SA", job: "Product Designer", stage: "Applied", applied: "21 Sep 2026", cv: "sara-ahmed-cv.pdf", summary: "pending", email: "sara@example.com" },
  { id: "app-4", candidate: "Bilal Raza", initials: "BR", job: "Senior Frontend Engineer", stage: "Offer", applied: "19 Sep 2026", cv: "bilal-raza-cv.pdf", summary: "ready", email: "bilal@example.com" },
  { id: "app-5", candidate: "Mina Zahid", initials: "MZ", job: "Product Designer", stage: "Rejected", applied: "18 Sep 2026", cv: "mina-zahid-cv.pdf", summary: "ready", email: "mina@example.com" },
];

export const demoRecruiters: Recruiter[] = [
  { id: "rec-1", name: "Nimra Shah", email: "nimra@nowsheradigital.com", active: true, jobs: 2 },
  { id: "rec-2", name: "Omar Khan", email: "omar@nowsheradigital.com", active: true, jobs: 1 },
  { id: "rec-3", name: "Mariam Iqbal", email: "mariam@nowsheradigital.com", active: false, jobs: 0 },
];
