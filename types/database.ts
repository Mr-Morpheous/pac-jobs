export type UserRole = "seeker" | "employer" | "admin";
// Order matches the enums in Postgres, which are in workflow order so
// `order by status` sorts the way a person reads it. See migration 014.
export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "shortlisted"
  | "rejected"
  | "hired";
export type JobStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "paused"
  | "expired"
  | "closed";
export type JobType = "full_time" | "part_time" | "freelance" | "contract" | "internship";
export type EmploymentLevel = "entry" | "mid" | "senior" | "executive";
// Ascending order matches the Postgres enum declaration (migration 033) —
// the meets_requirements trigger compares these ordinally ("at least this
// level"), so the order here and in the enum must stay in step.
export type EducationLevel =
  | "high_school"
  | "certificate"
  | "diploma"
  | "bachelors"
  | "masters"
  | "doctorate";
export type NoticePeriod =
  | "immediate"
  | "two_weeks"
  | "one_month"
  | "two_months"
  | "three_plus_months";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[] | null;
  address: string | null;
  linkedin_url: string | null;
  cv_url: string | null;
  company_id: string | null;
  /** Set by an admin only (migration 017). */
  suspended_at: string | null;
  // Notification preferences (migration 028).
  notify_email: boolean;
  notify_new_jobs: boolean;
  notify_pending_review: boolean;
  // Dashboard personalization (migration 030).
  dashboard_landing: string | null;
  dashboard_density: "comfortable" | "compact";
  // Hiring profile depth (migration 033).
  years_experience: number | null;
  education_level: EducationLevel | null;
  industry_category_id: string | null;
  expected_salary: number | null;
  current_salary: number | null;
  notice_period: NoticePeriod | null;
  created_at: string;
  updated_at: string;
}

/** Migration 033. One row per school/qualification, delete-and-re-add only. */
export type ProfileEducation = {
  id: string;
  profile_id: string;
  school_name: string;
  field_of_study: string | null;
  level: EducationLevel | null;
  start_year: number | null;
  end_year: number | null;
  created_at: string;
}

/** Migration 033. One row per job, delete-and-re-add only. */
export type ProfileWorkExperience = {
  id: string;
  profile_id: string;
  company_name: string;
  job_title: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  created_at: string;
}

export type Company = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  size: string | null;
  verified: boolean;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export type JobCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
}

export type JobLocation = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  created_at: string;
}

export type Job = {
  id: string;
  company_id: string | null;
  posted_by: string | null;
  title: string;
  slug: string;
  description: string;
  requirements: string | null;
  qualifications: string | null;
  /** Migration 031. Same shape as Profile.skills, for lib/match.ts overlap scoring. */
  required_skills: string[] | null;
  // Requirements the compute_meets_requirements() trigger flags against (migration 033).
  required_years_experience: number | null;
  required_education_level: EducationLevel | null;
  required_industry_category_id: string | null;
  category_id: string | null;
  location_id: string | null;
  location_text: string | null;
  job_type: JobType;
  employment_level: EmploymentLevel;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  is_remote: boolean;
  status: JobStatus;
  is_featured: boolean;
  application_deadline: string | null;
  views: number;
  rejection_reason: string | null;
  /** Stamped when an admin publishes; cleared when a non-admin edits (migration 019). */
  approved_at: string | null;
  wp_post_id: number | null;
  original_date: string | null;
  created_at: string;
  updated_at: string;
  // joined
  company?: Company;
  category?: JobCategory;
  location?: JobLocation;
}

export type Application = {
  id: string;
  job_id: string | null;
  applicant_id: string | null;
  applicant_name: string | null;
  applicant_email: string;
  applicant_phone: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  status: ApplicationStatus;
  employer_note: string | null;
  wp_post_id: number | null;
  wp_job_title: string | null;
  // Apply-time snapshot fields, nullable — required for a NEW submission
  // (enforced in app/jobs/actions.ts) but 4,356+ existing rows predate
  // migration 033 and have none of this (see the migration's file header).
  years_experience: number | null;
  expected_salary: number | null;
  current_salary: number | null;
  consented_at: string | null;
  consent_version: string | null;
  /** null = job had no requirements set, nothing was flagged. */
  meets_requirements: boolean | null;
  applied_at: string;
  updated_at: string;
  // joined
  job?: Job;
}

export type ApplicationEvent = {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export type ApplicationReviewMode = "overview" | "final";

/** migration 029 — who has looked at an application, and how carefully. */
export type ApplicationReview = {
  id: string;
  application_id: string;
  reviewer_id: string;
  mode: ApplicationReviewMode;
  opinion: string | null;
  created_at: string;
}

export type SavedJob = {
  id: string;
  profile_id: string;
  job_id: string;
  created_at: string;
}

export type JobAlert = {
  id: string;
  profile_id: string;
  email: string;
  keyword: string | null;
  category_id: string | null;
  location_id: string | null;
  job_type: JobType | null;
  frequency: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

// Hand-maintained to match schema.sql + migrations/. NOT generated, so any
// schema change needs a matching edit here — or run
// `supabase gen types typescript --project-id khdvagjfonbiezkybpvh`.
/**
 * supabase-js requires every table to carry a `Relationships` key to satisfy its
 * GenericSchema constraint. Omit it and the client silently resolves every table
 * to `never`, so `.update({...})` fails with "not assignable to type 'never'"
 * and even the cookie handlers in lib/supabase/server.ts lose inference.
 * Empty is fine — it only types the embedded-resource helpers.
 */
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      companies: Table<Company>;
      job_categories: Table<JobCategory>;
      job_locations: Table<JobLocation>;
      jobs: Table<Job>;
      applications: Table<Application>;
      application_events: Table<ApplicationEvent>;
      application_reviews: Table<ApplicationReview>;
      saved_jobs: Table<SavedJob>;
      job_alerts: Table<JobAlert>;
      profile_education: Table<ProfileEducation>;
      profile_work_experience: Table<ProfileWorkExperience>;
    };
    Views: Record<string, never>;
    // RPCs added by the migrations. Without these declared, supabase.rpc()
    // calls do not typecheck against this Database generic.
    Functions: {
      applicant_profile_detail: {
        Args: { p_application_id: string };
        Returns: {
          years_experience: number | null;
          education_level: EducationLevel | null;
          industry_name: string | null;
          expected_salary: number | null;
          current_salary: number | null;
          notice_period: NoticePeriod | null;
          education: {
            school_name: string;
            field_of_study: string | null;
            level: EducationLevel | null;
            start_year: number | null;
            end_year: number | null;
          }[];
          work_experience: {
            company_name: string;
            job_title: string;
            start_date: string | null;
            end_date: string | null;
            description: string | null;
          }[];
        }[];
      };
      submit_guest_application: {
        Args: {
          p_job_id: string;
          p_name: string | null;
          p_email: string;
          p_phone: string | null;
          p_cover_letter: string | null;
          p_cv_url: string | null;
          p_job_title: string | null;
          p_years_experience: number;
          p_expected_salary: number;
          p_current_salary: number;
          p_consented_at: string;
          p_consent_version: string;
        };
        Returns: string;
      };
      candidate_matches: {
        Args: { p_job_id: string; p_industry_category_id?: string | null };
        Returns: {
          seeker_id: string;
          full_name: string | null;
          headline: string | null;
          avatar_url: string | null;
          match_percent: number;
        }[];
      };
      stats: {
        Args: Record<string, never>;
        Returns: { live_jobs: number; applications: number; employers: number }[];
      };
      activity_bands: {
        Args: Record<string, never>;
        Returns: { recent_band: number | null; total_band: number | null }[];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      count_claimable_applications: {
        Args: Record<string, never>;
        Returns: number;
      };
      claim_historical_applications: {
        Args: Record<string, never>;
        Returns: number;
      };
      applicant_cards: {
        Args: { app_ids: string[] };
        Returns: { application_id: string; headline: string | null; avatar_url: string | null }[];
      };
      increment_job_view: {
        Args: { job: string };
        Returns: undefined;
      };
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      application_status: ApplicationStatus;
      job_status: JobStatus;
      job_type: JobType;
      employment_level: EmploymentLevel;
    };
    CompositeTypes: Record<string, never>;
  };
}
