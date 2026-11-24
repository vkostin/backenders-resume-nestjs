# backenders-showcase-nestjs-v2

Портфолио-API на NestJS + GraphQL: публикует профиль, опыт работы, навыки,
проекты и достижения через Apollo Sandbox и позволяет владельцу редактировать
все данные через мутации.

## Стек

- Node.js 22, TypeScript, NestJS 11
- GraphQL code-first (`@nestjs/graphql`) поверх Apollo Server 5
- Prisma 6 + PostgreSQL 17
- Silo (S3-совместимое хранилище) для изображений
- Jest + Testcontainers для интеграционных тестов
- Docker Compose для запуска

## Быстрый старт

```bash
cp .env.example .env   # значения по умолчанию подходят для локального запуска
docker compose up --build
```

После старта:

- Apollo Sandbox: <http://localhost:3000/graphql>
- Консоль Silo: <http://localhost:9001> (логин `siloadmin`)

Entrypoint контейнера API выполняет по порядку: 
`prisma migrate deploy` → seed → запуск сервера. 
Поэтому с чистого листа портфолио уже заполнено.

## Архитектура

```
src/
  portfolio/    GraphQL-резолверы, DataLoader'ы, application-сервисы,
                input-классы, отображение ошибок
  persistence/  порты (интерфейсы) + Prisma-реализации; Prisma видна
                только внутри этого модуля
  media/        порт хранилища + S3/Silo-реализация + построитель публичных URL
  seed/         каталог данных и standalone CLI начального заполнения
  auth/         guard для мутаций
docs/adr/       архитектурные решения
```

Разделение ответственности:

- **Резолверы** только отображают GraphQL-поля и аргументы.
- **Сервисы** (`PortfolioService`, `PortfolioMutations`, `MediaMutations`)
  содержат бизнес-правила и оркестрацию.
- **Порты** `PortfolioQueries` / `PortfolioStore` описывают чтение и запись;
  Prisma-реализации приватны для `PersistenceModule`.
- **`MediaStorage`** — единственное место, где живёт S3 SDK.

### Чтение и DataLoader'ы

`Query.profile` возвращает единственный профиль. Вложенные поля
(`profile.links`, `experience.skills`, `project.illustrations`, …)
разрешаются per-request DataLoader'ами, которые батчат запросы через
`PortfolioQueries`. Поэтому:

- выборка только скаляров (`profile { name }`) — ровно один SQL-запрос;
- полный граф — ограниченное число запросов независимо от размера каталога
  (16 выражений для текущего сида, проверяется тестом "describe read API" в test/api.spec.ts).

Публичные URL картинок строятся из `S3_PUBLIC_BASE_URL` + ключа из БД —
`S3_PUBLIC_BASE_URL` должен включать имя бакета
(`http://localhost:9000/portfolio`). Чтение не обращается к Silo, и его
недоступность не ломает API.

## Мутации

Полный CRUD для profile, links, skill categories, skills, experiences,
projects, achievements, а также загрузка изображений. Все мутации требуют
заголовок `X-Admin-Token`, сравниваемый с `ADMIN_TOKEN`. Запросы без токена
или с неверным токеном отклоняются с `UNAUTHENTICATED`.

Создание/обновление возвращают изменённый объект; удаление — удалённый id.
Необязательный аргумент `idx` перемещает элемент в списке; новые
элементы по умолчанию добавляются в конец.

Основные правила:

- `to` раньше `from` отклоняется;
- `preferred` у Link уникален — установка снимает флаг у остальных;
- имена Skill и SkillCategory уникальны;
- Skill обязан состоять хотя бы в одной категории (Skill может входить в
  несколько категорий);
- удаление SkillCategory отклоняется, если после этого у какого-то Skill
  не останется категорий;
- удаление Experience открепляет проекты (они остаются без Experience);
- удаление Project удаляет его achievements, illustrations и связи;
- удаление Skill удаляет его связи с проектами и периодами.

Ошибки приходят с `extensions.code`: `NOT_FOUND`, `BAD_USER_INPUT`,
`UNAUTHENTICATED`.

### Загрузка изображений

```graphql
mutation {
  addProjectIllustration(
    projectId: "..."
    file: <файл>
    alt: "Скриншот"
  ) { id url alt }
}
```

- Поддерживаются PNG, JPEG, WebP; тип определяется по байтам файла,
  а не по заявленному MIME (Sandbox всегда шлёт `application/octet-stream`).
- SVG отклоняется, лимит размера — 5 МБ.
- Ключ объекта генерируется на сервере (`uploads/<uuid>.<ext>`),
  имя файла клиента не используется.
- Порядок записи: сначала объект в Silo, затем строка в БД; при ошибке БД
  объект удаляется (компенсирующее действие). При удалении — сначала
  строка, затем объект; неудача удаления объекта логируется, но мутация
  считается успешной (см. `docs/adr/0004-object-before-row.md`).

Мутации изображений: `addProjectIllustration`, `updateIllustration`,
`deleteIllustration`, `setProfilePhoto`, `removeProfilePhoto`.

**Важно для Sandbox:** multipart-запросы требуют заголовок
`Apollo-Require-Preflight: true` (CSRF-защита Apollo включена). В Sandbox
добавьте его в раздел Headers. Загружайте по одному файлу за мутацию —
это обходит известное ограничение Sandbox с несколькими файловыми
переменными.

## Резюме

`GET /resume` отдаёт резюме в стиле hh.ru, собранное из текущих данных
БД. Требует тот же заголовок `X-Admin-Token`, что и мутации (REST-сторона
возвращает HTTP 401).

```bash
curl -H "X-Admin-Token: $ADMIN_TOKEN" "http://localhost:3000/resume"            # HTML
curl -H "X-Admin-Token: $ADMIN_TOKEN" "http://localhost:3000/resume?format=md"  # Markdown
curl -H "X-Admin-Token: $ADMIN_TOKEN" "http://localhost:3000/resume?format=pdf" # PDF
```

- `format`: `html` (по умолчанию), `pdf`, `md` (`markdown` — синоним).
- Состав: имя, заголовок, контакты (links), «Обо мне», опыт работы с
  периодами и достижениями, проекты, навыки по категориям (устаревшие
  помечены).
- HTML — самодостаточная страница с inline-стилями и print CSS. PDF
  генерируется через pdfmake на лету.

## Seed

Данные — в `src/seed/catalog.ts` (русский текст, английские названия
навыков). Seed запускается отдельным CLI и не является частью Nest-приложения.

Режимы через переменные окружения:

| Переменная | Значения | Эффект |
|---|---|---|
| `SEED_MEDIA` | `full` / `none` | `full` — загружает файлы из `seed/media/` в Silo и пишет illustration/photo; `none` — не обращается к Silo, удаляет media-строки |
| `SEED_RESET` | `1` | Принудительно перезаписывает каталог (в `full` также очищает bucket) |
| `SEED_MEDIA_DIR` | путь | Каталог с файлами (по умолчанию `seed/media/`) |

По умолчанию seed заполняет только пустую базу (нет Profile) — правки,
сделанные через мутации, переживают перезапуски (см.
`docs/adr/0002-seed-on-empty-database.md`). В `SEED_MEDIA=full` отсутствие
файла, на который ссылается каталог, — фатальная ошибка.

## Модель данных

- **Profile** — ровно один; name, headline, description, photo, links.
- **Experience** — company (nullable), position, description,
  `from`/`to` типа `YearMonth` (`"2026-09"`, `to: null` — текущая роль).
  Периоды могут пересекаться.
- **Project** — name, summary, url (nullable), опциональная связь с
  Experience, skills, achievements, illustrations.
- **Achievement** — принадлежит Experience и опционально одному Project.
- **Skill** — name, obsolete-флаг; входит в одну или несколько
  SkillCategory.
- **SkillCategory** — name + упорядоченный список skills.
- **Link** — label, url, preferred.
- **Photo / Illustration** — публичный URL + метаданные.

Все списки возвращаются в порядке, заданном сортировкой в БД; пагинации и
аргументов сортировки нет.

## Тесты

```bash
npm test        # Jest + Testcontainers (нужен Docker)
npm run build
```

Тесты поднимают PostgreSQL 17 в контейнере и сидят с `SEED_MEDIA=none`.
Покрытие: пример запроса из задания дословно, полный вложенный запрос с
подсчётом SQL-запросов, идемпотентность seed и удаление устаревших записей,
guard мутаций и правила записи.

## Переменные окружения

См. `.env.example`. Обязательные: `DATABASE_URL`, `S3_ENDPOINT`,
`S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL`,
`ADMIN_TOKEN`. Приложение не стартует без них.

## Документация

- ADR: `docs/adr/0001` … `0004`
- Глоссарий предметной области: `GLOSSARY.md`
- Черновик каталога (источник seed-данных): `doc/catalog-draft.md`
