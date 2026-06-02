import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'account_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('subscription_plan', 20).notNullable().defaultTo('free')
      table.timestamp('premium_started_at', { useTz: true }).nullable()
      table.timestamp('premium_renews_at', { useTz: true }).nullable()
      table.integer('reward_points').notNullable().defaultTo(0)
      table.integer('scanner_monthly_limit').notNullable().defaultTo(5)
      table.index(['subscription_plan'])
    })

    this.defer(async (db) => {
      await db.from(this.tableName).whereNull('subscription_plan').update({
        subscription_plan: 'free',
      })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['subscription_plan'])
      table.dropColumn('scanner_monthly_limit')
      table.dropColumn('reward_points')
      table.dropColumn('premium_renews_at')
      table.dropColumn('premium_started_at')
      table.dropColumn('subscription_plan')
    })
  }
}
