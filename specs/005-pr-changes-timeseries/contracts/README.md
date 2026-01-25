# API Contracts: PR Changes Timeseries

This directory contains TypeScript type definitions documenting the data contracts for the PR Changes Timeseries feature.

**IMPORTANT**: These files are for documentation purposes only. They are excluded from TypeScript compilation via `tsconfig.json` (`exclude: ["specs/**/contracts/**"]`).

## Files

- **TimeseriesTypes.ts**: Domain DTOs and data structures
  - `WeeklyAggregateDto`: Weekly aggregated PR changes
  - `ChangeTrendDto`: Trend analysis results
  - `OutlierWeekDto`: Statistical outlier identification
  - `TimeseriesSummary`: Aggregate statistics
  - `TimeseriesResult`: Complete timeseries analysis response

- **ComponentProps.ts**: React component prop interfaces
  - `AnalysisTabsProps`: Tab navigation component
  - `ChangesTimeseriesTabProps`: Timeseries tab component
  - `TimeseriesChartProps`: Chart visualization component
  - `TimeseriesInsightsProps`: Insights panel component

## Usage

These contracts serve as:

1. **Implementation reference** for developers building the feature
2. **API documentation** for understanding data flows between layers
3. **Contract validation** during code reviews

Actual implementation files are located in:

- `src/application/dto/` (DTOs)
- `src/presentation/components/` (Component props)
- `src/domain/value-objects/` (Domain entities)

## Validation Rules

See `TimeseriesTypes.ts` for detailed validation constraints on each DTO field.

## Examples

Each contract file includes example usage demonstrating:

- Successful analysis with complete data
- Insufficient data scenarios (< 4 weeks)
- Empty state handling (no merged PRs)
