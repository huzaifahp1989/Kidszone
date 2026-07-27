# Debug Session: points-flow-root-cause
- **Status**: [OPEN]
- **Issue**: User points are not updating correctly after activities, and the full points flow must be traced, fixed at the root cause, and verified end-to-end.
- **Debug Server**: Pending start
- **Log File**: `.dbg/trae-debug-log-points-flow-root-cause.ndjson`

## Scope
- Trace activity completion, validation, database write, leaderboard update, UI refresh, and profile update.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Some activity award paths bypass the shared atomic points writer, so totals drift or do not update together. | High | Medium | Pending |
| B | Supabase updates succeed, but stale UI/profile refresh paths make points appear unchanged. | High | Medium | Pending |
| C | A trigger, function, constraint, or policy causes partial or silent write failures. | Medium | High | Pending |
| D | Conflicting async point updates race and overwrite `total`, `weekly`, or `today` fields. | High | High | Pending |
| E | Some activity types use inconsistent identifiers or validation and never reach the canonical points path. | High | Medium | Pending |

## Verification Conclusion
- Pending
