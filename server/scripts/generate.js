// Picks the right Prisma schema template based on whichever DB env var is
// set, writes it to prisma/schema.prisma (rewriting the `provider` line for
// MySQL/MariaDB, since that template defaults to "postgresql"), then runs
// `prisma generate`. Run this once after editing .env, and again any time
// you switch which database you're pointing at.
import "dotenv/config";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { detectProvider } from "../src/lib/detectProvider.js";

const info = detectProvider();
console.log(`Detected database: ${info.label}`);

let templatePath, content;
if (info.family === "mongo") {
  templatePath = "prisma/schema.mongo.prisma";
  content = fs.readFileSync(templatePath, "utf8");
} else {
  templatePath = "prisma/schema.relational.prisma";
  content = fs.readFileSync(templatePath, "utf8");
  if (info.engine === "mysql") {
    content = content.replace('provider = "postgresql"', 'provider = "mysql"');
    // MySQL/MariaDB needs a schema.prisma reading MYSQL_URL — Prisma's `url`
    // line always reads DATABASE_URL by convention, so we point it at the
    // right env var name for this engine.
    content = content.replace('url      = env("DATABASE_URL")', 'url      = env("MYSQL_URL")');
  }
}

fs.writeFileSync("prisma/schema.prisma", content);
console.log("Wrote prisma/schema.prisma from", templatePath);

execSync("npx prisma generate", { stdio: "inherit" });
