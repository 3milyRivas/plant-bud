import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('arrival_window_start', 5).nullable()
      table.string('arrival_window_end', 5).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('arrival_window_start', 'arrival_window_end')
    })
  }
}
