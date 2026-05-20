import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nursery_products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('nursery_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('nursery_profiles')
        .onDelete('CASCADE')
      table.string('name', 120).notNullable()
      table.string('category', 80).nullable()
      table.text('description').nullable()
      table.decimal('price', 10, 2).nullable()
      table.integer('stock').notNullable().defaultTo(0)
      table.string('image_url', 255).nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['nursery_profile_id', 'is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
