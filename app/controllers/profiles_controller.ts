import AccountLink from '#models/account_link'
import AccountProfile from '#models/account_profile'
import CommunityPost from '#models/community_post'
import Follow from '#models/follow'
import GardenerProfile from '#models/gardener_profile'
import GardenerService from '#models/gardener_service'
import NurseryProfile from '#models/nursery_profile'
import ProfileReview from '#models/profile_review'
import User from '#models/user'
import { profileValidator } from '#validators/profile'
import {
  redirectBackWithFormErrors,
  validationExceptionToFieldErrors,
  type FieldErrors,
} from '#services/form_errors'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const profileImageOptions = {
  size: '5mb',
  extnames: ['jpg', 'jpeg', 'png', 'webp'],
}
const profileImageHeaderBytes = 256 * 1024
const maxProfileImageDimension = 8000
const maxProfileImagePixels = 32_000_000
const profileMediaFilePattern = /^(avatar|banner)-\d+-[0-9a-f-]+\.(jpg|png|webp)$/i

type ProfileImageKind = 'avatar' | 'banner'
type ProfileUploadFile = ReturnType<HttpContext['request']['file']>
type DetectedProfileImage = {
  extension: 'jpg' | 'png' | 'webp'
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}

const socialLinkConfigs = [
  {
    key: 'instagram',
    field: 'instagram_handle',
    label: 'Instagram',
    domain: 'instagram.com',
    pattern: /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9][a-zA-Z0-9._]{0,29}$/,
    message: 'Instagram can use up to 30 letters, numbers, periods, or underscores',
  },
  {
    key: 'tiktok',
    field: 'tiktok_handle',
    label: 'TikTok',
    domain: 'tiktok.com',
    pattern: /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9][a-zA-Z0-9._]{1,31}$/,
    message: 'TikTok can use letters, numbers, periods, or underscores',
  },
  {
    key: 'facebook',
    field: 'facebook_handle',
    label: 'Facebook',
    domain: 'facebook.com',
    pattern: /^[a-zA-Z0-9][a-zA-Z0-9.]{2,79}$/,
    message: 'Facebook can use letters, numbers, and periods',
  },
] as const

type SocialLinkConfig = (typeof socialLinkConfigs)[number]
type SocialKey = SocialLinkConfig['key']
type SocialField = SocialLinkConfig['field']
type SocialHandles = Record<SocialKey, string>
type NormalizedSocialLink = {
  userId: number
  label: string
  url: string
  sortOrder: number
}
type ProfileFormPayload = {
  display_name: string
  bio?: string | null
  location?: string | null
  phone?: string | null
  instagram_handle?: string | null
  tiktok_handle?: string | null
  facebook_handle?: string | null
  headline?: string | null
  service_area?: string | null
  availability_schedule?: string | null
  services_offered?: string | null
  payment_methods?: string | null
  public_phone?: string | null
  public_email?: string | null
  address?: string | null
  city?: string | null
  opening_hours?: string | null
  is_available?: string | null
  is_active?: string | null
}

export default class ProfilesController {
  async show({ auth, view }: HttpContext) {
    const user = auth.user!
    const accountProfile = await this.ensureAccountProfile(user)
    const accountLinks = await AccountLink.query()
      .where('userId', user.id)
      .orderBy('sortOrder', 'asc')
    const recentPostRows = await CommunityPost.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .limit(9)
    const roleDetails = await this.getRoleProfileDetails(user)
    const [stats, profileRelations] = await Promise.all([
      this.getProfileStats(user.id, accountProfile, {
        phone: user.phone,
        socialLinks: accountLinks.length,
      }),
      this.getProfileRelations(user.id),
    ])

    return view.render('pages/profile', {
      user,
      accountProfile,
      accountLinks,
      recentPosts: await this.getProfilePostPreviews(recentPostRows),
      ...roleDetails,
      avatarInitial: this.getProfileInitial(accountProfile, user),
      stats,
      profileRelations,
    })
  }

  async settings({ auth, view }: HttpContext) {
    const user = auth.user!
    const accountProfile = await this.ensureAccountProfile(user)
    const accountLinks = await AccountLink.query()
      .where('userId', user.id)
      .orderBy('sortOrder', 'asc')
    const roleDetails = await this.getRoleProfileDetails(user)

    return view.render('pages/profile_settings', {
      user,
      accountProfile,
      accountLinks,
      ...roleDetails,
      avatarInitial: this.getProfileInitial(accountProfile, user),
      socialHandles: this.getSocialHandles(accountLinks),
      stats: await this.getProfileStats(user.id, accountProfile, {
        phone: user.phone,
        socialLinks: accountLinks.length,
      }),
    })
  }

  async update({ auth, request, response, session }: HttpContext) {
    const user = auth.user!

    try {
      const payload = await request.validateUsing(profileValidator)
      const accountProfile = await this.ensureAccountProfile(user)
      const avatarFile = request.file('avatar', profileImageOptions)
      const bannerFile = request.file('banner', profileImageOptions)
      const uploadValidation = await this.validateUploads({
        avatar: avatarFile,
        banner: bannerFile,
      })
      const normalizedPhone = this.normalizePhone(payload.phone)
      const { links: socialLinks, errors: socialErrors } = this.normalizeSocialLinks(
        user.id,
        payload
      )
      const profileErrors = {
        ...(await this.validateProfileUpdate(user, normalizedPhone)),
        ...this.validateRoleProfileFields(payload),
        ...socialErrors,
        ...uploadValidation.errors,
      }

      if (Object.keys(profileErrors).length) {
        return redirectBackWithFormErrors({ request, response, session }, profileErrors)
      }

      const avatarUrl = await this.storeProfileImage(avatarFile, {
        userId: user.id,
        kind: 'avatar',
        detectedImage: uploadValidation.detected.avatar,
      })
      const bannerUrl = await this.storeProfileImage(bannerFile, {
        userId: user.id,
        kind: 'banner',
        detectedImage: uploadValidation.detected.banner,
      })

      accountProfile.merge({
        displayName: payload.display_name,
        bio: payload.bio,
        location: payload.location,
        avatarUrl: avatarUrl || accountProfile.avatarUrl,
        bannerUrl: bannerUrl || accountProfile.bannerUrl,
      })

      const shouldSaveUser = Boolean(avatarUrl) || user.phone !== normalizedPhone

      if (avatarUrl) {
        user.profilePicture = avatarUrl
      }

      if (user.phone !== normalizedPhone) {
        user.phone = normalizedPhone
      }

      if (shouldSaveUser) {
        await user.save()
      }

      await accountProfile.save()
      await this.updateRoleProfile(user, payload, normalizedPhone)
      await this.replaceAccountLinks(user.id, socialLinks)

      session.flash('success', 'Profile updated successfully')

      return response.redirect().toRoute('profile')
    } catch (error) {
      const validationErrors = validationExceptionToFieldErrors(error)

      if (validationErrors) {
        return redirectBackWithFormErrors({ request, response, session }, validationErrors)
      }

      throw error
    }
  }

  async media({ auth, params, response }: HttpContext) {
    const ownerId = params.userId ? Number(params.userId) : auth.user!.id
    const kind = params.kind as ProfileImageKind
    const fileName = params.fileName as string

    if (
      !Number.isInteger(ownerId) ||
      ownerId <= 0 ||
      !this.isValidProfileMediaRequest(kind, fileName)
    ) {
      return response.notFound('Image not found')
    }

    const directory = this.profileImageDirectory(ownerId)
    const filePath = path.resolve(directory, fileName)

    if (!filePath.startsWith(`${directory}${path.sep}`)) {
      return response.notFound('Image not found')
    }

    response
      .header('Cache-Control', 'private, max-age=300')
      .header('X-Content-Type-Options', 'nosniff')
      .download(filePath, false, (error) => {
        if (error.code === 'ENOENT') return ['Image not found', 404]
        return ['Unable to read image', 500]
      })
  }

  private async getRoleProfileDetails(user: NonNullable<HttpContext['auth']['user']>) {
    const baseDetails = {
      roleProfileKind: user.role,
      roleProfile: null as GardenerProfile | NurseryProfile | null,
      profileServices: [] as string[],
      profileServicesText: '',
      paymentMethods: [] as string[],
      paymentMethodsText: '',
      profileReviews: [] as ProfileReview[],
      profileRating: { average: 0, averageText: '0.0', count: 0 },
      ratingStars: [1, 2, 3, 4, 5],
    }

    if (user.role === 'gardener') {
      const roleProfile = await this.ensureGardenerProfile(user)
      const serviceRows = await GardenerService.query()
        .where('gardenerProfileId', roleProfile.id)
        .where('isActive', true)
        .orderBy('name', 'asc')
      const profileServices = serviceRows.length
        ? serviceRows.map((service) => service.name)
        : this.splitStoredList(roleProfile.servicesOffered)
      const paymentMethods = this.splitStoredList(roleProfile.paymentMethods)
      const profileReviews = await ProfileReview.query()
        .where('gardenerProfileId', roleProfile.id)
        .orderBy('createdAt', 'desc')
        .limit(6)
      const profileRating = await this.getReviewRatingStats(
        'gardener_profile_id',
        roleProfile.id,
        roleProfile.ratingAverage,
        roleProfile.ratingCount
      )

      return {
        ...baseDetails,
        roleProfile,
        profileServices,
        profileServicesText: this.listToStoredText(profileServices) || '',
        paymentMethods,
        paymentMethodsText: this.listToStoredText(paymentMethods) || '',
        profileReviews,
        profileRating,
      }
    }

    if (user.role === 'nursery') {
      const roleProfile = await this.ensureNurseryProfile(user)
      const profileServices = this.splitStoredList(roleProfile.servicesOffered)
      const paymentMethods = this.splitStoredList(roleProfile.paymentMethods)
      const profileReviews = await ProfileReview.query()
        .where('nurseryProfileId', roleProfile.id)
        .orderBy('createdAt', 'desc')
        .limit(6)
      const profileRating = await this.getReviewRatingStats(
        'nursery_profile_id',
        roleProfile.id,
        roleProfile.ratingAverage,
        roleProfile.ratingCount
      )

      return {
        ...baseDetails,
        roleProfile,
        profileServices,
        profileServicesText: this.listToStoredText(profileServices) || '',
        paymentMethods,
        paymentMethodsText: this.listToStoredText(paymentMethods) || '',
        profileReviews,
        profileRating,
      }
    }

    return baseDetails
  }

  private async updateRoleProfile(
    user: NonNullable<HttpContext['auth']['user']>,
    payload: ProfileFormPayload,
    privatePhone: string | null
  ) {
    if (user.role === 'gardener') {
      const roleProfile = await this.ensureGardenerProfile(user)
      const profileServices = this.normalizeList(payload.services_offered, 12, 90)
      const paymentMethods = this.normalizeList(payload.payment_methods, 8, 60)
      const publicPhone = this.normalizePhone(payload.public_phone) || privatePhone

      roleProfile.merge({
        headline: this.cleanOptional(payload.headline),
        bio: this.cleanOptional(payload.bio),
        serviceArea: this.cleanOptional(payload.service_area),
        availabilitySchedule: this.cleanOptional(payload.availability_schedule),
        servicesOffered: this.listToStoredText(profileServices, 255),
        paymentMethods: this.listToStoredText(paymentMethods),
        publicPhone,
        isAvailable: this.booleanFromForm(payload.is_available, roleProfile.isAvailable),
      })

      await roleProfile.save()
      await this.syncGardenerServices(roleProfile.id, profileServices)
    }

    if (user.role === 'nursery') {
      const roleProfile = await this.ensureNurseryProfile(user)
      const profileServices = this.normalizeList(payload.services_offered, 16, 90)
      const paymentMethods = this.normalizeList(payload.payment_methods, 8, 60)
      const publicPhone = this.normalizePhone(payload.public_phone) || privatePhone

      roleProfile.merge({
        description: this.cleanOptional(payload.bio),
        address: this.cleanOptional(payload.address),
        city: this.cleanOptional(payload.city),
        openingHours: this.cleanOptional(payload.opening_hours),
        servicesOffered: this.listToStoredText(profileServices),
        paymentMethods: this.listToStoredText(paymentMethods),
        publicPhone,
        publicEmail: this.cleanOptional(payload.public_email) || user.email,
        isActive: this.booleanFromForm(payload.is_active, roleProfile.isActive),
      })

      await roleProfile.save()
    }
  }

  private async ensureGardenerProfile(user: NonNullable<HttpContext['auth']['user']>) {
    return GardenerProfile.firstOrCreate(
      { userId: user.id },
      {
        userId: user.id,
        availabilitySchedule: '',
        servicesOffered: '',
        headline: 'Gardening professional',
        isAvailable: true,
        publicPhone: user.phone,
      }
    )
  }

  private async ensureNurseryProfile(user: NonNullable<HttpContext['auth']['user']>) {
    const accountProfile = await this.ensureAccountProfile(user)
    const fallbackName = accountProfile.displayName || user.fullName || user.username
    const baseSlug = this.slugify(fallbackName) || `nursery-${user.id}`
    const nurserySlug = `${baseSlug.slice(0, 72)}-${user.id}`.replace(/^-+|-+$/g, '')

    return NurseryProfile.firstOrCreate(
      { userId: user.id },
      {
        userId: user.id,
        nurseryName: fallbackName,
        nurserySlug,
        ownerName: user.fullName || user.username,
        publicPhone: user.phone,
        publicEmail: user.email,
        isActive: true,
      }
    )
  }

  private async syncGardenerServices(gardenerProfileId: number, serviceNames: string[]) {
    const existingServices = await GardenerService.query().where(
      'gardenerProfileId',
      gardenerProfileId
    )
    const activeServiceIds = new Set<number>()

    for (const serviceName of serviceNames) {
      const existingService = existingServices.find(
        (service) => service.name.toLowerCase() === serviceName.toLowerCase()
      )

      if (existingService) {
        existingService.merge({ name: serviceName, isActive: true })
        await existingService.save()
        activeServiceIds.add(existingService.id)
        continue
      }

      const createdService = await GardenerService.create({
        gardenerProfileId,
        name: serviceName,
        isActive: true,
      })

      activeServiceIds.add(createdService.id)
    }

    for (const service of existingServices) {
      if (activeServiceIds.has(service.id) || !service.isActive) continue

      service.isActive = false
      await service.save()
    }
  }

  private validateRoleProfileFields(payload: ProfileFormPayload) {
    const errors: FieldErrors = {}
    const publicPhone = this.normalizePhone(payload.public_phone)

    if (publicPhone && !/^[0-9]{4}-[0-9]{4}$/.test(publicPhone)) {
      errors.public_phone = ['Public phone must use the format 0000-0000']
    }

    return errors
  }

  private async getReviewRatingStats(
    targetColumn: 'gardener_profile_id' | 'nursery_profile_id',
    targetId: number,
    fallbackAverage: number,
    fallbackCount: number
  ) {
    const result = (await db
      .from('profile_reviews')
      .where(targetColumn, targetId)
      .avg('rating as average')
      .count('* as total')
      .first()) as { average?: number | string | null; total?: number | string | null } | null
    const reviewCount = Number(result?.total || 0)
    const ratingAverage =
      reviewCount > 0 ? Number(result?.average || 0) : Number(fallbackAverage || 0)
    const ratingCount = reviewCount > 0 ? reviewCount : Number(fallbackCount || 0)
    const roundedAverage = Math.round(Math.min(Math.max(ratingAverage, 0), 5) * 10) / 10

    return {
      average: roundedAverage,
      averageText: roundedAverage.toFixed(1),
      count: ratingCount,
    }
  }

  private async ensureAccountProfile(user: NonNullable<HttpContext['auth']['user']>) {
    const existingProfile = await AccountProfile.findBy('userId', user.id)

    if (existingProfile) {
      await this.secureLegacyProfileImages(user, existingProfile)
      return existingProfile
    }

    return AccountProfile.create({
      userId: user.id,
      displayName: user.fullName || user.username,
    })
  }

  private getProfileInitial(
    accountProfile: AccountProfile,
    user: NonNullable<HttpContext['auth']['user']>
  ) {
    const source = accountProfile.displayName || user.fullName || user.username || 'P'
    const initial = Array.from(source.trim())[0] || 'P'

    return initial.toLocaleUpperCase('en')
  }

  private async validateUploads(files: Record<ProfileImageKind, ProfileUploadFile>) {
    const errors: FieldErrors = {}
    const detected: Partial<Record<ProfileImageKind, DetectedProfileImage>> = {}

    for (const [kind, file] of Object.entries(files) as [ProfileImageKind, ProfileUploadFile][]) {
      if (!file) continue

      if (!file.isValid) {
        errors[kind] = [this.uploadErrorMessage(kind)]
        continue
      }

      const detectedImage = await this.detectProfileImage(file)

      if (!detectedImage) {
        errors[kind] = [
          `${kind === 'avatar' ? 'Profile photo' : 'Banner'} must be a real JPG, PNG, or WEBP image`,
        ]
        continue
      }

      detected[kind] = detectedImage
    }

    return { errors, detected }
  }

  private async validateProfileUpdate(
    user: NonNullable<HttpContext['auth']['user']>,
    phone: string | null
  ) {
    const errors: FieldErrors = {}
    const phoneIsRequired = user.role === 'gardener' || user.role === 'nursery'

    if (phoneIsRequired && !phone) {
      errors.phone = ['Phone number is required for this account type']
    }

    if (phone && !/^[0-9]{4}-[0-9]{4}$/.test(phone)) {
      errors.phone = ['Phone must use the format 0000-0000']
    }

    const phoneOwner = phone
      ? await db.from('users').where('phone', phone).whereNot('id', user.id).first()
      : null

    if (phoneOwner) {
      errors.phone = ['Phone already exists']
    }

    return errors
  }

  private async storeProfileImage(
    file: ProfileUploadFile,
    options: { userId: number; kind: ProfileImageKind; detectedImage?: DetectedProfileImage }
  ) {
    if (!file || !file.isValid || !options.detectedImage) return null

    const extension = options.detectedImage.extension
    const directory = this.profileImageDirectory(options.userId)

    await fs.mkdir(directory, { recursive: true })
    await file.move(directory, {
      name: `${options.kind}-${Date.now()}-${randomUUID()}.${extension}`,
      overwrite: true,
    })

    return file.fileName
      ? `/profile/media/${options.userId}/${options.kind}/${file.fileName}`
      : null
  }

  private profileImageDirectory(userId: number) {
    return app.makePath('storage/profile_uploads', String(userId))
  }

  private async secureLegacyProfileImages(
    user: NonNullable<HttpContext['auth']['user']>,
    accountProfile: AccountProfile
  ) {
    const legacyAvatarUrl = accountProfile.avatarUrl
    const legacyBannerUrl = accountProfile.bannerUrl
    const secureAvatarUrl = await this.migrateLegacyProfileImage(user.id, legacyAvatarUrl, 'avatar')
    const secureBannerUrl = await this.migrateLegacyProfileImage(user.id, legacyBannerUrl, 'banner')
    const profileUpdates: Partial<AccountProfile> = {}
    let shouldSaveProfile = false
    let shouldSaveUser = false

    if (secureAvatarUrl !== legacyAvatarUrl) {
      profileUpdates.avatarUrl = secureAvatarUrl
      shouldSaveProfile = true

      if (user.profilePicture === legacyAvatarUrl) {
        user.profilePicture = secureAvatarUrl
        shouldSaveUser = true
      }
    }

    if (secureBannerUrl !== legacyBannerUrl) {
      profileUpdates.bannerUrl = secureBannerUrl
      shouldSaveProfile = true
    }

    if (shouldSaveProfile) {
      accountProfile.merge(profileUpdates)
      await accountProfile.save()
    }

    if (shouldSaveUser) {
      await user.save()
    }
  }

  private async migrateLegacyProfileImage(
    userId: number,
    currentUrl: string | null,
    kind: ProfileImageKind
  ) {
    const legacyPrefix = `/uploads/profiles/${userId}/`

    if (!currentUrl?.startsWith(legacyPrefix)) return currentUrl

    const legacyName = currentUrl.slice(legacyPrefix.length)

    if (legacyName !== path.basename(legacyName)) return null

    const legacyPath = app.makePath('public/uploads/profiles', String(userId), legacyName)
    const detectedImage = await this.detectProfileImageFromPath(legacyPath).catch(() => null)

    if (!detectedImage) return null

    const secureName = `${kind}-${Date.now()}-${randomUUID()}.${detectedImage.extension}`
    const secureDirectory = this.profileImageDirectory(userId)
    const securePath = path.join(secureDirectory, secureName)

    await fs.mkdir(secureDirectory, { recursive: true })
    await fs.rename(legacyPath, securePath)

    return `/profile/media/${userId}/${kind}/${secureName}`
  }

  private isValidProfileMediaRequest(kind: string, fileName?: string) {
    if (kind !== 'avatar' && kind !== 'banner') return false
    if (!fileName || !profileMediaFilePattern.test(fileName)) return false

    return fileName.startsWith(`${kind}-`)
  }

  private async detectProfileImage(file: ProfileUploadFile): Promise<DetectedProfileImage | null> {
    if (!file?.tmpPath) return null

    return this.detectProfileImageFromPath(file.tmpPath, file.size)
  }

  private async detectProfileImageFromPath(
    filePath: string,
    fileSize = profileImageHeaderBytes
  ): Promise<DetectedProfileImage | null> {
    const bytesToRead = Math.min(Math.max(fileSize || 32, 32), profileImageHeaderBytes)
    const header = Buffer.alloc(bytesToRead)
    const handle = await fs.open(filePath, 'r')

    try {
      const { bytesRead } = await handle.read(header, 0, header.length, 0)
      const signature = header.subarray(0, bytesRead)

      return (
        this.detectJpegImage(signature) ||
        this.detectPngImage(signature) ||
        this.detectWebpImage(signature)
      )
    } finally {
      await handle.close()
    }
  }

  private detectJpegImage(header: Buffer): DetectedProfileImage | null {
    if (header.length < 4 || header[0] !== 0xff || header[1] !== 0xd8 || header[2] !== 0xff) {
      return null
    }

    const dimensions = this.readJpegDimensions(header)

    if (!dimensions || !this.hasSafeImageDimensions(dimensions.width, dimensions.height)) {
      return null
    }

    return { extension: 'jpg', mimeType: 'image/jpeg' }
  }

  private detectPngImage(header: Buffer): DetectedProfileImage | null {
    const hasPngSignature =
      header.length >= 24 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a &&
      header.toString('ascii', 12, 16) === 'IHDR'

    if (!hasPngSignature) return null

    const width = header.readUInt32BE(16)
    const height = header.readUInt32BE(20)

    if (!this.hasSafeImageDimensions(width, height)) {
      return null
    }

    return { extension: 'png', mimeType: 'image/png' }
  }

  private detectWebpImage(header: Buffer): DetectedProfileImage | null {
    if (
      header.length < 30 ||
      header.toString('ascii', 0, 4) !== 'RIFF' ||
      header.toString('ascii', 8, 12) !== 'WEBP'
    ) {
      return null
    }

    const dimensions = this.readWebpDimensions(header)

    if (!dimensions || !this.hasSafeImageDimensions(dimensions.width, dimensions.height)) {
      return null
    }

    return { extension: 'webp', mimeType: 'image/webp' }
  }

  private readJpegDimensions(header: Buffer) {
    let offset = 2

    while (offset + 3 < header.length) {
      if (header[offset] !== 0xff) {
        offset += 1
        continue
      }

      while (header[offset] === 0xff) {
        offset += 1
      }

      const marker = header[offset]
      offset += 1

      if (marker === 0xd9 || marker === 0xda) return null
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 2 > header.length) return null

      const segmentLength = header.readUInt16BE(offset)

      if (segmentLength < 2) return null

      const segmentStart = offset + 2
      const segmentEnd = offset + segmentLength

      if (this.isJpegStartOfFrame(marker)) {
        if (segmentStart + 5 > header.length) return null

        return {
          height: header.readUInt16BE(segmentStart + 1),
          width: header.readUInt16BE(segmentStart + 3),
        }
      }

      if (segmentEnd <= offset) return null

      offset = segmentEnd
    }

    return null
  }

  private readWebpDimensions(header: Buffer) {
    const chunkType = header.toString('ascii', 12, 16)

    if (chunkType === 'VP8X') {
      return {
        width: 1 + header.readUIntLE(24, 3),
        height: 1 + header.readUIntLE(27, 3),
      }
    }

    if (chunkType === 'VP8L' && header[20] === 0x2f) {
      const b0 = header[21]
      const b1 = header[22]
      const b2 = header[23]
      const b3 = header[24]

      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      }
    }

    if (chunkType === 'VP8 ' && header[23] === 0x9d && header[24] === 0x01 && header[25] === 0x2a) {
      return {
        width: header.readUInt16LE(26) & 0x3fff,
        height: header.readUInt16LE(28) & 0x3fff,
      }
    }

    return null
  }

  private isJpegStartOfFrame(marker: number) {
    return (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    )
  }

  private hasSafeImageDimensions(width: number, height: number) {
    return (
      Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      width <= maxProfileImageDimension &&
      height <= maxProfileImageDimension &&
      width * height <= maxProfileImagePixels
    )
  }

  private uploadErrorMessage(kind: ProfileImageKind) {
    return kind === 'avatar'
      ? 'Profile photo must be JPG, PNG, or WEBP and smaller than 5MB'
      : 'Banner must be JPG, PNG, or WEBP and smaller than 5MB'
  }

  private async replaceAccountLinks(userId: number, links: NormalizedSocialLink[]) {
    await db.from('account_links').where('user_id', userId).delete()

    if (links.length) {
      await AccountLink.createMany(links)
    }
  }

  private normalizeSocialLinks(
    userId: number,
    payload: Partial<Record<SocialField, string | null>>
  ) {
    const errors: FieldErrors = {}
    const links: NormalizedSocialLink[] = []

    for (const [index, config] of socialLinkConfigs.entries()) {
      const rawHandle = payload[config.field]
      const handle = this.extractSocialHandle(config, rawHandle)

      if (!handle) continue

      if (!config.pattern.test(handle)) {
        errors[config.field] = [config.message]
        continue
      }

      links.push({
        userId,
        label: config.label,
        url: this.buildSocialUrl(config, handle),
        sortOrder: index + 1,
      })
    }

    return { links, errors }
  }

  private getSocialHandles(accountLinks: AccountLink[]): SocialHandles {
    const handles: SocialHandles = {
      instagram: '',
      tiktok: '',
      facebook: '',
    }

    for (const link of accountLinks) {
      const config = socialLinkConfigs.find(
        (candidate) => candidate.label.toLowerCase() === link.label.toLowerCase()
      )

      if (config) {
        handles[config.key] = this.extractSocialHandle(config, link.url)
      }
    }

    return handles
  }

  private extractSocialHandle(config: SocialLinkConfig, value?: string | null) {
    const clean = this.cleanOptional(value)

    if (!clean) return ''

    const stripped = clean.replace(/^@+/, '')

    try {
      const normalizedUrl = stripped.match(/^https?:\/\//i) ? stripped : `https://${stripped}`
      const url = new URL(normalizedUrl)
      const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()

      if (hostname === config.domain) {
        return (
          url.pathname
            .replace(/^\/+|\/+$/g, '')
            .replace(/^@+/, '')
            .split('/')[0] || ''
        ).toLowerCase()
      }
    } catch {
      // Plain handles are expected, so URL parsing failures fall back to string cleanup.
    }

    return stripped
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(new RegExp(`^${config.domain.replace('.', '\\.')}\\/?`, 'i'), '')
      .replace(/^@+/, '')
      .split(/[/?#]/)[0]
      .trim()
      .toLowerCase()
  }

  private buildSocialUrl(config: SocialLinkConfig, handle: string) {
    if (config.key === 'tiktok') {
      return `https://www.tiktok.com/@${encodeURIComponent(handle)}`
    }

    return `https://www.${config.domain}/${encodeURIComponent(handle)}`
  }

  private normalizePhone(value?: string | null) {
    const clean = this.cleanOptional(value)

    if (!clean) return null

    const numbers = clean.replace(/\D/g, '')

    if (numbers.length === 8) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`
    }

    return clean
  }

  private normalizeList(value?: string | null, maxItems = 12, maxLength = 80) {
    const uniqueItems = new Map<string, string>()

    for (const item of this.splitStoredList(value)) {
      const clean = item.replace(/\s+/g, ' ').trim().slice(0, maxLength)
      const key = clean.toLowerCase()

      if (clean && !uniqueItems.has(key)) {
        uniqueItems.set(key, clean)
      }
    }

    return Array.from(uniqueItems.values()).slice(0, maxItems)
  }

  private splitStoredList(value?: string | null) {
    return (value || '')
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  private listToStoredText(items: string[], maxLength?: number) {
    const cleanText = items
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n')
    const limitedText = maxLength ? cleanText.slice(0, maxLength) : cleanText

    return limitedText || null
  }

  private booleanFromForm(value?: string | null, fallback = false) {
    if (value === undefined || value === null) return fallback

    return ['1', 'true', 'on', 'yes'].includes(value.toString().toLowerCase())
  }

  private slugify(value?: string | null) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
  }

  private cleanOptional(value?: string | null) {
    const clean = value?.toString().trim()
    return clean ? clean : null
  }

  private async getProfileStats(
    userId: number,
    accountProfile: AccountProfile,
    options: { phone?: string | null; socialLinks?: number } = {}
  ) {
    const [posts, followers, following, friends, likes, favorites, comments] = await Promise.all([
      this.countRows('community_posts', 'user_id', userId),
      this.countRows('follows', 'following_id', userId),
      this.countRows('follows', 'follower_id', userId),
      this.countMutualFriends(userId),
      this.countRows('post_reactions', 'user_id', userId, { type: 'like' }),
      this.countRows('post_reactions', 'user_id', userId, { type: 'favorite' }),
      this.countRows('post_comments', 'user_id', userId),
    ])

    const reliabilitySignals = [
      accountProfile.displayName,
      accountProfile.avatarUrl,
      accountProfile.bannerUrl,
      accountProfile.bio,
      accountProfile.location,
      options.phone,
      options.socialLinks ? 'social-links' : null,
    ].filter(Boolean).length

    return {
      posts,
      followers,
      following,
      friends,
      likes,
      favorites,
      comments,
      reliability: Math.round((reliabilitySignals / 7) * 100),
    }
  }

  private async getProfilePostPreviews(posts: CommunityPost[]) {
    if (!posts.length) return []

    const postIds = posts.map((post) => post.id)
    const [reactionRows, commentRows, pollRows] = await Promise.all([
      db
        .from('post_reactions')
        .whereIn('community_post_id', postIds)
        .groupBy('community_post_id', 'type')
        .select('community_post_id', 'type')
        .count('* as total'),
      db
        .from('post_comments')
        .whereIn('community_post_id', postIds)
        .groupBy('community_post_id')
        .select('community_post_id')
        .count('* as total'),
      db.from('post_polls').whereIn('community_post_id', postIds).select('id', 'community_post_id', 'question'),
    ])
    const statsByPost = new Map<number, { likes: number; favorites: number; comments: number }>()
    const pollIds = pollRows.map((row) => Number(row.id))
    const pollPostIds = new Set(pollRows.map((row) => Number(row.community_post_id)))
    const pollByPost = new Map<number, { question: string; totalVotes: number; options: { label: string; votes: number; percent: number }[] }>()

    postIds.forEach((postId) => statsByPost.set(postId, { likes: 0, favorites: 0, comments: 0 }))

    reactionRows.forEach((row) => {
      const postId = Number(row.community_post_id)
      const stats = statsByPost.get(postId)

      if (!stats) return

      if (row.type === 'like') stats.likes = Number(row.total || 0)
      if (row.type === 'favorite') stats.favorites = Number(row.total || 0)
    })

    commentRows.forEach((row) => {
      const stats = statsByPost.get(Number(row.community_post_id))

      if (stats) stats.comments = Number(row.total || 0)
    })

    if (pollIds.length) {
      const [optionRows, voteRows] = await Promise.all([
        db
          .from('post_poll_options')
          .whereIn('post_poll_id', pollIds)
          .orderBy('sort_order', 'asc')
          .select('id', 'post_poll_id', 'label'),
        db
          .from('post_poll_votes')
          .whereIn('post_poll_id', pollIds)
          .groupBy('post_poll_id', 'post_poll_option_id')
          .select('post_poll_id', 'post_poll_option_id')
          .count('* as total'),
      ])
      const votesByOption = new Map<number, number>()

      voteRows.forEach((row) => {
        votesByOption.set(Number(row.post_poll_option_id), Number(row.total || 0))
      })

      pollRows.forEach((poll) => {
        const pollId = Number(poll.id)
        const options = optionRows.filter((option) => Number(option.post_poll_id) === pollId)
        const totalVotes = options.reduce(
          (total, option) => total + (votesByOption.get(Number(option.id)) || 0),
          0
        )

        pollByPost.set(Number(poll.community_post_id), {
          question: String(poll.question || ''),
          totalVotes,
          options: options.map((option) => {
            const votes = votesByOption.get(Number(option.id)) || 0

            return {
              label: String(option.label || ''),
              votes,
              percent: totalVotes ? Math.round((votes / totalVotes) * 100) : 0,
            }
          }),
        })
      })
    }

    return posts.map((post) => {
      const kind = pollPostIds.has(post.id) ? 'poll' : post.mediaUrl ? 'image' : 'text'
      const stats = statsByPost.get(post.id) || { likes: 0, favorites: 0, comments: 0 }

      return {
        id: post.id,
        body: post.body,
        mediaUrl: post.mediaUrl,
        kind,
        kindLabel: kind === 'poll' ? 'Poll' : kind === 'image' ? 'Image' : 'Text',
        createdAtHuman: post.createdAt?.toRelative() || 'Recently',
        poll: pollByPost.get(post.id) || null,
        pollJson: pollByPost.has(post.id) ? JSON.stringify(pollByPost.get(post.id)) : '',
        ...stats,
      }
    })
  }

  private async getProfileRelations(userId: number) {
    const [followers, following, friendIds] = await Promise.all([
      Follow.query()
        .where('followingId', userId)
        .preload('follower', (query) => query.preload('accountProfile'))
        .orderBy('createdAt', 'desc')
        .limit(80),
      Follow.query()
        .where('followerId', userId)
        .preload('following', (query) => query.preload('accountProfile'))
        .orderBy('createdAt', 'desc')
        .limit(80),
      this.getFriendIds(userId),
    ])
    const friendSet = new Set(friendIds)

    return {
      followers: followers.map((follow) =>
        this.formatRelationUser(follow.follower, userId, friendSet)
      ),
      following: following.map((follow) =>
        this.formatRelationUser(follow.following, userId, friendSet)
      ),
      friends: following
        .filter((follow) => friendSet.has(follow.followingId))
        .map((follow) => this.formatRelationUser(follow.following, userId, friendSet)),
    }
  }

  private formatRelationUser(user: User, currentUserId: number, friendIds: Set<number>) {
    const profile = user.accountProfile || null
    const displayName = profile?.displayName || user.fullName || user.username
    const initial = Array.from((displayName || user.username || 'P').trim())[0] || 'P'

    return {
      id: user.id,
      username: user.username,
      displayName,
      role: user.role,
      roleLabel: this.roleLabel(user.role),
      avatarUrl: this.profileMediaUrl(user.id, profile?.avatarUrl || user.profilePicture),
      initial: initial.toLocaleUpperCase('en'),
      relationLabel: user.id === currentUserId ? 'You' : friendIds.has(user.id) ? 'Friend' : null,
    }
  }

  private async getFriendIds(userId: number) {
    const [followingRows, followerRows] = await Promise.all([
      Follow.query().where('followerId', userId).select('followingId'),
      Follow.query().where('followingId', userId).select('followerId'),
    ])
    const followerIds = new Set(followerRows.map((row) => row.followerId))

    return followingRows.map((row) => row.followingId).filter((id) => followerIds.has(id))
  }

  private async countMutualFriends(userId: number) {
    return (await this.getFriendIds(userId)).length
  }

  private profileMediaUrl(userId: number, url?: string | null) {
    if (!url) return null

    const legacySecureUrl = url.match(/^\/profile\/media\/(avatar|banner)\/([^/]+)$/)

    if (legacySecureUrl) {
      return `/profile/media/${userId}/${legacySecureUrl[1]}/${legacySecureUrl[2]}`
    }

    return url
  }

  private roleLabel(role: string) {
    if (role === 'gardener') return 'Gardener'
    if (role === 'nursery') return 'Nursery'

    return 'Client'
  }

  private async countRows(
    tableName: string,
    columnName: string,
    value: number,
    extraWhere: Record<string, string> = {}
  ) {
    const query = db.from(tableName).where(columnName, value)

    for (const [key, extraValue] of Object.entries(extraWhere)) {
      query.where(key, extraValue)
    }

    const result = (await query.count('* as total').first()) as { total?: number | string } | null

    return Number(result?.total || 0)
  }
}
