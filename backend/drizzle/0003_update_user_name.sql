-- Add the new name column
ALTER TABLE `users` ADD COLUMN `name` text;
--> statement-breakpoint

-- Copy existing data from first_name and last_name to name column
-- This will concatenate first_name and last_name with a space in between
UPDATE `users` 
SET `name` = CASE
  WHEN `first_name` IS NOT NULL AND `last_name` IS NOT NULL THEN `first_name` || ' ' || `last_name`
  WHEN `first_name` IS NOT NULL THEN `first_name`
  WHEN `last_name` IS NOT NULL THEN `last_name`
  ELSE NULL
END;
--> statement-breakpoint

-- Drop the old columns
ALTER TABLE `users` DROP COLUMN `first_name`;
--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `last_name`;
