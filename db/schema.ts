import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
// A project is a versioned aggregate so changes/actions/history commit atomically.
export const projects = sqliteTable('projects', { owner: text('owner').primaryKey(), state: text('state').notNull(), version: integer('version').notNull().default(0) });

export const teamProjects = sqliteTable('team_projects', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), ownerEmail:text('owner_email').notNull(), name:text('name').notNull(), state:text('state').notNull(), version:integer('version').notNull().default(0), createdAt:text('created_at').notNull()
});
export const teamMembers = sqliteTable('team_members', {
 id:text('id').primaryKey(), teamId:text('team_id').notNull().references(()=>teamProjects.id), email:text('email').notNull(), actor:text('actor').notNull()
},table=>[uniqueIndex('team_member_email').on(table.teamId,table.email),uniqueIndex('team_member_actor').on(table.teamId,table.actor),index('member_email_lookup').on(table.email)]);
