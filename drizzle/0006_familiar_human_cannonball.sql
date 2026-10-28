CREATE TABLE `video_analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`file_name` text NOT NULL,
	`started_at` text,
	`metrics` text NOT NULL,
	`created_at` integer NOT NULL
);
