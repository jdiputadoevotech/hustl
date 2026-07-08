/**
 * Shared database entity types for Hustl (student job board).
 *
 * These hand-written interfaces mirror the Postgres schema in SETUP.md
 * (profiles, jobs, contracts, reviews). Import them across pages and server
 * actions instead of redeclaring shapes, e.g.:
 *
 *   import type { Job, ContractStatus } from "@/lib/types/database";
 */

/** Kind of posting. Drives which pay fields apply. */
export type JobType = "gig" | "part-time" | "full-time";

/** Pay cadence. 'project' is for gigs; the rest are salary rates. */
export type PayPeriod = "project" | "hourly" | "weekly" | "monthly";

/** Where the work happens. Null when the employer left it unset. */
export type WorkMode = "on-site" | "remote" | "hybrid";

/** Account role. A label for now — RLS still lets anyone post or be hired. */
export type Role = "student" | "employer" | "admin";

/** A single question/answer pair shown in a job's FAQ accordion. */
export interface Faq {
  question: string;
  answer: string;
}

/** Establishment social links. Stored as jsonb; all keys optional. */
export interface Socials {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

/** Lifecycle of a hiring contract. Matches the CHECK on contracts.status. */
export type ContractStatus =
  | "Offered"
  | "Accepted"
  | "Declined"
  | "Completed"
  | "Resigned";

/**
 * A user profile. Row id matches auth.users.id (1:1 with Supabase Auth).
 * Everyone starts a 'student'; the become-employer flow flips role to
 * 'employer' (blocked for .edu emails). The establishment fields are the
 * poster's company (employer) or school (student).
 */
export interface Profile {
  id: string; // uuid, FK -> auth.users.id
  full_name: string | null;
  role: Role; // defaults to 'student'
  messenger_username: string | null; // used for m.me/<username> handoff
  bio: string | null;
  skills: string[] | null;
  establishment_name: string | null; // company (employer) / school (student); blank employer => independent
  establishment_description: string | null;
  website_url: string | null;
  socials: Socials; // jsonb, defaults to {}
  contracts_hidden: boolean; // student hides their contracts from public profile
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** A job posting created by an employer (any authenticated user). */
export interface Job {
  id: string; // uuid
  employer_id: string; // uuid, FK -> profiles.id
  title: string;
  description: string | null;
  job_type: JobType;
  category: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: PayPeriod;
  skills: string[]; // required skills, rendered as badges
  location: string | null;
  work_mode: WorkMode | null;
  term: string | null; // free-text duration, e.g. "3-4 days"
  is_urgent: boolean;
  faqs: Faq[]; // employer Q&A, 2–10 to be publicly listed
  is_disabled: boolean; // hidden from public listings (manual draft or <2 FAQs)
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/**
 * Row shape of the `jobs_with_employer` view: every job column plus the
 * employer's name and aggregate rating. Read by the browse grid + profiles.
 */
export interface JobWithEmployer extends Job {
  employer_name: string | null;
  employer_establishment_name: string | null; // employer's establishment_name (company)
  employer_rating_avg: number; // 0 when no reviews
  employer_rating_count: number;
}

/** The hiring relationship between an employer, a job, and a hired student. */
export interface Contract {
  id: string; // uuid
  job_id: string; // uuid, FK -> jobs.id
  employer_id: string; // uuid, FK -> profiles.id (job poster)
  student_id: string; // uuid, FK -> profiles.id (hired student)
  status: ContractStatus;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** A job a student bookmarked for later. One row per (student, job). */
export interface SavedJob {
  id: string; // uuid
  student_id: string; // uuid, FK -> profiles.id
  job_id: string; // uuid, FK -> jobs.id
  created_at: string; // timestamptz
}

/**
 * A 1–5 star review left by a student for an employer after a contract
 * Completes. One per contract; eligibility enforced by RLS. See SETUP.md.
 */
export interface Review {
  id: string; // uuid
  contract_id: string; // uuid, FK -> contracts.id
  employer_id: string; // uuid, FK -> profiles.id (reviewee)
  reviewer_id: string; // uuid, FK -> profiles.id (the student)
  rating: number; // 1..5
  comment: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
