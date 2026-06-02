import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plant_scans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('account_profile_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('account_profiles')
        .onDelete('SET NULL')

      table.string('subscription_plan', 20).notNullable().defaultTo('free')
      table.string('species', 160).notNullable().defaultTo('Unknown plant')
      table.string('health_status', 50).nullable()
      table.integer('confidence').notNullable().defaultTo(0)
      table.string('reliability_level', 20).nullable()
      table.string('image_hash', 64).nullable()
      table.text('scan_summary').nullable()
      table.text('matches').nullable()
      table.text('causes').nullable()
      table.text('premium_insights').nullable()

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['user_id', 'created_at'])
      table.index(['account_profile_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
