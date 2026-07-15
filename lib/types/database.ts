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

/**
 * Account verification state. Users request ('none'/'rejected' -> 'pending');
 * an admin decides ('pending' -> 'verified'|'rejected'). A DB trigger stops
 * users self-setting 'verified'/'rejected'. 'verified' shows a public badge.
 */
export type VerificationStatus = "none" | "pending" | "verified" | "rejected";

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
  archived: boolean; // admin-only; archived users are locked out (proxy-enforced)
  flagged_at: string | null; // admin soft restriction; null = not flagged. Flagged users stay logged in but are write-locked (RLS-enforced). Step before `archived`.
  flag_reason: string | null; // admin's note on why the user was flagged
  flagged_by: string | null; // uuid, FK -> profiles.id (admin who flagged)
  deactivated_at: string | null; // self soft-delete; null = active (distinct from admin `archived`)
  verification_status: VerificationStatus;
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
  employer_verification_status: VerificationStatus; // drives the verified badge on job cards
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
  contract_id: string | null; // uuid, FK -> contracts.id; null once the contract is deleted
  employer_id: string; // uuid, FK -> profiles.id (reviewee)
  reviewer_id: string | null; // uuid, FK -> profiles.id (the student); null once they delete their account
  rating: number; // 1..5
  comment: string | null;
  archived: boolean; // admin soft-delete: hidden everywhere public + excluded from ratings
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/** Kind of event a notification represents. Written by DB triggers (SETUP.md). */
export type NotificationType =
  | "review_received"
  | "offer_received"
  | "offer_status"
  | "verification_requested"
  | "verification_decided"
  | "report_created"
  | "appeal_created";

/**
 * An event shown in the navbar bell dropdown. Created only by SECURITY DEFINER
 * triggers; the recipient reads/marks-read/deletes their own rows. See SETUP.md.
 */
export interface Notification {
  id: string; // uuid
  user_id: string; // uuid, FK -> profiles.id (recipient)
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null; // deep-link target, e.g. /contracts, /profile/{id}
  read: boolean;
  created_at: string; // timestamptz
}

/** What a report points at. All live in one table via a polymorphic target_id. */
export type ReportTargetType = "profile" | "job" | "review";

/** Why the reporter flagged the target. Drives the admin triage dropdown. */
export type ReportReason =
  | "spam"
  | "harassment"
  | "scam"
  | "inappropriate"
  | "other";

/** Triage lifecycle. Admins move open -> resolved|dismissed (and back). */
export type ReportStatus = "open" | "resolved" | "dismissed";

/**
 * A user's report against a profile or a job. target_id is polymorphic (no FK);
 * see SETUP.md. Only admins read these (service-role client); the reported user
 * has no visibility and is never notified.
 */
export interface Report {
  id: string; // uuid
  reporter_id: string; // uuid, FK -> profiles.id (who filed it)
  target_type: ReportTargetType;
  target_id: string; // profiles.id or jobs.id, depending on target_type
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null; // uuid, FK -> profiles.id (admin who closed it)
  resolved_at: string | null; // timestamptz
  created_at: string; // timestamptz
}

/** Appeal lifecycle. Admins move open -> approved (lifts the flag) | denied. */
export type AppealStatus = "open" | "approved" | "denied";

/**
 * A flagged user's appeal of their restriction. Only the flagged user files one
 * (RLS); admins read/resolve via the service-role client. Approving clears the
 * user's flagged_at (done in the resolveAppeal server action). See SETUP.md.
 */
export interface FlagAppeal {
  id: string; // uuid
  user_id: string; // uuid, FK -> profiles.id (the appellant)
  message: string;
  status: AppealStatus;
  reviewed_by: string | null; // uuid, FK -> profiles.id (admin who resolved it)
  reviewed_at: string | null; // timestamptz
  created_at: string; // timestamptz
}
