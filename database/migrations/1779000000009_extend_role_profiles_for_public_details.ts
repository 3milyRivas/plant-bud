import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('gardener_profiles', (table) => {
      table.text('payment_methods').nullable()
    })

    this.schema.alterTable('nursery_profiles', (table) => {
      table.text('services_offered').nullable()
      table.text('payment_methods').nullable()
    })
  }

  async down() {
    this.schema.alterTable('nursery_profiles', (table) => {
      table.dropColumn('payment_methods')
      table.dropColumn('services_offered')
    })

    this.schema.alterTable('gardener_profiles', (table) => {
      table.dropColumn('payment_methods')
    })
  }
}
