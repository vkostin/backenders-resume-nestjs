export interface ProfileRecord {
  id: string;
  name: string;
  headline: string | null;
  description: string;
  photoKey: string | null;
}

export interface LinkRecord {
  id: string;
  profileId: string;
  label: string;
  url: string;
  preferred: boolean;
  sortOrder: number;
}

export interface SkillCategoryRecord {
  id: string;
  name: string;
  sortOrder: number;
}

export interface SkillCategoryLinkRecord {
  categoryId: string;
  skillId: string;
  sortOrder: number;
}

export interface SkillRecord {
  id: string;
  name: string;
  obsolete: boolean;
  sortOrder: number;
}

export interface ExperienceRecord {
  id: string;
  profileId: string;
  company: string | null;
  position: string;
  description: string;
  from: Date;
  to: Date | null;
  sortOrder: number;
}

export interface ProjectRecord {
  id: string;
  profileId: string;
  experienceId: string | null;
  name: string;
  summary: string;
  url: string | null;
  sortOrder: number;
}

export interface AchievementRecord {
  id: string;
  experienceId: string;
  projectId: string | null;
  statement: string;
  sortOrder: number;
}

export interface IllustrationRecord {
  id: string;
  projectId: string;
  key: string;
  alt: string;
  sortOrder: number;
}
