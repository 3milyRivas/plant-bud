import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('location_removed_at', { useTz: true }).nullable()
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereIn('status', ['completed', 'cancelled'])
        .update({
          address: null,
          latitude: null,
          longitude: null,
          google_place_id: null,
          location_removed_at: db.raw('COALESCE(completed_at, updated_at, created_at)'),
        })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('location_removed_at')
    })
  }
}
