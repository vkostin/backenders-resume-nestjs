import { execFileSync } from 'child_process';
import { join } from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { GraphQLError } from 'graphql';
import { AppModule } from '../src/app.module';
import { catalog } from '../src/seed/catalog';
import { seedDatabase, SeedOptions } from '../src/seed/seed';
import { PrismaService } from '../src/persistence/prisma.service';
import { MEDIA_STORAGE, MediaStorage } from '../src/media/media-storage';

const ROOT = join(__dirname, '..');

let container: StartedPostgreSqlContainer;
let silo: StartedTestContainer;
let prisma: PrismaClient;
let app: INestApplication;
let graphqlUrl: string;
let queryCount: number;

const SEED_OPTIONS: SeedOptions = {
  media: 'none',
  resetMedia: false,
  mediaDir: join(ROOT, 'seed', 'media'),
};

beforeAll(async () => {
  process.env.S3_ENDPOINT = 'http://localhost:9000';
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000';
  process.env.S3_BUCKET = 'test';
  process.env.S3_ACCESS_KEY = 'siloadmin';
  process.env.S3_SECRET_KEY = 'siloadmin-change-me';
  process.env.ADMIN_TOKEN = 'test-token';
  process.env.PRISMA_LOG_QUERIES = '1';
  process.env.SEED_MEDIA_DIR = SEED_OPTIONS.mediaDir;

  container = await new PostgreSqlContainer('postgres:17').start();
  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });

  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await seedDatabase(prisma, catalog, null, SEED_OPTIONS);

  silo = await new GenericContainer(
    'docker.io/pgsty/silo:RELEASE.2026-11-12T00-00-00Z',
  )
    .withCommand(['server', '/data', '--console-address', ':9001'])
    .withEnvironment({
      MINIO_ROOT_USER: 'siloadmin',
      MINIO_ROOT_PASSWORD: 'siloadmin-change-me',
      MINIO_UPDATE: 'off',
    })
    .withExposedPorts(9000)
    .start();
  process.env.S3_ENDPOINT = `http://localhost:${silo.getMappedPort(9000)}`;

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = moduleRef.createNestApplication();
  app.use(
    '/graphql',
    graphqlUploadExpress({
      maxFileSize: 5 * 1024 * 1024,
      maxFiles: 1,
      overrideSendResponse: false,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new GraphQLError(
          errors
            .map((e) => Object.values(e.constraints ?? {}).join('; '))
            .join('; ') || 'Validation failed',
          { extensions: { code: 'BAD_USER_INPUT' } },
        ),
    }),
  );
  await app.init();
  await app.listen(0, '127.0.0.1');
  const storage = app.get<MediaStorage>(MEDIA_STORAGE);
  await storage.ensureBucket();
  const address = app.getHttpServer().address() as { port: number };
  graphqlUrl = `http://127.0.0.1:${address.port}/graphql`;

  const prismaService = app.get(PrismaService);
  (prismaService as unknown as {
    $on: (event: 'query', cb: () => void) => void;
  }).$on('query', () => {
    queryCount += 1;
  });
}, 300000);

afterAll(async () => {
  await app?.close();
  await prisma?.$disconnect();
  await silo?.stop();
  await container?.stop();
});

beforeEach(() => {
  queryCount = 0;
});

interface GqlError {
  message: string;
  extensions?: { code?: string };
}

async function graphql(
  query: string,
  options: { token?: string; variables?: Record<string, unknown> } = {},
): Promise<{
  data?: Record<string, unknown>;
  errors?: GqlError[];
}> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.token) {
    headers['x-admin-token'] = options.token;
  }
  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables: options.variables }),
  });
  return response.json();
}

function codeOf(result: { errors?: GqlError[] }): string | undefined {
  return result.errors?.[0]?.extensions?.code;
}

describe('read API', () => {
  it('answers the task sample query verbatim', async () => {
    const result = await graphql(`query {
      profile {
        name
        description
        skills { name }
        experience { company position }
        projects { name }
      }
    }`);
    expect(result.errors).toBeUndefined();
    const profile = result.data?.profile as Record<string, unknown>;
    expect(profile.name).toBe('Виктор Костин');
    expect(typeof profile.description).toBe('string');
    expect((profile.skills as unknown[]).length).toBe(catalog.skills.length);
    expect((profile.experience as unknown[]).length).toBe(
      catalog.experiences.length,
    );
    expect((profile.projects as unknown[]).length).toBe(
      catalog.projects.length,
    );
  });

  it('loads the whole graph with a bounded number of queries', async () => {
    const result = await graphql(`{
      profile {
        name
        headline
        links { label url preferred }
        photo { url }
        skills { name obsolete categories { name } }
        skillCategories { name skills { name } }
        experiences {
          company
          position
          description
          from
          to
          skills { name }
          achievements { statement project { name } }
          projects {
            name
            summary
            url
            experience { company }
            skills { name }
            achievements { statement }
            illustrations { url alt }
          }
        }
        projects {
          name
          experience { position }
          achievements { statement }
        }
      }
    }`);
    expect(result.errors).toBeUndefined();
    const profile = result.data?.profile as any;
    expect(profile.experiences).toHaveLength(catalog.experiences.length);
    expect(profile.skills.length).toBe(catalog.skills.length);
    expect(profile.skillCategories.length).toBe(
      catalog.skillCategories.length,
    );
    // Every catalog achievement is reachable.
    const experienceAchievements = profile.experiences.flatMap(
      (e: any) => e.achievements,
    );
    expect(experienceAchievements.length).toBe(catalog.achievements.length);
    // The first experience is the current one: catalog order, no end date.
    expect(profile.experiences[0].company).toBe(catalog.experiences[0].company);
    expect(profile.experiences[0].to).toBeNull();
    // A project with a repository link exposes it.
    const adfox = profile.projects.find(
      (p: any) => p.name === 'adfox-api-java',
    );
    expect(adfox.experience.position).toContain('разработчик');
    // Query count is documented in the README; keep it exact.
    expect(queryCount).toBe(16);
  });

  it('issues a single query for a scalar-only selection', async () => {
    await graphql('{ profile { name } }');
    expect(queryCount).toBe(1);
  });
});

describe('seed', () => {
  it('is idempotent and removes catalog entries that disappeared', async () => {
    const before = {
      profiles: await prisma.profile.count(),
      experiences: await prisma.experience.count(),
      projects: await prisma.project.count(),
      skills: await prisma.skill.count(),
    };

    // Second run changes nothing.
    await seedDatabase(prisma, catalog, null, SEED_OPTIONS);
    expect(await prisma.profile.count()).toBe(before.profiles);
    expect(await prisma.experience.count()).toBe(before.experiences);
    expect(await prisma.project.count()).toBe(before.projects);
    expect(await prisma.skill.count()).toBe(before.skills);

    // A catalog without one project removes that project and its rows.
    const reduced = {
      ...catalog,
      projects: catalog.projects.filter((p) => p.key !== 'xlss'),
      achievements: catalog.achievements.filter(
        (a) => a.project !== 'xlss',
      ),
    };
    await seedDatabase(prisma, reduced, null, SEED_OPTIONS);
    expect(await prisma.project.count()).toBe(before.projects - 1);

    // Restoring the catalog brings it back.
    await seedDatabase(prisma, catalog, null, SEED_OPTIONS);
    expect(await prisma.project.count()).toBe(before.projects);
  });
});

describe('mutations', () => {
  const TOKEN = 'test-token';

  async function ids(): Promise<{
    projectId: string;
    skillId: string;
    categoryId: string;
  }> {
    const result = await graphql(
      `{ profile { projects { id name } skills { id name } skillCategories { id name } } }`,
    );
    const profile = result.data?.profile as any;
    return {
      projectId: profile.projects.find((p: any) => p.name === 'adfox-api-java').id,
      skillId: profile.skills[0].id,
      categoryId: profile.skillCategories[0].id,
    };
  }

  it('keeps reads public but rejects mutations without a valid token', async () => {
    const query = await graphql('{ profile { name } }');
    expect(query.errors).toBeUndefined();

    const mutation = `mutation { updateProfile(input:{name:"X",description:"Y"}){ id } }`;
    expect(codeOf(await graphql(mutation))).toBe('UNAUTHENTICATED');
    expect(codeOf(await graphql(mutation, { token: 'wrong' }))).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('updates the profile and returns the changed object', async () => {
    const result = await graphql(
      `mutation { updateProfile(input:{name:"Виктор Костин",headline:"Fullstack Developer",description:"Портфолио"}){ name headline } }`,
      { token: TOKEN },
    );
    expect(result.errors).toBeUndefined();
    const profile = result.data?.updateProfile as any;
    expect(profile.headline).toBe('Fullstack Developer');

    const read = await graphql('{ profile { headline } }');
    expect((read.data?.profile as any).headline).toBe('Fullstack Developer');
  });

  it('keeps a single preferred link', async () => {
    await graphql(
      `mutation { createLink(input:{label:"Test A",url:"https://a.example.com",preferred:true}){ id } }`,
      { token: TOKEN },
    );
    await graphql(
      `mutation { createLink(input:{label:"Test B",url:"https://b.example.com",preferred:true}){ id } }`,
      { token: TOKEN },
    );
    const links = await graphql(
      `{ profile { links { id label preferred } } }`,
    );
    const all = (links.data?.profile as any).links as any[];
    const testLinks = all.filter((l) => l.label.startsWith('Test '));
    expect(testLinks.filter((l) => l.preferred)).toHaveLength(1);
    expect(testLinks.find((l) => l.preferred)?.label).toBe('Test B');
    for (const l of testLinks) {
      await graphql(
        `mutation { deleteLink(id:"${l.id}") }`,
        { token: TOKEN },
      );
    }
  });

  it('rejects an experience whose end precedes its start', async () => {
    const result = await graphql(
      `mutation { createExperience(input:{company:null,position:"Dev",description:"d",from:"2020-05",to:"2019-01"}){ id } }`,
      { token: TOKEN },
    );
    expect(result.errors).toBeDefined();
    expect(['BAD_USER_INPUT', 'BAD_REQUEST']).toContain(codeOf(result));
  });

  it('keeps the job title and the list index of an experience apart', async () => {
    const order = async (): Promise<{ id: string; position: string }[]> => {
      const read = await graphql(`{ profile { experiences { id position } } }`);
      return (read.data?.profile as any).experiences;
    };
    const before = await order();
    expect(before.length).toBeGreaterThan(1);

    // A new experience is appended, not moved to the top.
    const created = await graphql(
      `mutation { createExperience(input:{company:"OrderCo",position:"Order Dev",description:"d",from:"2024-01",to:null}){ id position } }`,
      { token: TOKEN },
    );
    expect(created.errors).toBeUndefined();
    const id = (created.data?.createExperience as any).id;
    expect((await order()).map((e) => e.id)).toEqual([
      ...before.map((e) => e.id),
      id,
    ]);

    // Updating without a reorder argument keeps the slot.
    const updated = await graphql(
      `mutation { updateExperience(id:"${id}",input:{company:"OrderCo",position:"Lead Dev",description:"d2",from:"2024-01",to:null}){ id position } }`,
      { token: TOKEN },
    );
    expect(updated.errors).toBeUndefined();
    expect((updated.data?.updateExperience as any).position).toBe('Lead Dev');
    expect((await order()).map((e) => e.id)).toEqual([
      ...before.map((e) => e.id),
      id,
    ]);

    // Reordering moves the item and leaves the title alone.
    const moved = await graphql(
      `mutation { updateExperience(id:"${id}",input:{company:"OrderCo",position:"Lead Dev",description:"d2",from:"2024-01",to:null},idx:1){ id position } }`,
      { token: TOKEN },
    );
    expect(moved.errors).toBeUndefined();
    expect((moved.data?.updateExperience as any).position).toBe('Lead Dev');
    const after = await order();
    expect(after[1]).toEqual({ id, position: 'Lead Dev' });

    await graphql(`mutation { deleteExperience(id:"${id}") }`, {
      token: TOKEN,
    });
  });

  it('appends a new item after the highest surviving order following a deletion', async () => {
    const create = async (position: string): Promise<string> => {
      const result = await graphql(
        `mutation { createExperience(input:{company:"OrderCo",position:"${position}",description:"d",from:"2024-01",to:null}){ id } }`,
        { token: TOKEN },
      );
      expect(result.errors).toBeUndefined();
      return (result.data?.createExperience as any).id;
    };

    const first = await create('Temporary first');
    const second = await create('Temporary second');
    await graphql(`mutation { deleteExperience(id:"${first}") }`, { token: TOKEN });
    const third = await create('Temporary third');

    const rows = await prisma.experience.findMany({
      where: { id: { in: [second, third] } },
      select: { id: true, sortOrder: true },
    });
    const order = new Map(rows.map((row) => [row.id, row.sortOrder]));
    expect(order.get(third)).toBeGreaterThan(order.get(second) ?? -1);

    await graphql(`mutation { deleteExperience(id:"${second}") }`, { token: TOKEN });
    await graphql(`mutation { deleteExperience(id:"${third}") }`, { token: TOKEN });
  });

  it('requires at least one category for a skill', async () => {
    const result = await graphql(
      `mutation { createSkill(input:{name:"NoCategorySkill",obsolete:false,categoryIds:[]}){ id } }`,
      { token: TOKEN },
    );
    expect(result.errors).toBeDefined();
    expect(codeOf(result)).toBe('BAD_USER_INPUT');
  });

  it('rejects duplicate relation IDs as bad input', async () => {
    const { projectId, skillId, categoryId } = await ids();
    const skill = await graphql(
      `mutation { createSkill(input:{name:"DuplicateCategorySkill",obsolete:false,categoryIds:["${categoryId}","${categoryId}"]}){ id } }`,
      { token: TOKEN },
    );
    expect(codeOf(skill)).toBe('BAD_USER_INPUT');

    const project = await graphql(
      `mutation { setProjectSkills(projectId:"${projectId}",skillIds:["${skillId}","${skillId}"]) }`,
      { token: TOKEN },
    );
    expect(codeOf(project)).toBe('BAD_USER_INPUT');
  });

  it('refuses to delete a category that would orphan a skill', async () => {
    const category = await graphql(
      `mutation { createSkillCategory(input:{name:"Temp Category"}){ id } }`,
      { token: TOKEN },
    );
    const categoryId = (category.data?.createSkillCategory as any).id;
    const skill = await graphql(
      `mutation { createSkill(input:{name:"TempSkill",obsolete:false,categoryIds:["${categoryId}"]}){ id } }`,
      { token: TOKEN },
    );
    const skillId = (skill.data?.createSkill as any).id;

    const refused = await graphql(
      `mutation { deleteSkillCategory(id:"${categoryId}") }`,
      { token: TOKEN },
    );
    expect(refused.errors).toBeDefined();

    await graphql(`mutation { deleteSkill(id:"${skillId}") }`, {
      token: TOKEN,
    });
    const allowed = await graphql(
      `mutation { deleteSkillCategory(id:"${categoryId}") }`,
      { token: TOKEN },
    );
    expect(allowed.errors).toBeUndefined();
    expect(allowed.data?.deleteSkillCategory).toBe(categoryId);
  });

  it('detaches projects when their experience is deleted', async () => {
    const { skillId } = await ids();
    const exp = await graphql(
      `mutation { createExperience(input:{company:"TmpCo",position:"Dev",description:"d",from:"2024-01",to:null}){ id } }`,
      { token: TOKEN },
    );
    const experienceId = (exp.data?.createExperience as any).id;
    const proj = await graphql(
      `mutation { createProject(input:{experienceId:"${experienceId}",name:"TmpProj",summary:"s",url:null,skillIds:["${skillId}"]}){ id } }`,
      { token: TOKEN },
    );
    expect(proj.errors).toBeUndefined();
    const projectId = (proj.data?.createProject as any).id;

    // setProjectSkills replaces the list
    const other = await graphql(
      `{ profile { skills { id name } } }`,
    );
    const skills = (other.data?.profile as any).skills as any[];
    const otherSkillId = skills.find((s) => s.id !== skillId).id;
    const set = await graphql(
      `mutation { setProjectSkills(projectId:"${projectId}",skillIds:["${otherSkillId}"]) }`,
      { token: TOKEN },
    );
    expect(set.errors).toBeUndefined();

    const del = await graphql(
      `mutation { deleteExperience(id:"${experienceId}") }`,
      { token: TOKEN },
    );
    expect(del.errors).toBeUndefined();

    const read = await graphql(
      `{ profile { projects { id experience { position } skills { name } } } }`,
    );
    const p = ((read.data?.profile as any).projects as any[]).find(
      (x) => x.id === projectId,
    );
    expect(p.experience).toBeNull();
    expect(p.skills).toHaveLength(1);

    await graphql(`mutation { deleteProject(id:"${projectId}") }`, {
      token: TOKEN,
    });
  });
});

describe('media uploads', () => {
  const TOKEN = 'test-token';
  const PNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
  ]);

  async function upload(
    mutation: string,
    variables: Record<string, unknown>,
    file: { filename: string; content: Buffer },
  ): Promise<{ data?: Record<string, unknown>; errors?: { message: string; extensions?: { code?: string } }[] }> {
    const form = new FormData();
    form.append(
      'operations',
      JSON.stringify({ query: mutation, variables: { ...variables, file: null } }),
    );
    form.append('map', JSON.stringify({ 0: ['variables.file'] }));
    form.append(
      '0',
      new Blob([new Uint8Array(file.content)], {
        type: 'application/octet-stream',
      }),
      file.filename,
    );
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'apollo-require-preflight': 'true',
        'x-admin-token': TOKEN,
      },
      body: form,
    });
    return response.json();
  }

  it('stores a PNG illustration and returns its public URL', async () => {
    const idsResult = await graphql(
      `{ profile { projects { id name } } }`,
    );
    const projectId = ((idsResult.data?.profile as any).projects as any[]).find(
      (p) => p.name === 'adfox-api-java',
    ).id;

    const result = await upload(
      `mutation Add($projectId: ID!, $file: Upload!, $alt: String!) {
        addProjectIllustration(projectId:$projectId, file:$file, alt:$alt){ id url alt }
      }`,
      { projectId, alt: 'schema' },
      { filename: 'schema.png', content: PNG },
    );
    expect(result.errors).toBeUndefined();
    const illustration = result.data?.addProjectIllustration as any;
    expect(illustration.url).toMatch(/\/uploads\/.+\.png$/);
    expect(illustration.alt).toBe('schema');

    const read = await graphql(
      `{ profile { projects { name illustrations { url alt } } } }`,
    );
    const project = ((read.data?.profile as any).projects as any[]).find(
      (p) => p.id === projectId || p.name === 'adfox-api-java',
    );
    expect(project.illustrations.map((i: any) => i.url)).toContain(
      illustration.url,
    );

    await graphql(
      `mutation { deleteIllustration(id:"${illustration.id}") }`,
      { token: TOKEN },
    );
  });

  it('rejects a non-image upload', async () => {
    const idsResult = await graphql(
      `{ profile { projects { id name } } }`,
    );
    const projectId = ((idsResult.data?.profile as any).projects as any[])[0].id;
    const result = await upload(
      `mutation Add($projectId: ID!, $file: Upload!, $alt: String!) {
        addProjectIllustration(projectId:$projectId, file:$file, alt:$alt){ id }
      }`,
      { projectId, alt: 'not an image' },
      { filename: 'notes.txt', content: Buffer.from('just text') },
    );
    expect(result.errors).toBeDefined();
    expect(codeOf(result)).toBe('BAD_USER_INPUT');
  });

  it('sets and removes the profile photo', async () => {
    const set = await upload(
      `mutation Add($file: Upload!) { setProfilePhoto(file:$file){ url } }`,
      {},
      { filename: 'me.png', content: PNG },
    );
    expect(set.errors).toBeUndefined();
    const url = (set.data?.setProfilePhoto as any).url as string;
    expect(url).toMatch(/\.png$/);

    const read = await graphql('{ profile { photo { url } } }');
    expect((read.data?.profile as any).photo.url).toBe(url);

    const removed = await graphql(
      `mutation { removeProfilePhoto }`,
      { token: TOKEN },
    );
    expect(removed.errors).toBeUndefined();
    const after = await graphql('{ profile { photo { url } } }');
    expect((after.data?.profile as any).photo).toBeNull();
  });
});

describe('resume endpoint', () => {
  const TOKEN = 'test-token';
  let baseUrl: string;

  beforeAll(() => {
    baseUrl = graphqlUrl.replace(/\/graphql$/, '');
  });

  it('rejects requests without the admin token', async () => {
    const response = await fetch(`${baseUrl}/resume`);
    expect(response.status).toBe(401);
  });

  it('serves markdown with the full resume content', async () => {
    const response = await fetch(`${baseUrl}/resume?format=md`, {
      headers: { 'x-admin-token': TOKEN },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/markdown');
    const body = await response.text();
    expect(body).toContain('# Виктор Костин');
    expect(body).toContain('## Опыт работы');
    expect(body).toContain('## Проекты');
    expect(body).toContain('## Навыки');
    expect(body).toContain('adfox-api-java');
  });

  it('serves a self-contained html page by default', async () => {
    const response = await fetch(`${baseUrl}/resume`, {
      headers: { 'x-admin-token': TOKEN },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    const body = await response.text();
    expect(body).toContain('<h1>Виктор Костин</h1>');
    expect(body).toContain('<style>');
  });

  it('serves a pdf document', async () => {
    const response = await fetch(`${baseUrl}/resume?format=pdf`, {
      headers: { 'x-admin-token': TOKEN },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/pdf');
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(5000);
  });

  it('rejects an unknown format', async () => {
    const response = await fetch(`${baseUrl}/resume?format=docx`, {
      headers: { 'x-admin-token': TOKEN },
    });
    expect(response.status).toBe(400);
  });
});
