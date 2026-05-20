import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gardener_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('headline', 100).nullable()
      table.text('bio').nullable()
      table.string('service_area', 120).nullable()
      table.integer('experience_years').notNullable().defaultTo(0)
      table.decimal('hourly_rate', 10, 2).nullable()
      table.boolean('is_available').notNullable().defaultTo(true)
      table.string('public_phone', 20).nullable()
      table.string('portfolio_url', 255).nullable()
      table.float('rating_average').notNullable().defaultTo(0)
      table.integer('rating_count').notNullable().defaultTo(0)
      table.unique(['user_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['user_id'])
      table.dropColumn('headline')
      table.dropColumn('bio')
      table.dropColumn('service_area')
      table.dropColumn('experience_years')
      table.dropColumn('hourly_rate')
      table.dropColumn('is_available')
      table.dropColumn('public_phone')
      table.dropColumn('portfolio_url')
      table.dropColumn('rating_average')
      table.dropColumn('rating_count')
    })
  }
}
