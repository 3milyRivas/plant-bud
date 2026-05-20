import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('community_posts', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('body').notNullable()
      table.string('media_url', 255).nullable()
      table.enum('media_type', ['none', 'image', 'video']).notNullable().defaultTo('none')
      table.enum('visibility', ['public', 'followers', 'private']).notNullable().defaultTo('public')
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['user_id', 'created_at'])
    })

    this.schema.createTable('post_comments', (table) => {
      table.increments('id')
      table
        .integer('community_post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_posts')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('body').notNullable()
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.index(['community_post_id', 'created_at'])
    })

    this.schema.createTable('post_reactions', (table) => {
      table.increments('id')
      table
        .integer('community_post_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('community_posts')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('type', ['like', 'favorite']).notNullable().defaultTo('like')
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.unique(['community_post_id', 'user_id', 'type'])
    })

    this.schema.createTable('follows', (table) => {
      table.increments('id')
      table
        .integer('follower_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('following_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      table.unique(['follower_id', 'following_id'])
    })
  }

  async down() {
    this.schema.dropTable('follows')
    this.schema.dropTable('post_reactions')
    this.schema.dropTable('post_comments')
    this.schema.dropTable('community_posts')
  }
}
