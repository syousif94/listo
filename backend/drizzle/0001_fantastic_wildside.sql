CREATE TABLE `token_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`completion_tokens` integer NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`completion_time` integer,
	`prompt_time` integer,
	`queue_time` integer,
	`total_time` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_token_usage_user_id` ON `token_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_token_usage_created_at` ON `token_usage` (`created_at`);