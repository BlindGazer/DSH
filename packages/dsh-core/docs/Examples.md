# Примеры компонентов

Библиотека не добавляет экран в DSH. Чтобы посмотреть компоненты локально, выполните `pnpm install` и `pnpm demo-core` из корня монорепозитория. Откройте адрес из вывода Vite.

```tsx
import { Button } from '@kalex/dsh-core';

export function SaveButton() {
    return <Button onClick={() => console.log('save')}>Сохранить</Button>;
}
```

[Установка и команды](Setup.md) | [English](Examples_EN.md)
