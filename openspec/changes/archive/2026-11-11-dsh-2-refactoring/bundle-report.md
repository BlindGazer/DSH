# Состав и размеры клиентских бандлов

Проверено 2026-11-07 командой `pnpm verify:tree-shaking` на production-сборке Vite 8. Размеры приведены в десятичных kB. Gzip указан для каждого итогового файла; число mapped sources взято из JavaScript source map.

## Контроль tree shaking и внешних зависимостей

Контрольная сборка с конфигурацией клиента `dsh-agents-router` сохранила используемый экспорт `DSH_TREE_SHAKING_USED_CONTROL` и удалила неиспользуемый `DSH_TREE_SHAKING_UNUSED_CONTROL`. Идентификаторы внешних модулей остались вызовами загрузчика, а не попали в состав бандла: `react`, `react/jsx-runtime`, модули DSH `dsh-client-ui-conversation`, `dsh-client-locale`, `dsh-client-ui-plugin-manager`, `dsh-client-ui-renderer`, `dsh-client-ui-settings-models`, `dsh-client-ui-settings`, `dsh-client-ui-slots` и `@deepseek-ai/cordis`.

## Production-артефакты

| Пакет и состав | JavaScript | Gzip | Mapped sources | CSS | Gzip |
| --- | ---: | ---: | ---: | ---: | ---: |
| `@kalex/dsh-core`: компоненты, хуки, темы и утилиты | `index.js`, 32.04 kB | 10.42 kB | 27 | `dsh-core.css`, 5.90 kB | 1.43 kB |
| `@kalex/dsh-agents-router`: приложение и функции роутера, каталога, диагностики, аудита, памяти и настроек | `client.js`, 86.85 kB | 28.67 kB | 44 | `dsh-agents-router.css`, 18.43 kB | 3.78 kB |
| `@kalex/dsh-proxy-provider`: приложение и функции профилей, маршрутизации, импорта/экспорта, карточки провайдера и настроек | `client.js`, 80.47 kB | 24.51 kB | 33 | `dsh-proxy-provider.css`, 10.90 kB | 2.19 kB |

Каждая клиентская сборка формирует один JavaScript-файл и один CSS-файл. Общие компоненты `dsh-core` включены в клиентские бандлы плагинов только по используемым импортам.
