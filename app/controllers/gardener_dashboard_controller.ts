import type AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import ServiceRequest from '#models/service_request'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class GardenerDashboardController {
  async index({ auth, view }: HttpContext) {
    const user = auth.user!
    await user.load('accountProfile')

    const gardener = await GardenerProfile.firstOrCreate(
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
    await gardener.load('services', (query) => query.where('isActive', true).orderBy('id', 'asc'))

    const requests = await ServiceRequest.query()
      .where('gardenerProfileId', gardener.id)
      .whereNull('gardenerHiddenAt')
      .preload('client', (query) => query.preload('accountProfile'))
      .orderBy('scheduledFor', 'asc')
      .orderBy('createdAt', 'desc')

    const today = DateTime.now().startOf('day')
    const tomorrow = today.plus({ days: 1 })
    const monthStart = today.startOf('month')
    const activeRequests = requests.filter((item) =>
      ['pending', 'accepted', 'scheduled'].includes(item.status)
    )
    const upcoming = activeRequests
      .filter((item) => item.scheduledFor && item.scheduledFor >= today)
      .sort(
        (left, right) =>
          (left.scheduledFor?.toMillis() || 0) - (right.scheduledFor?.toMillis() || 0)
      )
      .slice(0, 6)
      .map((item) => this.formatRequest(item, today))
    const attention = requests
      .filter(
        (item) =>
          item.status === 'pending' ||
          (['accepted', 'scheduled'].includes(item.status) &&
            Boolean(item.clientConfirmedAt) &&
            !item.gardenerConfirmedAt)
      )
      .slice(0, 5)
      .map((item) => this.formatRequest(item, today))
    const recentCompleted = requests
      .filter((item) => item.status === 'completed')
      .sort(
        (left, right) => (right.completedAt?.toMillis() || 0) - (left.completedAt?.toMillis() || 0)
      )
      .slice(0, 4)
      .map((item) => this.formatRequest(item, today))
    const completedThisMonth = requests.filter(
      (item) => item.status === 'completed' && item.completedAt && item.completedAt >= monthStart
    )
    const monthlyRevenue = completedThisMonth.reduce(
      (total, item) => total + Number(item.releasedAmount || item.finalAmount || 0),
      0
    )
    const profileChecklist = [
      { label: 'Professional headline', complete: Boolean(gardener.headline?.trim()) },
      { label: 'Service area', complete: Boolean(gardener.serviceArea?.trim()) },
      { label: 'Availability schedule', complete: Boolean(gardener.availabilitySchedule?.trim()) },
      { label: 'Public contact', complete: Boolean(gardener.publicPhone?.trim()) },
      { label: 'Active services', complete: gardener.services.length > 0 },
    ]
    const completedProfileItems = profileChecklist.filter((item) => item.complete).length

    return view.render('pages/gardener/dashboard', {
      dashboardProfile: {
        displayName:
          user.accountProfile?.displayName || user.fullName || user.username || 'Gardener',
        avatarUrl: this.profileMediaUrl(
          user.id,
          user.accountProfile?.avatarUrl || user.profilePicture,
          user.accountProfile?.updatedAt || user.updatedAt
        ),
        avatarInitial: user.initials,
        planLabel: user.accountProfile?.planLabel || 'Free',
      },
      gardener: {
        isAvailable: gardener.isAvailable,
        headline: gardener.headline || 'Gardening professional',
        serviceArea: gardener.serviceArea || 'Service area pending',
        schedule: gardener.availabilitySchedule || 'Availability not configured',
        rating: Number(gardener.ratingAverage || 0).toFixed(1),
        reviews: Number(gardener.ratingCount || 0),
        services: gardener.services.map((service) => service.name),
      },
      stats: {
        pending: requests.filter((item) => item.status === 'pending').length,
        active: activeRequests.filter((item) => item.status !== 'pending').length,
        today: activeRequests.filter(
          (item) => item.scheduledFor && item.scheduledFor >= today && item.scheduledFor < tomorrow
        ).length,
        completedThisMonth: completedThisMonth.length,
        monthlyRevenue: this.money(monthlyRevenue),
      },
      upcoming,
      attention,
      recentCompleted,
      profileChecklist,
      profileProgress: Math.round((completedProfileItems / profileChecklist.length) * 100),
      todayLabel: DateTime.now().toFormat('cccc, LLLL d'),
    })
  }

  private formatRequest(serviceRequest: ServiceRequest, today: DateTime) {
    const profile: AccountProfile | null = serviceRequest.client.accountProfile || null
    const clientName =
      profile?.displayName ||
      serviceRequest.client.fullName ||
      serviceRequest.client.username ||
      'Plant Bud client'
    const scheduledFor = serviceRequest.scheduledFor
    const dateLabel = !scheduledFor
      ? 'Date pending'
      : scheduledFor.hasSame(today, 'day')
        ? 'Today'
        : scheduledFor.hasSame(today.plus({ days: 1 }), 'day')
          ? 'Tomorrow'
          : scheduledFor.toFormat('ccc, LLL d')

    return {
      id: serviceRequest.id,
      clientName,
      clientInitial: Array.from(clientName.trim())[0]?.toLocaleUpperCase('en') || 'P',
      clientPhoto: this.profileMediaUrl(
        serviceRequest.clientUserId,
        profile?.avatarUrl || serviceRequest.client.profilePicture,
        profile?.updatedAt || serviceRequest.client.updatedAt
      ),
      clientProfileHref: `/users/${serviceRequest.client.username}`,
      serviceType: this.serviceLabel(serviceRequest.serviceType),
      status: serviceRequest.status,
      statusLabel: this.statusLabel(serviceRequest),
      dateLabel,
      dateDetail: scheduledFor ? scheduledFor.toFormat('DD') : 'Coordinate with the client',
      arrivalWindow: this.arrivalWindow(serviceRequest),
      budget: this.money(Number(serviceRequest.budget || 0)),
      finalAmount: this.money(
        Number(serviceRequest.releasedAmount || serviceRequest.finalAmount || 0)
      ),
      address: serviceRequest.address || 'Location available in the service inbox',
      needsAttention:
        serviceRequest.status === 'pending' ||
        (Boolean(serviceRequest.clientConfirmedAt) && !serviceRequest.gardenerConfirmedAt),
    }
  }

  private statusLabel(serviceRequest: ServiceRequest) {
    if (serviceRequest.clientConfirmedAt && !serviceRequest.gardenerConfirmedAt) {
      return 'Client confirmed'
    }

    const labels: Record<string, string> = {
      pending: 'New request',
      accepted: 'Accepted',
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }

    return labels[serviceRequest.status] || serviceRequest.status
  }

  private serviceLabel(serviceType: string) {
    const labels: Record<string, string> = {
      maintenance: 'Garden maintenance',
      garden_design: 'Garden design',
      consultation: 'Plant consultation',
      delivery: 'Plant delivery',
      other: 'Custom service',
    }

    return labels[serviceType] || 'Garden service'
  }

  private arrivalWindow(serviceRequest: ServiceRequest) {
    if (!serviceRequest.arrivalWindowStart || !serviceRequest.arrivalWindowEnd) {
      return 'Time pending'
    }

    const start = DateTime.fromFormat(serviceRequest.arrivalWindowStart, 'HH:mm')
    const end = DateTime.fromFormat(serviceRequest.arrivalWindowEnd, 'HH:mm')
    return start.isValid && end.isValid
      ? `${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a')}`
      : `${serviceRequest.arrivalWindowStart} - ${serviceRequest.arrivalWindowEnd}`
  }

  private money(value: number) {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  private profileMediaUrl(userId: number, url?: string | null, updatedAt?: DateTime | null) {
    if (!url) return null

    const legacySecureUrl = url.match(/^\/profile\/media\/(avatar|banner)\/([^/]+)$/)
    const resolvedUrl = legacySecureUrl
      ? `/profile/media/${userId}/${legacySecureUrl[1]}/${legacySecureUrl[2]}`
      : url

    if (!updatedAt || !resolvedUrl.startsWith('/profile/media/')) return resolvedUrl

    const separator = resolvedUrl.includes('?') ? '&' : '?'
    return `${resolvedUrl}${separator}v=${updatedAt.toMillis()}`
  }
}
