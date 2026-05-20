import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nursery_profiles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('nursery_name').notNullable()

      table.string('owner_name').notNullable()
      table.text('description').nullable()
      table.string('address', 255).nullable()
      table.string('city', 120).nullable()
      table.string('public_phone', 20).nullable()
      table.string('public_email', 254).nullable()
      table.string('logo_url', 255).nullable()
      table.string('banner_url', 255).nullable()
      table.string('opening_hours', 255).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.float('rating_average').notNullable().defaultTo(0)
      table.integer('rating_count').notNullable().defaultTo(0)

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
