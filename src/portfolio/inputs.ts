import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { isYearMonth } from '../year-month';

/** Same rule as the YearMonth scalar: YYYY-MM, month 01-12, year 1900-2200. */
function IsYearMonth(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    { name: 'isYearMonth', validator: { validate: (value) => isYearMonth(value) } },
    options,
  );
}

const URL_LIKE = /^(https?:\/\/|mailto:)/;

@InputType()
export class ProfileInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  headline: string | null;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;
}

@InputType()
export class LinkInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  label: string;

  @Field()
  @IsString()
  @Matches(URL_LIKE, { message: 'url must start with http(s):// or mailto:' })
  url: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  preferred: boolean;
}

@InputType()
export class SkillCategoryInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;
}

@InputType()
export class SkillInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  obsolete: boolean;

  @Field(() => [ID])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique({ message: 'categoryIds must not contain duplicates' })
  @IsString({ each: true })
  categoryIds: string[];
}

@InputType()
export class ExperienceInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  company: string | null;

  @Field()
  @IsString()
  @IsNotEmpty()
  position: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  description: string;

  @Field({ description: 'YYYY-MM' })
  @IsYearMonth({ message: 'from must be YYYY-MM' })
  from: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsYearMonth({ message: 'to must be YYYY-MM' })
  to: string | null;
}

@InputType()
export class ProjectInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  experienceId: string | null;

  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(URL_LIKE, { message: 'url must start with http(s):// or mailto:' })
  url: string | null;

  @Field(() => [ID], { defaultValue: [] })
  @IsArray()
  @ArrayUnique({ message: 'skillIds must not contain duplicates' })
  @IsString({ each: true })
  skillIds: string[];
}

@InputType()
export class AchievementInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  experienceId: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  projectId: string | null;

  @Field()
  @IsString()
  @IsNotEmpty()
  statement: string;
}

@InputType()
export class IllustrationPatchInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  alt?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  idx?: number;
}
