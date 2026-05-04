UPDATE `sessions`
SET `notes` = CASE
	WHEN `notes` IS NULL OR `notes` = '' THEN (
		SELECT group_concat('Schritt ' || `steps`.`step_number` || ': Bitte anschauen: migrated from previous rating', char(10))
		FROM `steps`
		WHERE `steps`.`session_id` = `sessions`.`id`
			AND `steps`.`rating` = 'Bitte anschauen'
	)
	ELSE `notes` || char(10) || (
		SELECT group_concat('Schritt ' || `steps`.`step_number` || ': Bitte anschauen: migrated from previous rating', char(10))
		FROM `steps`
		WHERE `steps`.`session_id` = `sessions`.`id`
			AND `steps`.`rating` = 'Bitte anschauen'
	)
END
WHERE EXISTS (
	SELECT 1
	FROM `steps`
	WHERE `steps`.`session_id` = `sessions`.`id`
		AND `steps`.`rating` = 'Bitte anschauen'
);
--> statement-breakpoint
UPDATE `steps`
SET `rating` = 'Schlecht'
WHERE `rating` = 'Bitte anschauen';
--> statement-breakpoint
UPDATE `steps`
SET `rating` = 'Abbruch'
WHERE `rating` = 'Pause';
