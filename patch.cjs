const fs = require('fs');
let s = fs.readFileSync('shared/schema.ts', 'utf8');

s = s.replace(/import \{ pgTable, text, serial, integer, boolean, timestamp \} from "drizzle-orm\/pg-core";/g, 'import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";');
s = s.replace(/pgTable/g, 'sqliteTable');
s = s.replace(/serial\("id"\)\.primaryKey\(\)/g, "integer('id').primaryKey({ autoIncrement: true })");
s = s.replace(/timestamp\("date"\)\.defaultNow\(\)/g, "integer('date', { mode: 'timestamp' }).$defaultFn(() => new Date())");
s = s.replace(/boolean\("is_active"\)\.default\(true\)/g, "integer('is_active', { mode: 'boolean' }).default(true)");
s = s.replace(/boolean\("is_free"\)\.default\(false\)/g, "integer('is_free', { mode: 'boolean' }).default(false)");

fs.writeFileSync('shared/schema.ts', s);
console.log("Patched shared/schema.ts successfully");
