import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PORTFOLIO_QUERIES,
  PortfolioError,
  PortfolioQueries,
} from '../persistence/ports';
import { MEDIA_URLS } from '../media/media-storage';
import { MediaUrls } from '../media/media-urls';
import {
  AchievementRecord,
  ExperienceRecord,
  ProfileRecord,
  ProjectRecord,
  SkillRecord,
} from '../domain';
import { groupBy } from '../utils/group-by';

export interface ResumeLink {
  label: string;
  url: string;
  preferred: boolean;
}

export interface ResumeExperience {
  /** "Должность — Компания", or just the position. */
  title: string;
  /** e.g. "сентябрь 2026 — настоящее время" */
  period: string;
  description: string;
  skills: string[];
  achievements: string[];
}

export interface ResumeProject {
  name: string;
  summary: string;
  url: string | null;
  /** "Компания — Должность" of the linked experience, when any. */
  context: string | null;
  skills: string[];
  achievements: string[];
}

export interface ResumeSkill {
  name: string;
  obsolete: boolean;
  /** Name with the "(устаревший)" marker for obsolete skills. */
  label: string;
}

export interface ResumeSkillGroup {
  name: string;
  skills: ResumeSkill[];
}

export interface ResumeData {
  name: string;
  headline: string | null;
  description: string;
  photoUrl: string | null;
  links: ResumeLink[];
  experiences: ResumeExperience[];
  projects: ResumeProject[];
  skillGroups: ResumeSkillGroup[];
}

export const OBSOLETE_MARK = '(устаревший)';

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function monthYear(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function periodLabel(from: Date, to: Date | null): string {
  return to === null
    ? `${monthYear(from)} — настоящее время`
    : `${monthYear(from)} — ${monthYear(to)}`;
}

@Injectable()
export class ResumeService {
  constructor(
    @Inject(PORTFOLIO_QUERIES)
    private readonly queries: PortfolioQueries,
    @Inject(MEDIA_URLS)
    private readonly mediaUrls: MediaUrls,
  ) {}

  async build(): Promise<ResumeData> {
    let profile: ProfileRecord | null;
    try {
      profile = await this.queries.findSoleProfile();
    } catch (error) {
      if (error instanceof PortfolioError && error.code === 'CONFLICT') {
        throw new ConflictException(error.message);
      }
      throw error;
    }
    if (!profile) {
      throw new NotFoundException('No profile in the database');
    }
    const profileId = profile.id;

    const [
      links,
      categories,
      skills,
      experiences,
      projects,
    ] = await Promise.all([
      this.queries.findLinksByProfileIds([profileId]),
      this.queries.findSkillCategories(),
      this.queries.findSkills(),
      this.queries.findExperiencesByProfileIds([profileId]),
      this.queries.findProjectsByProfileIds([profileId]),
    ]);
    const categoryLinks = await this.queries.findSkillsByCategoryIds(
      categories.map((c) => c.id),
    );

    const experienceIds = experiences.map((e) => e.id);
    const projectIds = projects.map((p) => p.id);
    const [
      experienceSkillLinks,
      projectSkillLinks,
      experienceAchievements,
      projectAchievements,
    ] = await Promise.all([
      this.queries.findExperienceSkillIdsByExperienceIds(experienceIds),
      this.queries.findProjectSkillIdsByProjectIds(projectIds),
      this.queries.findAchievementsByExperienceIds(experienceIds),
      this.queries.findAchievementsByProjectIds(projectIds),
    ]);

    const skillsById = new Map<string, SkillRecord>(
      skills.map((s) => [s.id, s]),
    );
    const experiencesById = new Map<string, ExperienceRecord>(
      experiences.map((e) => [e.id, e]),
    );

    const skillNames = (ids: readonly string[]): string[] =>
      ids
        .map((id) => skillsById.get(id)?.name)
        .filter((name): name is string => Boolean(name));

    // Queries return rows in sortOrder; groupBy preserves that order.
    // Experience skills have no own order, so they follow the global skill order.
    const experienceSkills = groupBy(
      experienceSkillLinks,
      (l) => l.experienceId,
      (l) => l.skillId,
    );
    const projectSkills = groupBy(
      projectSkillLinks,
      (l) => l.projectId,
      (l) => l.skillId,
    );
    const achievementsByExperience = groupBy(
      experienceAchievements,
      (a) => a.experienceId,
    );
    const achievementsByProject = groupBy(projectAchievements, (a) => a.projectId);
    const categorySkills = groupBy(
      categoryLinks,
      (l) => l.categoryId,
      (l) => l.skillId,
    );

    const bySkillOrder = (a: string, b: string): number =>
      (skillsById.get(a)?.sortOrder ?? 0) - (skillsById.get(b)?.sortOrder ?? 0) ||
      a.localeCompare(b);

    const statements = (rows: readonly AchievementRecord[] = []): string[] =>
      rows.map((a) => a.statement);

    const experienceContext = (project: ProjectRecord): string | null => {
      if (!project.experienceId) return null;
      const exp = experiencesById.get(project.experienceId);
      if (!exp) return null;
      return exp.company ? `${exp.company} — ${exp.position}` : exp.position;
    };

    return {
      name: profile.name,
      headline: profile.headline,
      description: profile.description,
      photoUrl: this.mediaUrls.urlFor(profile.photoKey),
      links: links.map((l) => ({
        label: l.label,
        url: l.url,
        preferred: l.preferred,
      })),
      experiences: experiences.map((e: ExperienceRecord) => ({
        title: e.company ? `${e.position} — ${e.company}` : e.position,
        period: periodLabel(e.from, e.to),
        description: e.description,
        skills: skillNames(
          [...(experienceSkills.get(e.id) ?? [])].sort(bySkillOrder),
        ),
        achievements: statements(
          achievementsByExperience.get(e.id)?.filter((a) => a.projectId === null),
        ),
      })),
      projects: projects.map((p) => ({
        name: p.name,
        summary: p.summary,
        url: p.url,
        context: experienceContext(p),
        skills: skillNames(projectSkills.get(p.id) ?? []),
        achievements: statements(achievementsByProject.get(p.id)),
      })),
      skillGroups: categories.map((c) => ({
        name: c.name,
        skills: (categorySkills.get(c.id) ?? []).map((skillId) => {
          const skill = skillsById.get(skillId);
          const name = skill?.name ?? skillId;
          const obsolete = skill?.obsolete ?? false;
          return {
            name,
            obsolete,
            label: obsolete ? `${name} ${OBSOLETE_MARK}` : name,
          };
        }),
      })),
    };
  }
}
