import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nursery_catalog_categories'

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
      table.string('name', 50).notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.unique(['nursery_profile_id', 'name'])
      table.index(['nursery_profile_id', 'sort_order'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
