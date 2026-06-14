import { BaseSchema } from '@adonisjs/lucid/schema'

const ownerEmail = 'davidalfredomenjivar@gmail.com'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('access_level', 16).notNullable().defaultTo('member').index()
    })

    this.schema.createTable('admin_audit_logs', (table) => {
      table.increments('id')
      table
        .integer('actor_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('actor_email', 254).notNullable()
      table.string('action', 80).notNullable()
      table.string('target_type', 40).notNullable()
      table.string('target_id', 80).nullable()
      table.text('summary').notNullable()
      table.string('ip_address', 64).nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())

      table.index(['created_at'])
      table.index(['actor_user_id', 'created_at'])
    })

    this.defer(async (db) => {
      await db
        .from('users')
        .whereRaw('lower(email) = ?', [ownerEmail])
        .update({ access_level: 'owner' })
    })
  }

  async down() {
    this.schema.dropTable('admin_audit_logs')
    this.schema.alterTable('users', (table) => {
      table.dropColumn('access_level')
    })
  }
}
