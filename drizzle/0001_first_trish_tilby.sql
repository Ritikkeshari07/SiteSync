CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`email` text NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_email` ON `team_members` (`team_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_actor` ON `team_members` (`team_id`,`actor`);--> statement-breakpoint
CREATE INDEX `member_email_lookup` ON `team_members` (`email`);--> statement-breakpoint
CREATE TABLE `team_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
