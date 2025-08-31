PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_device_tokens` (
	`push_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text,
	`platform` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_used_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_device_tokens`("push_token", "user_id", "device_name", "platform", "is_active", "last_used_at", "created_at", "updated_at") SELECT "push_token", "user_id", "device_name", "platform", "is_active", "last_used_at", "created_at", "updated_at" FROM `device_tokens`;--> statement-breakpoint
DROP TABLE `device_tokens`;--> statement-breakpoint
ALTER TABLE `__new_device_tokens` RENAME TO `device_tokens`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_device_tokens_user_id` ON `device_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_device_tokens_is_active` ON `device_tokens` (`is_active`);