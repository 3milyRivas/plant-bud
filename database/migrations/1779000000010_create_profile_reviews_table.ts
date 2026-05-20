import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'profile_reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('reviewer_user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('gardener_profile_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('gardener_profiles')
        .onDelete('CASCADE')
      table
        .integer('nursery_profile_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('nursery_profiles')
        .onDelete('CASCADE')
      table.integer('rating').unsigned().notNullable()
      table.string('reviewer_name', 100).nullable()
      table.text('comment').nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['gardener_profile_id', 'created_at'])
      table.index(['nursery_profile_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
