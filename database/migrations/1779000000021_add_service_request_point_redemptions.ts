import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('points_redeemed').notNullable().defaultTo(0)
      table.integer('discount_percent').notNullable().defaultTo(0)
      table.decimal('discount_amount', 10, 2).notNullable().defaultTo(0)
      table.timestamp('points_refunded_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('points_refunded_at')
      table.dropColumn('discount_amount')
      table.dropColumn('discount_percent')
      table.dropColumn('points_redeemed')
    })
  }
}
