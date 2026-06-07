import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    for (const tableName of ['gardener_profiles', 'nursery_profiles']) {
      this.schema.alterTable(tableName, (table) => {
        table.string('payout_paypal_email', 254).nullable()
        table.string('payout_cardholder_name', 100).nullable()
        table.string('payout_card_brand', 30).nullable()
        table.string('payout_card_last_four', 4).nullable()
      })
    }
  }

  async down() {
    for (const tableName of ['gardener_profiles', 'nursery_profiles']) {
      this.schema.alterTable(tableName, (table) => {
        table.dropColumn('payout_card_last_four')
        table.dropColumn('payout_card_brand')
        table.dropColumn('payout_cardholder_name')
        table.dropColumn('payout_paypal_email')
      })
    }
  }
}
