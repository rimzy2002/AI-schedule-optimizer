# AI Schedule Optimizer - Database Migration & Baseline Guide

## Overview

This guide provides reproducible, evidence-based migration and baseline instructions for the **AI Schedule Optimizer** database schema. It documents the exact current state of the database, prerequisites for migrating legacy databases, and steps for initializing fresh installations.

---

## 1. What Is Already Applied Locally

Direct read-only schema inspection of the local development database (`ai_schedule_optimizer` on MySQL 8.0+, port 3306) on September 28, 2026 confirms the following schema and data state:

### Schema State
- **`tasks` Table**:
  - `is_date_only` (`TINYINT(1)`, `NOT NULL`, default `0`): **Applied**.
  - `estimated_duration` (`INT`, `NULL`, default `NULL`): **Applied**.
  - `description` (`TEXT`, `NULL`, default `NULL`): **Applied**.
  - `recurring` (`TINYINT(1)`, `NOT NULL`, default `0`): **Applied**.
- **`focus_metrics` Table**:
  - `session_id` (`VARCHAR(191)`, `NULL`, default `NULL`): **Applied**.
  - Unique index `focus_metrics_session_id_metric_key_key` on `(session_id, metric_key)`: **Applied**.
- **`courses` Table**:
  - `course_code` (`VARCHAR(191)`, `NULL`, default `NULL`): **Applied**.
  - `instructor` (`VARCHAR(191)`, `NULL`, default `NULL`): **Applied**.
  - `semester` (`VARCHAR(191)`, `NULL`, default `NULL`): **Applied**.
- **`syllabi` Table**:
  - `course_name` (`VARCHAR(191)`, `NULL`, default `NULL`): **Applied**.
  - `extracted_text` (`LONGTEXT`, `NOT NULL`): **Applied**.
- **Migration History Table**:
  - `_prisma_migrations` does **not** exist in the active development database. The current local schema was established via `prisma db push` / direct DDL synchronization rather than Prisma Migrate CLI history tracking.

### Data Integrity Audit (Verified Evidence)
- **Null Syllabus Extracted Text**: `0` rows with `extracted_text IS NULL`.
- **Duplicate Metric Keys**: `0` duplicate `(session_id, metric_key)` pairs among non-null `session_id` rows.
- **Legacy Metrics**: Exactly 3 focus metric records exist with `session_id = NULL` (valid under MySQL unique indexes where NULL values are treated as distinct).
- **Active Record Counts**:
  - `users`: 4
  - `courses`: 5
  - `tasks`: 6
  - `syllabi`: 5
  - `study_blocks`: 9
  - `focus_sessions`: 2
  - `focus_metrics`: 3

> **Caution**: Running unconditional `ALTER TABLE ... ADD COLUMN ...` statements against the current local database will fail with MySQL Error 1060 (`Duplicate column name`) and Error 1061 (`Duplicate key name`).

---

## 2. What a Legacy Database Requires

A legacy deployment (e.g., prior to September 2026 updates) may have a schema where `is_date_only`, `session_id`, and other columns are missing, and may contain unconstrained data that violates new constraints.

### Step 2.1: Preflight Data Integrity Checks (Run BEFORE DDL)

Before modifying the schema or applying constraints, run these read-only diagnostic queries:

```sql
-- Check 1: Detect NULL syllabus text that would fail NOT NULL constraint on syllabi.extracted_text
SELECT id, user_id, filename, created_at 
FROM syllabi 
WHERE extracted_text IS NULL;

-- Check 2: Detect duplicate non-null (session_id, metric_key) pairs that would fail unique constraint
SELECT session_id, metric_key, COUNT(*) AS count
FROM focus_metrics
WHERE session_id IS NOT NULL
GROUP BY session_id, metric_key
HAVING COUNT(*) > 1;

-- Check 3: Check which columns already exist in tasks
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'tasks'
  AND column_name IN ('is_date_only', 'estimated_duration', 'description', 'recurring');

-- Check 4: Check if focus_metrics.session_id and its unique index exist
SELECT column_name FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'focus_metrics' AND column_name = 'session_id';

SELECT index_name FROM information_schema.statistics
WHERE table_schema = DATABASE() AND table_name = 'focus_metrics' AND index_name = 'focus_metrics_session_id_metric_key_key';
```

### Step 2.2: Data Remediation (If Preflight Fails)

1. **If NULL `extracted_text` records exist**:
   Decide remediation based on data value. If placeholder text is acceptable:
   ```sql
   UPDATE syllabi SET extracted_text = '' WHERE extracted_text IS NULL;
   ```
2. **If duplicate `(session_id, metric_key)` records exist**:
   Deduplicate records by keeping only the most recent entry:
   ```sql
   DELETE fm1 FROM focus_metrics fm1
   INNER JOIN focus_metrics fm2 
     ON fm1.session_id = fm2.session_id 
    AND fm1.metric_key = fm2.metric_key
    AND fm1.created_at < fm2.created_at;
   ```

### Step 2.3: Idempotent Legacy Migration Script

Use standard dynamic SQL with `information_schema` checks (compatible with standard MySQL 8.0 without unsupported `ADD COLUMN IF NOT EXISTS` syntax). Detects equivalent foreign keys by their definition (`REFERENCED_TABLE_NAME` and `REFERENCED_COLUMN_NAME`) rather than only a custom constraint name.

```sql
-- 1. Tasks Table Columns
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'is_date_only');
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `tasks` ADD COLUMN `is_date_only` BOOLEAN NOT NULL DEFAULT FALSE;', 'DO 0;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'estimated_duration');
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `tasks` ADD COLUMN `estimated_duration` INT NULL;', 'DO 0;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'description');
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `tasks` ADD COLUMN `description` TEXT NULL;', 'DO 0;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'recurring');
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `tasks` ADD COLUMN `recurring` BOOLEAN NOT NULL DEFAULT FALSE;', 'DO 0;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Focus Metrics session_id Column
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'focus_metrics' AND COLUMN_NAME = 'session_id');
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `focus_metrics` ADD COLUMN `session_id` VARCHAR(191) NULL;', 'DO 0;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Foreign Key: Detect equivalent FK by its semantic definition
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'focus_metrics'
    AND COLUMN_NAME = 'session_id'
    AND REFERENCED_TABLE_NAME = 'focus_sessions'
    AND REFERENCED_COLUMN_NAME = 'id'
);
SET @sql_fk = IF(@fk_exists = 0,
  'ALTER TABLE `focus_metrics` ADD CONSTRAINT `fk_focus_metrics_session` FOREIGN KEY (`session_id`) REFERENCES `focus_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;',
  'DO 0;'
);
PREPARE stmt_fk FROM @sql_fk; EXECUTE stmt_fk; DEALLOCATE PREPARE stmt_fk;

-- 4. Unique Constraint on (session_id, metric_key)
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'focus_metrics' 
    AND INDEX_NAME = 'focus_metrics_session_id_metric_key_key'
);
SET @sql_idx = IF(@idx_exists = 0,
  'CREATE UNIQUE INDEX `focus_metrics_session_id_metric_key_key` ON `focus_metrics` (`session_id`, `metric_key`);',
  'DO 0;'
);
PREPARE stmt_idx FROM @sql_idx; EXECUTE stmt_idx; DEALLOCATE PREPARE stmt_idx;

-- 5. Syllabi Column Nullability Alignment
ALTER TABLE `syllabi`
  MODIFY COLUMN `course_name` VARCHAR(191) NULL,
  MODIFY COLUMN `extracted_text` LONGTEXT NOT NULL;
```

---

## 3. What a Fresh Installation Requires

For a completely new installation with a blank MySQL database:

1. **Configure Environment Variables**:
   Create a root `.env` file based on `.env.example`:
   ```bash
   DATABASE_URL="mysql://<user>:<password>@localhost:3306/ai_schedule_optimizer"
   TEST_DATABASE_URL="mysql://<user>:<password>@localhost:3306/ai_schedule_optimizer_test"
   REDIS_HOST="127.0.0.1"
   REDIS_PORT="6379"
   GEMINI_API_KEY="<your-api-key>"
   JWT_SECRET="<your-jwt-secret>"
   ```

2. **Create Databases in MySQL**:
   ```sql
   CREATE DATABASE IF NOT EXISTS ai_schedule_optimizer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE IF NOT EXISTS ai_schedule_optimizer_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Deploy Schema via Prisma**:
   ```bash
   cd packages/database
   npm run build
   npx prisma db push
   ```
   Or, to initialize Prisma Migrate with baseline tracking:
   ```bash
   npx prisma migrate resolve --applied 20260928_schedule_optimizer_repair
   ```

4. **Verify Schema Generation**:
   ```bash
   npx prisma generate
   ```

---

## 4. Verification and Safety Rules

1. **Never use `--accept-data-loss`** in production or existing development databases.
2. **Never drop the `ai_schedule_optimizer` database** to run tests; tests must strictly run against the dedicated `TEST_DATABASE_URL` (`ai_schedule_optimizer_test`).
3. Always run the preflight queries in Step 2.1 before attempting any schema modification on existing databases.
