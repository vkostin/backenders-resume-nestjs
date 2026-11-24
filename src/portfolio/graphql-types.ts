import { Field, ID, ObjectType } from '@nestjs/graphql';
import { IllustrationRecord } from '../domain';
import { MediaUrls } from '../media/media-urls';
import { YearMonthScalar } from '../year-month.scalar';

@ObjectType('Link')
export class LinkType {
  @Field(() => ID)
  id: string;

  @Field()
  label: string;

  @Field()
  url: string;

  @Field()
  preferred: boolean;
}

@ObjectType('Photo')
export class PhotoType {
  @Field()
  url: string;
}

@ObjectType('Skill')
export class SkillType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  obsolete: boolean;
}

@ObjectType('SkillCategory')
export class SkillCategoryType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}

@ObjectType('Experience')
export class ExperienceType {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  company: string | null;

  @Field()
  position: string;

  @Field()
  description: string;

  @Field(() => YearMonthScalar)
  from: Date;

  @Field(() => YearMonthScalar, { nullable: true })
  to: Date | null;
}

@ObjectType('Project')
export class ProjectType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  summary: string;

  @Field(() => String, { nullable: true })
  url: string | null;
}

@ObjectType('Achievement')
export class AchievementType {
  @Field(() => ID)
  id: string;

  @Field()
  statement: string;
}

@ObjectType('Illustration')
export class IllustrationType {
  @Field(() => ID)
  id: string;

  @Field()
  url: string;

  @Field()
  alt: string;
}

export function toIllustrationType(
  record: IllustrationRecord,
  mediaUrls: MediaUrls,
): IllustrationType {
  return { id: record.id, url: mediaUrls.urlFor(record.key), alt: record.alt };
}

@ObjectType('Profile')
export class ProfileType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => String, { nullable: true })
  headline: string | null;

  @Field()
  description: string;
}
