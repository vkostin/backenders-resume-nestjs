import { Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AchievementRecord,
  ExperienceRecord,
  LinkRecord,
  ProfileRecord,
  ProjectRecord,
  SkillCategoryRecord,
  SkillRecord,
} from '../domain';
import {
  AchievementType,
  ExperienceType,
  IllustrationType,
  LinkType,
  PhotoType,
  ProfileType,
  ProjectType,
  SkillCategoryType,
  SkillType,
  toIllustrationType,
} from './graphql-types';
import { GraphQLContext } from './loaders';
import { PortfolioService } from './portfolio.service';

@Resolver(() => ProfileType)
export class ProfileResolver {
  constructor(private readonly service: PortfolioService) {}

  @Query(() => ProfileType)
  profile(): Promise<ProfileRecord> {
    return this.service.getProfile();
  }

  @ResolveField('photo', () => PhotoType, { nullable: true })
  photo(
    @Parent() profile: ProfileRecord,
    @Context() ctx: GraphQLContext,
  ): PhotoType | null {
    const url = ctx.mediaUrls.urlFor(profile.photoKey);
    return url === null ? null : { url };
  }

  @ResolveField('links', () => [LinkType])
  links(
    @Parent() profile: ProfileRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<LinkRecord[]> {
    return ctx.loaders.linksByProfile.load(profile.id);
  }

  @ResolveField('skillCategories', () => [SkillCategoryType])
  skillCategories(
    @Context() ctx: GraphQLContext,
  ): Promise<SkillCategoryRecord[]> {
    return ctx.loaders.skillCategories.load('all');
  }

  @ResolveField('skills', () => [SkillType])
  skills(@Context() ctx: GraphQLContext): Promise<SkillRecord[]> {
    return ctx.loaders.skills.load('all');
  }

  @ResolveField('experiences', () => [ExperienceType])
  experiences(
    @Parent() profile: ProfileRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<ExperienceRecord[]> {
    return ctx.loaders.experiencesByProfile.load(profile.id);
  }

  /** Alias kept so the task's sample query (`experience { ... }`) works verbatim. */
  @ResolveField('experience', () => [ExperienceType])
  experience(
    @Parent() profile: ProfileRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<ExperienceRecord[]> {
    return this.experiences(profile, ctx);
  }

  @ResolveField('projects', () => [ProjectType])
  projects(
    @Parent() profile: ProfileRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<ProjectRecord[]> {
    return ctx.loaders.projectsByProfile.load(profile.id);
  }
}

@Resolver(() => ExperienceType)
export class ExperienceResolver {
  @ResolveField('skills', () => [SkillType])
  async skills(
    @Parent() experience: ExperienceRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<SkillRecord[]> {
    const skillIds = await ctx.loaders.experienceSkillIdsByExperience.load(
      experience.id,
    );
    const skills = await Promise.all(
      skillIds.map((id) => ctx.loaders.skillsById.load(id)),
    );
    return skills.filter((s): s is SkillRecord => s !== null);
  }

  @ResolveField('achievements', () => [AchievementType])
  achievements(
    @Parent() experience: ExperienceRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<AchievementRecord[]> {
    return ctx.loaders.achievementsByExperience.load(experience.id);
  }

  @ResolveField('projects', () => [ProjectType])
  projects(
    @Parent() experience: ExperienceRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<ProjectRecord[]> {
    return ctx.loaders.projectsByExperience.load(experience.id);
  }
}

@Resolver(() => ProjectType)
export class ProjectResolver {
  @ResolveField('experience', () => ExperienceType, { nullable: true })
  experience(
    @Parent() project: ProjectRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<ExperienceRecord | null> {
    if (project.experienceId === null) {
      return Promise.resolve(null);
    }
    return ctx.loaders.experienceById.load(project.experienceId);
  }

  @ResolveField('skills', () => [SkillType])
  async skills(
    @Parent() project: ProjectRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<SkillRecord[]> {
    const rows = await ctx.loaders.projectSkillIdsByProject.load(project.id);
    const skills = await Promise.all(
      rows.map((row) => ctx.loaders.skillsById.load(row.skillId)),
    );
    return skills.filter((s): s is SkillRecord => s !== null);
  }

  @ResolveField('achievements', () => [AchievementType])
  achievements(
    @Parent() project: ProjectRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<AchievementRecord[]> {
    return ctx.loaders.achievementsByProject.load(project.id);
  }

  @ResolveField('illustrations', () => [IllustrationType])
  async illustrations(
    @Parent() project: ProjectRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<IllustrationType[]> {
    const rows = await ctx.loaders.illustrationsByProject.load(project.id);
    return rows.map((row) => toIllustrationType(row, ctx.mediaUrls));
  }
}

@Resolver(() => SkillType)
export class SkillResolver {
  @ResolveField('categories', () => [SkillCategoryType])
  async categories(
    @Parent() skill: SkillRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<SkillCategoryRecord[]> {
    const links = await ctx.loaders.categoryLinksBySkill.load(skill.id);
    const categories = await Promise.all(
      links.map((link) => ctx.loaders.categoriesById.load(link.categoryId)),
    );
    return categories.filter((c): c is SkillCategoryRecord => c !== null);
  }
}

@Resolver(() => SkillCategoryType)
export class SkillCategoryResolver {
  @ResolveField('skills', () => [SkillType])
  async skills(
    @Parent() category: SkillCategoryRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<SkillRecord[]> {
    const links = await ctx.loaders.categoryLinksByCategory.load(category.id);
    const skills = await Promise.all(
      links.map((link) => ctx.loaders.skillsById.load(link.skillId)),
    );
    return skills.filter((s): s is SkillRecord => s !== null);
  }
}

@Resolver(() => AchievementType)
export class AchievementResolver {
  @ResolveField('project', () => ProjectType, { nullable: true })
  project(
    @Parent() achievement: AchievementRecord,
    @Context() ctx: GraphQLContext,
  ): Promise<ProjectRecord | null> {
    if (achievement.projectId === null) {
      return Promise.resolve(null);
    }
    return ctx.loaders.projectById.load(achievement.projectId);
  }
}
