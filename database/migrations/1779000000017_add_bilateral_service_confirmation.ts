import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('client_confirmed_at', { useTz: true }).nullable()
      table.timestamp('gardener_confirmed_at', { useTz: true }).nullable()
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereNotNull('completed_at')
        .update({ gardener_confirmed_at: db.raw('completed_at') })

      await db
        .from(this.tableName)
        .whereNotNull('verified_at')
        .update({ client_confirmed_at: db.raw('verified_at') })

      await db
        .from(this.tableName)
        .where('status', 'completed')
        .whereNull('verified_at')
        .update({ status: 'scheduled' })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('gardener_confirmed_at')
      table.dropColumn('client_confirmed_at')
    })
  }
}
