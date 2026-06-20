import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'account_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('notifications_seen_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('notifications_seen_at')
    })
  }
}
