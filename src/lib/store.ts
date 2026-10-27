import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { initialStore, normalizeStore, type Store } from './model';

const connectionString = process.env.DATABASE_URL;

type DatabaseGlobals = {
  churicanvasPool?: Pool;
  churicanvasInitialized?: Promise<void>;
};

const database = globalThis as typeof globalThis & DatabaseGlobals;
let queue: Promise<unknown> = Promise.resolve();

function pool() {
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  if (!database.churicanvasPool) {
    const instance = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
      allowExitOnIdle: true,
    });
    attachDatabasePool(instance);
    database.churicanvasPool = instance;
  }
  return database.churicanvasPool;
}

async function createSchema() {
  const migration = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED || connectionString,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  try {
    await migration.query(
      'CREATE TABLE IF NOT EXISTS churicanvas_state (id integer PRIMARY KEY CHECK (id=1), data jsonb NOT NULL)',
    );
    await migration.query(
      'INSERT INTO churicanvas_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT DO NOTHING',
      [JSON.stringify(initialStore())],
    );
  } finally {
    await migration.end();
  }
}

async function initialize() {
  if (!database.churicanvasInitialized) {
    database.churicanvasInitialized = createSchema().catch((error) => {
      database.churicanvasInitialized = undefined;
      throw error;
    });
  }
  await database.churicanvasInitialized;
}

export async function withStore<T>(
  fn: (store: Store) => T | Promise<T>,
  mutate = false,
): Promise<T> {
  if (connectionString) {
    await initialize();
    if (!mutate) {
      const { rows } = await pool().query(
        'SELECT data FROM churicanvas_state WHERE id=1',
      );
      return fn(normalizeStore(rows[0].data as Store));
    }
    const client = await pool().connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT data FROM churicanvas_state WHERE id=1 FOR UPDATE',
      );
      const store = normalizeStore(rows[0].data as Store);
      const result = await fn(store);
      await client.query(
        'UPDATE churicanvas_state SET data=$1::jsonb WHERE id=1',
        [JSON.stringify(store)],
      );
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  if (process.env.VERCEL)
    throw new Error(
      'DATABASE_URL must be configured before accepting orders on Vercel.',
    );
  const task = queue.then(async () => {
    const directory = path.join(process.cwd(), 'data');
    const file = path.join(directory, 'store.json');
    let state: Store;
    try {
      state = normalizeStore(JSON.parse(await readFile(file, 'utf8')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      state = initialStore();
    }
    const result = await fn(state);
    if (mutate) {
      await mkdir(directory, { recursive: true });
      await writeFile(file + '.tmp', JSON.stringify(state), 'utf8');
      await rename(file + '.tmp', file);
    }
    return result;
  });
  queue = task.catch(() => {});
  return task;
}
