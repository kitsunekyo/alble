ALTER TABLE `journal_entries` ADD COLUMN `moods` text;
--> statement-breakpoint
UPDATE `journal_entries` SET `moods` = CASE
  WHEN `mood` IS NOT NULL THEN json_array(`mood`)
  ELSE NULL
END;
--> statement-breakpoint
ALTER TABLE `journal_entries` DROP COLUMN `mood`;
