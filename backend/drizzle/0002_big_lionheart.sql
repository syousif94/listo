CREATE TABLE `user_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`jwt` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_tokens_jwt_unique` ON `user_tokens` (`jwt`);--> statement-breakpoint
CREATE INDEX `idx_user_tokens_user_id` ON `user_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_tokens_jwt` ON `user_tokens` (`jwt`);--> statement-breakpoint
CREATE INDEX `idx_user_tokens_is_active` ON `user_tokens` (`is_active`);--> statement-breakpoint
DROP TABLE `sessions`;