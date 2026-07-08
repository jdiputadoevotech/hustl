# Hustl Sequence Diagrams

Mermaid.js sequence diagrams for every use case in the Hustl platform.

---

## Module: Authentication & Profile

### UC-1: Sign In

```mermaid
sequenceDiagram
    actor U as User (Employee / Student / Admin)
    participant P as Next.js Page (auth/login)
    participant F as LoginForm Component
    participant SA as Server Action (auth)
    participant SA2 as Server Action (profile)
    participant SupA as Supabase Auth
    participant SupDB as Supabase DB (profiles)

    U->>P: Navigate to /auth/login
    P->>F: Render login form
    U->>F: Enter email + password
    F->>SA: submitLogin(email, password)
    SA->>SupA: signInWithPassword({email, password})
    SupA-->>SA: { user, session }
    SA->>SupDB: SELECT * FROM profiles WHERE id = user.id
    SupDB-->>SA: profile row (role, full_name, …)
    SA-->>F: { success: true, profile }
    F->>P: redirectToDashboardOrOnboarding()
    P-->>U: Show dashboard / onboarding
```

---

### UC-2: Sign Up (as Employee or Student)

```mermaid
sequenceDiagram
    actor U as User (Employee / Student)
    participant P as Next.js Page (auth/sign-up)
    participant F as SignUpForm Component
    participant SA as Server Action (auth)
    participant SupA as Supabase Auth
    participant SupDB as Supabase DB
    participant Trigger as DB Trigger (handle_new_user)

    U->>P: Navigate to /auth/sign-up
    P->>F: Render sign-up form
    U->>F: Enter email, password, full_name
    F->>SA: signUp({email, password, full_name})
    SA->>SupA: signUp({email, password, options: { data: { full_name } }})
    SupA-->>SA: { user, session }
    SA->>SupDB: SELECT role FROM profiles WHERE id = user.id
    Note over SupDB,Trigger: Trigger auto-created profile with default role='student'
    SupDB-->>SA: profile (role = 'student')
    SA-->>F: { success: true, profile }
    F->>P: redirectTo('/auth/sign-up-success')
    P-->>U: Show "Check your email" confirmation
```

---

### UC-3: Manage Account & Profile

```mermaid
sequenceDiagram
    actor U as User (Employee / Student / Admin)
    participant P as Next.js Page (profile/edit)
    participant F as EditProfileForm / JobForm / etc.
    participant SA as Server Action (profile)
    participant SupDB as Supabase DB (profiles)

    U->>P: Navigate to /profile/edit
    P->>SA: getProfile()
    SA->>SupDB: SELECT * FROM profiles WHERE id = auth.uid()
    Note over SupDB: RLS: user can update own profile
    SupDB-->>SA: profile row
    SA-->>P: profile data
    P->>F: Render form with current values

    U->>F: Edit fields (name, bio, skills, establishment, socials, …)
    alt Change role (Student → Employee)
        U->>F: Click "Become Employer"
        F->>SA: updateRole('employer')
        SA->>SupDB: UPDATE profiles SET role = 'employer' WHERE id = auth.uid()
        Note over SupDB: RLS: only own row + role check
        SupDB-->>SA: updated profile
    end
    U->>F: Click "Save"
    F->>SA: updateProfile(formData)
    SA->>SupDB: UPDATE profiles SET … WHERE id = auth.uid()
    SupDB-->>SA: updated profile
    SA-->>F: { success: true }
    F->>P: Show success toast + refresh
    P-->>U: Display updated profile
```

---

## Module: Gig Management

### UC-4: Browse / Search / Filter Gigs

```mermaid
sequenceDiagram
    actor S as Student
    actor A as Admin
    participant P as Next.js Page (jobs/)
    participant C as JobCard / FilterBar / SearchInput
    participant SA as Server Action (jobs)
    participant SupDB as Supabase DB (jobs_with_employer view)

    S->>P: Navigate to /jobs
    P->>SA: listJobs({ filters, search, sort })
    SA->>SupDB: SELECT * FROM jobs_with_employer WHERE is_disabled = false AND …
    Note over SupDB: Supports: category, job_type, pay range, location, skills, search text, sort order
    SupDB-->>SA: job rows + employer_name + employer_rating_avg
    SA-->>P: jobs array
    P->>C: Render job cards with filters
    S-->>P: View job list

    S->>C: Adjust filters (category, type, pay, etc.)
    C->>SA: listJobs(updatedFilters)
    SA->>SupDB: Re-query with new WHERE clauses
    SupDB-->>SA: filtered results
    SA-->>C: Update job cards
    C-->>S: Show filtered results

    A->>P: Navigate to /jobs (admin view)
    P->>SA: listJobs({ includeDisabled: true })
    SA->>SupDB: SELECT * FROM jobs_with_employer (no is_disabled filter)
    SupDB-->>SA: all jobs
    SA-->>P: full job list
    P-->>A: Display all gigs including hidden
```

---

### UC-5: View Gig Details

```mermaid
sequenceDiagram
    actor E as Employee
    actor S as Student
    actor A as Admin
    participant P as Next.js Page (jobs/[id])
    participant D as JobDetail Component
    participant SA as Server Action (jobs)
    participant SupDB as Supabase DB (jobs + jobs_with_employer + profiles)
    participant R as ReviewsSection

    S->>P: Navigate to /jobs/{jobId}
    P->>SA: getJob(jobId)
    SA->>SupDB: SELECT * FROM jobs_with_employer WHERE id = jobId
    SupDB-->>SA: job + employer info
    SA->>SupDB: SELECT * FROM profiles WHERE id = employer_id
    SupDB-->>SA: employer profile (establishment, socials, …)
    SA-->>P: { job, employer }
    P->>D: Render job details
    D->>R: Load reviews
    R->>SA: getReviews(employerId)
    SA->>SupDB: SELECT * FROM reviews WHERE employer_id = …
    SupDB-->>SA: review rows
    SA-->>R: reviews data
    R-->>D: Render reviews section
    D-->>S: Display full gig details + employer profile + reviews

    E->>P: Navigate to own job
    P->>SA: getJob(jobId)
    SA->>SupDB: SELECT * FROM jobs WHERE id = jobId AND employer_id = auth.uid()
    SupDB-->>SA: job row (visible to owner even if is_disabled=true)
    SA-->>P: job data
    P-->>E: Show job + edit controls + applicant stats

    A->>P: Navigate to any job
    P->>SA: getJob(jobId)
    SA->>SupDB: SELECT * FROM jobs_with_employer WHERE id = jobId
    SupDB-->>SA: job row (admin sees everything)
    SA-->>P: job data
    P-->>A: Display job + admin controls
```

---

### UC-6: Save / Bookmark Gigs

```mermaid
sequenceDiagram
    actor S as Student
    participant P as Next.js Page (jobs/ or jobs/[id])
    participant B as SaveJobButton Component
    participant SA as Server Action (saved)
    participant SupDB as Supabase DB (saved_jobs)

    S->>P: Browse jobs, see Save button
    P->>B: Render SaveJobButton (heart icon)

    alt Save / Bookmark
        S->>B: Click "Save"
        B->>SA: saveJob(jobId)
        SA->>SupDB: INSERT INTO saved_jobs (student_id, job_id)
        Note over SupDB: RLS: student_id = auth.uid() AND role='student'
        SupDB-->>SA: { success }
        SA-->>B: { saved: true }
        B-->>S: Show filled heart icon
    end

    alt Unsave / Remove Bookmark
        S->>B: Click "Unsave"
        B->>SA: unsaveJob(jobId)
        SA->>SupDB: DELETE FROM saved_jobs WHERE student_id = auth.uid() AND job_id = …
        SupDB-->>SA: { success }
        SA-->>B: { saved: false }
        B-->>S: Show empty heart icon
    end

    S->>P: Navigate to /saved
    P->>SA: getSavedJobs()
    SA->>SupDB: SELECT j.* FROM saved_jobs sj JOIN jobs j ON sj.job_id = j.id WHERE sj.student_id = auth.uid()
    SupDB-->>SA: saved job rows
    SA-->>P: saved jobs list
    P-->>S: Display bookmarked gigs
```

---

### UC-7: Post a Gig

```mermaid
sequenceDiagram
    actor E as Employee
    participant P as Next.js Page (jobs/new)
    participant F as JobForm Component
    participant SA as Server Action (jobs)
    participant SupDB as Supabase DB (jobs)

    E->>P: Navigate to /jobs/new
    P->>F: Render empty job form
    E->>F: Fill in: title, description, job_type, category, pay range, skills, location, work_mode, term, FAQs
    
    alt Save as Draft
        E->>F: Click "Save Draft"
        F->>SA: createJob(data, publish=false)
        SA->>SupDB: INSERT INTO jobs (…, is_disabled = true)
        Note over SupDB: RLS: employer_id = auth.uid() AND role='employer'
        SupDB-->>SA: new job row
        SA-->>F: { success, jobId }
        F->>P: redirectTo(/jobs/{jobId}/edit)
        P-->>E: Show draft saved confirmation
    end

    alt Publish Gig
        E->>F: Click "Post Gig" (with 2–10 valid FAQs)
        F->>SA: createJob(data, publish=true)
        SA->>SA: Validate FAQ count (2–10) and all fields
        SA->>SupDB: INSERT INTO jobs (…, is_disabled = false)
        SupDB-->>SA: new job row
        SA-->>F: { success, jobId }
        F->>P: redirectTo(/jobs/{jobId})
        P-->>E: Show published job + share link
    end
```

---

### UC-8: Manage Posted Gigs & Applicants

```mermaid
sequenceDiagram
    actor E as Employee
    actor A as Admin
    participant P as Next.js Page (dashboard or jobs/[id]/edit)
    participant D as Dashboard / JobManager Component
    participant SA as Server Action (jobs / contracts)
    participant SupDB as Supabase DB (jobs + contracts + profiles)

    E->>P: Navigate to /dashboard
    P->>SA: getEmployerJobs()
    SA->>SupDB: SELECT * FROM jobs WHERE employer_id = auth.uid()
    SupDB-->>SA: job rows
    SA->>SupDB: SELECT * FROM contracts WHERE job_id IN (…)
    SupDB-->>SA: contract rows per job
    SA-->>P: { jobs: [{ …, applicants: […] }] }
    P->>D: Render job list with applicant counts
    D-->>E: Show "My Gigs" dashboard

    E->>D: Click on a gig → manage
    D->>P: Navigate to /jobs/{jobId}/edit
    P->>SA: getJob(jobId)
    SA->>SupDB: SELECT * FROM jobs WHERE id = jobId AND employer_id = auth.uid()
    SupDB-->>SA: job row
    SA-->>P: job data
    P->>D: Render edit form + applicant list

    alt Edit Gig
        E->>D: Update fields, add/remove FAQs
        E->>D: Click "Save Changes"
        D->>SA: updateJob(jobId, data)
        SA->>SupDB: UPDATE jobs SET … WHERE id = jobId AND employer_id = auth.uid()
        Note over SupDB: If FAQs < 2 → is_disabled = true
        SupDB-->>SA: updated row
        SA-->>D: { success }
        D-->>E: Show updated gig
    end

    alt View Applicants / Offers
        E->>D: Click "View Applicants"
        D->>SA: getContractsForJob(jobId)
        SA->>SupDB: SELECT * FROM contracts WHERE job_id = jobId
        SupDB-->>SA: contract rows (Offered, Accepted, …)
        SA->>SupDB: SELECT * FROM profiles WHERE id IN (student_ids)
        SupDB-->>SA: student profiles
        SA-->>D: { contracts, students }
        D-->>E: Show applicant list with status badges
    end

    alt Send Offer to Student
        E->>D: Click "Hire" on applicant
        D->>SA: createContract({ jobId, studentEmail })
        SA->>SupDB: SELECT id FROM profiles WHERE email = studentEmail
        SupDB-->>SA: student_id
        SA->>SupDB: INSERT INTO contracts (job_id, employer_id, student_id, status='Offered')
        Note over SupDB: RLS: employer_id = auth.uid() AND status='Offered'
        SupDB-->>SA: new contract row
        SA-->>D: { success }
        D-->>E: Show "Offer sent" confirmation
    end

    A->>P: Navigate to admin view
    P->>SA: getAllJobsAndContracts()
    SA->>SupDB: SELECT * FROM jobs (no employer filter)
    SA->>SupDB: SELECT * FROM contracts
    SupDB-->>SA: all rows
    SA-->>P: full dataset
    P-->>A: Show all gigs + applicants (admin oversight)
```

---

## Module: Application Process

### UC-9: Apply to a Gig

```mermaid
sequenceDiagram
    actor S as Student
    participant P as Next.js Page (jobs/[id])
    participant D as JobDetail Component
    participant C as ContactEmployerButton / ApplyFlow
    participant SA as Server Action (contracts)
    participant SupDB as Supabase DB (contracts)
    participant M as Messenger (external)

    S->>P: Navigate to /jobs/{jobId}
    P->>SA: getJob(jobId)
    SA->>SupDB: SELECT * FROM jobs_with_employer WHERE id = jobId
    SupDB-->>SA: job + employer info
    SA-->>P: job data
    P->>D: Render job details
    D-->>S: Show gig details + employer messenger link

    S->>C: Click "Contact Employer" / "Apply via Messenger"
    C->>SA: getEmployerMessenger(jobId)
    SA->>SupDB: SELECT messenger_username FROM profiles WHERE id = (SELECT employer_id FROM jobs WHERE id = jobId)
    SupDB-->>SA: messenger_username
    SA-->>C: { messengerUrl: "https://m.me/{username}" }
    C->>M: Open Messenger chat in new tab
    M-->>S: Student messages employer

    alt Employer Sends Offer Back
        Note over E,SupDB: See UC-8 (Employee sends offer)
        SupDB-->>S: Notification: "You have a new offer"
        S->>P: Navigate to /dashboard
        P->>D: Show pending offer
        S->>D: Click "Accept" or "Decline"
        D->>SA: updateContract(contractId, status)
        SA->>SupDB: UPDATE contracts SET status = 'Accepted' (or 'Declined') WHERE id = contractId AND student_id = auth.uid()
        SupDB-->>SA: updated row
        SA-->>D: { success }
        D-->>S: Show updated contract status
    end
```

---

### UC-10: Track Applications

```mermaid
sequenceDiagram
    actor S as Student
    participant P as Next.js Page (dashboard)
    participant D as Dashboard Component
    participant SA as Server Action (contracts)
    participant SupDB as Supabase DB (contracts + jobs + profiles)

    S->>P: Navigate to /dashboard
    P->>SA: getStudentContracts()
    SA->>SupDB: SELECT * FROM contracts WHERE student_id = auth.uid()
    Note over SupDB: RLS: student_id = auth.uid()
    SupDB-->>SA: contract rows
    SA->>SupDB: SELECT * FROM jobs WHERE id IN (contract.job_ids)
    SupDB-->>SA: job rows
    SA->>SupDB: SELECT * FROM profiles WHERE id IN (contract.employer_ids)
    SupDB-->>SA: employer profiles
    SA-->>P: { contracts: [{ job, employer, status, updated_at }] }
    P->>D: Render contract cards
    D-->>S: Show "My Applications" with status:
    Note over D,S: Offered → Accept/Decline<br/>Accepted → In Progress<br/>Completed → Leave Review<br/>Declined/Resigned → Archived

    alt Update Application Status
        S->>D: Click "Accept" on an Offered contract
        D->>SA: updateContract(contractId, 'Accepted')
        SA->>SupDB: UPDATE contracts SET status='Accepted' WHERE id=contractId AND student_id=auth.uid()
        SupDB-->>SA: updated row
        SA-->>D: { success }
        D-->>S: Refresh list, show "Accepted"
    end

    alt Filter / Sort Applications
        S->>D: Select filter (Active, Completed, Declined)
        D->>SA: getStudentContracts({ statusFilter })
        SA->>SupDB: SELECT … WHERE status = filter
        SupDB-->>SA: filtered rows
        SA-->>D: filtered contracts
        D-->>S: Show filtered application list
    end
```

---

## Module: Communication & Feedback

### UC-11: Notifications

```mermaid
sequenceDiagram
    actor E as Employee
    actor S as Student
    actor A as Admin
    participant P as Next.js (any page)
    participant N as NotificationBell / Toast Component
    participant SA as Server Action (contracts / jobs)
    participant SupDB as Supabase DB
    participant SSE as Supabase Realtime / Polling

    S->>P: Navigate to any page
    P->>N: Mount notification component
    N->>SA: getUnreadNotifications()
    SA->>SupDB: Query contracts, jobs, reviews for recent changes
    SupDB-->>SA: recent events
    SA-->>N: { count, items: [{ type, message, link }] }
    N-->>S: Show notification bell with count

    alt Realtime Update
        SupDB->>SSE: NOTIFY on contract status change
        SSE->>N: Push event: "contract_updated"
        N->>SA: getUnreadNotifications()
        SA->>SupDB: Re-query recent changes
        SupDB-->>SA: updated events
        SA-->>N: { newCount, items }
        N-->>S: Show toast + update bell count
    end

    S->>N: Click notification bell
    N->>P: Open dropdown / panel
    N-->>S: Display notification list:
    Note over N,S: "New offer from Employer X"<br/>"Your contract was marked Completed"<br/>"New review received"

    S->>N: Click a notification
    N->>P: Navigate to relevant page (dashboard, job detail, etc.)
    P->>SA: markNotificationRead(id)
    SA->>SupDB: Update notification read status
    P-->>S: Show relevant detail page

    E->>P: Use notifications (same flow)
    A->>P: Admin notifications (system-level alerts)
```

---

### UC-12: Ratings & Reviews

```mermaid
sequenceDiagram
    actor E as Employee
    actor S as Student
    participant P as Next.js Page (dashboard or profile)
    participant R as ReviewForm / ReviewsSection Component
    participant SA as Server Action (reviews)
    participant SupDB as Supabase DB (reviews + contracts + profiles)

    S->>P: Navigate to dashboard after contract completes
    P->>SA: getCompletedContracts()
    SA->>SupDB: SELECT * FROM contracts WHERE student_id = auth.uid() AND status = 'Completed'
    SupDB-->>SA: completed contracts without reviews
    SA-->>P: { contractsAwaitingReview: […] }
    P->>R: Render "Leave a Review" prompts
    R-->>S: Show review form for completed gigs

    S->>R: Fill rating (1-5 stars) + comment
    S->>R: Click "Submit Review"
    R->>SA: createReview({ contractId, employerId, rating, comment })
    SA->>SupDB: Verify contract exists, status='Completed', student_id=auth.uid()
    SupDB-->>SA: contract verified
    SA->>SupDB: INSERT INTO reviews (contract_id, employer_id, reviewer_id, rating, comment)
    Note over SupDB: RLS: reviewer_id = auth.uid() AND contract status = 'Completed'
    SupDB-->>SA: new review row
    SA-->>R: { success }
    R-->>S: Show "Review submitted" confirmation

    S->>P: View employer profile
    P->>R: Load reviews
    R->>SA: getReviews(employerId)
    SA->>SupDB: SELECT * FROM reviews WHERE employer_id = …
    SupDB-->>SA: review rows + reviewer profiles
    SA-->>R: reviews data
    R-->>S: Display employer's rating average + review list

    E->>P: View own profile
    P->>R: Load reviews
    R->>SA: getReviews(employerId = ownId)
    SA->>SupDB: SELECT * FROM reviews WHERE employer_id = auth.uid()
    SupDB-->>SA: review rows
    SA-->>R: reviews
    R-->>E: Show aggregate rating + all reviews
```

---

## Module: Administration

### UC-13: Identity & Content Verification

```mermaid
sequenceDiagram
    actor A as Admin
    participant P as Next.js Page (admin/verification)
    participant V as VerificationDashboard Component
    participant SA as Server Action (admin)
    participant SupDB as Supabase DB (profiles + jobs)

    A->>P: Navigate to admin verification page
    P->>SA: getPendingVerifications()
    SA->>SupDB: SELECT * FROM profiles WHERE verification_status = 'pending'
    SA->>SupDB: SELECT * FROM jobs WHERE is_disabled = true AND employer_id IN (pending profiles)
    SupDB-->>SA: pending profiles + flagged jobs
    SA-->>P: { verifications: […] }
    P->>V: Render verification queue
    V-->>A: Show list of users/jobs awaiting verification

    alt Verify User Identity
        A->>V: Click "Verify" on a profile
        V->>SA: verifyProfile(profileId)
        SA->>SupDB: UPDATE profiles SET role = 'employer', verification_status = 'verified' WHERE id = profileId
        SupDB-->>SA: updated profile
        SA-->>V: { success }
        V-->>A: Show verified status + allow job posting
    end

    alt Reject / Flag Content
        A->>V: Click "Reject" on a profile
        V->>SA: rejectProfile(profileId, reason)
        SA->>SupDB: UPDATE profiles SET verification_status = 'rejected', rejection_reason = reason
        SupDB-->>SA: updated profile
        SA-->>V: { success }
        V-->>A: Show rejection + notify user
    end

    alt Review Flagged Job
        A->>V: Click on a flagged job
        V->>SA: getJobDetails(jobId)
        SA->>SupDB: SELECT * FROM jobs WHERE id = jobId
        SupDB-->>SA: job row + employer profile
        SA-->>V: job details
        V-->>A: Display job content for review
        A->>V: Click "Approve Job" or "Remove Job"
        V->>SA: moderateJob(jobId, action)
        SA->>SupDB: UPDATE jobs SET is_disabled = (action == 'remove') WHERE id = jobId
        SupDB-->>SA: updated job
        SA-->>V: { success }
        V-->>A: Show moderation result
    end
```

---

### UC-14: Admin Dashboard

```mermaid
sequenceDiagram
    actor A as Admin
    participant P as Next.js Page (admin/dashboard)
    participant D as AdminDashboard Component
    participant SA as Server Action (admin)
    participant SupDB as Supabase DB (all tables)

    A->>P: Navigate to /admin/dashboard
    P->>SA: getAdminStats()
    SA->>SupDB: SELECT COUNT(*) FROM profiles WHERE role = 'student'
    SA->>SupDB: SELECT COUNT(*) FROM profiles WHERE role = 'employer'
    SA->>SupDB: SELECT COUNT(*) FROM jobs
    SA->>SupDB: SELECT COUNT(*) FROM contracts
    SA->>SupDB: SELECT COUNT(*) FROM reviews
    SA->>SupDB: SELECT COUNT(*) FROM jobs WHERE is_disabled = true
    SA->>SupDB: SELECT COUNT(*) FROM contracts WHERE status = 'Offered'
    SupDB-->>SA: aggregated stats
    SA-->>P: { stats: { students, employers, jobs, contracts, reviews, pendingJobs, pendingOffers } }
    P->>D: Render dashboard widgets
    D-->>A: Show admin overview:
    Note over D,A: Total Users, Active Jobs<br/>Pending Verifications<br/>Hiring Activity<br/>Recent Reviews

    A->>D: Click "Manage Users"
    D->>P: Navigate to user management view
    P->>SA: getAllUsers()
    SA->>SupDB: SELECT * FROM profiles (bypass RLS via service_role)
    SupDB-->>SA: all profile rows
    SA-->>P: user list
    P-->>A: Display all users with roles + actions

    A->>D: Click "View Reports"
    D->>P: Navigate to reports view
    P->>SA: getPlatformReports()
    SA->>SupDB: Aggregate queries (jobs posted over time, hire rates, review scores)
    SupDB-->>SA: report data
    SA-->>P: charts + tables
    P-->>A: Display analytics dashboard

    A->>D: Click "System Settings"
    D->>SA: updateSystemSettings(settings)
    SA->>SupDB: UPDATE admin_settings SET …
    SupDB-->>SA: updated settings
    SA-->>D: { success }
    D-->>A: Show updated configuration
```

---

## Diagram Index

| # | Use Case | File Section | Actors |
|---|----------|--------------|--------|
| 1 | Sign In | UC-1 | Employee, Student, Admin |
| 2 | Sign Up | UC-2 | Employee, Student |
| 3 | Manage Account & Profile | UC-3 | Employee, Student, Admin |
| 4 | Browse / Search / Filter Gigs | UC-4 | Student, Admin |
| 5 | View Gig Details | UC-5 | Employee, Student, Admin |
| 6 | Save / Bookmark Gigs | UC-6 | Student |
| 7 | Post a Gig | UC-7 | Employee |
| 8 | Manage Posted Gigs & Applicants | UC-8 | Employee, Admin |
| 9 | Apply to a Gig | UC-9 | Student |
| 10 | Track Applications | UC-10 | Student |
| 11 | Notifications | UC-11 | Employee, Student, Admin |
| 12 | Ratings & Reviews | UC-12 | Employee, Student |
| 13 | Identity & Content Verification | UC-13 | Admin |
| 14 | Admin Dashboard | UC-14 | Admin |
