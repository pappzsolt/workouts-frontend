# Backend DTO models

This directory is generated from the Java DTOs in the workouts backend supplied for the DTO audit.

Rules:
- These interfaces describe the backend API contract only.
- Do not add UI-only fields here.
- Java reference types are represented as `T | null`; Java primitive fields remain non-null.
- `LocalDate` / `LocalDateTime` / `UUID` are represented as `string`.
- `List<T>` and `Set<T>` are represented as `Array<T>`.
- `Map<String, Object>` is represented as `Record<string, unknown>`.
- Existing UI models are intentionally not deleted or globally replaced in this first migration step.

The generated layer is the safe canonical source for endpoint/service migration. Services should be migrated endpoint-by-endpoint, keeping UI-only models separate where needed.
