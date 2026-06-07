import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'account_profiles'

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

      table.string('display_name', 100).notNullable()
      table.string('avatar_url', 255).notNullable().defaultTo('/profiles/pfp.png')
      table.string('banner_url', 255).notNullable().defaultTo('/profiles/banner.png')
      table.text('bio').nullable()
      table.string('location', 120).nullable()
      table.string('website_url', 255).nullable()

      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    this.defer(async (db) => {
      const users = await db
        .from('users')
        .select('id', 'first_name', 'last_name', 'profile_picture')

      for (const user of users) {
        await db.table(this.tableName).insert({
          user_id: user.id,
          display_name: `${user.first_name} ${user.last_name}`.trim(),
          avatar_url: user.profile_picture || '/profiles/pfp.png',
          banner_url: '/profiles/banner.png',
        })
      }
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
