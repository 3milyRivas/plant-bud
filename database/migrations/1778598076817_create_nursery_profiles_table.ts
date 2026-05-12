import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {

  protected tableName = 'nursery_profiles'

  async up() {

    this.schema.createTable(this.tableName, (table) => {

      table.increments('id')

      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('nursery_name').notNullable()

      table.string('owner_name').notNullable()

      table.timestamps(true)
    })
  }

  async down() {

    this.schema.dropTable(this.tableName)
  }
}
