CREATE TABLE `device_tokens` (
	`push_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text,
	`platform` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_used_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_device_tokens_user_id` ON `device_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_device_tokens_is_active` ON `device_tokens` (`is_active`);
