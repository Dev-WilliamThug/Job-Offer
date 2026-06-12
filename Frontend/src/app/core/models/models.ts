/**
 * Modèles TypeScript reflétant les serializers de l'API Django.
 * Un seul fichier pour centraliser les contrats de données.
 */

// ─────────── Rôles & énumérations ───────────
export type UserRole = 'candidate' | 'recruiter' | 'admin';

export type ContractType =
  | 'cdi' | 'cdd' | 'internship' | 'freelance' | 'apprentice' | 'parttime';

export type ExperienceLevel =
  | 'junior' | 'mid' | 'senior' | 'lead' | 'no_require';

export type WorkMode = 'onsite' | 'remote' | 'hybrid';

export type JobStatus = 'draft' | 'published' | 'closed';

export type ApplicationStatus =
  | 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';

export type CompanyStatus = 'pending' | 'active' | 'suspended';

export type CompanySize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';

// ─────────── Authentification ───────────
export interface AuthTokens {
  access: string;
  refresh: string;
}

/** Claims décodés du JWT (enrichi côté Django). */
export interface JwtPayload {
  user_id: number;
  email: string;
  role: UserRole;
  full_name: string;
  exp: number;
  iat: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  password: string;
  password_confirm: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}

// ─────────── Profils ───────────
export interface CandidateProfile {
  phone: string;
  bio: string;
  skills: string;
  resume: string | null;
  location: string;
  linkedin_url: string;
  portfolio_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecruiterProfile {
  phone: string;
  position: string;
  company: number | null;
  company_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  candidate_profile?: CandidateProfile | null;
  recruiter_profile?: RecruiterProfile | null;
}

// ─────────── Entreprises ───────────
export interface CompanyListItem {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  city: string;
  country: string;
  sector: string;
  size: CompanySize | '';
  status: CompanyStatus;
  job_count: number;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  logo: string | null;
  address: string;
  city: string;
  country: string;
  sector: string;
  size: CompanySize | '';
  founded_year: number | null;
  status: CompanyStatus;
  created_by?: User;
  job_count: number;
  recruiter_count: number;
  is_followed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyWrite {
  name: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  sector?: string;
  size?: CompanySize | '';
  founded_year?: number | null;
}

// ─────────── Offres d'emploi ───────────
export interface JobListItem {
  id: number;
  slug: string;
  title: string;
  company_name: string;
  company_logo: string | null;
  location: string;
  contract_type: ContractType;
  experience_level: ExperienceLevel;
  work_mode: WorkMode;
  salary_display: string | null;
  status: JobStatus;
  deadline: string;
  is_expired: boolean;
  is_open: boolean;
  created_at: string;
}

export interface JobDetail extends JobListItem {
  description: string;
  requirements: string;
  benefits: string;
  company: number;
  company_city: string;
  company_slug: string;
  recruiter: number;
  recruiter_name: string;
  salary_min: string | null;
  salary_max: string | null;
  salary_is_public: boolean;
  application_count: number;
  updated_at: string;
}

export interface JobWrite {
  title: string;
  description: string;
  requirements?: string;
  benefits?: string;
  company: number;
  contract_type: ContractType;
  experience_level: ExperienceLevel;
  work_mode: WorkMode;
  location?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_public?: boolean;
  status: JobStatus;
  deadline: string;
}

// ─────────── Candidatures ───────────
export interface CandidateApplication {
  id: number;
  job_offer: number;
  job_title: string;
  company_name: string;
  job_slug: string;
  cover_letter: string;
  resume: string | null;
  status: ApplicationStatus;
  can_withdraw: boolean;
  applied_at: string;
  updated_at: string;
}

export interface RecruiterApplication {
  id: number;
  job_offer: number;
  job_title: string;
  candidate: number;
  candidate_name: string;
  candidate_email: string;
  candidate_resume: string | null;
  candidate_skills: string;
  candidate_linkedin: string;
  cover_letter: string;
  resume: string | null;
  status: ApplicationStatus;
  recruiter_note: string;
  applied_at: string;
  updated_at: string;
}

// ─────────── Réponses génériques ───────────
export interface MessageResponse {
  message: string;
}
