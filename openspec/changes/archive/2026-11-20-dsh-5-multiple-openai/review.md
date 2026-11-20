# Итог реализации и ревью dsh-5

## Статус

Все 23 пункта [tasks.md](<tasks.md>) реализованы и проверены автоматическими тестами. Изменение не архивировано: установка в рабочий профиль, реальная OAuth-приемка и визуальная приемка остаются действиями пользователя.

## Проверка требований

| Пункты | Результат |
| --- | --- |
| 1.1-1.2 | Новый пакет `@kalex/dsh-openai-hub`, новый Loader id, workspace/build inputs, документация и пересобранные артефакты; старые proxy assets удалены. |
| 2.1-2.3 | Один зарегистрированный маршрут `openai-hub`, namespace `openaiHub`, строгий `accounts[]`, отдельный credential resolver. Полный account id и токены отсутствуют в config/Remote DTO/model ids. |
| 3.1-3.3 | Авторизованный каталог, сохранение настроек/порядка, новые и удаленные модели, последний успешный каталог и локальный fallback. Публичные model id/name содержат только `<label>/<upstream-id>`; подготовленный запрос отправляет upstream id. |
| 4.1-4.2 | Отдельные карточки и модальные окна; метка до OAuth, проверка lowercase ASCII/дубликатов, изменение метки без переноса credential. Старые ссылки не переписываются и не получают aliases. |
| 4.3-4.5 | Persisted auto-refresh off по умолчанию; plugin-lifetime scheduler работает без открытых карточек/dock. Один таймер на аккаунт, 5 минут обычно / 1 минута только для выбранной модели с остатком <25%; приоритет час/5 часов/день. Скрытая страница не отправляет quota-запросы, возврат обновляет каждый релевантный аккаунт один раз. Dock читает фактический SDK model directory и скрывает другие/устаревшие модели и старые quota-данные. |
| 5.1-5.2 | Удаление account-local credentials/config/models/cache, соседние аккаунты и история не меняются. Последний аккаунт возвращает fresh-install. Ошибка сохранения удаления восстанавливает точный удаленный credential, включая завершившийся rotating refresh. |
| 6.1-6.2 | Все затронутые Modal backdrop являются Core theme roots и карточки используют modal background token; Hub и workspace-manager покрыты light/dark DOM-тестами. OpenAI Hub больше не содержит proxy UI/handlers/workers/transports и credential debug logs. |
| 7.1-7.3 | Синтетические Host/Client/transport/catalog тесты, проверка собранного Client и выпуска; обновлены RU/EN инструкции и [Workflow](<../../../packages/dsh-openai-hub/docs/Workflow.md>). |
| 8.1-8.3 | Два независимых параллельных ревью, собственный source/history/diff audit, исправления, полный прогон проверок, [инструкция переустановки и приемки](<../../../packages/dsh-openai-hub/docs/Setup.md>). |

## Ревью и исправления

Параллельно работали `final-review-host` и `final-review-client` (`openai-codex/gpt-6-luna`). Они проверили OpenSpec и запрошенные правила кода, TypeScript, DoD, frontend и дизайн-системы. Lead отдельно проверил интеграцию SDK, историю/diff и границы изменений.

Исправлены подтвержденные замечания:

1. Удаление с неуспешным сохранением конфигурации больше не оставляет настроенный аккаунт без credential. Сериализованный `take()` ждет уже начатый token refresh и сохраняет именно его результат для отката; восстановление не затирает более новую запись. Добавлены два failure/concurrency регрессионных теста.
2. Pending reset переносится под подтвержденную новую метку до публикации снимка и монтирования новой карточки. Idempotency key сохраняется; старый и чужой устаревший cache не переиспользуются.
3. Auto-refresh имеет владельца на срок жизни плагина, а не только открытого модального окна/композера. Таймеры общие и дедуплицированы.
4. Убран частый опрос snapshot из-за fallback-каталога. Названия способов OAuth локализованы.
5. Добавлены тесты scheduler без UI, pending-reset rename, выбранного аккаунта/старых данных и light/dark theme roots. После повторного чтения reviewers подтвердили исправления и отсутствие других подтвержденных дефектов в этих срезах.

Собственная проверка дополнительно исправила:

- Несовпадение native pi-ai provider id с маршрутом Hub: SDK provider/model metadata теперь адресуются согласованно.
- Client transport boundary использует настоящий `RemoteResult<T>` и проверяет бизнес-DTO; transport envelope не попадает в состояние UI.
- Ответ операции после ConfigEditor/Loader remount больше не показывает ложное пустое fresh-install состояние. Незавершенный первый каталог продолжает новый Host instance.
- Гонки ответов разных аккаунтов завершаются чтением актуального снимка, а не потерей завершившегося обновления.
- У Core Modal собственный backdrop не входил в стандартные token root selectors. Локальный `backdropClassName="dsh-core-root"` исправляет это без изменения общей библиотеки.
- Три существовавших несогласованных тестовых ожидания agents-router приведены к текущим контрактам: baseline external `react-dom`, ThemedSelect вместо native select и явно заданная license в fixture. Production-код router не менялся.

## Финальные проверки

- `pnpm fix` — успешно.
- `pnpm check` — успешно: UTF-8/LF, TypeScript source/tests, Oxlint, Biome.
- `pnpm build` — успешно, все пакеты.
- `pnpm test` — 51 файл, 192 теста успешно.
- `pnpm --filter @kalex/dsh-openai-hub run test` — 15 файлов, 66 тестов успешно (входят в общий прогон).
- `pnpm --filter @kalex/dsh-openai-hub run verify` — успешно, проверены exports/metadata/license/артефакты и отсутствие proxy worker.
- `pnpm --filter @kalex/dsh-workspace-manager run test` — 9 файлов, 38 тестов успешно.
- `openspec validate dsh-5-multiple-openai --strict` — успешно.
- `git diff --check` — успешно.

Сборка сохраняет нефатальное предупреждение bundler о директиве `use no memo` в стороннем `react-compiler-runtime`; код зависимости не изменялся. Failure-тесты намеренно печатают обезличенные сообщения ошибок Host, без исходных ответов/секретов.

## Границы и ручная приемка

- Ключи CredentialRef используют согласованные с пользователем underscores: `openai_hub_device_code_<8hex>` / `openai_hub_browser_oauth_<8hex>`. SDK не принимает дефисы в CredentialRef; логическая строка OpenSpec не выдается за допустимый SDK ref.
- Пакеты `dsh-core` и `dsh-proxy-provider` не изменены; production-код agents-router не изменен.
- Рабочий профиль и реальные credentials не изменялись. Все сетевые/OAuth fixtures синтетические.
- Live Client Inspect не отвечал; проверялись установленные SDK source contracts, DOM-тесты и собранный Client через реальный формат ModuleLoader. Это не заменяет визуальный осмотр существующей страницы DSH после установки и refresh.
- Browser OAuth требует локального callback на машине DSH; для remote/headless установки предусмотрен device-code. Возможности неизвестных API моделей используют локальный Codex metadata template с API overrides, как описано в [Workflow](<../../../packages/dsh-openai-hub/docs/Workflow.md>).
- Ручная установка нового пакета, реальная OAuth-приемка двух аккаунтов и визуальная проверка выполняются по [Setup](<../../../packages/dsh-openai-hub/docs/Setup.md>). Архивирование — только после приемки пользователя.
