---
name: backend-patterns
description: Patterns for backend development with Mediator
---

# Backend patterns

Use Mediator for generic commands and register handlers properly.

## Key patterns

- Use `IRequestHandler` for commands
- Register `RequestHandlerWrapper` in ServicesConfig
- Verify actual calls through `IMediator.Send`
