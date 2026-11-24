import pdfmake from 'pdfmake';
import Roboto from 'pdfmake/fonts/Roboto';
import { ResumeData } from './resume.service';

pdfmake.addFonts(Roboto);
pdfmake.setLocalAccessPolicy(() => true);
pdfmake.setUrlAccessPolicy(() => false);

type Content = Record<string, unknown>;

function text(value: string, style?: string): Content {
  return style ? { text: value, style } : { text: value };
}

function link(textValue: string, url: string): Content {
  return { text: textValue, link: url, color: '#0a6cff' };
}

export async function renderPdf(data: ResumeData): Promise<Buffer> {
  const contacts: Content[] = [];
  data.links.forEach((l, i) => {
    if (i > 0) contacts.push({ text: ' · ', color: '#999' });
    const node = link(l.label, l.url);
    if (l.preferred) node.bold = true;
    contacts.push(node);
  });

  const content: Content[] = [
    text(data.name, 'name'),
    ...(data.headline ? [text(data.headline, 'headline')] : []),
    { text: contacts, style: 'contacts', margin: [0, 0, 0, 14] },
  ];

  content.push(text('Обо мне', 'h2'), text(data.description, 'body'));

  content.push(text('Опыт работы', 'h2'));
  for (const exp of data.experiences) {
    content.push(
      text(exp.title, 'entryTitle'),
      text(exp.period, 'period'),
      text(exp.description, 'body'),
    );
    if (exp.skills.length > 0) {
      content.push(text(`Навыки: ${exp.skills.join(', ')}`, 'skills'));
    }
    for (const a of exp.achievements) {
      content.push({ ul: [a], style: 'list' });
    }
  }

  content.push(text('Проекты', 'h2'));
  for (const project of data.projects) {
    const title = project.url
      ? { text: project.name, link: project.url, color: '#0a6cff', bold: true }
      : text(project.name, 'entryTitle');
    content.push(title);
    if (project.context) {
      content.push(text(project.context, 'period'));
    }
    content.push(text(project.summary, 'body'));
    if (project.skills.length > 0) {
      content.push(text(`Навыки: ${project.skills.join(', ')}`, 'skills'));
    }
    for (const a of project.achievements) {
      content.push({ ul: [a], style: 'list' });
    }
  }

  content.push(text('Навыки', 'h2'));
  for (const group of data.skillGroups) {
    content.push(
      text(
        `${group.name}: ${group.skills.map((s) => s.label).join(', ')}`,
        'skillGroup',
      ),
    );
  }

  const docDefinition = {
    content,
    styles: {
      name: { fontSize: 24, bold: true, color: '#111' },
      headline: { fontSize: 13, color: '#555', margin: [0, 2, 0, 8] },
      contacts: { fontSize: 10 },
      h2: {
        fontSize: 11,
        bold: true,
        color: '#666',
        margin: [0, 14, 0, 6],
      },
      body: { fontSize: 10, lineHeight: 1.3, margin: [0, 0, 0, 6] },
      entryTitle: { fontSize: 11, bold: true, margin: [0, 4, 0, 0] },
      period: { fontSize: 9, color: '#777', margin: [0, 0, 0, 3] },
      skills: { fontSize: 9, color: '#555', margin: [0, 2, 0, 4] },
      list: { fontSize: 9.5, color: '#333', margin: [0, 1, 0, 1] },
      skillGroup: { fontSize: 9.5, margin: [0, 0, 0, 3] },
    },
    defaultStyle: { font: 'Roboto', fontSize: 10 },
  };

  return pdfmake.createPdf(docDefinition).getBuffer();
}
