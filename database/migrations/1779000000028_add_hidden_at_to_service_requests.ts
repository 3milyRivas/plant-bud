import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('client_hidden_at', { useTz: true }).nullable()
      table.timestamp('gardener_hidden_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('client_hidden_at', 'gardener_hidden_at')
    })
  }
}
