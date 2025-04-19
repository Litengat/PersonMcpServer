import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";
import { env } from "../env.js";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn =
  globalForDb.conn ??
  postgres(
    "postgresql://postgres:e8pdxk5ZY3q57VYW@localhost:5432/person-graph"
  );

export const db = drizzle(conn, { schema });
