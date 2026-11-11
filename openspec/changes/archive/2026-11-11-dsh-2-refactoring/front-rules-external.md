---
description: Требования к написанию фронтового кода, применять при создании или редактировании любого файла в Components и ClientApp
---

# Frontend agent rules (TS/React)

Compiled from the files listed in `doc/Front/readme.md`: `doc/Front/style-guides.md` (sections 1-11), `doc/Front/back-sync-rules.md` (section 12), `doc/Front/table-rules.md` (section 13). Rules are final; do not re-read the sources.
Read `.cursor/skills/react-best-practices/SKILL.md` (index only), then only the `rules/*.md` files relevant to the task; do not read the whole folder. If a rule is already loaded, do not read it again.
Read `.cursor/rules/ponytail.mdc`.
On conflict this file wins over `.cursor/skills/react-best-practices` or `.cursor/rules/ponytail.mdc`

When the user asks to change any of these source files, apply the same change to this file in the same task:
add, edit or remove the matching rule in the matching section, in this file's compact English style. If the change
has nothing to carry over (wording or examples only), say so in the report.

## 1. Project structure

Main project is `src/ClientApp`, depends on `src/Components` (package `@ord/components`)

```
.vscode          run settings for VS / VS Code
configs          infrastructure settings: lint rules, build
public/assets    static files with fixed names (docs, fonts, templates)
public/assets/templates   templates for bulk upload, promos, instructions
src/index.html   start page template (stays in src: Vite quirk)
src/Main.tsx     app entry point
src/vite-env.d.ts   base types for Vite
src/api          data from external sources (HTTP)
src/components/common     shared components: buttons, form elements, modals
src/components/features   components for specific tasks
src/layouts      page templates
src/constants    app-wide settings: routes, defaults, errors, localization (testId.ts here)
src/hooks        shared hooks
src/infrastructure   app pipeline: routing, auth, data store wiring
src/models       component interfaces, service models, data types
src/store        app state
src/stylesheets  shared static styles, fonts, images
src/utils        shared logic: converters, formatters, helpers
```

## 2. Files and folders

- Encoding UTF-8 with BOM, line endings CRLF.
- Folder names lowercase by default. A folder with a default component (`index`) is named after that component.
- Each component gets its own folder with its styles and tests. Main file: `index.tsx` or `{Component}.tsx`.
- Styles: `{Component}.module.scss` for modules, `.scss` for global static styles. Styles shared by several components are named after the main component or common entity (`Container.module.scss` for Container, GroupContainer, DisplayContainer; `Form.module.scss` for FormContainer, FormFooterContainer, SimpleFormContainer).
- Tests: stored next to the component, naming per section 8.
- Component without styles and tests and with a single file: no folder, just `{Component}.tsx`.
- File name = name of the component/default export inside. Only the main file of a folder is `index`. React component files PascalCase `.tsx`. File that is a set of exported functions (no class): camelCase name.
- Example: `components/features/login/LoginForm/{index.tsx,LoginForm.module.scss,LoginForm.test.ts}`, nested `LoginForm/LoginButton/index.tsx`; single file `components/features/login/LoginForm.ts`; `models/navigation/NavigationItem.tsx`; `models/constants/routes.tsx`.
- Imports: no file extensions; import the folder (`./Footer`), never `./Footer/Footer` or `./Footer/index`.
- Do not edit `*.generated.*` files. One logical component per file; do not add files without need (splitting by "Separation of concerns" below counts as a need).

### Separation of concerns (any TS/TSX code: components, hooks, utils, API, models)

- One file = one responsibility. Do not mix in one file: component, table column definitions, row actions, nested components, models, data loading/state logic, data mapping functions. The main component file only wires ready-made parts together.
- Where parts go:
  - Component `.tsx`: markup and wiring only. Every nested component, including small stateless ones, gets its own file.
  - State, data loading, polling, subscriptions: a hook in `hooks/features/{feature}/use{Feature}{Purpose}.ts` (shared logic: `hooks/common/...`).
  - Table columns: `{feature}Columns.tsx`; row actions set: `{feature}Actions.tsx`; each action component (button, link) in its own file.
  - Models (interfaces, types, enums): in `models/...`, one model per file, file named after the model. Several models in one file are undesirable even if related.
  - Pure mapping/conversion functions: `utils/...` or a separate file next to the model, not inside the model file or the component file.
- Allowed inside a component file: its own props interface (`{Component}Props`) if no other file uses it (once reused, move it to `models/` as a separate file); non-exported local aliases of existing types (`type RowData = Partial<SomeDto>;`).
- Violation signs: a component plus a columns builder, nested components, models or data loading in the same file; a file exporting several unrelated entities; an interface in a component file that is not this component's props or is used elsewhere.
- Bad: `components/features/invoice/asyncBulk/AsyncBulkInvoiceImportTasksTable.tsx` (table component, `columnsBuilder`, `getRowActions`, nested `TasksEmptyContent` and `DownloadReportAction`, page loading and status polling in one file).
- Good: `components/features/finalContract/table/`: `FinalContractsTable.tsx` (wiring only), `finalContractColumns.tsx`, `finalContractActions.tsx`, `FinalContractEmptyContent.tsx`, one file per action (`FinalContractEditLink.tsx`, `FinalContractDeleteButton.tsx`, ...), toolbar logic in `hooks/features/finalContract/useFinalContractsToolbar`.

## 3. Identifier naming

- Scheme `{Feature}{Component}`: domain first, then purpose. Good: `CounterpartyAddressesInputModal`, `PlatformInputDrawer`, `InvoiceImportTasksTable` (do not repeat qualifiers that have no alternative, e.g. `AsyncBulk`), `InvoiceBulkUploadForm` (mention `BulkUpload` only where it is the subject). Bad: `InputCounterpartyAddressesModal`, `InputPlatformDrawer`, `AsyncBulkInvoiceImportTasksTable`.
- PascalCase: classes, interfaces, types, React components (function and arrow), enums and enum values, public hard-coded constants (UPPER_CASE is NOT used: `MaxLengthSettings = { UserName: 50 }`), exported constructors/singletons/function libraries/bare objects.
- camelCase: local variables and constants (incl. constants holding an object instance, file-local), exported object instances (`const router = new Router()`), class methods, functions (default-exported function: file name equals function name), properties, props (PascalCase prop only when its value is a component: `Component={SomeComponent}`), instances of components (`const reservationItem = <ReservationCard />`).
- No `_`/`__` prefix or suffix. Private members: `private api: ApiClient`.
- No `I` prefix for interfaces (exception: auto-generated interfaces). No `Interface` in interface names. No `Imp`, `Implementation`, `Private` suffix on implementations; name the role instead.
  - Example: `interface CreativeFormActions`, `class CreativeFormApi implements CreativeFormActions`. Split form logic and data logic: `InvoiceInputActions` (send/receive external data, update local store) implemented by `InvoiceInputApi`; `InvoiceFormActions` (form behavior via `react-final-form/FormApi`: show/hide, filtering, lists, modes; gets data via `InvoiceInputActions`) implemented by `InvoiceFormApi`.
- Names descriptive, no single letters, full words. Acronyms all upper or all lower (`SMSContainer`, `httpRequests`).
- Accessors: no JS `get`/`set` syntax unless the accessor (a) only forwards to other properties (mapping), no extra logic; (b) does a simple comparison, no collection iteration, no heavy computation; (c) checks whether the instance is already created and reuses it instead of creating a new one. Otherwise (requests, state mutation, iteration, heavy computation) use methods `getVal()`/`setVal(v)`. Universal `get()`/`set()` allowed if used consistently. Boolean: `isVal()`/`hasVal()`.
- Do not alias `this` (`self`, `that`); use arrow functions or `bind`.
- Event handlers: `handleX` (internal) / `onX` (callback prop); render getters `getX`; render helpers `renderX`.
- Do not use DOM prop names (`style`, `className`) for other meanings (`variant="fancy"`).
- HOC displayName: `withFoo(Bar)`. Name ordinary components by reference, not via `displayName` (exception: `memo`, see section 5).

## 4. TypeScript

- `interface` for object shapes. `type` only for primitive types/unions; `enum` is preferred over a string-literal union.
- Use `undefined`; do not use `null`.
- Absolute imports (`components/common/loader`, `models/SomeModel`) instead of relative; relative only for local sibling (`../SomeLocalComponent`), absolute still preferred. No `../../..` chains.
- Do not export classes/functions/variables/types until needed elsewhere; no speculative `export`/`export default`. No new types/values in global scope. Shared types: in `models/`, one model per file (see section 2, Separation of concerns). Type definitions at the top of a file.
- More than two related boolean properties in a type: replace with a flags value.
- JSDoc for functions, interfaces, enums, classes. Code comments explain why/boundaries, not what.
- If a compiler warning or error can be fixed by a type, fix the type; do not suppress it (`!`, `as any`, `// @ts-ignore`, `// @ts-expect-error`, disabling a lint rule). Applies to product code and tests (e.g. declare test data `as Required<IApplicationCardView>` instead of `application.name!`). Suppress only when the type cannot be fixed (broken third-party typings), with a comment giving the reason.

## 5. React

- Functional components only; class components are forbidden. Only exception: `ErrorBoundary` (error boundary needs a class: function components have no `componentDidCatch`).
- One component per file, small stateless components included (stricter than Airbnb; see section 2, Separation of concerns). Always JSX; `React.createElement` only when initializing the app from a non-JSX file.
- Component form: `function LoginForm() {...}` or `const LoginForm = () => {...}`; both allowed.
- Type props via interfaces (arrays/objects explicitly typed). Non-required props get explicit defaults (default parameter values).
- `children`: pass as tag content by default (`<EditButton>{label}</EditButton>`). Via `children` prop allowed for primitives and conditional values (`children={isCreate ? 'Add' : 'Save'}`), and for pre-memoized JSX (`useMemo`) allowed but not recommended.
- `memo` components: set `displayName` (preferred). Without it they show as Anonymous/Memo in React DevTools and error messages.

  ```tsx
  const CardTitle = memo(({ ... }: SomeProps) => <h2>{...}</h2>);

  CardTitle.displayName = 'CardTitle';
  export default CardTitle;
  ```

- Quotes: double in JSX attributes, single elsewhere (`style={{ left: '20px' }}`).
- Self-close tags without children; one space before `/>` (`<Foo />`); no spaces inside JSX braces (`bar={baz}`).
- JSX props: if they fit one line keep one line; otherwise one prop per line and closing `>` or `/>` on its own line. Multiline JSX is wrapped in parentheses. Conditional JSX: `{show && <Button />}`; multiline `{show && (<Button />)}`; ternary `{cond ? (<A />) : (<B />)}`; long `&&` chains: operator at line start, JSX in parentheses.
- Props: omit `={true}` (`<Foo hidden />`). `<img>` always has `alt` (`""` or `role="presentation"` if decorative), no words image/photo/picture in alt. Only valid non-abstract ARIA roles. No `accessKey`.
- `key`: stable id, not array index.
- Spread props sparingly. Allowed: HOCs proxying props; spreading objects with known explicit props. Filter out irrelevant props before spreading.
- Arrow functions closing over locals in handlers are fine; mind rerender cost for memoized children.

## 6. JavaScript language rules

References and variables

- `const` for all references; `let` only if reassigned; never `var`. Always declare (no implicit globals). One declaration per variable; group consts, then lets. Declare where needed, in a sensible place. Define before use (variables, classes, functions). No chained assignment. No `++`/`--` (`x += 1`). No unused variables. No line break before/after `=` (wrap long value in parentheses).

Objects and arrays

- Literals (`{}`, `[]`), not `new Object()`/`new Array()`. Computed keys for dynamic names. Method and property shorthand; group shorthand properties first. Quote keys only if invalid identifiers. Do not call `Object.prototype` methods directly (use `Object.hasOwn(o, k)` or `Object.prototype.hasOwnProperty.call`). Spread over `Object.assign`; rest to omit keys.
- `push` not index assignment. Spread to copy arrays and to convert iterables (`[...nodes]`); `Array.from` for array-likes and for map over iterable (`Array.from(it, fn)`). Array callbacks must return (omit `return` only for a single side-effect-free expression). Multiline arrays: break after `[` and before `]`.

Destructuring

- Destructure objects when using several properties (parameters too). Destructure arrays. Return objects, not arrays, for multiple values.

Strings

- Single quotes. Template literals only with interpolation/newlines and instead of concatenation; no spaces in `${ }`. Do not split long strings with concatenation. No `eval`. No useless escapes.

Functions

- Function declarations and arrows allowed. Wrap IIFE in parentheses. No function declarations inside blocks (assign to variable). No param named `arguments`; use rest `...args`. Default parameter syntax, not mutation; no side effects in defaults; defaults last. No `Function` constructor. Spacing: `function () {}`, `function name() {}`, no space between name and `(`. Never mutate or reassign parameters (section 10, Immutability). Spread, not `apply`. Multiline signature/call: one item per line.

Arrow functions

- Anonymous callbacks are arrows. Implicit return only for a single expression without side effects; otherwise braces and `return`. Multiline expression body in parentheses. Parentheses around a single parameter only when needed (`x => x * x`, `(x, y) => x + y`, `<T>(x: T, y: T) => x === y`). Do not confuse `=>` with `<=`/`>=` (wrap ternary in parentheses). Implicit-return body starts on the same line as `=>`.

Classes and modules

- Use `class`, not manual `prototype`. `extends` for inheritance. Methods may `return this` for chaining. Custom `toString()` must be side-effect free. No empty/delegating-only constructors. No duplicate members. Instance methods use `this` or become `static`.
- `import`/`export` only. No wildcard imports. No `export ... from`. One import statement per path. No exported mutable bindings (`let`). Single export in a module: prefer default. All imports before other statements. Multiline imports formatted like object literals.

Iteration

- No `for-in`/`for-of`/index loops where higher-order functions fit: `map`/`filter`/`reduce`/`find`/`findIndex`/`some`/`every`/`forEach`; objects via `Object.keys`/`values`/`entries`.

Properties

- Dot notation; brackets for variable keys. `**` over `Math.pow`.

Comparison and control flow

- `===`/`!==`. Booleans by shortcut (`if (isValid)`), strings and numbers explicitly (`name !== ''`, `list.length > 0`). Braces around `case`/`default` bodies with `let`/`const`/`function`/`class`. No nested ternaries; ternaries on one line; no unneeded ternary (`a || b`, `!!c`, `!c`, `a ?? b`). Parenthesize mixed operators (except `+`, `-`, `**`; also parenthesize `/`, `*` when mixed). `??` only for `null`/`undefined` defaults, not for `0`/`''`.
- Braces for multiline blocks (single statement on the same line may omit them: `if (test) return false;`); `} else {` on one line. No `else` after a block that always `return`s. Long conditions: each group on its own line, logical operator at line start. No `cond && fn()` instead of `if`.

Coercion

- Coerce at statement start. `String(x)` (not `new String`, `x + ''`, `.toString()`). `Number(x)` or `parseInt(x, 10)` with radix (no `new Number`, unary `+`, `>> 0`; if bitshift is needed for performance, comment why). `Boolean(x)` or `!!x` (no `new Boolean`).

Comments

- `/** ... */` multiline; `//` single line, on its own line above the subject, blank line before it unless first in block. Space after `//` and `*`. `// FIXME:` for problems, `// TODO:` for planned solutions.

Other

- `Number.isNaN`/`Number.isFinite`, not global `isNaN`/`isFinite`.
- No TC39 proposals below stage 3.

## 7. Formatting

Prettier (final values):

- `singleQuote: true`, `semi: true`, `tabWidth: 4`, `printWidth: 140` (long strings are not broken), `trailingComma: none`, `arrowParens: avoid`, `bracketSameLine: true`, `endOfLine: auto`.

ESLint (`src/Components/configs/eslint.config.js`, `src/ClientApp/configs/eslint.config.js`):

- `simple-import-sort/imports: error`, group order: react, `react-*`, final-form, @mui, `@*`, material, classnames, date-fns, dayjs, debounce, file-saver, query-string, lodash, vitest, absolute paths (`^\w`), relative (`../`, `./`), styles (`.scss`), side-effect.
- `simple-import-sort/exports: error`, `import-x/no-duplicates: error`, `prefer-template: error`.
- `no-console: warn`, `react-hooks/todo: warn`, `react-refresh/only-export-components: warn`.
- ClientApp additionally off: `react-hooks/refs`, `react/no-unescaped-entities`, `import-x/default`, `import-x/no-named-as-default`.

Whitespace and layout:

- No leading commas. JSX closing bracket on the same line as the last prop. Line endings per section 2.
- 1 space before `{`; 1 space after `if`/`while`; spaces around operators; `{ a: 1 }` spaces inside braces; no spaces inside `()` or `[]`; no space before a comma, one after; `key: value`; no space before call parens; one-line blocks `{ return true; }`; computed keys `obj[foo]`.
- Single newline at end of file; no blank line at start; no multiple blank lines; no trailing spaces; no blank-line padding inside blocks; blank line after a block before the next statement.
- Method chains of more than 2 calls: one call per line with leading dot, indented.

## 8. Tests

- Write tests, aim for full coverage; every bug fix gets a regression test; limit stubs/mocks.
- File `{TestedFile}.test.ts` next to the tested file (`.test.tsx` for components).
- Structure: `describe('TestedFile (short description)')` -> `describe('methodName')` -> `test('scenario or group of same-outcome scenarios')`. Merging into one `test('method (scenario)')` only for very simple tests (usually a sign of missing cases). Component tests have one level less: `describe('ComponentName')` -> `test('scenario')`. Descriptions in Russian (section 9).
- One `test` = one group of scenarios. Several `expect` in one test are allowed when all check the same outcome: only positive (no error, valid value) or only negative (same error). Do not mix positive and negative outcomes in one test (a failing first check hides the rest, the name does not tell which outcome broke); split them. Purpose: avoid many tiny tests, one per value.
- Element lookup: attribute `data-testid`; values live in `constants/testId.ts`, key bound to the feature (`TestId.Agency.BlockButton` = `agencyBlockButton`).
- If the test renders `lazy` components (e.g. `GroupContainer`), statically import them in the test first: `import '@ord/components/components/container/GroupContainer'`.
- Test data typing: type test data and params of factories/helpers with project models. No `object`, `Object`, `any`, `unknown`, no casts through them (`as unknown as Model`). For partial data use `Partial<Model>`/`Pick<Model, ...>` and a factory returning a fully filled model with defaults: `(overrides: Partial<Model> = {}): Model => ({ ...defaultModel, ...overrides })`. Why: untyped data hides field-name typos and tests outdated by model changes. Exception: a test deliberately checking a wrong-type value may cast in one place with a comment explaining why.
- Shared test data: data, factories and helpers used by several test files go to separate files in `utils/tests/mocks`, or in `utils/tests/mocks/{feature}/` when the feature has more than one such file (`utils/tests/mocks/creativePlatforms/createCreativePlatform.ts`); one factory or one related data set per file, named after it; no `describe`/`test` there; typed per the rule above. Data used by one test file may stay in it if small (under 20 lines); move to `mocks` (do not copy) once a second file needs it. Test environment setup (`utils/tests/setupDayjs.ts`) stays in `utils/tests`, not in `mocks`.
- Reference example: `src/Components/src/utils/formatters/DateFormatter.test.ts`.

## 9. Text in code and docs

Plain ASCII only: `-`, `->`, `"`, `'`, `...`. No long dash, arrows, emoji, typographic quotes, single-character ellipsis.

Language: code comments (`//`, JSDoc) and test names (`describe`, `test` descriptions) are written in Russian. Code identifiers inside them (tested file, component, method) stay as in code.

- Bad: `test('shows the bar immediately', ...)`, `// The bar is shown without delay`.
- Good: `describe('InitialLoader (полоса загрузки при запуске приложения)', ...)`, `test('Полоса показывается сразу, без задержки', ...)`.

Static strings without markup (button labels, titles, hints, placeholders, notification/confirmation texts, validation
messages) are not hard-coded in components, hooks or utils. Move them to the feature localization constant
`constants/localizations/{Feature}Localization.ts` (agency components: `AgencyLocalization.ts`). Group strings by purpose
(`Modify`, `Confirmation`, `Validation`, `Card`, `Table`, ...). Strings with a variable part are templates with `{0}`, `{1}`
(`'Агентство {0} успешно заблокировано'`). Strings with markup (JSX, HTML) are out of scope.

- Bad: `<Button>Заблокировать</Button>`, `notify.showSuccess('Агентство успешно добавлено')`.
- Good: `<Button>{AgencyLocalization.Modify.Block}</Button>`, `notify.showSuccess(AgencyLocalization.Modify.AddSuccess)`.

## 10. Design principles

Apply to all front code: components, hooks, utils, API, models, tests.

DRY

- Do not duplicate code. Logic, markup or data repeated in several components, classes, hooks or tests: extract to a shared place and reuse.
- Search before writing: `components/common`, `hooks/common`, `utils`, `constants`, `utils/tests/mocks`.
- Where to extract: section 2, Separation of concerns. Extract on the second use, not "for the future" (section 4, no premature export).
- Do not merge code that only looks similar but solves different tasks and changes for different reasons; one shared function with a flag per case is worse than two simple ones.

Single responsibility

- One file = one task: section 2, Separation of concerns.
- One function = one task. Violation signs: name begs for "and" (`validateAndSave`); validates, maps and does side effects (requests, notifications, state changes) at once; long function of comment-separated blocks. Split into small, preferably pure functions (no side effects, result depends only on arguments).

Open for extension

- Components and classes are extended from outside, not by editing shared internals.
- A component accepts extension points: `children`, `className`, `onX` handlers, components via props (`Component={SomeComponent}`), display settings (`variant`, `size`).
- No checks of specific features/pages inside a shared component (`isInvoicePage`); move the difference into a prop or compose a new component from the shared one.
- Classes implement interfaces; consumers depend on the interface, not the implementation (`CreativeFormActions`, section 3).

Immutability

- Do not mutate incoming data without explicit need: function params, props, state, store objects, API responses. Build new values with spread and destructuring (`({ ...item, VatRate: 22 })`, `const { Id, ...rest } = item`). Never reassign params.
- Treat objects as immutable outside the component that created them; arrays are immutable after creation.
- If mutation is really needed (library API requires it, measured performance problem), comment why.

## 11. Animations and loading

The user never sees an empty page or no reaction to an action while data, components or an operation load: always show a display or loading animation.

Preferred: show ready markup with `Skeleton` (`@mui/material/Skeleton`) in place of form elements or card parts, so the screen does not jump when data arrives.

- Ready components (in `Components`): `components/buttons/SkeletonButton.tsx` (buttons), `components/display/DisplaySkeletonField.tsx` (card or form elements), `components/display/FileDisplaySkeleton.tsx` (files in a form).
- For a complex component make a skeleton component with the same structure and labels, values replaced by `DisplaySkeletonField`. Example: `CreativeSkeletonTab` for `CreativeViewTab` (`ClientApp/src/components/features/creative/card/`).
- Mark every form, tab, card or page skeleton with `data-testid` `TestId.Common.Loading` (autotests wait until no element with it is left); no skeleton-specific test ids.
  - Put it on the skeleton root; for a fragment root, on the first container.
  - Skip it when the skeleton already contains a `Spinner` or `ProgressBar` with `TestId.Common.Loading`.
  - Do not mark skeleton parts (`SkeletonButton`, `DisplaySkeletonField`, form footers).
  - Unit tests find a skeleton by `TestId.Common.Loading` and tell skeletons apart by visible traits: group headers, number of bars (`countSkeletons`).

Universal indicators when a skeleton is not possible or is excessive:

- `ProgressBar` (`components/loader/ProgressBar.tsx`): loading of components and pages.
- `Spinner` (`components/loader/Spinner.tsx`): loading of lists, buttons, etc.

Animations must not flicker. When a response can arrive faster than the animation plays, or states switch quickly, set a minimum animation time.

- Login: run `delay(Delay.Animation)` together with the request and `await` both before redirecting (`ClientApp/src/components/pages/LoginPage/index.tsx`), otherwise the animation is shown and cut at once.
- Search while typing: `debounce` the search function by 300 ms (`Delay.AutocompleteSearch`) and make the request last at least 300 ms (`Delay.AnimationShort`); this removes flicker and extra requests.
  ```ts
  const animationDelay = delay(Delay.AnimationShort);
  const response = await request;
  await animationDelay;
  ```
- Do not hard-code animation times; use `Delay` (`Components/src/constants/delay.ts`): `AnimationShort` (300) for fast animations, `Animation` (500) and `AnimationLong` (800) for longer ones.

Preloading lazy components (`preload()` of `lazyWithPreload`):

- One style: a preloader component that renders nothing and starts loading in `useEffect`. Name it after what it preloads, domain first (section 3): `PagesPreloader`, `MainLayoutPreloader`. No `preload{Entity}` functions.
- Explicit: render preloaders in the startup tree (`StartupFull`) or in a layout (`MainLayout`, `AdminLayout`, `GuestLayout`). Do not preload inside providers, react-router route `lazy` loaders, hooks or components that do other work. A route `lazy` loader only imports its component and awaits nothing else.
- One place: each lazy component is preloaded by exactly one preloader. A component needed by several layouts goes to one shared preloader rendered in each of them. A route definition may store a component's own `preload` as data (`handle.preload`, `handle.preloadFallback`); only preloaders call it.
- Exception for base routes: each base route layout (`MainLayout`, `AdminLayout`, `GuestLayout`) may have its own preloader (`MainLayoutPreloader`, `AdminLayoutPreloader`, `GuestLayoutPreloader`) that preloads only what its pages need, in the order they need it, even if another layout's preloader preloads the same component, when this makes its pages load faster. Guest exception: a guest page is always followed by `MainLayout`, so after the `GuestLayout` parts load, `GuestLayoutPreloader` starts background loading of `MainLayout`.
- Where to declare lazy wrappers: a `lazyWithPreload` wrapper imported by several modules (routes, preloaders) is declared once: one constant per component, named exports, no group object. One wrapper's `preload` marks the component loaded everywhere it is used; declaring another wrapper of the same component elsewhere is forbidden.
  - Default: declare it in the folder `index.tsx` (`index.ts`) next to the group's other exports (`components/common/controls/grid/index.ts`, `components/common/floating.ts`).
  - A separate `preloads.tsx` in the same folder only when code splitting or loading optimization needs it: the `index` statically imports other components, and importing the wrapper from it would pull their code into a module that does not need them (routes, layout preloaders). State the reason in the file JSDoc. Example: `components/features/contract/preloads.tsx` (the folder `index.ts` statically imports contract card tabs, routes need only skeletons).
  - Several such files in one folder: prefix the feature, `{feature}Preloads.tsx` (`contractPreloads.tsx`).
- Direct imports: modules that affect loading of base page components (layouts, headers, navigation, skeletons, preloaders) may import a component or helper from its own module (`@ord/components/components/container/GridContainer`, `@ord/components/components/buttons/NavigateBackButton`) instead of a shared group `index` or a lazy wrapper (`components/common/controls/grid`), when this makes the base bundle smaller or lets the page show sooner; `npm run build` stays without `[INEFFECTIVE_DYNAMIC_IMPORT]`. Examples: `MainHeader`, `TableSkeleton`, `LoginSkeleton`. In all other cases import from the shared group.
- The goal of these rules: loading order is obvious from the code and each component loads as early as its page needs it.
- To start after an event, render the preloader conditionally. If its code is large (e.g. it needs the route definitions), the preloader loads its own code lazily inside its own `<Suspense>` without fallback (see "A component owns its loading" below), so loading it never replaces the tree. Showing a page never waits for preloading.

A component owns its loading:

- A parent renders a child as a plain element (`<PagesPreloader />`) and does not know how the child is loaded.
- If a component loads its own code lazily (`lazy`, `catch` of the import, `<Suspense>`), this lives in a separate wrapper component or in its folder `index.tsx`, the implementation in `{Component}.tsx` next to it: `infrastructure/Startup/PagesPreloader/{index.tsx,PagesPreloader.tsx}`. A parent never uses `lazy().catch()`.
- Showing lazy components through `LazyLoader` or `ChildrenLazy` is allowed, e.g. a `lazy` declared in the module that exports the component (`components/common/controls/grid/index.ts`).

  ```tsx
  // bad: the parent knows how the child is loaded
  const PagesPreloader = lazy(() => import('infrastructure/Startup/PagesPreloader').catch(() => ({ default: () => undefined })));
  <Suspense><PagesPreloader /></Suspense>

  // good: infrastructure/Startup/PagesPreloader/index.tsx owns lazy, catch and Suspense; the parent renders
  <PagesPreloader />
  ```

Fallback through `ChildrenLazy`:

- Do not use `<Suspense>` with a custom `fallback`; use `ChildrenLazy` (`Components/src/components/loader/ChildrenLazy.tsx`): a standard animation via `variant` (`spiner`, `progress`, `modal`, `empty`), a custom placeholder via `loader`. Exceptions: the loader components themselves (`ChildrenLazy`, `LazyLoader`) and `<Suspense>` without fallback in the wrapper of a component that loads its own code (above).

  ```tsx
  // bad
  <Suspense fallback={<Spinner />}>...</Suspense>

  // good
  <ChildrenLazy variant="spiner">...</ChildrenLazy>
  <ChildrenLazy loader={pageFallback}>...</ChildrenLazy>
  ```