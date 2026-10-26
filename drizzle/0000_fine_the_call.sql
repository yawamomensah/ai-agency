CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text,
	"completed" boolean DEFAULT false
);
