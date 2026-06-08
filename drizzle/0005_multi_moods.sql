-- Add new moods column (JSON array), migrate data from old mood column
ALTER TABLE `journal_entries` ADD COLUMN `moods` text;

-- Migrate existing mood values to JSON array format
UPDATE `journal_entries` SET `moods` = CASE
  WHEN `mood` IS NOT NULL THEN json_array(`mood`)
  ELSE NULL
END;

-- Drop old mood column
ALTER TABLE `journal_entries` DROP COLUMN `mood`;
