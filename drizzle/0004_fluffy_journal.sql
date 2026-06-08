CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`text` text NOT NULL,
	`mood` text,
	`created_at` integer NOT NULL
);
