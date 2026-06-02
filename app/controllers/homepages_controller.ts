import type { HttpContext } from '@adonisjs/core/http'
import type AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'

export default class HomepagesController {
  async index({ auth, view }: HttpContext) {
    const user = auth.user!

    await user.load('accountProfile')

    if (user.role === 'gardener') {
      const gardenerProfile = await GardenerProfile.firstOrCreate(
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

      return view.render('pages/homepages/gardener', {
        user,
        accountProfile: user.accountProfile,
        gardenerProfile,
        homepageProfile: this.getHomepageProfile(user, user.accountProfile),
      })
    }

    if (user.role === 'nursery') {
      const fallbackName = user.accountProfile?.displayName || user.fullName || user.username
      const nurseryProfile = await NurseryProfile.firstOrCreate(
        { userId: user.id },
        {
          userId: user.id,
          nurseryName: fallbackName,
          nurserySlug: this.uniqueFallbackSlug(fallbackName, user.id),
          ownerName: user.fullName || user.username,
          publicPhone: user.phone,
          publicEmail: user.email,
          isActive: true,
        }
      )

      return view.render('pages/homepages/nursery', {
        user,
        accountProfile: user.accountProfile,
        nurseryProfile,
        homepageProfile: this.getHomepageProfile(
          user,
          user.accountProfile,
          nurseryProfile.nurseryName
        ),
      })
    }

    return view.render('pages/homepages/client', {
      user,
      accountProfile: user.accountProfile,
      homepageProfile: this.getHomepageProfile(user, user.accountProfile),
    })
  }

  private getHomepageProfile(
    user: NonNullable<HttpContext['auth']['user']>,
    accountProfile?: AccountProfile | null,
    displayNameOverride?: string | null
  ) {
    const displayName =
      displayNameOverride || accountProfile?.displayName || user.fullName || user.username
    const avatarUrl = accountProfile?.avatarUrl || user.profilePicture || null
    const initial = Array.from((displayName || user.username || 'P').trim())[0] || 'P'

    return {
      displayName,
      avatarUrl,
      avatarInitial: initial.toLocaleUpperCase('en'),
      planLabel: accountProfile?.planLabel || 'Free',
    }
  }

  private uniqueFallbackSlug(value: string, userId: number) {
    const baseSlug =
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72) || 'nursery'

    return `${baseSlug}-${userId}`
  }
}
