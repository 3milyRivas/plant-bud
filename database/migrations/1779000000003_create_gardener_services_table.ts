import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'gardener_services'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('gardener_profile_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('gardener_profiles')
        .onDelete('CASCADE')
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table.decimal('base_price', 10, 2).nullable()
      table.integer('duration_minutes').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['gardener_profile_id', 'is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
