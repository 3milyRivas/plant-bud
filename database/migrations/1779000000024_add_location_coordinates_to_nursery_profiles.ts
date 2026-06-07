import { BaseSchema } from '@adonisjs/lucid/schema'

const demoCoordinates = [
  { slug: 'loma-verde-nursery', latitude: 13.6731, longitude: -89.2898 },
  { slug: 'jardines-aurora', latitude: 13.6648, longitude: -89.2532 },
  { slug: 'raiz-viva-nursery', latitude: 13.4833, longitude: -88.1833 },
  { slug: 'casa-monstera', latitude: 13.6929, longitude: -89.2182 },
]

export default class extends BaseSchema {
  protected tableName = 'nursery_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.decimal('latitude', 10, 7).nullable()
      table.decimal('longitude', 10, 7).nullable()
      table.index(['latitude', 'longitude'])
    })

    this.defer(async (db) => {
      for (const nursery of demoCoordinates) {
        await db
          .from(this.tableName)
          .where('nursery_slug', nursery.slug)
          .update({ latitude: nursery.latitude, longitude: nursery.longitude })
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['latitude', 'longitude'])
      table.dropColumn('longitude')
      table.dropColumn('latitude')
    })
  }
}
