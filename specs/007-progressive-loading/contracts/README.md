# API Contracts: Progressive Data Loading

**Feature**: 007-progressive-loading
**Date**: 2026-02-06
**Status**: Complete

## Purpose

This directory contains TypeScript interface definitions and type contracts for the progressive loading feature. These contracts serve as the specification for implementation and ensure type safety across layers.

**Note**: These are documentation-only contracts. They are excluded from TypeScript compilation and ESLint (per CLAUDE.md configuration).

## Files

- `index.ts` - All TypeScript interface definitions and type contracts (enums, value objects, entities, repositories)

## Usage

These contracts define the shape of domain objects and interfaces. Implementations in `src/domain/`, `src/application/`, and `src/infrastructure/` must adhere to these contracts.

**Example**:

```typescript
// All contracts are defined in a single file
// Contract: specs/007-progressive-loading/contracts/index.ts
export interface CachedDataEntry {
  key: CacheKey;
  repositoryId: string;
  dataType: DataType;
  // ...
}

// Implementation: src/domain/entities/CachedDataEntry.ts
export class CachedDataEntry {
  private constructor(
    public readonly key: CacheKey,
    public readonly repositoryId: string,
    public readonly dataType: DataType,
    // ...
  ) {}
}
```

## References

- [data-model.md](../data-model.md) - Detailed entity descriptions and relationships
- [spec.md](../spec.md) - Feature requirements
- [CLAUDE.md](/CLAUDE.md) - Project conventions

## Generated Contracts

Contract file generated 2026-02-06 based on data-model.md specifications. All types are consolidated in `index.ts` for simplicity, as these are documentation-only contracts. Implementation can split these into separate files as needed.
