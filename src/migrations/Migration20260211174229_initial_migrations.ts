import { Migration } from '@mikro-orm/migrations';

export class Migration20260211174229_initial_migrations extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "admin_user" ("id" uuid not null, "email" varchar(255) not null, "password_hash" varchar(255) not null, "full_name" varchar(255) not null, "role" text check ("role" in ('admin', 'super_admin', 'citizen')) not null default 'admin', "is_active" boolean not null default true, "created_at" timestamptz not null, constraint "admin_user_pkey" primary key ("id"));`);
    this.addSql(`alter table "admin_user" add constraint "admin_user_email_unique" unique ("email");`);

    this.addSql(`create table "caller" ("id" uuid not null, "phone_number" varchar(255) not null, "name" varchar(255) null, "district" varchar(255) null, "sector" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "caller_pkey" primary key ("id"));`);
    this.addSql(`alter table "caller" add constraint "caller_phone_number_unique" unique ("phone_number");`);

    this.addSql(`create table "location" ("id" uuid not null, "district" varchar(255) not null, "sector" varchar(255) null, "cell" varchar(255) null, "village" varchar(255) null, "created_at" timestamptz not null, constraint "location_pkey" primary key ("id"));`);

    this.addSql(`create table "cases" ("id" uuid not null, "caller_id" uuid not null, "location_id" uuid null, "call_sid" varchar(255) not null, "categories" text[] not null default '{}', "description" text null, "transcript" text null, "urgency" text check ("urgency" in ('low', 'medium', 'high', 'critical')) not null default 'medium', "status" text check ("status" in ('open', 'in_progress', 'resolved', 'closed')) not null default 'open', "ai_audio_url" varchar(255) null, "resolution_notes" text null, "assigned_to_id" uuid null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "cases_pkey" primary key ("id"));`);
    this.addSql(`alter table "cases" add constraint "cases_call_sid_unique" unique ("call_sid");`);

    this.addSql(`create table "audit_log" ("id" uuid not null, "case_id" uuid not null, "action" text check ("action" in ('case_created', 'status_change', 'assignment', 'note_added', 'location_set')) not null, "actor_type" text check ("actor_type" in ('ai', 'admin', 'system', 'citizen')) not null, "actor_id" varchar(255) null, "details" text null, "created_at" timestamptz not null, constraint "audit_log_pkey" primary key ("id"));`);

    this.addSql(`create table "otp" ("id" uuid not null, "caller_id" uuid not null, "code" varchar(6) not null, "expires_at" timestamptz not null, "is_used" boolean not null default false, "created_at" timestamptz not null, constraint "otp_pkey" primary key ("id"));`);

    this.addSql(`alter table "cases" add constraint "cases_caller_id_foreign" foreign key ("caller_id") references "caller" ("id") on update cascade;`);
    this.addSql(`alter table "cases" add constraint "cases_location_id_foreign" foreign key ("location_id") references "location" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "cases" add constraint "cases_assigned_to_id_foreign" foreign key ("assigned_to_id") references "admin_user" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "audit_log" add constraint "audit_log_case_id_foreign" foreign key ("case_id") references "cases" ("id") on update cascade;`);

    this.addSql(`alter table "otp" add constraint "otp_caller_id_foreign" foreign key ("caller_id") references "caller" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "cases" drop constraint "cases_assigned_to_id_foreign";`);

    this.addSql(`alter table "cases" drop constraint "cases_caller_id_foreign";`);

    this.addSql(`alter table "otp" drop constraint "otp_caller_id_foreign";`);

    this.addSql(`alter table "cases" drop constraint "cases_location_id_foreign";`);

    this.addSql(`alter table "audit_log" drop constraint "audit_log_case_id_foreign";`);

    this.addSql(`drop table if exists "admin_user" cascade;`);

    this.addSql(`drop table if exists "caller" cascade;`);

    this.addSql(`drop table if exists "location" cascade;`);

    this.addSql(`drop table if exists "cases" cascade;`);

    this.addSql(`drop table if exists "audit_log" cascade;`);

    this.addSql(`drop table if exists "otp" cascade;`);
  }

}
