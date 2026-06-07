import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('latitude', 10, 7).nullable()
      table.decimal('longitude', 10, 7).nullable()
      table.string('google_place_id', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('google_place_id')
      table.dropColumn('longitude')
      table.dropColumn('latitude')
    })
  }
}
