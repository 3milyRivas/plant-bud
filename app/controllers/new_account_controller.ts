import User from '#models/user'
import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import { FREE_SCANNER_MONTHLY_LIMIT } from '#services/subscription_service'

import { signupValidator } from '#validators/user'
import {
  redirectBackWithFormErrors,
  safeOldInput,
  validationExceptionToFieldErrors,
  type FieldErrors,
} from '#services/form_errors'

import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type SignupRole = 'client' | 'gardener' | 'nursery'

const NURSERY_USERNAME_PREFIX = 'nursery_'
const SIGNUP_USERNAME_MAX_LENGTH = 15
const RESERVED_HANDLE_KEYS = new Set([
  'admin',
  'administrator',
  'login',
  'nurseries',
  'nursery',
  'plantbud',
  'signup',
  'support',
])
const nurseryNamePattern = /^[\p{L}\p{N}][\p{L}\p{N} .&'-]{1,20}[\p{L}\p{N}]$/u

type SignupPayload = {
  username?: string
  display_name?: string
  first_name?: string
  last_name?: string
  nursery_name?: string
  owner_name?: string
  email: string
  phone?: string | null
  dui?: string | null
  owner_dui?: string | null
  password: string
  role: SignupRole
}

type NormalizedSignup = {
  role: SignupRole
  username: string
  firstName: string
  lastName: string
  displayName: string
  email: string
  password: string
  phone: string | null
  dui: string | null
  nurseryName: string | null
  nurserySlug: string | null
  ownerName: string | null
}

export default class NewAccountController {
  async createClient({ view }: HttpContext) {
    return view.render('pages/auth/signup_client')
  }

  async createGardener({ view }: HttpContext) {
    return view.render('pages/auth/signup_gardener')
  }

  async createNursery({ view }: HttpContext) {
    return view.render('pages/auth/signup_nursery')
  }

  async store({ request, response, auth, session }: HttpContext) {
    try {
      const payload = await request.validateUsing(signupValidator)
      const normalized = await this.normalizeSignup(payload)
      const errors = await this.validateSignup(normalized)

      if (Object.keys(errors).length) {
        return redirectBackWithFormErrors({ request, response, session }, errors)
      }

      const trx = await db.transaction()
      let user: User

      try {
        user = await User.create(
          {
            username: normalized.username,
            first_name: normalized.firstName,
            last_name: normalized.lastName,
            email: normalized.email,
            password: normalized.password,
            role: normalized.role,
            phone: normalized.phone,
            dui: normalized.dui,
          },
          { client: trx }
        )

        await AccountProfile.create(
          {
            userId: user.id,
            displayName: normalized.displayName,
            subscriptionPlan: 'free',
            rewardPoints: 0,
            scannerMonthlyLimit: FREE_SCANNER_MONTHLY_LIMIT,
          },
          { client: trx }
        )

        if (normalized.role === 'gardener') {
          await GardenerProfile.create(
            {
              userId: user.id,
              availabilitySchedule: '',
              servicesOffered: '',
              headline: 'Gardening professional',
              isAvailable: true,
            },
            { client: trx }
          )
        }

        if (normalized.role === 'nursery') {
          await NurseryProfile.create(
            {
              userId: user.id,
              nurseryName: normalized.nurseryName!,
              nurserySlug: normalized.nurserySlug!,
              ownerName: normalized.ownerName!,
              publicPhone: normalized.phone,
              publicEmail: normalized.email,
              isActive: true,
            },
            { client: trx }
          )
        }

        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }

      await auth.use('web').login(user)

      return response.redirect().toRoute('homepage')
    } catch (error) {
      const validationErrors = validationExceptionToFieldErrors(error)

      if (validationErrors) {
        return redirectBackWithFormErrors({ request, response, session }, validationErrors)
      }

      session.flash('errors', {
        auth: ['Signup failed'],
      })

      session.flash('old', safeOldInput(request.all()))

      return response.redirect().back()
    }
  }

  private async normalizeSignup(payload: SignupPayload): Promise<NormalizedSignup> {
    const role = payload.role
    const email = payload.email.trim().toLowerCase()
    const phone = this.cleanOptional(payload.phone)
    const ownerName = this.cleanName(payload.owner_name)
    const nurseryName = this.cleanName(payload.nursery_name)
    const nurserySlug = this.normalizeSlug(nurseryName)
    const accountName = role === 'nursery' ? ownerName : null
    const splitOwnerName = this.splitName(accountName)
    const accountDisplayName =
      role === 'nursery'
        ? nurseryName || ''
        : this.cleanName(payload.display_name) ||
          this.cleanName(`${payload.first_name || ''} ${payload.last_name || ''}`)
    const splitDisplayName = this.splitDisplayNameForUser(accountDisplayName)

    const firstName = role === 'nursery' ? splitOwnerName.firstName : splitDisplayName.firstName
    const lastName = role === 'nursery' ? splitOwnerName.lastName : splitDisplayName.lastName
    const username =
      role === 'nursery'
        ? await this.uniqueUsername(`${NURSERY_USERNAME_PREFIX}${nurserySlug || 'account'}`)
        : this.normalizeUsername(payload.username)
    const dui =
      role === 'nursery' ? this.cleanOptional(payload.owner_dui) : this.cleanOptional(payload.dui)

    return {
      role,
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      displayName: accountDisplayName || '',
      email,
      password: payload.password,
      phone,
      dui,
      nurseryName,
      nurserySlug,
      ownerName,
    }
  }

  private async validateSignup(normalized: NormalizedSignup) {
    const errors: FieldErrors = {}

    if (normalized.role !== 'nursery') {
      if (!normalized.username) errors.username = ['Username is required']
      if (this.isReservedHandle(normalized.username)) {
        errors.username = ['This username is reserved']
      }
      if (normalized.username.startsWith(NURSERY_USERNAME_PREFIX)) {
        errors.username = ['This username prefix is reserved for nursery accounts']
      }
      if (!normalized.displayName) errors.display_name = ['Display name is required']
    }

    if (normalized.role === 'nursery') {
      if (!normalized.nurseryName) errors.nursery_name = ['Nursery name is required']
      if (!normalized.nurserySlug) {
        errors.nursery_name = ['Nursery name must include letters or numbers']
      }
      if (normalized.nurseryName && !this.isValidNurseryName(normalized.nurseryName)) {
        errors.nursery_name = [
          'Use letters, numbers, spaces, periods, apostrophes, hyphens, or & only',
        ]
      }
      if (!normalized.ownerName) errors.owner_name = ['Owner or manager name is required']
    }

    if (normalized.role === 'gardener' || normalized.role === 'nursery') {
      if (!normalized.phone) errors.phone = ['Phone number is required']
    }

    if (normalized.phone && !/^[0-9]{4}-[0-9]{4}$/.test(normalized.phone)) {
      errors.phone = ['Phone must use the format 0000-0000']
    }

    const duiField = normalized.role === 'nursery' ? 'owner_dui' : 'dui'

    if (normalized.role === 'gardener' || normalized.role === 'nursery') {
      if (!normalized.dui) errors[duiField] = ['DUI is required']
    }

    if (normalized.dui && !/^\d{8}-\d$/.test(normalized.dui)) {
      errors[duiField] = ['DUI must use the format 01234567-8']
    }

    const emailExists = await User.findBy('email', normalized.email)
    const usernameExists =
      normalized.role === 'nursery' ? null : await User.findBy('username', normalized.username)
    const nurseryExists =
      normalized.role === 'nursery' && normalized.nurserySlug
        ? await NurseryProfile.findBy('nurserySlug', normalized.nurserySlug)
        : null
    const nurseryNameConflictsWithUser =
      normalized.role === 'nursery' && normalized.nurserySlug
        ? await User.query()
            .whereRaw("replace(replace(lower(username), '.', ''), '_', '') = ?", [
              this.handleKey(normalized.nurserySlug),
            ])
            .first()
        : null
    const usernameConflictsWithNursery =
      normalized.role !== 'nursery' && normalized.username
        ? await NurseryProfile.query()
            .whereRaw("replace(lower(nursery_slug), '-', '') = ?", [
              this.handleKey(normalized.username),
            ])
            .first()
        : null
    const phoneExists = normalized.phone ? await User.findBy('phone', normalized.phone) : null
    const duiExists = normalized.dui ? await User.findBy('dui', normalized.dui) : null

    if (emailExists) errors.email = ['Email already exists']
    if (usernameExists) errors.username = ['Username already exists']
    if (nurseryExists) errors.nursery_name = ['Nursery name already exists']
    if (nurseryNameConflictsWithUser) {
      errors.nursery_name = ['Nursery name is too similar to an existing username']
    }
    if (usernameConflictsWithNursery) {
      errors.username = ['Username is too similar to an existing nursery name']
    }
    if (phoneExists) errors.phone = ['Phone already exists']
    if (duiExists) errors[duiField] = ['DUI already exists']

    return errors
  }

  private cleanOptional(value?: string | null) {
    const clean = value?.toString().trim()
    return clean ? clean : null
  }

  private cleanName(value?: string | null) {
    return this.cleanOptional(value)?.replace(/\s+/g, ' ') || null
  }

  private normalizeUsername(value?: string | null) {
    return this.cleanOptional(value)?.toLowerCase().slice(0, SIGNUP_USERNAME_MAX_LENGTH) || ''
  }

  private normalizeSlug(value?: string | null) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
  }

  private isValidNurseryName(value: string) {
    return nurseryNamePattern.test(value) && !this.isReservedHandle(value)
  }

  private isReservedHandle(value: string) {
    return RESERVED_HANDLE_KEYS.has(this.handleKey(value))
  }

  private handleKey(value?: string | null) {
    return this.normalizeSlug(value).replace(/-/g, '')
  }

  private async uniqueUsername(base: string) {
    const fallback =
      this.normalizeSlug(base).replace(/-/g, '_').slice(0, SIGNUP_USERNAME_MAX_LENGTH) || 'user'
    let username = fallback.slice(0, SIGNUP_USERNAME_MAX_LENGTH)
    let counter = 1

    while (await User.findBy('username', username)) {
      const suffix = `_${counter}`
      username = `${fallback.slice(0, SIGNUP_USERNAME_MAX_LENGTH - suffix.length)}${suffix}`
      counter += 1
    }

    return username
  }

  private splitName(fullName?: string | null) {
    const parts = (fullName || '').split(/\s+/).filter(Boolean)
    const firstName = parts[0] || ''
    const lastName = parts.slice(1).join(' ') || 'Owner'

    return { firstName, lastName }
  }

  private splitDisplayNameForUser(displayName?: string | null) {
    const cleanDisplayName = this.cleanName(displayName) || ''

    return {
      firstName: cleanDisplayName.slice(0, 50).trim(),
      lastName: cleanDisplayName.slice(50, 100).trim(),
    }
  }
}
