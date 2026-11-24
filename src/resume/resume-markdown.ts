import { ResumeData } from './resume.service';

/** Escape user-authored values so they remain text rather than Markdown syntax. */
function text(value: string): string {
  return value.replace(/([\\`*_{}\[\]<>#+.!|~()])/g, '\\$1');
}

function linkDestination(value: string): string {
  return value.replace(/([\\()<>])/g, '\\$1');
}

function linkLine(links: ResumeData['links']): string {
  return links.map((l) => `[${text(l.label)}](${linkDestination(l.url)})`).join(' · ');
}

function skillsLine(skills: readonly string[]): string {
  return skills.length > 0 ? `Навыки: ${skills.map(text).join(', ')}` : '';
}

export function renderMarkdown(data: ResumeData): string {
  const lines: string[] = [];
  lines.push(`# ${text(data.name)}`);
  if (data.headline) {
    lines.push('', `*${text(data.headline)}*`);
  }
  lines.push('', linkLine(data.links));
  lines.push('', '## Обо мне', '', text(data.description));

  lines.push('', '## Опыт работы');
  for (const exp of data.experiences) {
    lines.push('', `### ${text(exp.title)}`);
    lines.push('', `*${text(exp.period)}*`, '', text(exp.description));
    const skills = skillsLine(exp.skills);
    if (skills) lines.push('', skills);
    for (const a of exp.achievements) {
      lines.push(`- ${text(a)}`);
    }
  }

  lines.push('', '## Проекты');
  for (const project of data.projects) {
    const title = project.url
      ? `### [${text(project.name)}](${linkDestination(project.url)})`
      : `### ${text(project.name)}`;
    lines.push('', title);
    if (project.context) {
      lines.push('', `*${text(project.context)}*`);
    }
    lines.push('', text(project.summary));
    const skills = skillsLine(project.skills);
    if (skills) lines.push('', skills);
    for (const a of project.achievements) {
      lines.push(`- ${text(a)}`);
    }
  }

  lines.push('', '## Навыки');
  for (const group of data.skillGroups) {
    const names = group.skills.map((s) => text(s.label)).join(', ');
    lines.push('', `**${text(group.name)}:** ${names}`);
  }

  return lines.join('\n') + '\n';
}
