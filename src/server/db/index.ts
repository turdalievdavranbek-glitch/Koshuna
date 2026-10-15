import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as {
  __koshunaPg?: ReturnType<typeof postgres>;
  __koshunaDb?: Db;
};

export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing");
  if (!g.__koshunaDb || !g.__koshunaPg) {
    g.__koshunaPg = postgres(url, { max: 10 });
    g.__koshunaDb = drizzle(g.__koshunaPg, { schema });
  }
  return g.__koshunaDb;
}

export type { Db };
