import { BaseSchema } from '@adonisjs/lucid/schema'

const FREE_SCANNER_MONTHLY_LIMIT = 5
const PREVIOUS_FREE_SCANNER_MONTHLY_LIMIT = 10

export default class extends BaseSchema {
  protected tableName = 'account_profiles'

  async up() {
    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .where('subscription_plan', 'free')
        .where('scanner_monthly_limit', PREVIOUS_FREE_SCANNER_MONTHLY_LIMIT)
        .update({
          scanner_monthly_limit: FREE_SCANNER_MONTHLY_LIMIT,
        })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .where('subscription_plan', 'free')
        .where('scanner_monthly_limit', FREE_SCANNER_MONTHLY_LIMIT)
        .update({
          scanner_monthly_limit: PREVIOUS_FREE_SCANNER_MONTHLY_LIMIT,
        })
    })
  }
}
