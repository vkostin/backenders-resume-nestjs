# Portfolio

The professional profile this API publishes, and the career facts that belong to it.

## Language

**Profile** (Профиль):
The one professional identity the API publishes: a name and a short description.
_Avoid_: User, account, résumé

**Link** (Ссылка):
An address of a professional resource where the Profile is present, with a label naming the resource. One Link may be marked as the preferred way to reach the Profile.
_Avoid_: Contact, social network

**Photo** (Фотография):
The single optional portrait of the Profile.
_Avoid_: Avatar, illustration

**Experience** (Опыт работы):
A continuous period of work at one company, with a position, a description of the duties, and a start. The end is absent while the period is still going. Periods may overlap.
_Avoid_: Job, employment, career, стаж

**Project** (Проект):
A named piece of work. It may belong to the Experience it was done in, and may have an address where it can be seen.
_Avoid_: Case study, product

**Achievement** (Достижение):
An outcome of an Experience, stated as a result. It may also be attributed to one Project of that Experience.
_Avoid_: Award, certificate, education

**Skill** (Навык):
A professional competency claimed by the Profile, filed under one or more Skill Categories. An Experience or a Project may use only skills the Profile claims. A Skill may be marked obsolete: claimed from past work, no longer in use.
_Avoid_: Technology, stack

**Skill Category** (Категория навыков):
A named group of Skills of one kind. A Skill may sit in several.
_Avoid_: Tag, group, area

**Illustration** (Иллюстрация):
A picture that shows a Project, with a text alternative. A Project has any number of them, in a fixed order.
_Avoid_: Media, image, screenshot, attachment
