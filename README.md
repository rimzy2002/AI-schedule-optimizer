# AI Schedule Optimizer

AI Schedule Optimizer is a full-stack web application designed to help students automatically extract actionable tasks from course syllabi and generate an optimized, personalized study schedule. It utilizes Google Gemini, Redis/BullMQ background queues, and a backward-scheduling heuristic algorithm.

## System Architecture

```
React 18 / TypeScript (Frontend SPA - Port 5173)
        │
        ▼ (JWT Bearer Auth / REST)
    Express API (Port 4000)
        │
        ├──────────────► MySQL 8 / Prisma ORM (Port 3306)
        │                 ├── Main DB: ai_schedule_optimizer
        │                 └── Isolated Test DB: ai_schedule_optimizer_test
        │
        ▼
   BullMQ Queue (syllabus-queue / syllabus-queue-test)
        │
        ▼
    Redis (Port 6379)
        │
        ▼
  Syllabus Worker (processSyllabusJob)
        │
        ▼
   Google Gemini API (gemini-3.8-flash)
        │
        ▼
  Zod Schema Validation (isoOrDateRegex + isDateOnly)
        │
        ▼
  Task Persistence & Review (Preserving Date-Only vs Timed Meaning)
        │
        ▼
  Backward Scheduling Heuristic Engine (Timezone-Aware)
        │
        ▼
  Study Blocks & Pomodoro Focus Sessions (Row-Locked & Concurrency-Safe)
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router 6, Vanilla CSS Design System (Light Theme)
- **Backend**: Node.js, Express, TypeScript
- **Database**: MySQL 8, Prisma ORM
- **Queue**: BullMQ, Redis (ioredis)
- **AI**: Google Gemini (`gemini-3.8-flash` via `@google/genai`)
- **Validation**: Zod
- **Testing**: Vitest, Supertest
- **Linting**: ESLint flat config (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`)

---

## Core Features & Workflow

1. **User Authentication & Ownership**:
   - Secure registration, login, session persistence, and logout with bcrypt and JWT.
   - Protected frontend routes and API middleware (`requireAuth`).
   - Strict resource ownership enforced on syllabi, courses, tasks, schedules, and focus sessions. Cross-user access is rejected.
2. **Syllabus Extraction & Deadline Integrity**:
   - Paste raw syllabus text; offloaded to a background queue via BullMQ and Redis.
   - AI extraction contract preserves date-only (`YYYY-MM-DD`) versus timed deadlines without inventing arbitrary times.
   - Automatic retry for transient provider demand spikes with configurable models (`gemini-3.8-flash`).
   - Zod schema validation ensuring extracted course metadata, dates, durations, and weights conform to schema boundaries.
3. **Lossless Task Review & Deadline Representation**:
   - Human review allowing task edits, additions, and deletions.
   - Editing unrelated task fields (such as title, weight, or duration) preserves the exact deadline timestamp and `is_date_only` flag.
   - Explicit UI controls for date-only deadlines (closing at end of daily study window, 22:00 local time) versus timed deadlines (with explicit UTC instant).
   - Full support for legitimate ungraded tasks (valid 0% weights).
   - Atomic in-place confirmation preserving stable IDs, task type, syllabus links, descriptions, durations, and recurring flags.
4. **Smart Timezone-Aware Scheduling Engine**:
   - Backward-scheduling heuristic algorithm placing study blocks before deadlines.
   - Strict daily study windows (08:00–22:00) calculated directly in the user's study timezone (e.g. `Asia/Colombo` +05:30) and mapped to UTC for database storage, eliminating server timezone dependencies and preventing late-night skewing (e.g. 03:30 AM).
   - Atomic replacement: previous schedules and pending blocks are archived and replaced inside a single Prisma transaction (`$transaction`). If persistence fails, changes roll back completely and the previous schedule is preserved.
   - Session preservation: preserves study blocks tied to active or paused focus sessions as well as completed study blocks.
   - Eligible work only: schedules only reviewed tasks (`needs_review: false`, `status != 'completed'`) and subtracts completed block durations from remaining study minutes.
5. **Scheduling Concurrency Guarantee & Limitations**:
   - **Single-Process Guarantee (Local MVP)**:
     `UserLockManager` uses an in-memory Promise-chain mutex to serialize concurrent schedule generation requests per user across all courses. Competing requests queue sequentially, preventing race conditions from creating duplicate active schedules or overlapping blocks.
   - **Multi-Process / Distributed Limitation**:
     The in-memory lock coordinates requests within a single Node.js process only. It does not protect across multi-instance or clustered server deployments. For horizontal clustering, distributed locking (such as Redis Redlock or MySQL advisory locks via `SELECT GET_LOCK(...)`) would be required.
6. **Pomodoro Focus Tracking & Transactional Safety**:
   - Study block execution with real-time timer, pause, resume, and session completion.
   - **Row-Level Transactional Locking**:
     All lifecycle transitions (`pause`, `resume`, `complete`) acquire an exclusive lock via `SELECT ... FOR UPDATE` inside Prisma transactions.
   - **Status Regression Prevention**:
     A completed session can never revert to `ACTIVE` or `PAUSED` from delayed or concurrent requests.
   - **Accurate Time Calculation**:
     Pause duration and elapsed study time are derived consistently from locked state.
   - **Metric Uniqueness**:
     `FocusMetric` enforces a database-level uniqueness constraint `@@unique([session_id, metric_key])` preventing duplicate metrics.
   - **Consistency Validation**:
     Validates that any supplied `taskId` belongs to the authenticated user and matches the selected study block.

---

## Local Setup (Windows)

### Prerequisites
- Node.js (v20+ recommended)
- MySQL running on port `3306`
- Redis running on port `6379`
- Google Gemini API Key

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=ai_schedule_optimizer
DATABASE_URL="mysql://root:@localhost:3306/ai_schedule_optimizer"

# Dedicated Test Database Configuration (Isolated)
TEST_DATABASE_URL="mysql://root:@localhost:3306/ai_schedule_optimizer_test"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your_jwt_secret_key_here

# AI / Google Gemini
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Ports & URLs
PORT=4000
CLIENT_URL=http://localhost:5173
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Schema Setup & Reproducible Migrations

A reproducible, reviewed migration guide and SQL script are provided:
- **Migration Guide**: [`packages/database/prisma/migrations/MIGRATION_GUIDE.md`](packages/database/prisma/migrations/MIGRATION_GUIDE.md) documents the exact state of the local database, legacy database remediation/preflight checks, and fresh install baseline steps.
- **Migration Script**: [`packages/database/prisma/migrations/20260928_schedule_optimizer_repair.sql`](packages/database/prisma/migrations/20260928_schedule_optimizer_repair.sql) contains preflight sanity checks and idempotent DDL statements.

Sync both the development and test databases:

```bash
# Push schema to development database
npx prisma db push --schema=packages/database/prisma/schema.prisma

# Push schema to isolated test database
DATABASE_URL="mysql://root:@localhost:3306/ai_schedule_optimizer_test" npx prisma db push --schema=packages/database/prisma/schema.prisma
```

### 4. Running the Development Servers

Start both frontend and backend concurrently:
```bash
npm run dev
```

Or run them in separate terminals:
```bash
npm run dev:api   # API backend on port 4000
npm run dev:web   # React Vite frontend on port 5173
```

---

## Verification & Testing

### Fail-Closed Test Database Isolation

The automated test suite runs completely isolated from the development database:
- **No Hardcoded Test URL**: `apps/api/vitest.config.ts` does not contain hardcoded credentials; it loads explicit configuration from `.env`.
- **Fail-Closed Prisma Construction**: In `packages/database/src/index.ts`, `createPrismaClient()` fails closed in `NODE_ENV=test`:
  - Throws immediately if `TEST_DATABASE_URL` is missing or empty.
  - Throws immediately if the target database name matches `DATABASE_URL`.
  - Throws immediately if the database name does not end in `_test`.
  - Never falls back to the schema's default `DATABASE_URL`.
- **Pre-Write MySQL Verification**: Asserts the active MySQL database on the Prisma connection via `SELECT DATABASE() as current_db` before executing any test writes.
- **Sanitized Errors**: Error messages never log or leak database usernames or passwords.

```bash
npm test
```

### Verified Test Suite (150 Passing Tests across 13 Suites)

- **Test Database Isolation & Target Validation** (`tests/unit/testDatabaseIsolation.test.ts` - 9 tests):
  - Safe database target parsing without credential leakage.
  - Strict rejection of normal database URLs with "test" in username or password.
  - Rejection of identical application/test database targets.
  - Rejection of missing/empty `TEST_DATABASE_URL`.
  - Rejection of database targets lacking `_test` suffix.
  - Validation of isolated test target.
  - Fail-closed behavior when `NODE_ENV=test` and `TEST_DATABASE_URL` is absent (with `DATABASE_URL` set), proving no connection is made to the application database.
  - Fail-closed behavior when `TEST_DATABASE_URL` targets the application database.
- **Strict Calendar Date and Deadline Validation** (`tests/unit/dateValidation.test.ts` - 29 tests):
  - Strict Gregorian leap-year logic (2024 and 2000 are leap years; 2025, 1900, 2100 are not).
  - Days-in-month boundary verification for all 12 months.
  - Calendar date validity rejecting impossible dates (February 30, April 31, Month 13, Month 0).
  - Explicit timezone offset parsing and bounds checking (offsets within hours 0-14, minutes 0-59, such as valid `+05:30` Asia/Colombo).
  - Contradiction rejection between deadline format and `isDateOnly` flag (e.g. date-only format with `isDateOnly: false` or timed format with `isDateOnly: true`).
  - Integration with Zod schemas in syllabus parser and task controllers.
- **Scheduler Timezones, DST Transitions & Heuristics** (`tests/scheduling/backwardScheduler.test.ts` - 19 tests):
  - Strict study windows in `Asia/Colombo` (+05:30), `UTC`, and `America/New_York`.
  - Date-only calendar date preservation across Asia/Colombo, UTC, and America/New_York (no backward day shift in Western timezones).
  - Preservation of calendar dates across daylight-saving transitions in America/New_York (EDT -> EST).
  - Explicit timestamp preservation vs configured `endHour` local-time close.
  - Local midnight boundaries and task prioritization.
- **Split Study Time & Max Session Duration** (`tests/unit/algorithms/splitStudyTime.test.ts` - 6 tests):
  - Splits long tasks into blocks respecting `maxSessionDuration`.
  - Strictly preserves total study minutes (`sum(blocks) === totalMinutes`).
  - Correctly preserves durations under the maximum cap.
- **Truthful & Durably Saved Settings** (`tests/unit/services/settings.service.test.ts` - 8 tests):
  - Direct authoritative reads from MySQL (`user_settings`).
  - Rejection of invalid study hours (`startHour >= endHour`) and out-of-bounds session durations.
  - Immunity to stale Redis cache overrides.
  - Resilience against Redis unavailability and cache failures.
  - Preservation of existing development settings JSON files during test execution.
- **Settings API Integration** (`tests/integration/settings.test.ts` - 6 tests):
  - Authentication protection on GET /api/settings and PUT /api/settings.
  - Durable persistence to MySQL database.
  - Partial settings update without loss of other preferences.
  - Cross-user settings isolation.
- **Persistence, Reload Recovery & Navigation** (`tests/integration/persistenceAndNavigation.test.ts` - 13 tests):
  - Server-backed draft task creation, edits, and deletions.
  - Survival of task edits across simulated reloads and durable course URLs.
  - Dedicated courses API returning full course lists with associated task counts.
  - Weekly calendar schedule navigation and distinct date ranges across months.
  - Cross-user data isolation on courses and task edits.
- **Schedule Concurrency & Rollback** (`tests/integration/schedule.test.ts` - 8 tests):
  - Atomic replacement rollback when persistence fails (preserves existing schedule).
  - Serialized competing schedule generation requests for the same user.
  - Active and paused focus session block preservation.
  - Deduction of completed block durations from remaining required study time.
  - Scheduling only reviewed, eligible tasks (`needs_review: false`).
- **Focus Tracking & Safe Concurrency** (`tests/integration/focus.test.ts` - 12 tests):
  - Atomic row-locked state transitions (`SELECT ... FOR UPDATE`).
  - Active and paused timer state reload recovery.
  - Concurrent duplicate completion deduplication.
  - Concurrent pause/complete and resume/complete safety.
  - Status regression prevention (completed session cannot become active or paused).
  - Transaction failure rollback and retry recovery.
  - Database metric uniqueness (`@@unique([session_id, metric_key])`).
  - `taskId` ownership and study block consistency validation.
- **Tasks, Concurrency & Deadline Meaning** (`tests/integration/tasks.test.ts` - 17 tests):
  - Preserves exact timestamp and `is_date_only` flag when editing only a title during confirmation.
  - Imported date-only deadline stays date-only through worker persistence.
  - Imported timed deadline retains its intended instant and timezone meaning.
  - Full round-trip: worker persistence -> GET course details -> unchanged confirmation -> schedule generation.
  - Atomic version increment and 409 Conflict return on stale edits.
  - Transaction-protected confirmation rejecting stale task versions.
  - Partial updates preserve deadlines.
  - Atomic task confirmation and cross-user rejection.
  - Rejection of impossible dates (Feb 30) during task confirmation.
  - Rejection of invalid timezone offsets (+25:00) during task confirmation.
  - Rejection of format-flag contradictions on task update.
- **Auth Integration** (`tests/integration/auth.test.ts` - 7 tests):
  - User registration, password hashing, and duplicate email rejection.
  - Login authentication and token verification.
  - Isolated per-test cleanup tracking created IDs only (no wildcard deletions).
- **Syllabus Integration** (`tests/integration/syllabus.test.ts` - 5 tests):
  - Mocked Gemini provider ensuring fast, deterministic, offline execution.
  - Unauthenticated access and empty syllabus validation.
  - Queue job creation and status tracking.
- **AI Syllabus Parser** (`tests/ai/syllabus.test.ts` - 11 tests):
  - Schema validation, date-only and ISO datetime parsing, invalid format detection, and error logging.

### Browser Form Behavior & Timezone Handling

In `TaskReviewForm.tsx`:
- **"Time (UTC):" Label**: The time input field is explicitly labeled **"Time (UTC):"**. When editing a timed deadline, the user inputs the time directly in UTC, which is formatted as `${datePart}T${timePart}:00.000Z` (`is_date_only = false`).
- **Title-Only Edits**: If a user only changes the task title, weight, or duration, the original deadline string and `is_date_only` flag are preserved verbatim without altering timestamps or timezone meaning.
- **Date-Only Deadlines**: If the user marks a deadline as date-only or supplies only a date, it is stored as `YYYY-MM-DD` (`is_date_only = true`) without inventing a timestamp. In schedule generation, it resolves to the configured study-day closing hour (`endHour`, default 22:00) in the user's study timezone, converted cleanly to UTC.
- **Conflict Banner**: If a task was modified in another tab or session, the review page displays an actionable conflict notification with a `↻ Refresh Tasks` button to reload the latest server state without losing uncommitted form inputs.

### Meaningful Linting & Building

ESLint flat configuration and TypeScript builds pass cleanly across all workspaces:
```bash
npm run lint    # ESLint passes with 0 errors (52 warnings in api, 44 warnings in web)
npm run build   # TypeScript tsc and Vite production bundle compile with 0 errors
```

---

## Known Limitations & Considerations

1. **Scheduling Concurrency Scope (Single-Process Mutex)**:
   - Scheduling serialization is managed via `UserLockManager` (an in-process Promise-chain mutex per user).
   - This provides complete safety within a single Node.js process (the target architecture for this local application).
   - Horizontal multi-instance clustering would require distributed lock coordination (e.g. Redis Redlock or MySQL advisory locks `GET_LOCK`).
2. **Google Gemini Live Quota**:
   - The application supports live AI extraction via `gemini-3.8-flash`.
   - Free-tier API keys are subject to Google Gemini rate limits (15 requests/minute). When quota is exhausted, the Gemini API responds with HTTP 429.
   - The background queue worker catches provider errors, marks the job failed with descriptive feedback, and retries with exponential backoff.
   - For offline testing and deterministic CI runs, the test suite mocks the Gemini provider.

---

## Verification Evidence Summary

| Verification Category | Status | Evidence |
| :--- | :--- | :--- |
| **Isolated Automated Tests** | **PASS** (150/150) | 13 test suites passing in Vitest targeting `ai_schedule_optimizer_test`. |
| **Fail-Closed DB Guard** | **PASS** | Tests prove `NODE_ENV=test` fails closed without `TEST_DATABASE_URL` without touching `ai_schedule_optimizer`. |
| **Calendar Date Validation** | **PASS** (29/29) | Rejects impossible dates (Feb 30, Month 13), invalid offsets (+25:00), leap year violations, and flag contradictions. |
| **Timezone & DST Resolution** | **PASS** (19/19) | Retains calendar date in Colombo, UTC, and New York; preserves dates across US daylight-saving fall-back transition. |
| **Settings Durability** | **PASS** (8/8) | Direct MySQL authoritative store; immune to stale Redis cache overrides and Redis failure. |
| **ESLint Static Analysis** | **PASS** (0 errors) | Strict TypeScript and React hooks linting with 0 errors across all workspaces (52 warnings in api, 44 in web). |
| **Production Build** | **PASS** (0 errors) | `tsc` and `vite build` completed cleanly across api, web, and database packages. |
| **Live Browser E2E** | **PASS** | Full user flow: registration, task edit/save/reload recovery, durable URL navigation, multi-tab stale conflict rejection, max session duration enforcement, and active/paused focus timer recovery. |

