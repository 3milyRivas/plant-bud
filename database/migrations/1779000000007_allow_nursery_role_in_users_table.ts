import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static disableTransactions = true

  async up() {
    this.defer(async (db) => {
      await db.rawQuery('PRAGMA foreign_keys = OFF')

      await db.rawQuery(`
        CREATE TABLE users_next (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          first_name varchar(50) NOT NULL,
          last_name varchar(50) NOT NULL,
          username varchar(50) NOT NULL,
          email varchar(254) NOT NULL,
          password varchar(255) NOT NULL,
          phone varchar(20) NULL,
          dui varchar(20) NULL,
          profile_picture varchar(255) NULL,
          role TEXT CHECK (role IN ('client', 'gardener', 'nursery')) NOT NULL DEFAULT 'client',
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await db.rawQuery(`
        INSERT INTO users_next (
          id,
          first_name,
          last_name,
          username,
          email,
          password,
          phone,
          dui,
          profile_picture,
          role,
          created_at,
          updated_at
        )
        SELECT
          id,
          first_name,
          last_name,
          username,
          email,
          password,
          phone,
          dui,
          profile_picture,
          role,
          created_at,
          updated_at
        FROM users
      `)

      await db.rawQuery('DROP TABLE users')
      await db.rawQuery('ALTER TABLE users_next RENAME TO users')
      await db.rawQuery('CREATE UNIQUE INDEX users_username_unique ON users (username)')
      await db.rawQuery('CREATE UNIQUE INDEX users_email_unique ON users (email)')
      await db.rawQuery('PRAGMA foreign_keys = ON')
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery('PRAGMA foreign_keys = OFF')

      await db.rawQuery(`
        CREATE TABLE users_previous (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          first_name varchar(50) NOT NULL,
          last_name varchar(50) NOT NULL,
          username varchar(50) NOT NULL,
          email varchar(254) NOT NULL,
          password varchar(255) NOT NULL,
          phone varchar(20) NULL,
          dui varchar(20) NULL,
          profile_picture varchar(255) NULL,
          role TEXT CHECK (role IN ('client', 'gardener')) NOT NULL DEFAULT 'client',
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await db.rawQuery(`
        INSERT INTO users_previous (
          id,
          first_name,
          last_name,
          username,
          email,
          password,
          phone,
          dui,
          profile_picture,
          role,
          created_at,
          updated_at
        )
        SELECT
          id,
          first_name,
          last_name,
          username,
          email,
          password,
          phone,
          dui,
          profile_picture,
          CASE WHEN role = 'nursery' THEN 'client' ELSE role END,
          created_at,
          updated_at
        FROM users
      `)

      await db.rawQuery('DROP TABLE users')
      await db.rawQuery('ALTER TABLE users_previous RENAME TO users')
      await db.rawQuery('CREATE UNIQUE INDEX users_username_unique ON users (username)')
      await db.rawQuery('CREATE UNIQUE INDEX users_email_unique ON users (email)')
      await db.rawQuery('PRAGMA foreign_keys = ON')
    })
  }
}
