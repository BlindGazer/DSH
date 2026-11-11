# Technical Design: `.mdc`, Globs & Auto-Discovery

## 1. Архитектурные компоненты (Single Responsibility)

Для сохранения чистой архитектуры логика разделяется на 4 изолированных модуля:
1. **`FrontmatterSanitizer & Parser`** — безопасное извлечение метаданных из `.md` и `.mdc`.
2. **`GlobNormalizer`** — приведение любых форматов `path`/`glob`/`globs` к чистому массиву POSIX-паттернов `string[]`.
3. **`RuleMatcher`** — проверка соответствия целевого пути файла набору правил (`alwaysApply`, положительные и отрицательные glob-паттерны).
4. **`WorkspaceDiscovery`** — резолвинг источников правил и скиллов в корне проекта (`agents/` -> fallback на `.cursor`, `.claude`, `.codex`, `AGENTS.md`).

---

## 2. Контракты типов (TypeScript Interfaces)

```typescript
export type SourceVendor = 'agents' | 'cursor' | 'claude' | 'codex' | 'root-file';

export type RuleActivationMode = 'always' | 'glob' | 'agent-requested' | 'manual';

export interface RawRuleFrontmatter {
  path?: string | string[];
  paths?: string | string[];
  glob?: string | string[];
  globs?: string | string[];
  alwaysApply?: boolean;
  description?: string;
  name?: string;
  type?: 'rule' | 'skill';
  [key: string]: unknown;
}

export interface NormalizedRuleMetadata {
  name: string;
  description?: string;
  globs: string[];
  alwaysApply: boolean;
  activationMode: RuleActivationMode;
  sourceVendor: SourceVendor;
  filePath: string;
}
```

---

## 3. Алгоритмы обработки краевых случаев (Для точной реализации)

### 3.1. Санитизация Frontmatter в `.mdc` (`sanitizeFrontmatterYaml`)
В файлах `.mdc` Cursor сохраняет `globs` без кавычек:
```yaml
---
description: TypeScript rules
globs: *.ts, *.tsx
alwaysApply: false
---
```
Стандартный YAML-парсер выбросит ошибку на `*.ts`, так как `*` в YAML — это alias.
**Алгоритм санитизации (построчно внутри блока `---`):**
Для каждой строки, соответствующей `/^(\s*(?:globs?|paths?)\s*:\s*)(.+)$/i`:
1. Извлечь ключ `$1` и значение `$2` (trim).
2. Если значение пустое, начинается с `[` (JSON-массив), начинается с `"` или `'` — оставить без изменений.
3. Иначе экранировать двойные кавычки внутри значения и обернуть его в двойные кавычки: `$1"${value.replace(/"/g, '\\"')}"`.

### 3.2. Парсинг строки Globs с учетом `{a,b}` (`splitGlobString`)
Строка `"src/**/*.{ts,tsx}, !**/*.test.ts, *.mdc"` не может быть разбита через `.split(',')`, так как это разрушит `{ts,tsx}`.
**Точный алгоритм разбиения:**
- Итерироваться по символам строки с отслеживанием глубины скобок: `braceDepth` (`{` -> `+1`, `}` -> `-1`) и `bracketDepth` (`[` -> `+1`, `]` -> `-1`).
- Разделять подстроку по символу `,` **только когда** `braceDepth === 0 && bracketDepth === 0`.
- Для каждого полученного токена:
  - Выполнить `.trim()`.
  - Заменить обратные слэши `\` на `/`.
  - Удалить ведущий `./` (но сохранить ведущий `!./` как `!`).
  - Отфильтровать пустые строки.

### 3.3. Преобразование легаси `path` в Glob
Если правило использует старое поле `path: "src/components"`:
- Если строка уже содержит glob-символы (`*`, `?`, `[`, `{`, `!`) — добавлять как есть.
- Если строка не содержит glob-символов и не имеет расширения файла в последнем сегменте (например, `src/api` или `src/api/`) — добавлять два паттерна: точное совпадение `src/api` и вложенное `src/api/**`.
- Если строка выглядит как путь к конкретному файлу (`src/index.ts`) — добавлять как `src/index.ts`.

### 3.4. Логика `RuleMatcher.matches(rule, targetFilePath)`
1. Нормализовать `targetFilePath`: заменить `\` на `/`, убрать ведущий `/` или `./`.
2. Если `rule.alwaysApply === true` -> вернуть `true`.
3. Если `rule.globs.length === 0` -> вернуть `false` (такие правила активируются только по `alwaysApply` или как `agent-requested`).
4. Разделить `rule.globs` на:
   - `positivePatterns`: паттерны, не начинающиеся с `!`.
   - `negativePatterns`: паттерны, начинающиеся с `!` (убрать ведущий `!` при проверке).
5. Для каждого паттерна (как positive, так и negative):
   - Если паттерн не содержит `/` (например, `*.ts` или `*.{ts,tsx}`), проверять его с опцией `matchBase: true` (или эквивалентно тестировать против `[pattern, `**/${pattern}`]`).
6. Файл считается совпавшим, если:
   - `(positivePatterns.length === 0 || matchesAny(targetFilePath, positivePatterns))`
   - **И** `!matchesAny(targetFilePath, negativePatterns)`.

---

## 4. Алгоритм Auto-Discovery корневых папок (`WorkspaceDiscovery`)

Роутер запускает поиск от корня активной сессии. Настройки проекта задают `instructionsRoot` и `discoveryMode`:

- `strict`: читать только заданный `instructionsRoot`.
- `fallback`: использовать заданный `instructionsRoot`; если стандартный `agents/` отсутствует, проверить `.agents/` и сканировать vendor-источники. Если `.agents/` тоже отсутствует, сканировать доступные корневые источники.
- `merge`: объединить заданный legacy-корень (либо `.agents/`, если стандартный `agents/` отсутствует) с корневыми файлами и vendor-каталогами.
- По умолчанию используется `merge`, чтобы наличие `.agents/` не скрывало `.cursor/`, `.claude/` и `.codex/`.

Корневые источники и их классификация:

| Путь относительно `rootDir` | Классификация | Поведение |
| :--- | :--- | :--- |
| `AGENTS.md`, `AGENT.md`, `CLAUDE.md`, `.cursorrules` | `Rule` | Всегда применяются |
| `.cursor/rules/**/*.{md,mdc}` | `Rule` | Выбор определяется frontmatter и активными путями |
| `.cursor/skills/**/SKILL.md` | `Skill` | Регистрируется в реестре навыков |
| `.claude/CLAUDE.md` | `Rule` | Всегда применяется |
| `.claude/rules/**/*.{md,mdc}` | `Rule` | Выбор определяется frontmatter и активными путями |
| `.claude/commands/**/*.{md,mdc}`, `.claude/skills/**/SKILL.md` | `Skill` | Регистрируется в реестре навыков |
| `.codex/rules/**/*.{md,mdc}`, `.codex/*.{md,mdc}` | `Rule` | Без `globs` и `description` всегда применяется |
| `.codex/skills/**/SKILL.md` | `Skill` | Регистрируется в реестре навыков |

Отсутствующие vendor-каталоги не являются ошибкой. Повторное обнаружение одного канонического файла не создает дубликат.
