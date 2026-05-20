import AccountLink from '#models/account_link'
import AccountProfile from '#models/account_profile'
import CommunityPost from '#models/community_post'
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

const profileImageOptions = {
  size: '5mb',
  extnames: ['jpg', 'jpeg', 'png', 'webp'],
}
const profileImageHeaderBytes = 256 * 1024
const maxProfileImageDimension = 8000
const maxProfileImagePixels = 32_000_000

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

export default class ProfilesController {
  async show({ auth, view }: HttpContext) {
    const user = auth.user!
    const accountProfile = await this.ensureAccountProfile(user)
    const accountLinks = await AccountLink.query()
      .where('userId', user.id)
      .orderBy('sortOrder', 'asc')
    const recentPosts = await CommunityPost.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .limit(9)

    return view.render('pages/profile', {
      user,
      accountProfile,
      accountLinks,
      recentPosts,
      stats: await this.getProfileStats(user.id, accountProfile, {
        phone: user.phone,
        socialLinks: accountLinks.length,
      }),
    })
  }

  async settings({ auth, view }: HttpContext) {
    const user = auth.user!
    const accountProfile = await this.ensureAccountProfile(user)
    const accountLinks = await AccountLink.query()
      .where('userId', user.id)
      .orderBy('sortOrder', 'asc')

    return view.render('pages/profile_settings', {
      user,
      accountProfile,
      accountLinks,
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

  private async ensureAccountProfile(user: NonNullable<HttpContext['auth']['user']>) {
    const existingProfile = await AccountProfile.findBy('userId', user.id)

    if (existingProfile) return existingProfile

    return AccountProfile.create({
      userId: user.id,
      displayName: user.fullName || user.username,
    })
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
    const directory = app.makePath('public/uploads/profiles', String(options.userId))

    await fs.mkdir(directory, { recursive: true })
    await file.move(directory, {
      name: `${options.kind}-${Date.now()}-${randomUUID()}.${extension}`,
      overwrite: true,
    })

    return file.fileName ? `/uploads/profiles/${options.userId}/${file.fileName}` : null
  }

  private async detectProfileImage(file: ProfileUploadFile): Promise<DetectedProfileImage | null> {
    if (!file?.tmpPath) return null

    const bytesToRead = Math.min(Math.max(file.size || 32, 32), profileImageHeaderBytes)
    const header = Buffer.alloc(bytesToRead)
    const handle = await fs.open(file.tmpPath, 'r')

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

  private cleanOptional(value?: string | null) {
    const clean = value?.toString().trim()
    return clean ? clean : null
  }

  private async getProfileStats(
    userId: number,
    accountProfile: AccountProfile,
    options: { phone?: string | null; socialLinks?: number } = {}
  ) {
    const [posts, followers, following, likes, favorites, comments] = await Promise.all([
      this.countRows('community_posts', 'user_id', userId),
      this.countRows('follows', 'following_id', userId),
      this.countRows('follows', 'follower_id', userId),
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
      likes,
      favorites,
      comments,
      reliability: Math.round((reliabilitySignals / 7) * 100),
    }
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
