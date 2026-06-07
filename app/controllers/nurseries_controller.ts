import nurseriesData from '#data/nurseries'
import NurseryProfile from '#models/nursery_profile'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type MapLocation = {
  id: string
  name: string
  location: string
  hours: string
  image: string | null
  initial: string
  latitude: number
  longitude: number
  profileHref: string | null
  directionsHref: string
}

export default class NurseriesController {
  async index({ auth, request, view }: HttpContext) {
    const user = auth.user
    const search = String(request.input('q') || '').trim()
    const requestedPage = Math.max(
      1,
      Number.parseInt(String(request.input('page') || '1'), 10) || 1
    )
    const profiles = await NurseryProfile.query()
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('products', (query) => query.where('isActive', true).orderBy('name', 'asc'))
      .orderBy('isActive', 'desc')
      .orderBy('ratingAverage', 'desc')
      .orderBy('nurseryName', 'asc')

    const favoriteNurseryUserIds = user
      ? await this.getFavoriteNurseryUserIds(user.id)
      : new Set<number>()
    const allRegisteredNurseries = profiles.map((profile) =>
      this.formatNursery(profile, {
        isFavorite: favoriteNurseryUserIds.has(profile.userId),
        isOwnProfile: user?.id === profile.userId,
      })
    )
    const filteredNurseries = this.filterNurseries(allRegisteredNurseries, search)
    const perPage = 10
    const totalPages = Math.max(1, Math.ceil(filteredNurseries.length / perPage))
    const page = Math.min(requestedPage, totalPages)
    const registeredNurseries = filteredNurseries.slice((page - 1) * perPage, page * perPage)

    const mapLocations = profiles
      .map((profile) => this.registeredMapLocation(profile))
      .filter((location): location is MapLocation => Boolean(location))

    return view.render('pages/client/nurseries', {
      registeredNurseries,
      favoriteNurseries: allRegisteredNurseries.filter((nursery) => nursery.isFavorite).slice(0, 6),
      editorialNurseries: nurseriesData.nurseries,
      mapLocations,
      mapLocationsJson: JSON.stringify(mapLocations).replace(/</g, '\\u003c'),
      search,
      pagination: {
        page,
        perPage,
        total: filteredNurseries.length,
        totalPages,
        from: filteredNurseries.length ? (page - 1) * perPage + 1 : 0,
        to: Math.min(page * perPage, filteredNurseries.length),
        previousHref: page > 1 ? this.paginationHref(search, page - 1) : null,
        nextHref: page < totalPages ? this.paginationHref(search, page + 1) : null,
        pages: Array.from({ length: totalPages }, (_, index) => ({
          number: index + 1,
          href: this.paginationHref(search, index + 1),
          current: index + 1 === page,
        })),
      },
      totals: {
        registered: allRegisteredNurseries.length,
        locations: mapLocations.length,
        active: allRegisteredNurseries.filter((nursery) => nursery.isActive).length,
        favorites: allRegisteredNurseries.filter((nursery) => nursery.isFavorite).length,
      },
      canUseFavorites: Boolean(user),
    })
  }

  async suggestions({ request, response }: HttpContext) {
    const search = String(request.input('q') || '').trim()

    if (search.length < 2) {
      return response.json({ nurseries: [] })
    }

    const profiles = await NurseryProfile.query()
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('products', (query) => query.where('isActive', true))
      .orderBy('ratingAverage', 'desc')

    const nurseries = this.filterNurseries(
      profiles.map((profile) => this.formatNursery(profile)),
      search
    )
      .slice(0, 6)
      .map((nursery) => ({
        name: nursery.name,
        username: nursery.username,
        photo: nursery.image,
        initial: nursery.initial,
        location: nursery.location,
        productsCount: nursery.productsCount,
        isActive: nursery.isActive,
        href: nursery.profileHref,
      }))

    return response.json({ nurseries })
  }

  private formatNursery(
    profile: NurseryProfile,
    options: { isFavorite?: boolean; isOwnProfile?: boolean } = {}
  ) {
    const account = profile.user.accountProfile
    const displayLocation =
      [profile.address, profile.city].filter(Boolean).join(', ') ||
      account?.location ||
      'Location pending'
    const displayName = profile.nurseryName || account?.displayName || profile.user.username

    return {
      id: profile.id,
      userId: profile.userId,
      name: displayName,
      username: profile.user.username,
      image: this.profileMediaUrl(
        profile.user.id,
        account?.avatarUrl || profile.user.profilePicture
      ),
      initial: Array.from(displayName.trim())[0]?.toLocaleUpperCase('en') || 'N',
      description:
        profile.description ||
        account?.bio ||
        'A registered Plant Bud nursery ready to share plants and growing advice.',
      location: displayLocation,
      hours: profile.openingHours || 'Schedule pending',
      phone: profile.publicPhone || profile.user.phone,
      rating: Number(profile.ratingAverage || 0),
      reviews: Number(profile.ratingCount || 0),
      productsCount: profile.products.length,
      services: this.splitStoredList(profile.servicesOffered).slice(0, 3),
      searchServices: this.splitStoredList(profile.servicesOffered),
      isActive: profile.isActive,
      isFavorite: Boolean(options.isFavorite),
      isOwnProfile: Boolean(options.isOwnProfile),
      profileHref: `/users/${profile.user.username}`,
    }
  }

  private filterNurseries<T extends ReturnType<NurseriesController['formatNursery']>>(
    nurseries: T[],
    search: string
  ) {
    const normalizedSearch = this.normalizeSearch(search)
    if (!normalizedSearch) return nurseries

    return nurseries.filter((nursery) =>
      this.normalizeSearch(
        [
          nursery.name,
          nursery.username,
          nursery.description,
          nursery.location,
          nursery.hours,
          ...nursery.searchServices,
        ].join(' ')
      ).includes(normalizedSearch)
    )
  }

  private registeredMapLocation(profile: NurseryProfile): MapLocation | null {
    const account = profile.user.accountProfile
    if (profile.latitude === null || profile.longitude === null) return null

    const latitude = Number(profile.latitude)
    const longitude = Number(profile.longitude)
    if (
      !profile.address ||
      !profile.city ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null
    }

    const location = `${profile.address}, ${profile.city}`
    const image = this.profileMediaUrl(
      profile.user.id,
      account?.avatarUrl || profile.user.profilePicture
    )
    const name = profile.nurseryName || account?.displayName || profile.user.username

    return {
      id: `registered-${profile.id}`,
      name,
      location,
      hours: profile.openingHours || 'Schedule pending',
      image,
      initial: Array.from(name.trim())[0]?.toLocaleUpperCase('en') || 'N',
      latitude,
      longitude,
      profileHref: `/users/${profile.user.username}`,
      directionsHref: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    }
  }

  private splitStoredList(value?: string | null) {
    return String(value || '')
      .split(/[\n,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  private normalizeSearch(value: string) {
    return value
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  private async getFavoriteNurseryUserIds(userId: number) {
    const rows = await db
      .from('favorite_accounts')
      .join('users', 'users.id', 'favorite_accounts.favorite_user_id')
      .where('favorite_accounts.user_id', userId)
      .where('users.role', 'nursery')
      .select('favorite_accounts.favorite_user_id')

    return new Set(rows.map((row) => Number(row.favorite_user_id)).filter(Boolean))
  }

  private paginationHref(search: string, page: number) {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (page > 1) params.set('page', String(page))
    const query = params.toString()

    return query ? `/nurseries?${query}#nursery-accounts` : '/nurseries#nursery-accounts'
  }

  private profileMediaUrl(userId: number, url?: string | null) {
    if (!url) return null

    const legacySecureUrl = url.match(/^\/profile\/media\/(avatar|banner)\/([^/]+)$/)
    return legacySecureUrl
      ? `/profile/media/${userId}/${legacySecureUrl[1]}/${legacySecureUrl[2]}`
      : url
  }
}
