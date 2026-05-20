import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('client_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('gardener_profile_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('gardener_profiles')
        .onDelete('SET NULL')
      table
        .integer('nursery_profile_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('nursery_profiles')
        .onDelete('SET NULL')
      table
        .enum('service_type', ['maintenance', 'garden_design', 'consultation', 'delivery', 'other'])
        .notNullable()
        .defaultTo('maintenance')
      table
        .enum('status', ['pending', 'accepted', 'scheduled', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('pending')
      table.timestamp('scheduled_for', { useTz: true }).nullable()
      table.string('address', 255).nullable()
      table.text('notes').nullable()
      table.decimal('budget', 10, 2).nullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['client_user_id', 'status'])
      table.index(['gardener_profile_id', 'status'])
      table.index(['nursery_profile_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
