# Демо @kalex/dsh-core

[![TypeScript 7](https://img.shields.io/badge/TypeScript-7-3178C6)](https://www.typescriptlang.org/) [![React 18 / 19](https://img.shields.io/badge/React-18_%2F_19-61DAFB)](https://react.dev/) [![Vite 8](https://img.shields.io/badge/Vite-8-D97706)](https://vite.dev/) [![license ISC](https://img.shields.io/badge/license-ISC-568814)](../../../LICENSE.md)

Из корня монорепозитория:

```sh
pnpm install
pnpm demo-core
```

Откройте адрес из вывода Vite. Демо работает отдельно от DSH: в нем можно проверить компоненты, переключить светлую и темную темы и посмотреть, как выглядят недоступные элементы.

Перед запуском скрипт сверяет SHA отдельных файлов стилей в ветке `master` репозитория `deepseek-ai/deepseek-harness` с кэшем в `packages/dsh-core/node_modules/dsh-github-styles`. Если запрос списка файлов не удался, скрипт использует кэш при наличии его манифеста. Без кэша для первого запуска нужен доступ к GitHub.
