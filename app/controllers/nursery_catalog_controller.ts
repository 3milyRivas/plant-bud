import NurseryCatalogCategory from '#models/nursery_catalog_category'
import NurseryProduct from '#models/nursery_product'
import NurseryProfile from '#models/nursery_profile'
import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_CATEGORY = 'Plants'
const MAX_CUSTOM_CATEGORIES = 5
const catalogImageOptions = {
  size: '5mb',
  extnames: ['jpg', 'jpeg', 'png', 'webp'],
}
const catalogMediaPattern = /^product-\d+-[0-9a-f-]+\.(jpg|jpeg|png|webp)$/i

export default class NurseryCatalogController {
  async storeCategory({ auth, request, response, session }: HttpContext) {
    const profile = await this.getNurseryProfile(auth.user!.id)
    const name = this.cleanName(request.input('name'), 50)

    if (!name || name.toLowerCase() === DEFAULT_CATEGORY.toLowerCase()) {
      session.flash('catalogError', 'Choose a different category name.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    const categories = await NurseryCatalogCategory.query()
      .where('nurseryProfileId', profile.id)
      .orderBy('sortOrder', 'asc')

    if (categories.length >= MAX_CUSTOM_CATEGORIES) {
      session.flash('catalogError', 'You can create up to 5 additional categories.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      session.flash('catalogError', 'That category already exists.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    await NurseryCatalogCategory.create({
      nurseryProfileId: profile.id,
      name,
      sortOrder: categories.length + 1,
    })

    session.flash('success', 'Catalog category created.')
    return response.redirect('/profile/settings#catalog-settings')
  }

  async destroyCategory({ auth, params, response, session }: HttpContext) {
    const profile = await this.getNurseryProfile(auth.user!.id)
    const category = await NurseryCatalogCategory.query()
      .where('id', Number(params.id))
      .where('nurseryProfileId', profile.id)
      .first()

    if (!category) {
      session.flash('catalogError', 'Category not found.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    await NurseryProduct.query()
      .where('nurseryProfileId', profile.id)
      .whereRaw('lower(category) = ?', [category.name.toLowerCase()])
      .update({ category: DEFAULT_CATEGORY })
    await category.delete()

    session.flash('success', 'Category removed. Its products were moved to Plants.')
    return response.redirect('/profile/settings#catalog-settings')
  }

  async storeProduct({ auth, request, response, session }: HttpContext) {
    const profile = await this.getNurseryProfile(auth.user!.id)
    const image = request.file('image', catalogImageOptions)
    const payload = await this.productPayload(profile.id, request.all())

    if (!payload.name) {
      session.flash('catalogError', 'Add a product name.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    if (image && !image.isValid) {
      session.flash('catalogError', 'Use a JPG, PNG or WEBP image smaller than 5 MB.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    const name = payload.name
    const product = await NurseryProduct.create({
      nurseryProfileId: profile.id,
      ...payload,
      name,
      imageUrl: null,
      isActive: true,
    })

    if (image) {
      product.imageUrl = await this.storeImage(image, auth.user!.id, product.id)
      await product.save()
    }

    session.flash('success', 'Product added to the catalog.')
    return response.redirect('/profile/settings#catalog-settings')
  }

  async updateProduct({ auth, params, request, response, session }: HttpContext) {
    const profile = await this.getNurseryProfile(auth.user!.id)
    const product = await NurseryProduct.query()
      .where('id', Number(params.id))
      .where('nurseryProfileId', profile.id)
      .first()

    if (!product) {
      session.flash('catalogError', 'Product not found.')
      return response.redirect('/profile/settings#catalog-settings')
    }

    const image = request.file('image', catalogImageOptions)
    const payload = await this.productPayload(profile.id, request.all())

    if (!payload.name || (image && !image.isValid)) {
      session.flash(
        'catalogError',
        !payload.name ? 'Add a product name.' : 'Use a JPG, PNG or WEBP image smaller than 5 MB.'
      )
      return response.redirect('/profile/settings#catalog-settings')
    }

    const name = payload.name
    product.merge({
      ...payload,
      name,
      isActive: request.input('is_active') === '1',
    })

    if (image) {
      await this.removeStoredImage(product.imageUrl)
      product.imageUrl = await this.storeImage(image, auth.user!.id, product.id)
    }

    await product.save()
    session.flash('success', 'Product updated.')
    return response.redirect('/profile/settings#catalog-settings')
  }

  async destroyProduct({ auth, params, response, session }: HttpContext) {
    const profile = await this.getNurseryProfile(auth.user!.id)
    const product = await NurseryProduct.query()
      .where('id', Number(params.id))
      .where('nurseryProfileId', profile.id)
      .first()

    if (product) {
      await this.removeStoredImage(product.imageUrl)
      await product.delete()
      session.flash('success', 'Product removed from the catalog.')
    }

    return response.redirect('/profile/settings#catalog-settings')
  }

  async media({ params, response }: HttpContext) {
    const ownerId = Number(params.userId)
    const fileName = String(params.fileName || '')

    if (!Number.isInteger(ownerId) || ownerId <= 0 || !catalogMediaPattern.test(fileName)) {
      return response.notFound('Image not found')
    }

    const directory = this.imageDirectory(ownerId)
    const filePath = path.resolve(directory, fileName)

    if (!filePath.startsWith(`${directory}${path.sep}`)) return response.notFound('Image not found')

    response
      .header('Cache-Control', 'public, max-age=86400')
      .header('X-Content-Type-Options', 'nosniff')
      .download(filePath, false, (error) => {
        if (error.code === 'ENOENT') return ['Image not found', 404]
        return ['Unable to read image', 500]
      })
  }

  private async productPayload(nurseryProfileId: number, input: Record<string, unknown>) {
    const requestedCategory = this.cleanName(input.category, 50) || DEFAULT_CATEGORY
    const categories = await NurseryCatalogCategory.query().where(
      'nurseryProfileId',
      nurseryProfileId
    )
    const category =
      requestedCategory.toLowerCase() === DEFAULT_CATEGORY.toLowerCase()
        ? DEFAULT_CATEGORY
        : categories.find((item) => item.name.toLowerCase() === requestedCategory.toLowerCase())
            ?.name || DEFAULT_CATEGORY
    const price = this.optionalNumber(input.price, 0, 999999.99)
    const stock = this.optionalNumber(input.stock, 0, 999999)

    return {
      name: this.cleanName(input.name, 120),
      category,
      description: this.cleanName(input.description, 500),
      price,
      stock: stock === null ? 0 : Math.floor(stock),
    }
  }

  private async getNurseryProfile(userId: number) {
    return NurseryProfile.findByOrFail('userId', userId)
  }

  private cleanName(value: unknown, maxLength: number) {
    if (typeof value !== 'string') return null
    const cleaned = value.trim().replace(/\s+/g, ' ')
    return cleaned ? cleaned.slice(0, maxLength) : null
  }

  private optionalNumber(value: unknown, min: number, max: number) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) && number >= min && number <= max ? number : null
  }

  private imageDirectory(userId: number) {
    return path.resolve(app.makePath('storage/nursery_catalog', String(userId)))
  }

  private async storeImage(
    image: NonNullable<ReturnType<HttpContext['request']['file']>>,
    userId: number,
    productId: number
  ) {
    const directory = this.imageDirectory(userId)
    const extension = (image.extname || 'jpg').toLowerCase()
    const fileName = `product-${productId}-${randomUUID()}.${extension}`

    await fs.mkdir(directory, { recursive: true })
    await image.move(directory, { name: fileName, overwrite: false })
    return `/nursery-catalog/media/${userId}/${fileName}`
  }

  private async removeStoredImage(imageUrl: string | null) {
    if (!imageUrl) return
    const match = imageUrl.match(/^\/nursery-catalog\/media\/(\d+)\/([^/]+)$/)
    if (!match || !catalogMediaPattern.test(match[2])) return
    await fs.rm(path.join(this.imageDirectory(Number(match[1])), match[2]), { force: true })
  }
}
