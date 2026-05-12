import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateUsersTable extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('first_name', 50).notNullable()
      table.string('last_name', 50).notNullable()

      table.string('username', 50).notNullable().unique()

      table.string('email', 254).notNullable().unique()

      table.string('password').notNullable()

      table.string('phone', 20).nullable()
      table.string('dui', 20).nullable()

      table.string('profile_picture', 255).nullable()

      table.enum('role', ['client', 'gardener', 'nursery']).notNullable().defaultTo('client')

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
