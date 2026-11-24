import { OBSOLETE_MARK, ResumeData } from './resume.service';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(text: string): string {
  return esc(text).replace(/\n/g, '<br>');
}

export function renderHtml(data: ResumeData): string {
  const contacts = data.links
    .map(
      (l) =>
        `<a href="${esc(l.url)}"${l.preferred ? ' class="preferred"' : ''}>${esc(l.label)}</a>`,
    )
    .join('<span class="sep">·</span>');

  const experiences = data.experiences
    .map(
      (e) => `
      <section class="entry">
        <div class="entry-head">
          <div>
            <div class="entry-title">${esc(e.title)}</div>
            <div class="entry-period">${esc(e.period)}</div>
          </div>
        </div>
        <p class="entry-desc">${nl2br(e.description)}</p>
        ${e.skills.length ? `<div class="tags">${e.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
        ${e.achievements.length ? `<ul class="achievements">${e.achievements.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      </section>`,
    )
    .join('');

  const projects = data.projects
    .map((p) => {
      const title = p.url
        ? `<a href="${esc(p.url)}" class="project-link">${esc(p.name)}</a>`
        : esc(p.name);
      return `
      <section class="entry">
        <div class="entry-title">${title}</div>
        ${p.context ? `<div class="entry-period">${esc(p.context)}</div>` : ''}
        <p class="entry-desc">${nl2br(p.summary)}</p>
        ${p.skills.length ? `<div class="tags">${p.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>` : ''}
        ${p.achievements.length ? `<ul class="achievements">${p.achievements.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      </section>`;
    })
    .join('');

  const skillGroups = data.skillGroups
    .map(
      (g) => `
      <div class="skill-group">
        <div class="skill-group-name">${esc(g.name)}</div>
        <div>${g.skills
          .map(
            (s) =>
              `<span class="skill${s.obsolete ? ' obsolete' : ''}">${esc(s.name)}${s.obsolete ? ` <em>${OBSOLETE_MARK}</em>` : ''}</span>`,
          )
          .join('')}</div>
      </div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Резюме — ${esc(data.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #222;
    background: #f4f5f7;
    line-height: 1.55;
  }
  .page {
    max-width: 820px;
    margin: 32px auto;
    background: #fff;
    padding: 48px 56px;
    box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
  header { border-bottom: 2px solid #e8e8e8; padding-bottom: 20px; margin-bottom: 8px; }
  h1 { font-size: 30px; margin: 0 0 4px; }
  .headline { color: #555; font-size: 17px; margin: 0 0 12px; }
  .contacts { font-size: 14px; }
  .contacts a { color: #0a6cff; text-decoration: none; }
  .contacts a:hover { text-decoration: underline; }
  .contacts a.preferred { font-weight: 600; }
  .sep { color: #bbb; margin: 0 8px; }
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #888;
    margin: 32px 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #eee;
  }
  .about { white-space: normal; }
  .entry { margin-bottom: 20px; }
  .entry-head { display: flex; justify-content: space-between; gap: 16px; }
  .entry-title { font-weight: 600; font-size: 16px; }
  .entry-period { color: #777; font-size: 13px; white-space: nowrap; padding-top: 2px; }
  .entry-desc { margin: 6px 0 8px; color: #333; }
  .project-link { color: #0a6cff; text-decoration: none; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; }
  .tag {
    background: #eef3ff;
    color: #0a6cff;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 12.5px;
  }
  .achievements { margin: 6px 0 0; padding-left: 20px; color: #333; }
  .achievements li { margin-bottom: 4px; }
  .skill-group { margin-bottom: 10px; }
  .skill-group-name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
  .skill { display: inline-block; margin: 0 10px 4px 0; font-size: 14px; }
  .skill.obsolete { color: #999; }
  .skill em { color: #aaa; font-size: 12px; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; margin: 0; max-width: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <header>
    <h1>${esc(data.name)}</h1>
    ${data.headline ? `<p class="headline">${esc(data.headline)}</p>` : ''}
    <div class="contacts">${contacts}</div>
  </header>

  <h2>Обо мне</h2>
  <p class="about">${nl2br(data.description)}</p>

  <h2>Опыт работы</h2>
  ${experiences}

  <h2>Проекты</h2>
  ${projects}

  <h2>Навыки</h2>
  ${skillGroups}
</div>
</body>
</html>`;
}
