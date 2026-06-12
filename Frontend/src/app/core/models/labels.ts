/**
 * Libellés français et styles de badge pour les énumérations.
 * Centralisé pour rester cohérent dans toute l'application.
 */
import {
  ApplicationStatus, ContractType, ExperienceLevel,
  JobStatus, WorkMode, CompanySize, CompanyStatus,
} from './models';

export const CONTRACT_LABELS: Record<ContractType, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  internship: 'Stage',
  freelance: 'Freelance',
  apprentice: 'Alternance',
  parttime: 'Temps partiel',
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  junior: 'Junior (0–2 ans)',
  mid: 'Confirmé (2–5 ans)',
  senior: 'Senior (5+ ans)',
  lead: 'Lead / Manager',
  no_require: 'Sans exigence',
};

export const WORKMODE_LABELS: Record<WorkMode, string> = {
  onsite: 'Présentiel',
  remote: 'Télétravail',
  hybrid: 'Hybride',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  closed: 'Clôturée',
};

export const JOB_STATUS_BADGE: Record<JobStatus, string> = {
  draft: 'badge-gray',
  published: 'badge-green',
  closed: 'badge-red',
};

export const APP_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'En attente',
  reviewing: 'En cours d\'examen',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  withdrawn: 'Retirée',
};

export const APP_STATUS_BADGE: Record<ApplicationStatus, string> = {
  pending: 'badge-amber',
  reviewing: 'badge-blue',
  accepted: 'badge-green',
  rejected: 'badge-red',
  withdrawn: 'badge-gray',
};

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  micro: 'Micro (1–9)',
  small: 'Petite (10–49)',
  medium: 'Moyenne (50–249)',
  large: 'Grande (250–999)',
  enterprise: 'Très grande (1000+)',
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: 'En attente de validation',
  active: 'Active',
  suspended: 'Suspendue',
};

export const COMPANY_STATUS_BADGE: Record<CompanyStatus, string> = {
  pending: 'badge-amber',
  active: 'badge-green',
  suspended: 'badge-red',
};

/** Options prêtes pour les <select>. */
export const CONTRACT_OPTIONS = entries(CONTRACT_LABELS);
export const EXPERIENCE_OPTIONS = entries(EXPERIENCE_LABELS);
export const WORKMODE_OPTIONS = entries(WORKMODE_LABELS);
export const COMPANY_SIZE_OPTIONS = entries(COMPANY_SIZE_LABELS);

function entries<T extends string>(map: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
