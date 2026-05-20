import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nursery_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('nursery_slug', 80).nullable()
    })

    this.defer(async (db) => {
      const nurseries = await db.from(this.tableName).select('id', 'nursery_name')
      const seen = new Map<string, number>()

      for (const nursery of nurseries) {
        const baseSlug = this.slugify(nursery.nursery_name) || `nursery-${nursery.id}`
        const count = seen.get(baseSlug) || 0
        const slug =
          count === 0
            ? baseSlug
            : `${baseSlug.slice(0, Math.max(1, 79 - String(count).length))}-${count}`

        seen.set(baseSlug, count + 1)

        await db.from(this.tableName).where('id', nursery.id).update({ nursery_slug: slug })
      }
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['nursery_slug'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['nursery_slug'])
      table.dropColumn('nursery_slug')
    })
  }

  private slugify(value: string) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
  }
}
