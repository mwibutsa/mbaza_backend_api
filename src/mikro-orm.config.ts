import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { Migrator } from '@mikro-orm/migrations';
import { EntityGenerator } from '@mikro-orm/entity-generator';
import { SeedManager } from '@mikro-orm/seeder';

dotenv.config();

export default defineConfig({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  entities: [__dirname + '/**/*.entity.js'],
  entitiesTs: [__dirname + '/**/*.entity.ts'],
  driver: PostgreSqlDriver,
  metadataProvider: TsMorphMetadataProvider,
  highlighter: new SqlHighlighter(),
  extensions: [Migrator, EntityGenerator, SeedManager],
  debug: process.env.DEBUG_MIKRO_ORM === '1',
});
