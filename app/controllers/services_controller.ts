import GardenerProfile from '#models/gardener_profile'
import ServiceRequest from '#models/service_request'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

type ServiceType = 'maintenance' | 'garden_design' | 'consultation' | 'delivery' | 'other'

export default class ServicesController {
  async index({ view }: HttpContext) {
    const gardeners = await GardenerProfile.query()
      .where('isAvailable', true)
      .preload('user')
      .preload('services', (query) => query.where('isActive', true).orderBy('id', 'asc'))
      .orderBy('ratingAverage', 'desc')

    return view.render('pages/services/maintenance', {
      gardeners: gardeners.map((gardener) => this.formatGardener(gardener)),
    })
  }

  async show({ params, response, view, session }: HttpContext) {
    const gardener = await GardenerProfile.query()
      .where('id', params.id)
      .preload('user')
      .preload('services', (query) => query.where('isActive', true).orderBy('id', 'asc'))
      .first()

    if (!gardener) {
      return response.redirect('/maintenance')
    }

    return view.render('pages/request', {
      gardener: this.formatGardener(gardener),
      errors: session.flashMessages.get('errors') || {},
      old: session.flashMessages.get('old') || {},
    })
  }

  async store({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    const gardener = await GardenerProfile.find(params.id)

    if (!gardener) {
      session.flash('errors', { request: ['Gardener not found'] })
      return response.redirect('/maintenance')
    }

    const budget = this.parseBudget(request.input('budget'))
    const scheduledFor = this.parseDate(request.input('scheduled_for'))

    await ServiceRequest.create({
      clientUserId: user.id,
      gardenerProfileId: gardener.id,
      serviceType: this.normalizeServiceType(request.input('service_type')),
      status: 'pending',
      scheduledFor,
      address: this.cleanOptional(request.input('location')),
      notes: this.cleanOptional(request.input('notes')),
      budget,
    })

    session.flash('success', 'Your request was sent to the gardener.')
    return response.redirect('/requested')
  }

  private formatGardener(gardener: GardenerProfile) {
    const services = gardener.services.map((service) => service.name)
    const firstService = gardener.services[0]

    return {
      id: gardener.id,
      name: gardener.user.fullName,
      photo: gardener.user.profilePicture || '/resources/images/services/profile2.png',
      specialty: gardener.headline || firstService?.name || 'Plant maintenance',
      experience: `${gardener.experienceYears || 0} years of experience`,
      rating: Number(gardener.ratingAverage || 0).toFixed(1),
      reviews: String(gardener.ratingCount || 0),
      location: gardener.serviceArea || 'San Salvador',
      phone: gardener.publicPhone || gardener.user.phone || 'Not available',
      email: gardener.user.email,
      services,
      schedule: gardener.availabilitySchedule || 'Available by appointment',
      hours: gardener.paymentMethods || 'Payment details on request',
      bio: gardener.bio || 'Ready to help with practical plant care and garden maintenance.',
      serviceType: this.serviceTypeFor(gardener.headline || firstService?.name || ''),
    }
  }

  private parseBudget(value: unknown) {
    const amount = Number(String(value || '').replace(/[^0-9.]/g, ''))
    return Number.isFinite(amount) && amount > 0 ? amount : null
  }

  private parseDate(value: unknown) {
    const date = String(value || '').trim()
    if (!date) return null

    const parsed = DateTime.fromISO(date)
    return parsed.isValid ? parsed : null
  }

  private cleanOptional(value: unknown) {
    const clean = String(value || '').trim()
    return clean || null
  }

  private normalizeServiceType(value: unknown): ServiceType {
    const normalized = String(value || '').trim()
    const allowed: ServiceType[] = ['maintenance', 'garden_design', 'consultation', 'delivery', 'other']
    return allowed.includes(normalized as ServiceType) ? (normalized as ServiceType) : 'maintenance'
  }

  private serviceTypeFor(value: string): ServiceType {
    const normalized = value.toLowerCase()
    if (normalized.includes('garden')) return 'garden_design'
    if (normalized.includes('irrigation')) return 'consultation'
    if (normalized.includes('delivery')) return 'delivery'
    return 'maintenance'
  }
}
