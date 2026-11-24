export interface SkillSeed {
  name: string;
  obsolete?: boolean;
}

export interface SkillCategorySeed {
  name: string;
  skillNames: readonly string[];
}

export interface LinkSeed {
  label: string;
  url: string;
  preferred?: boolean;
}

export interface ExperienceSkillSeed {
  experience: string;
  skillNames: readonly string[];
}

export interface AchievementSeed {
  experience: string;
  /** When set, the achievement is also attributed to this project. */
  project?: string;
  statement: string;
}

export interface ProjectSeed {
  name: string;
  experience?: string;
  summary: string;
  url?: string;
  skillNames: readonly string[];
  /** File names inside seed/media/, uploaded only in SEED_MEDIA=full. */
  illustrations?: readonly { file: string; alt: string }[];
}

export interface PortfolioCatalog {
  profile: {
    name: string;
    headline: string;
    description: string;
    /** File inside seed/media/ used as the profile photo in full mode. */
    photoFile?: string;
  };
  links: readonly LinkSeed[];
  skillCategories: readonly SkillCategorySeed[];
  skills: readonly SkillSeed[];
  experiences: readonly {
    key: string;
    company: string | null;
    position: string;
    description: string;
    from: string; // YYYY-MM
    to: string | null; // YYYY-MM, null = current
    skillNames?: readonly string[];
  }[];
  projects: readonly (ProjectSeed & { key: string })[];
  achievements: readonly AchievementSeed[];
}

export const catalog: PortfolioCatalog = {
  profile: {
    name: 'Виктор Костин',
    headline: 'Fullstack-разработчик',
    description:
      'Fullstack-разработчик и архитектор с опытом более 25 лет. Проектирую и довожу до эксплуатации backend на Java, TypeScript, Go и Scala и интерфейсы на React и Vue; последние годы — микросервисные платформы для рекламного рынка. Руководил группами разработки.',
    photoFile: 'photo-vkostin.jpeg',
  },
  links: [
    {
      label: 'Telegram',
      url: 'https://t.me/vkostin_com',
      preferred: true,
    },
    { label: 'GitHub', url: 'https://github.com/vkostin' },
    {
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/victor-kostin-055b097/',
    },
    { label: 'Email', url: 'mailto:victor.kostin@gmail.com' },
  ],
  skillCategories: [
    {
      name: 'Языки программирования',
      skillNames: [
        'Java',
        'TypeScript',
        'JavaScript',
        'Go',
        'Scala',
        'Python',
        'PHP',
        'ActionScript',
      ],
    },
    {
      name: 'Backend',
      skillNames: [
        'Spring Boot',
        'Spring Security',
        'JPA/Hibernate',
        'Flyway',
        'Node.js',
        'NestJS',
        'Prisma',
        'Play Framework',
        'Akka',
        'Lift',
        'Apache POI',
        'REST API',
        'OpenAPI',
      ],
    },
    {
      name: 'Frontend',
      skillNames: [
        'React',
        'Redux',
        'Vue',
        'Angular',
        'SvelteKit',
        'Flutter',
        'Tailwind CSS',
        'DaisyUI',
        'Sass',
        'snabbdom',
        'Chart.js',
        'Flash',
      ],
    },
    {
      name: 'Базы данных',
      skillNames: ['PostgreSQL', 'MongoDB', 'ClickHouse', 'Redis', 'MySQL', 'H2'],
    },
    {
      name: 'Интеграция и обмен сообщениями',
      skillNames: [
        'Apache Kafka',
        'Apache Camel',
        'Puppeteer',
        'JSoup',
      ],
    },
    {
      name: 'Обработка данных',
      skillNames: ['Hadoop', 'Apache Spark', 'Scalding', 'Apache Kafka'],
    },
    {
      name: 'Мультимедиа и видео',
      skillNames: [
        'Flash',
        'ActionScript',
        'Director',
        'Wowza',
        'RealPlayer/SMIL',
      ],
    },
    {
      name: 'Инфраструктура и CI/CD',
      skillNames: [
        'Docker',
        'Kubernetes',
        'GitLab CI/CD',
        'Jenkins',
        'TeamCity',
        'Nginx',
        'Vault',
        'SOPS',
        'ELK',
        'Prometheus',
        'Grafana',
        'Git',
      ],
    },
    {
      name: 'Архитектура, управление и процессы',
      skillNames: [
        'Software Architecture',
        'Project Management',
        'Управление командой',
        'Scrum',
        'Kanban',
        'Jira',
        'Confluence',
        'Redmine',
      ],
    },
  ],
  skills: [
    { name: 'Java' },
    { name: 'TypeScript' },
    { name: 'JavaScript' },
    { name: 'Go' },
    { name: 'Scala' },
    { name: 'Python' },
    { name: 'PHP' },
    { name: 'ActionScript', obsolete: true },
    { name: 'Spring Boot' },
    { name: 'Spring Security' },
    { name: 'JPA/Hibernate' },
    { name: 'Flyway' },
    { name: 'Node.js' },
    { name: 'NestJS' },
    { name: 'Prisma' },
    { name: 'Play Framework' },
    { name: 'Akka' },
    { name: 'Lift' },
    { name: 'Apache POI' },
    { name: 'REST API' },
    { name: 'OpenAPI' },
    { name: 'React' },
    { name: 'Redux' },
    { name: 'Vue' },
    { name: 'Angular' },
    { name: 'SvelteKit' },
    { name: 'Flutter' },
    { name: 'Tailwind CSS' },
    { name: 'DaisyUI' },
    { name: 'Sass' },
    { name: 'snabbdom' },
    { name: 'Chart.js' },
    { name: 'Flash', obsolete: true },
    { name: 'PostgreSQL' },
    { name: 'MongoDB' },
    { name: 'ClickHouse' },
    { name: 'Redis' },
    { name: 'MySQL' },
    { name: 'H2' },
    { name: 'Apache Kafka' },
    { name: 'Apache Camel' },
    { name: 'Puppeteer' },
    { name: 'JSoup' },
    { name: 'Hadoop' },
    { name: 'Apache Spark' },
    { name: 'Scalding' },
    { name: 'Director', obsolete: true },
    { name: 'Wowza', obsolete: true },
    { name: 'RealPlayer/SMIL', obsolete: true },
    { name: 'Docker' },
    { name: 'Kubernetes' },
    { name: 'GitLab CI/CD' },
    { name: 'Jenkins' },
    { name: 'TeamCity' },
    { name: 'Nginx' },
    { name: 'Vault' },
    { name: 'SOPS' },
    { name: 'ELK' },
    { name: 'Prometheus' },
    { name: 'Grafana' },
    { name: 'Git' },
    { name: 'Software Architecture' },
    { name: 'Project Management' },
    { name: 'Управление командой' },
    { name: 'Scrum' },
    { name: 'Kanban' },
    { name: 'Jira' },
    { name: 'Confluence' },
    { name: 'Redmine' },
  ],
  experiences: [
    {
      key: 'current',
      company: 'Стартап',
      position: 'Архитектор, Full-Stack Developer',
      description:
        'Разработка комплексной цифровой платформы с мобильным приложением, пользовательским и административным интерфейсами, backend и интеграцией платёжной инфраструктуры.',
      from: '2026-09',
      to: null,
      skillNames: ['TypeScript', 'Prisma', 'PostgreSQL', 'Vue', 'Flutter'],
    },
    {
      key: 'startup',
      company: 'Стартап',
      position: 'Архитектор, Full-Stack Developer',
      description:
        'Развитие платформы управления видеорекламой и рекламными размещениями: модернизация legacy-системы, рефакторинг и новый функционал, получение рекламной статистики и биллинг, CI/CD, использование AI-инструментов в цикле разработки.',
      from: '2025-12',
      to: '2026-11',
      skillNames: [
        'Go',
        'PostgreSQL',
        'MongoDB',
        'ClickHouse',
        'Redis',
        'React',
        'Vue',
        'TypeScript',
        'Docker',
        'Nginx',
        'Vault',
        'SOPS',
        'GitLab CI/CD',
        'Software Architecture',
      ],
    },
    {
      key: 'freelance',
      company: 'Фриланс/ИП',
      position: 'Ведущий разработчик, Архитектор',
      description:
        'Проектирование и разработка систем для рекламных агентств и производственной компании: микросервисы, интеграция систем, отчётность, сбор и анализ данных, работа с legacy-кодом.',
      from: '2019-01',
      to: '2025-12',
      skillNames: [
        'Java',
        'TypeScript',
        'Scala',
        'Python',
        'Spring Boot',
        'Apache Camel',
        'Apache Kafka',
        'PostgreSQL',
        'MongoDB',
        'MySQL',
        'React',
        'SvelteKit',
        'Docker',
        'Kubernetes',
        'Software Architecture',
      ],
    },
    {
      key: 'digital-alliance',
      company: 'Диджитал Альянс',
      position: 'Технический эксперт',
      description:
        'Сопровождение ПО, разработанного в ИМХО. Обработка логов Adfox, автоматизация ежедневных и ежемесячных отчётов и бизнес-процессов, тестовые стенды для отладки интеграций рекламных площадок (видео, баннеры, Smart TV).',
      from: '2021-01',
      to: '2023-12',
      skillNames: [
        'Scala',
        'Angular',
        'React',
        'TypeScript',
        'JavaScript',
        'Puppeteer',
        'Apache Kafka',
        'Hadoop',
        'Apache Spark',
        'Scalding',
      ],
    },
    {
      key: 'imkho',
      company: 'ИМХО ЗАО',
      position: 'Руководитель группы разработки',
      description:
        'Управление группой разработчиков: постановка задач, Scrum, Kanban. Проектирование и разработка пользовательских и серверных интерфейсов, системная интеграция, техническая документация, модульные тесты. Поддержка SL3, решение инцидентов в эксплуатации: BigData-кластер (Hadoop, MapReduce, Spark, Scalding), ежедневная и ежемесячная отчётность по открутке рекламы.',
      from: '2013-08',
      to: '2020-12',
      skillNames: [
        'Scala',
        'JavaScript',
        'Node.js',
        'React',
        'Vue',
        'Angular',
        'Apache Camel',
        'REST API',
        'MongoDB',
        'MySQL',
        'PostgreSQL',
        'Hadoop',
        'Apache Spark',
        'Scalding',
        'Git',
        'Jira',
        'Scrum',
        'Kanban',
        'Управление командой',
        'Project Management',
      ],
    },
    {
      key: 'video-international',
      company: 'Видео Интернешнл',
      position: 'Руководитель группы разработки',
      description:
        'Департамент инновационных технологий. Управление группой, ТЗ и контроль задач. Продукты для размещения рекламы в интернете: система сбора данных и формирования отчётов, UI и backend внутрикорпоративных сайтов, библиотека показа рекламы в видеоплеерах и ПО для тестирования плееров, обёртки для баннеров. Участие в создании продукта «Видеосеть»: автоматизация системы размещения рекламы, frontend и backend.',
      from: '2012-02',
      to: '2013-08',
      skillNames: [
        'Java',
        'Scala',
        'JavaScript',
        'Node.js',
        'Angular',
        'Apache Camel',
        'REST API',
        'ActionScript',
        'PHP',
        'Lift',
        'Jira',
        'Redmine',
        'Scrum',
        'Kanban',
        'Управление командой',
        'Project Management',
        'Software Architecture',
      ],
    },
    {
      key: 'tsifir',
      company: 'Цифирь, ООО',
      position: 'Главный специалист отдела информационных технологий',
      description:
        'Работа с подрядчиками, планирование, программирование мультимедиа-приложений для компакт-дисков и сенсорных киосков, создание веб-сайтов, в том числе сайта Третьяковской галереи.',
      from: '2009-09',
      to: '2012-01',
      skillNames: ['Project Management', 'Software Architecture', 'ActionScript'],
    },
    {
      key: 'infox',
      company: 'Инфокс-Интерактив',
      position: 'Ведущий программист',
      description:
        'Flash-приложения: видеоплеер для прямых трансляций и on-demand видео, приложение для записи видео с камеры (видеоблоги), доработка системы онлайн-конференций и вебинаров vivavox в команде.',
      from: '2009-09',
      to: '2012-01',
      skillNames: [
        'Flash',
        'ActionScript',
        'JavaScript',
        'Java',
        'Wowza',
      ],
    },
    {
      key: 'tretyakov',
      company: 'Государственная Третьяковская галерея, отдел мультимедиа',
      position: 'Инженер-программист',
      description:
        'Работа с подрядчиками, планирование, программирование и дизайн разделов сайта и мультимедиа-приложений для компакт-дисков и сенсорных киосков.',
      from: '2003-03',
      to: '2006-08',
      skillNames: ['Flash', 'Director'],
    },
    {
      key: 'rootvision',
      company: 'ООО Рутвижн',
      position: 'Программист-разработчик',
      description:
        'Поддержка сайта, онлайн-видеотрансляции через интернет, SMIL-презентации, техническая поддержка трансляций, создание дисков с видеозаписями.',
      from: '1998-09',
      to: '2002-11',
      skillNames: ['RealPlayer/SMIL'],
    },
    {
      key: 'next',
      company: 'Некст Интернет Сервис, интернет-провайдер',
      position: 'Веб-мастер',
      description:
        'Создание и поддержка корпоративного сайта интернет-провайдера.',
      from: '1997-01',
      to: '1999-05',
      skillNames: ['JavaScript'],
    },
  ],
  projects: [
    {
      key: 'autopilot',
      name: 'Сбермаркетинг. Автопилот',
      experience: 'freelance',
      summary:
        'Автоматизация закупки и планирования диджитал- и ТВ-рекламы. Спроектирована и реализована микросервисная платформа размещения с единым API (Swagger/OpenAPI) для внешних площадок.',
      skillNames: [
        'Java',
        'Spring Boot',
        'REST API',
        'OpenAPI',
        'MongoDB',
        'Apache Camel',
        'ELK',
      ],
    },
    {
      key: 'cloud-migration',
      name: 'Перенос промышленной desktop-системы в облако',
      experience: 'freelance',
      summary:
        'Распределённая система обработки заданий: микросервисы и headless-desktop клиент, асинхронное взаимодействие через Kafka, CI/CD и мониторинг, автоматизация работы с VMware-кластером.',
      skillNames: [
        'Java',
        'Spring Boot',
        'Spring Security',
        'JPA/Hibernate',
        'Flyway',
        'Apache Kafka',
        'REST API',
        'OpenAPI',
        'PostgreSQL',
        'Docker',
        'Kubernetes',
        'GitLab CI/CD',
        'Prometheus',
        'Grafana',
        'ELK',
      ],
    },
    {
      key: 'xls-reports',
      name: 'Отчёты по рекламным кампаниям на XLS-шаблонах',
      experience: 'freelance',
      summary:
        'Сервис формирования отчётности для рекламного агентства на основе XLS-шаблонов.',
      skillNames: [
        'Java',
        'Spring Boot',
        'PostgreSQL',
        'JPA/Hibernate',
        'Apache POI',
        'REST API',
      ],
    },
    {
      key: 'dashboards',
      name: 'Аналитические дашборды',
      experience: 'freelance',
      summary:
        'Аналитическая платформа крупного рекламного агентства: работа с данными в виде электронной таблицы и визуализация табличных данных графиками.',
      skillNames: [
        'SvelteKit',
        'Node.js',
        'Prisma',
        'PostgreSQL',
        'Tailwind CSS',
        'DaisyUI',
        'Chart.js',
      ],
    },
    {
      key: 'data-collection',
      name: 'Аналитическая система для рекламного агентства',
      experience: 'freelance',
      summary:
        'Автоматизированный сбор и агрегация данных из VK, YouTube и Telegram через API и парсинг.',
      skillNames: ['Python', 'TypeScript'],
    },
    {
      key: 'stat-cabinets',
      name: 'Кабинеты статистики',
      experience: 'freelance',
      summary:
        'Получение статистики через API, запросы к БД и Google Docs; управление пользователями; интеграция с Yandex Metrika; настраиваемые пользователем отчёты на Excel-шаблонах (Apache POI).',
      skillNames: [
        'Java',
        'Spring Boot',
        'JPA/Hibernate',
        'Apache POI',
        'PostgreSQL',
        'React',
        'TypeScript',
        'Tailwind CSS',
        'Chart.js',
      ],
    },
    {
      key: 'game-server',
      name: 'Кастомизация многопользовательского игрового сервера',
      experience: 'freelance',
      summary:
        'Доработка серверной и клиентской части многопользовательского игрового сервера.',
      skillNames: [
        'Scala',
        'Play Framework',
        'Akka',
        'Java',
        'Redis',
        'MongoDB',
        'TypeScript',
        'snabbdom',
        'Sass',
      ],
    },
    {
      key: 'adfox-api-java',
      name: 'adfox-api-java',
      experience: 'freelance',
      summary: 'Библиотека для работы с API Adfox.',
      url: 'https://github.com/vkostin/adfox-api-java',
      skillNames: ['Java'],
    },
    {
      key: 'xlss',
      name: 'xlss',
      experience: 'freelance',
      summary: 'Java-библиотека для создания оформленных Excel-файлов.',
      url: 'https://github.com/vkostin/xlss',
      skillNames: ['Java', 'Apache POI'],
    },
    {
      key: 'video-ads-platform',
      name: 'Платформа управления видеорекламой',
      experience: 'startup',
      summary:
        'Платформа управления видеорекламой и рекламными размещениями: статистика и биллинг, RBAC, модернизация legacy-системы.',
      skillNames: [
        'Go',
        'PostgreSQL',
        'MongoDB',
        'ClickHouse',
        'Redis',
        'React',
        'Vue',
        'TypeScript',
        'Docker',
      ],
    },
    {
      key: 'digital-platform',
      name: 'Цифровая платформа с мобильным приложением',
      experience: 'current',
      summary:
        'Комплексная цифровая платформа: мобильное приложение, пользовательский и административный интерфейсы, backend, интеграция платёжной инфраструктуры.',
      skillNames: ['TypeScript', 'Prisma', 'PostgreSQL', 'Vue', 'Flutter'],
    },
  ],
  achievements: [
    {
      experience: 'startup',
      project: 'video-ads-platform',
      statement:
        'Спроектирована и реализована RBAC: администратор, четыре категории менеджеров и три категории пользователей.',
    },
    {
      experience: 'startup',
      project: 'video-ads-platform',
      statement: 'Реализованы получение рекламной статистики и биллинг.',
    },
    {
      experience: 'freelance',
      project: 'autopilot',
      statement:
        'Микросервисная платформа размещения обрабатывает до 1 000 размещений в месяц с сохранением производительности.',
    },
    {
      experience: 'freelance',
      project: 'autopilot',
      statement:
        'Единый API (Swagger/OpenAPI) для внешних площадок сократил время размещения на 30% и ускорил подключение новых площадок.',
    },
    {
      experience: 'freelance',
      project: 'autopilot',
      statement: 'Универсальный API для внешних площадок.',
    },
    {
      experience: 'freelance',
      project: 'autopilot',
      statement:
        'Алертинг и мониторинг на ELK: 0 критических простоев, проактивное реагирование на инциденты.',
    },
    {
      experience: 'freelance',
      project: 'cloud-migration',
      statement:
        'Асинхронное взаимодействие через Kafka повысило стабильность системы.',
    },
    {
      experience: 'freelance',
      project: 'cloud-migration',
      statement:
        'CI/CD, мониторинг и автоматизация работы с VMware-кластером сократили объём ручных операций поддержки на 80%.',
    },
    {
      experience: 'freelance',
      project: 'xls-reports',
      statement: 'Работа аккаунт-менеджеров ускорена на 50%.',
    },
    {
      experience: 'digital-alliance',
      statement:
        'Тестовые стенды для веб-, Smart TV- и мобильной рекламы.',
    },
    {
      experience: 'imkho',
      statement:
        'Автоматизация задач по размещению рекламы более чем на 200 сайтах.',
    },
    {
      experience: 'imkho',
      statement:
        'Получение статистики и сверка данных за 1–3 дня после получения корректных логов в конце месяца.',
    },
    {
      experience: 'imkho',
      statement:
        'Анализ логов для поиска аномалий и ошибок: около 80 ГБ в день, 1–7 дней в поиске, в условиях ограниченного дискового пространства.',
    },
    {
      experience: 'video-international',
      statement:
        'Участие в создании продукта «Видеосеть»: автоматизация системы размещения рекламы, frontend и backend.',
    },
    {
      experience: 'tsifir',
      statement:
        'Диск «Золотая карта России»: разработка и локализация на 7 языков, включая китайский и корейский.',
    },
    {
      experience: 'tretyakov',
      statement:
        '5 дисков по истории искусства с мультимедиа-приложениями: проектирование, графический дизайн, дизайн интерфейсов, программирование, подготовка контента, управление рабочей группой.',
    },
  ],
};

export function slugId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${slug}`;
}
