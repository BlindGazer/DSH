---
description: Do not freeze "today" in a static field or constructor of a long-lived validator - read Now on every call
path: "**/*.cs"
---

Do not compute "today" in a `static` field or in the constructor of a long-lived validator.
Read the current time on every validation call via the project clock abstraction, or
directly inside the predicate, so the validator does not go stale after the date changes.
