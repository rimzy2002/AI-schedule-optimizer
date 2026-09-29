-- ==============================================================================
-- Migration: 20260928_schedule_optimizer_repair.sql
-- Description: Reproducible, reviewed migration instructions for AI Schedule Optimizer
-- Fully compatible with MySQL 8.0, MySQL 8.4, and MariaDB 10.4+.
-- Safe, non-destructive, and idempotent DDL statements preserving existing data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PREFLIGHT INTEGRITY CHECKS (Execute prior to applying DDL)
-- ------------------------------------------------------------------------------
-- 1. Check for NULL syllabus text (would violate NOT NULL on syllabi.extracted_text):
--    SELECT id, user_id, filename, created_at FROM `syllabi` WHERE `extracted_text` IS NULL;
--    (Remediation: UPDATE `syllabi` SET `extracted_text` = '' WHERE `extracted_text` IS NULL;)
--
-- 2. Check for duplicate (session_id, metric_key) pairs among non-null sessions:
--    SELECT `session_id`, `metric_key`, COUNT(*) AS count
--    FROM `focus_metrics`
--    WHERE `session_id` IS NOT NULL
--    GROUP BY `session_id`, `metric_key`
--    HAVING COUNT(*) > 1;
--    (Remediation: Deduplicate by keeping highest/latest entry before creating unique index)
-- ------------------------------------------------------------------------------

-- 1. Tasks Table: Additive columns for date-only, duration, description, and recurring
-- Uses dynamic SQL with information_schema checks for strict MySQL 8.0 compatibility

-- 1a. tasks.is_date_only
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'is_date_only'
);
SET @sql_cmd = IF(@col_exists = 0,
  'ALTER TABLE `tasks` ADD COLUMN `is_date_only` BOOLEAN NOT NULL DEFAULT FALSE;',
  'DO 0;'
);
PREPARE stmt_is_date_only FROM @sql_cmd;
EXECUTE stmt_is_date_only;
DEALLOCATE PREPARE stmt_is_date_only;

-- 1b. tasks.estimated_duration
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'estimated_duration'
);
SET @sql_cmd = IF(@col_exists = 0,
  'ALTER TABLE `tasks` ADD COLUMN `estimated_duration` INT NULL;',
  'DO 0;'
);
PREPARE stmt_duration FROM @sql_cmd;
EXECUTE stmt_duration;
DEALLOCATE PREPARE stmt_duration;

-- 1c. tasks.description
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'description'
);
SET @sql_cmd = IF(@col_exists = 0,
  'ALTER TABLE `tasks` ADD COLUMN `description` TEXT NULL;',
  'DO 0;'
);
PREPARE stmt_desc FROM @sql_cmd;
EXECUTE stmt_desc;
DEALLOCATE PREPARE stmt_desc;

-- 1d. tasks.recurring
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'recurring'
);
SET @sql_cmd = IF(@col_exists = 0,
  'ALTER TABLE `tasks` ADD COLUMN `recurring` BOOLEAN NOT NULL DEFAULT FALSE;',
  'DO 0;'
);
PREPARE stmt_rec FROM @sql_cmd;
EXECUTE stmt_rec;
DEALLOCATE PREPARE stmt_rec;

-- 2. Focus Metrics Table: Add session reference and unique constraint

-- 2a. focus_metrics.session_id column
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'focus_metrics' AND COLUMN_NAME = 'session_id'
);
SET @sql_cmd = IF(@col_exists = 0,
  'ALTER TABLE `focus_metrics` ADD COLUMN `session_id` VARCHAR(191) NULL;',
  'DO 0;'
);
PREPARE stmt_session_id FROM @sql_cmd;
EXECUTE stmt_session_id;
DEALLOCATE PREPARE stmt_session_id;

-- 2b. Foreign Key: Detect equivalent foreign key constraint by its DEFINITION
-- (Checks whether ANY foreign key already connects focus_metrics.session_id -> focus_sessions.id)
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
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- 2c. Unique Constraint: exactly one metric per (session_id, metric_key)
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
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- 3. Syllabi Table: Relax course_name requirement during upload and enforce non-null text
ALTER TABLE `syllabi`
  MODIFY COLUMN `course_name` VARCHAR(191) NULL,
  MODIFY COLUMN `extracted_text` LONGTEXT NOT NULL;
