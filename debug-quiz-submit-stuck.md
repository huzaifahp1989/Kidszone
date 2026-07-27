# Debug Session: quiz-submit-stuck
- **Status**: [OPEN]
- **Issue**: Quiz answers do not submit, and both featured and small quizzes stay stuck on "Submitting your answers..."
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: `.dbg/trae-debug-log-quiz-submit-stuck.ndjson`

## Reproduction Steps
1. Open `/quiz`
2. Start any quiz
3. Answer all questions
4. Tap `Finish Quiz`
5. Observe the UI staying on `Submitting your answers...`

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The submit request reaches `/api/quiz/daily/submit` but hangs in auth or Supabase before returning. | High | Medium | Pending |
| B | The submit path stalls while resolving featured/topic question state before scoring. | High | Medium | Pending |
| C | The points-award step blocks the response because `users_points` or related sync queries are slow. | Medium | Medium | Pending |
| D | The frontend is awaiting the submit promise forever because the API never completes, not because of post-submit UI logic. | High | Low | Pending |
| E | A smaller non-featured quiz shares the same blocking server branch, so the bug is in common submit logic. | High | Medium | Pending |

## Log Evidence
- Pending instrumentation

## Verification Conclusion
- Pending
