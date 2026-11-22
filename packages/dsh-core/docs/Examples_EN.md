# Component examples

The library does not add a DSH screen. To preview its components locally, run `pnpm install` and `pnpm demo-core` from the monorepo root. Open the URL printed by Vite.

```tsx
import { Button } from '@kalex/dsh-core';

export function SaveButton() {
    return <Button onClick={() => console.log('save')}>Save</Button>;
}
```

[Setup and commands](Setup_EN.md) | [Russian](Examples.md)
