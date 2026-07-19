/**
 * The column list every job-card surface reads off the `jobs_with_employer`
 * view (browse, saved, profile, home). It was duplicated verbatim in four
 * files; keep it here so a new view column reaches all of them at once.
 *
 * Not used by `app/admin/jobs/page.tsx`, which reads a different, narrower
 * projection off the same view (adds is_disabled/employer_id, drops pay+skills).
 */
export const JOB_CARD_SELECT =
  "id, title, category, job_type, pay_min, pay_max, pay_period, skills, location, work_mode, term, is_urgent, created_at, employer_name, employer_establishment_name, employer_verification_status, employer_rating_avg, employer_rating_count";
