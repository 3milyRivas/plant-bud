import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('post_hashtags', (table) => {
      table.increments('id')
      table
        .integer('community_post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_posts')
        .onDelete('CASCADE')
      table.string('tag', 60).notNullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.unique(['community_post_id', 'tag'])
      table.index(['tag'])
    })

    this.schema.createTable('post_polls', (table) => {
      table.increments('id')
      table
        .integer('community_post_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('community_posts')
        .onDelete('CASCADE')
      table.string('question', 160).notNullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())
    })

    this.schema.createTable('post_poll_options', (table) => {
      table.increments('id')
      table
        .integer('post_poll_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('post_polls')
        .onDelete('CASCADE')
      table.string('label', 120).notNullable()
      table.integer('sort_order').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['post_poll_id', 'sort_order'])
    })

    this.schema.createTable('post_poll_votes', (table) => {
      table.increments('id')
      table
        .integer('post_poll_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('post_polls')
        .onDelete('CASCADE')
      table
        .integer('post_poll_option_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('post_poll_options')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.unique(['post_poll_id', 'user_id'])
      table.index(['post_poll_option_id'])
    })
  }

  async down() {
    this.schema.dropTable('post_poll_votes')
    this.schema.dropTable('post_poll_options')
    this.schema.dropTable('post_polls')
    this.schema.dropTable('post_hashtags')
  }
}
