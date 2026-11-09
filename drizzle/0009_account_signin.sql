-- Registration redesign, release 2: short sign-up (title, name, email, mobile, password). Gender and institution are asked at checkout.
ALTER TABLE "accounts" ALTER COLUMN "gender" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "institution" DROP NOT NULL;
