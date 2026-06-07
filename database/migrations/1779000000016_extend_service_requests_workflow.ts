import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('gardener_response').nullable()
      table.decimal('final_amount', 10, 2).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('verified_at', { useTz: true }).nullable()
      table.integer('reward_points_awarded').notNullable().defaultTo(0)
      table.timestamp('reward_awarded_at', { useTz: true }).nullable()
      table.index(['client_user_id', 'verified_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['client_user_id', 'verified_at'])
      table.dropColumn('reward_awarded_at')
      table.dropColumn('reward_points_awarded')
      table.dropColumn('verified_at')
      table.dropColumn('completed_at')
      table.dropColumn('final_amount')
      table.dropColumn('gardener_response')
    })
  }
}
