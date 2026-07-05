# My Work Mobile Query (Phase 6D foundation)

`getMyOperationsWork(projectId?, limit?)` returns only rows owned by `auth.uid()` — no other users' PII.

Shape:
```
{ leads: [...], registrations: [...], tasks: [...], overdue_tasks: number }
```

Mobile UI cutover is NOT part of Phase 6D. This foundation exists so mobile can adopt without another schema change.

Query key: `queryKeys.myOperationsWork(filters)`.
Service: `src/services/operations.service.ts` (re-exports the admin service function).