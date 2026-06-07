import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'service_requests'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .enum('payment_status', ['held', 'released', 'refunded'])
        .nullable()
      table.string('payment_method', 30).nullable()
      table.string('payment_brand', 30).nullable()
      table.string('payment_last_four', 4).nullable()
      table.decimal('held_amount', 10, 2).nullable()
      table.decimal('released_amount', 10, 2).nullable()
      table.decimal('refunded_amount', 10, 2).nullable()
      table.timestamp('payment_held_at', { useTz: true }).nullable()
      table.timestamp('payment_released_at', { useTz: true }).nullable()
      table.timestamp('payment_refunded_at', { useTz: true }).nullable()
      table.index(['payment_status'])
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereNotNull('budget')
        .whereNot('status', 'cancelled')
        .update({
          payment_status: 'held',
          payment_method: 'card',
          payment_brand: 'Card',
          payment_last_four: '0000',
          held_amount: db.raw('budget'),
          payment_held_at: db.raw('created_at'),
        })

      await db
        .from(this.tableName)
        .whereNotNull('verified_at')
        .update({
          payment_status: 'released',
          released_amount: db.raw('COALESCE(final_amount, budget)'),
          payment_released_at: db.raw('verified_at'),
        })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['payment_status'])
      table.dropColumn('payment_refunded_at')
      table.dropColumn('payment_released_at')
      table.dropColumn('payment_held_at')
      table.dropColumn('refunded_amount')
      table.dropColumn('released_amount')
      table.dropColumn('held_amount')
      table.dropColumn('payment_last_four')
      table.dropColumn('payment_brand')
      table.dropColumn('payment_method')
      table.dropColumn('payment_status')
    })
  }
}
