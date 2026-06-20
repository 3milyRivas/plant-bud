import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import ServiceRequest from '#models/service_request'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

type ServiceType = 'maintenance' | 'garden_design' | 'consultation' | 'delivery' | 'other'
type RequestAction = 'accept' | 'schedule' | 'confirm_complete' | 'cancel'
type ScheduleWindow = { days: number[]; start: string; end: string }
const REWARD_POINTS_PER_DOLLAR = 50
const POINTS_PER_DISCOUNT_STEP = 500
const DISCOUNT_PERCENT_PER_STEP = 10
const MAX_DISCOUNT_STEPS = 2
const MIN_REQUEST_BUDGET = 5
const MAX_REQUEST_BUDGET = 1_000_000
const MAX_REQUEST_DATE_YEARS = 2
const MIN_LOCATION_LENGTH = 8
const MIN_DESCRIPTION_LENGTH = 20
const MIN_RESPONSE_LENGTH = 10
const DEMO_CARD_NUMBER = '0000000000000000'
type FormattedGardener = {
  name: string
  username: string
  photo: string | null
  initial: string
  specialty: string
  location: string
  bio: string
  services: string[]
  profileHref: string
  isAvailable: boolean
}

export default class ServicesController {
  async index({ auth, request, view }: HttpContext) {
    const user = auth.user
    const search = String(request.input('q') || '').trim()
    const gardeners = await GardenerProfile.query()
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('services', (query) => query.where('isActive', true).orderBy('id', 'asc'))
      .orderBy('ratingAverage', 'desc')

    const favoriteGardenerUserIds = user
      ? await this.getFavoriteGardenerUserIds(user.id)
      : new Set<number>()
    const formattedGardeners = gardeners.map((gardener) =>
      this.formatGardener(gardener, {
        isFavorite: favoriteGardenerUserIds.has(gardener.userId),
      })
    )
    const filteredGardeners = this.filterGardeners(formattedGardeners, search)
    const favoriteGardeners = formattedGardeners
      .filter((gardener) => gardener.isFavorite)
      .slice(0, 4)
    const featuredGardeners = formattedGardeners
      .filter(
        (gardener) =>
          gardener.isAvailable && (gardener.ratingScore >= 4 || gardener.reviewCount > 0)
      )
      .slice(0, 4)

    return view.render('pages/services/maintenance', {
      gardeners: filteredGardeners,
      favoriteGardeners,
      featuredGardeners: featuredGardeners.length
        ? featuredGardeners
        : formattedGardeners.slice(0, 4),
      search,
      stats: {
        available: formattedGardeners.filter((gardener) => gardener.isAvailable).length,
        total: formattedGardeners.length,
        featured: featuredGardeners.length || Math.min(formattedGardeners.length, 4),
        favorites: favoriteGardeners.length,
      },
    })
  }

  async suggestions({ request, response }: HttpContext) {
    const search = String(request.input('q') || '').trim()

    if (search.length < 2) {
      return response.json({ gardeners: [] })
    }

    const gardeners = await GardenerProfile.query()
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('services', (query) => query.where('isActive', true).orderBy('id', 'asc'))
      .orderBy('ratingAverage', 'desc')

    const results = this.filterGardeners(
      gardeners.map((gardener) => this.formatGardener(gardener)),
      search
    )
      .slice(0, 6)
      .map((gardener) => ({
        name: gardener.name,
        username: gardener.username,
        photo: gardener.photo,
        specialty: gardener.specialty,
        location: gardener.location,
        isAvailable: gardener.isAvailable,
        href: gardener.profileHref,
      }))

    return response.json({ gardeners: results })
  }

  async show({ auth, params, response, view, session }: HttpContext) {
    if (auth.user) {
      await auth.user.load('accountProfile')
    }

    const gardener = await GardenerProfile.query()
      .where('id', params.id)
      .preload('user', (query) => query.preload('accountProfile'))
      .preload('services', (query) => query.where('isActive', true).orderBy('id', 'asc'))
      .first()

    if (!gardener) {
      return response.redirect('/maintenance')
    }

    return view.render('pages/request', {
      gardener: this.formatGardener(gardener),
      arrivalWindowDefaults: this.arrivalWindowDefaults(gardener.availabilitySchedule),
      viewerAvatarUrl: auth.user
        ? this.profileMediaUrl(
            auth.user.id,
            auth.user.accountProfile?.avatarUrl || auth.user.profilePicture,
            auth.user.accountProfile?.updatedAt || auth.user.updatedAt
          )
        : null,
      paymentMethods: this.gardenerPaymentMethods(gardener.paymentMethods),
      rewardPoints: auth.user?.accountProfile?.rewardPoints || 0,
      discountOptions: this.discountOptions(auth.user?.accountProfile?.rewardPoints || 0),
      errors: session.flashMessages.get('errors') || {},
      old: session.flashMessages.get('old') || {},
      requestDateMin: DateTime.now().toISODate(),
      requestDateMax: DateTime.now().plus({ years: MAX_REQUEST_DATE_YEARS }).toISODate(),
    })
  }

  async requested({ auth, view }: HttpContext) {
    const user = auth.user!
    await user.load('accountProfile')

    if (user.role !== 'gardener') {
      const serviceRequests = await ServiceRequest.query()
        .where('clientUserId', user.id)
        .whereNull('clientHiddenAt')
        .preload('gardenerProfile', (query) => {
          query.preload('user', (userQuery) => userQuery.preload('accountProfile'))
          query.preload('services', (serviceQuery) =>
            serviceQuery.where('isActive', true).orderBy('id', 'asc')
          )
        })
        .orderBy('createdAt', 'desc')
      const requests = serviceRequests.map((serviceRequest) =>
        this.formatSentServiceRequest(serviceRequest, user.accountProfile)
      )

      return view.render('pages/requested', {
        requests,
        mode: 'sent',
        viewerAvatarUrl: this.profileMediaUrl(
          user.id,
          user.accountProfile?.avatarUrl || user.profilePicture,
          user.accountProfile?.updatedAt || user.updatedAt
        ),
        rewardPoints: user.accountProfile?.rewardPoints || 0,
        requestDateMin: DateTime.now().toISODate(),
        requestDateMax: DateTime.now().plus({ years: MAX_REQUEST_DATE_YEARS }).toISODate(),
        stats: {
          pending: requests.filter((item) => item.status === 'pending').length,
          active: requests.filter((item) => ['accepted', 'scheduled'].includes(item.status)).length,
          awaiting: requests.filter((item) => item.confirmationPending).length,
          verified: requests.filter((item) => item.isVerified).length,
        },
      })
    }

    const gardener = await GardenerProfile.query().where('userId', user.id).first()
    const serviceRequests = await ServiceRequest.query()
      .if(gardener, (query) => query.where('gardenerProfileId', gardener!.id))
      .if(!gardener, (query) => query.whereRaw('1 = 0'))
      .whereNull('gardenerHiddenAt')
      .preload('client', (query) => query.preload('accountProfile'))
      .orderBy('createdAt', 'desc')

    const requests = serviceRequests.map((serviceRequest) =>
      this.formatServiceRequest(serviceRequest)
    )

    return view.render('pages/requested', {
      requests,
      mode: 'received',
      viewerAvatarUrl: this.profileMediaUrl(
        user.id,
        user.accountProfile?.avatarUrl || user.profilePicture,
        user.accountProfile?.updatedAt || user.updatedAt
      ),
      rewardPoints: user.accountProfile?.rewardPoints || 0,
      requestDateMin: DateTime.now().toISODate(),
      requestDateMax: DateTime.now().plus({ years: MAX_REQUEST_DATE_YEARS }).toISODate(),
      stats: {
        pending: requests.filter((item) => item.status === 'pending').length,
        active: requests.filter((item) => ['accepted', 'scheduled'].includes(item.status)).length,
        awaiting: requests.filter((item) => item.confirmationPending).length,
        verified: requests.filter((item) => item.isVerified).length,
      },
    })
  }

  async store({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    if (user.role !== 'client') {
      session.flash('errors', { request: ['Only client accounts can send service requests.'] })
      return response.redirect('/maintenance')
    }

    const gardener = await GardenerProfile.query()
      .where('id', params.id)
      .where('isAvailable', true)
      .first()

    if (!gardener) {
      session.flash('errors', { request: ['Gardener not found'] })
      return response.redirect('/maintenance')
    }

    const budget = this.parseBudget(request.input('budget'))
    const scheduledFor = this.parseRequestDate(request.input('scheduled_for'))
    const arrivalWindowStart = this.parseTime(request.input('arrival_window_start'))
    const arrivalWindowEnd = this.parseTime(request.input('arrival_window_end'))
    const address = this.cleanOptional(request.input('location'))
    const notes = this.cleanOptional(request.input('notes'))
    const serviceType = this.parseServiceType(request.input('service_type'))
    const latitude = this.parseCoordinate(request.input('latitude'), -90, 90)
    const longitude = this.parseCoordinate(request.input('longitude'), -180, 180)
    const intentConfirmed = String(request.input('intent_confirmed') || '') === '1'
    const allowedPaymentMethods = this.gardenerPaymentMethods(gardener.paymentMethods)
    const paymentMethod = this.parsePaymentMethod(request.input('payment_method'))
    const payment =
      paymentMethod === 'card'
        ? { brand: 'Demo Card', lastFour: DEMO_CARD_NUMBER.slice(-4) }
        : paymentMethod === 'paypal'
          ? { brand: 'PayPal', lastFour: null }
          : paymentMethod === 'cash'
            ? { brand: 'Cash', lastFour: null }
            : null
    const paymentIsAllowed = paymentMethod
      ? allowedPaymentMethods.some((method) => method.value === paymentMethod)
      : false
    const discountSteps = this.parseDiscountSteps(request.input('discount_steps'))
    const discountRequested = discountSteps > 0
    const validationErrors: string[] = []

    if (!budget) validationErrors.push('Enter a budget of at least $5.00.')
    if (!address || address.length < MIN_LOCATION_LENGTH || address.length > 255) {
      validationErrors.push('Enter a service location of at least 8 characters.')
    }
    if (latitude === null || longitude === null) {
      validationErrors.push('Select the exact service location on the map.')
    }
    if (!notes || notes.length < MIN_DESCRIPTION_LENGTH || notes.length > 2000) {
      validationErrors.push('Describe the requested work using at least 20 characters.')
    }
    if (!serviceType) validationErrors.push('Choose a valid service type.')
    if (!arrivalWindowStart || !arrivalWindowEnd || arrivalWindowStart >= arrivalWindowEnd) {
      validationErrors.push('Choose a valid arrival time range with an end time after the start.')
    } else if (
      scheduledFor &&
      !this.isWithinGardenerSchedule(
        scheduledFor,
        arrivalWindowStart,
        arrivalWindowEnd,
        gardener.availabilitySchedule
      )
    ) {
      validationErrors.push(
        `Choose an arrival range within the gardener's published availability: ${gardener.availabilitySchedule || 'available by appointment'}.`
      )
    }
    if (!intentConfirmed) validationErrors.push('Confirm that this is a genuine service request.')
    if (!paymentMethod || !paymentIsAllowed) {
      validationErrors.push('Choose one of the payment methods accepted by this gardener.')
    } else if (!payment) {
      validationErrors.push(
        paymentMethod === 'card'
          ? 'Check the cardholder name, card number, expiration date, and security code.'
          : 'Enter a valid PayPal email address.'
      )
    }
    if (
      discountSteps < 0 ||
      (discountRequested && (!paymentMethod || !['card', 'paypal'].includes(paymentMethod)))
    ) {
      validationErrors.push('Point discounts can only be used with Card or PayPal.')
    }

    if (
      validationErrors.length ||
      !budget ||
      !serviceType ||
      !paymentMethod ||
      !payment ||
      !arrivalWindowStart ||
      !arrivalWindowEnd
    ) {
      session.flash('errors', {
        request: validationErrors,
      })
      session.flash('old', this.safeRequestOld(request.all()))
      return response.redirect().back()
    }

    if (!scheduledFor) {
      session.flash('errors', {
        request: [
          `Choose a valid service date between today and ${DateTime.now().plus({ years: MAX_REQUEST_DATE_YEARS }).toFormat('DDD')}.`,
        ],
      })
      session.flash('old', this.safeRequestOld(request.all()))
      return response.redirect().back()
    }

    const pointsToRedeem = discountSteps * POINTS_PER_DISCOUNT_STEP
    const discountPercent = discountSteps * DISCOUNT_PERCENT_PER_STEP
    const discountAmount = this.discountedAmount(budget, discountPercent)
    const amountToHold = Math.max(0, Math.round((budget - discountAmount) * 100) / 100)
    const creationResult = await db.transaction(async (trx) => {
      const activeRequest = await ServiceRequest.query({ client: trx })
        .where('clientUserId', user.id)
        .where('gardenerProfileId', gardener.id)
        .whereIn('status', ['pending', 'accepted', 'scheduled'])
        .first()

      if (activeRequest) {
        return {
          ok: false,
          message:
            'You already have an active request with this gardener. Track it here before sending another.',
        }
      }

      const clientProfile = await AccountProfile.query({ client: trx })
        .where('userId', user.id)
        .forUpdate()
        .first()

      if (pointsToRedeem > Number(clientProfile?.rewardPoints || 0)) {
        return {
          ok: false,
          message: 'You do not have enough reward points for that discount.',
        }
      }

      if (pointsToRedeem > 0 && clientProfile) {
        clientProfile.useTransaction(trx)
        clientProfile.rewardPoints = Number(clientProfile.rewardPoints || 0) - pointsToRedeem
        await clientProfile.save()
      }

      const serviceRequest = new ServiceRequest()
      serviceRequest.useTransaction(trx)
      serviceRequest.merge({
        clientUserId: user.id,
        gardenerProfileId: gardener.id,
        serviceType,
        status: 'pending',
        scheduledFor,
        arrivalWindowStart,
        arrivalWindowEnd,
        address,
        latitude,
        longitude,
        googlePlaceId: null,
        notes,
        budget,
        paymentStatus: paymentMethod === 'cash' ? null : 'held',
        paymentMethod,
        paymentBrand: payment.brand,
        paymentLastFour: payment.lastFour,
        heldAmount: paymentMethod === 'cash' ? 0 : amountToHold,
        releasedAmount: 0,
        refundedAmount: 0,
        pointsRedeemed: pointsToRedeem,
        discountPercent,
        discountAmount,
        paymentHeldAt: paymentMethod === 'cash' ? null : DateTime.now(),
      })
      await serviceRequest.save()

      return { ok: true, message: '' }
    })

    if (!creationResult.ok) {
      session.flash('requestError', creationResult.message)
      session.flash('old', this.safeRequestOld(request.all()))
      return response.redirect().back()
    }

    session.flash(
      'success',
      paymentMethod === 'cash'
        ? 'Your request was sent. Payment will be made in cash after the service.'
        : pointsToRedeem > 0
          ? `Your request was sent with a ${discountPercent}% points discount and the reduced payment is securely held.`
          : 'Your request was sent and the payment is securely held.'
    )
    return response.redirect('/requested')
  }

  async updateRequest({ auth, params, request, response, session }: HttpContext) {
    const user = auth.user!
    const action = String(request.input('action') || '') as RequestAction

    if (!['accept', 'schedule', 'confirm_complete', 'cancel'].includes(action)) {
      session.flash('requestError', 'That request action is not available.')
      return response.redirect('/requested')
    }

    if (!['client', 'gardener'].includes(user.role)) {
      session.flash('requestError', 'Service requests are available to clients and gardeners.')
      return response.redirect('/requested')
    }

    if (user.role === 'gardener') {
      return this.updateRequestAsGardener({
        userId: user.id,
        requestId: Number(params.id),
        action,
        responseText: this.cleanOptional(request.input('gardener_response')),
        scheduledFor: this.parseRequestDate(request.input('scheduled_for')),
        finalAmount: this.parseBudget(request.input('final_amount')),
        response,
        session,
      })
    }

    return this.updateRequestAsClient({
      userId: user.id,
      requestId: Number(params.id),
      action,
      response,
      session,
    })
  }

  async dismissCompletedRequest({ auth, params, response, session }: HttpContext) {
    const user = auth.user!
    const serviceRequest = await ServiceRequest.find(Number(params.id))

    if (!serviceRequest || serviceRequest.status !== 'completed' || !serviceRequest.verifiedAt) {
      session.flash('requestError', 'Only completed requests can be removed from this list.')
      return response.redirect('/requested')
    }

    if (user.role === 'client' && serviceRequest.clientUserId === user.id) {
      serviceRequest.clientHiddenAt = DateTime.now()
    } else if (user.role === 'gardener') {
      const gardener = await GardenerProfile.query().where('userId', user.id).first()
      if (!gardener || serviceRequest.gardenerProfileId !== gardener.id) {
        session.flash('requestError', 'That request does not belong to your account.')
        return response.redirect('/requested')
      }
      serviceRequest.gardenerHiddenAt = DateTime.now()
    } else {
      session.flash('requestError', 'That request does not belong to your account.')
      return response.redirect('/requested')
    }

    await serviceRequest.save()
    session.flash('success', 'Completed request removed from your list.')
    return response.redirect('/requested')
  }

  private async updateRequestAsGardener(input: {
    userId: number
    requestId: number
    action: RequestAction
    responseText: string | null
    scheduledFor: DateTime | null
    finalAmount: number | null
    response: HttpContext['response']
    session: HttpContext['session']
  }) {
    const result = await db.transaction(async (trx) => {
      const gardener = await GardenerProfile.query({ client: trx })
        .where('userId', input.userId)
        .first()

      if (!gardener) {
        return { ok: false, message: 'Your gardener profile is not available.' }
      }

      const serviceRequest = await ServiceRequest.query({ client: trx })
        .where('id', input.requestId)
        .where('gardenerProfileId', gardener.id)
        .forUpdate()
        .first()

      if (!serviceRequest) {
        return { ok: false, message: 'That request does not belong to your profile.' }
      }

      const currentStatus = serviceRequest.status
      const now = DateTime.now()

      if (input.action === 'accept') {
        if (currentStatus !== 'pending') {
          return { ok: false, message: 'Only pending requests can be accepted.' }
        }
        if (!this.hasRequiredResponse(input.responseText)) {
          return {
            ok: false,
            message: 'Write a response of at least 10 characters before accepting.',
          }
        }
        serviceRequest.status = 'accepted'
      } else if (input.action === 'schedule') {
        if (!['pending', 'accepted'].includes(currentStatus)) {
          return { ok: false, message: 'Only pending or accepted requests can be scheduled.' }
        }
        if (serviceRequest.clientConfirmedAt || serviceRequest.gardenerConfirmedAt) {
          return { ok: false, message: 'A completed-service confirmation is already pending.' }
        }
        if (!input.scheduledFor || input.scheduledFor < now.startOf('day')) {
          return { ok: false, message: 'Choose a valid service date within the next two years.' }
        }
        if (
          serviceRequest.arrivalWindowStart &&
          serviceRequest.arrivalWindowEnd &&
          !this.isWithinGardenerSchedule(
            input.scheduledFor,
            serviceRequest.arrivalWindowStart,
            serviceRequest.arrivalWindowEnd,
            gardener.availabilitySchedule
          )
        ) {
          return {
            ok: false,
            message: `Choose a date when the requested arrival range fits your published availability: ${gardener.availabilitySchedule || 'available by appointment'}.`,
          }
        }
        if (!this.hasRequiredResponse(input.responseText)) {
          return { ok: false, message: 'Add scheduling instructions of at least 10 characters.' }
        }
        serviceRequest.status = 'scheduled'
        serviceRequest.scheduledFor = input.scheduledFor
      } else if (input.action === 'confirm_complete') {
        if (!['accepted', 'scheduled'].includes(currentStatus)) {
          return { ok: false, message: 'Accept or schedule the request before confirming it.' }
        }
        if (serviceRequest.gardenerConfirmedAt) {
          return { ok: false, message: 'You already confirmed this service as completed.' }
        }
        if (!input.finalAmount) {
          return { ok: false, message: 'Enter the final amount charged for this service.' }
        }
        if (
          serviceRequest.paymentMethod !== 'cash' &&
          input.finalAmount > Number(serviceRequest.budget || 0)
        ) {
          return {
            ok: false,
            message: 'The final amount cannot exceed the original request budget.',
          }
        }
        if (!this.hasRequiredResponse(input.responseText)) {
          return { ok: false, message: 'Add a work summary of at least 10 characters.' }
        }
        serviceRequest.finalAmount = input.finalAmount
        serviceRequest.gardenerConfirmedAt = now
      } else if (input.action === 'cancel') {
        if (!['pending', 'accepted', 'scheduled'].includes(currentStatus)) {
          return { ok: false, message: 'This request can no longer be cancelled.' }
        }
        if (serviceRequest.clientConfirmedAt || serviceRequest.gardenerConfirmedAt) {
          return { ok: false, message: 'A confirmed service can no longer be cancelled.' }
        }
        serviceRequest.status = 'cancelled'
        this.refundHeldPayment(serviceRequest, now)
        await this.refundRedeemedPoints(serviceRequest, trx, now)
        this.clearPrivateLocation(serviceRequest, now)
      }

      if (input.responseText) {
        serviceRequest.gardenerResponse = input.responseText
      }

      serviceRequest.useTransaction(trx)
      await serviceRequest.save()

      if (input.action === 'confirm_complete') {
        const finalized = await this.finalizeConfirmedRequest(serviceRequest, trx)

        return {
          ok: true,
          message: finalized
            ? serviceRequest.paymentMethod === 'cash'
              ? 'Both parties confirmed the service. The cash payment was verified.'
              : 'Both parties confirmed the service. The held payment was released.'
            : 'Service completion confirmed. Waiting for client confirmation.',
        }
      }

      const messages: Record<Exclude<RequestAction, 'confirm_complete'>, string> = {
        accept: 'Request accepted.',
        schedule: 'Service date updated.',
        cancel: 'Request cancelled.',
      }

      return {
        ok: true,
        message: messages[input.action as Exclude<RequestAction, 'confirm_complete'>],
      }
    })

    input.session.flash(result.ok ? 'success' : 'requestError', result.message)
    return input.response.redirect('/requested')
  }

  private async updateRequestAsClient(input: {
    userId: number
    requestId: number
    action: RequestAction
    response: HttpContext['response']
    session: HttpContext['session']
  }) {
    const result = await db.transaction(async (trx) => {
      const serviceRequest = await ServiceRequest.query({ client: trx })
        .where('id', input.requestId)
        .where('clientUserId', input.userId)
        .forUpdate()
        .first()

      if (!serviceRequest) {
        return { ok: false, message: 'That request does not belong to your account.' }
      }

      if (input.action === 'cancel') {
        if (!['pending', 'accepted'].includes(serviceRequest.status)) {
          return { ok: false, message: 'This request can no longer be cancelled.' }
        }
        if (serviceRequest.clientConfirmedAt || serviceRequest.gardenerConfirmedAt) {
          return { ok: false, message: 'A confirmed service can no longer be cancelled.' }
        }

        const now = DateTime.now()
        serviceRequest.status = 'cancelled'
        this.refundHeldPayment(serviceRequest, now)
        await this.refundRedeemedPoints(serviceRequest, trx, now)
        this.clearPrivateLocation(serviceRequest, now)
        serviceRequest.useTransaction(trx)
        await serviceRequest.save()
        return { ok: true, message: 'Request cancelled.' }
      }

      if (input.action !== 'confirm_complete') {
        return { ok: false, message: 'That action is only available to the gardener.' }
      }

      if (!['accepted', 'scheduled'].includes(serviceRequest.status)) {
        return { ok: false, message: 'The request must be accepted before confirming completion.' }
      }

      if (serviceRequest.clientConfirmedAt) {
        return { ok: false, message: 'You already confirmed this service as completed.' }
      }

      serviceRequest.useTransaction(trx)
      serviceRequest.clientConfirmedAt = DateTime.now()
      await serviceRequest.save()

      const finalized = await this.finalizeConfirmedRequest(serviceRequest, trx)

      return {
        ok: true,
        message: finalized
          ? serviceRequest.rewardPointsAwarded > 0
            ? `Both parties confirmed the service. ${serviceRequest.rewardPointsAwarded.toLocaleString('en-US')} reward points were added.`
            : serviceRequest.paymentMethod === 'cash'
              ? 'Both parties confirmed the service. The cash payment was verified.'
              : 'Both parties confirmed the service. The held payment was released.'
          : 'Service completion confirmed. Waiting for gardener confirmation.',
      }
    })

    input.session.flash(result.ok ? 'success' : 'requestError', result.message)
    return input.response.redirect('/requested')
  }

  private async finalizeConfirmedRequest(serviceRequest: ServiceRequest, trx: any) {
    if (
      !serviceRequest.clientConfirmedAt ||
      !serviceRequest.gardenerConfirmedAt ||
      serviceRequest.verifiedAt
    ) {
      return false
    }

    const finalAmount = Number(serviceRequest.finalAmount || 0)
    if (finalAmount <= 0) return false
    const isCashPayment = serviceRequest.paymentMethod === 'cash'
    if (!isCashPayment && serviceRequest.paymentStatus !== 'held') {
      return false
    }
    if (!isCashPayment && finalAmount > Number(serviceRequest.budget || 0)) {
      return false
    }
    const discountAmount = this.discountedAmount(finalAmount, serviceRequest.discountPercent)
    const payableAmount = isCashPayment
      ? finalAmount
      : Math.max(0, Math.round((finalAmount - discountAmount) * 100) / 100)
    if (!isCashPayment && payableAmount > Number(serviceRequest.heldAmount || 0)) return false

    let profile = await AccountProfile.query({ client: trx })
      .where('userId', serviceRequest.clientUserId)
      .first()

    if (!profile) {
      profile = new AccountProfile()
      profile.useTransaction(trx)
      profile.merge({
        userId: serviceRequest.clientUserId,
        displayName: 'Plant Bud member',
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      })
      await profile.save()
    }

    const rewardsEligible = ['card', 'paypal'].includes(serviceRequest.paymentMethod || '')
    const rewardPoints =
      profile.subscriptionPlan === 'premium' && rewardsEligible
        ? Math.max(0, Math.round(payableAmount * REWARD_POINTS_PER_DOLLAR))
        : 0
    const now = DateTime.now()

    if (rewardPoints > 0) {
      profile.useTransaction(trx)
      profile.rewardPoints = Number(profile.rewardPoints || 0) + rewardPoints
      await profile.save()
    }

    serviceRequest.useTransaction(trx)
    serviceRequest.status = 'completed'
    serviceRequest.completedAt = now
    serviceRequest.verifiedAt = now
    serviceRequest.rewardPointsAwarded = rewardPoints
    serviceRequest.rewardAwardedAt = rewardPoints > 0 ? now : null
    serviceRequest.paymentStatus = 'released'
    serviceRequest.discountAmount = discountAmount
    serviceRequest.releasedAmount = payableAmount
    serviceRequest.refundedAmount = isCashPayment
      ? 0
      : Math.max(
          0,
          Math.round((Number(serviceRequest.heldAmount || 0) - payableAmount) * 100) / 100
        )
    serviceRequest.paymentReleasedAt = now
    serviceRequest.paymentRefundedAt = Number(serviceRequest.refundedAmount || 0) > 0 ? now : null
    this.clearPrivateLocation(serviceRequest, now)
    await serviceRequest.save()

    return true
  }

  private formatGardener(gardener: GardenerProfile, options: { isFavorite?: boolean } = {}) {
    const services = gardener.services.map((service) => service.name)
    const firstService = gardener.services[0]
    const profile = gardener.user.accountProfile || null
    const displayName = profile?.displayName || gardener.user.fullName || gardener.user.username
    const ratingScore = Number(gardener.ratingAverage || 0)
    const reviewCount = Number(gardener.ratingCount || 0)

    return {
      id: gardener.id,
      userId: gardener.userId,
      username: gardener.user.username,
      name: displayName,
      photo: this.profileMediaUrl(
        gardener.userId,
        profile?.avatarUrl || gardener.user.profilePicture,
        profile?.updatedAt || gardener.user.updatedAt
      ),
      initial: this.profileInitial(displayName),
      specialty: gardener.headline || firstService?.name || 'Plant maintenance',
      experience: `${gardener.experienceYears || 0} years of experience`,
      rating: ratingScore.toFixed(1),
      ratingScore,
      reviews: String(reviewCount),
      reviewCount,
      location: gardener.serviceArea || 'San Salvador',
      phone: gardener.publicPhone || gardener.user.phone || 'Not available',
      email: gardener.user.email,
      services,
      schedule: gardener.availabilitySchedule || 'Available by appointment',
      hours: gardener.paymentMethods || 'Payment details on request',
      bio: gardener.bio || 'Ready to help with practical plant care and garden maintenance.',
      serviceType: this.serviceTypeFor(gardener.headline || firstService?.name || ''),
      profileHref: `/users/${gardener.user.username}`,
      isAvailable: gardener.isAvailable,
      isFavorite: Boolean(options.isFavorite),
      isPremium: profile?.isPremium || false,
    }
  }

  private filterGardeners(gardeners: FormattedGardener[], search: string) {
    const normalized = search.toLowerCase()

    if (!normalized) return gardeners

    return gardeners.filter((gardener) =>
      [
        gardener.name,
        gardener.username,
        gardener.specialty,
        gardener.location,
        gardener.bio,
        gardener.services.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
  }

  private async getFavoriteGardenerUserIds(userId: number) {
    const rows = await db
      .from('favorite_accounts')
      .join('users', 'users.id', 'favorite_accounts.favorite_user_id')
      .where('favorite_accounts.user_id', userId)
      .where('users.role', 'gardener')
      .select('favorite_accounts.favorite_user_id')

    return new Set(rows.map((row) => Number(row.favorite_user_id)).filter(Boolean))
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

  private parseBudget(value: unknown) {
    const amount = Number(String(value || '').replace(/[^0-9.]/g, ''))
    return Number.isFinite(amount) && amount >= MIN_REQUEST_BUDGET && amount <= MAX_REQUEST_BUDGET
      ? Math.round(amount * 100) / 100
      : null
  }

  private parseDiscountSteps(value: unknown) {
    const steps = Number.parseInt(String(value || '0'), 10)
    return Number.isInteger(steps) && steps >= 0 && steps <= MAX_DISCOUNT_STEPS ? steps : -1
  }

  private discountOptions(rewardPoints: number) {
    const availableSteps = Math.min(
      MAX_DISCOUNT_STEPS,
      Math.floor(Math.max(0, Number(rewardPoints || 0)) / POINTS_PER_DISCOUNT_STEP)
    )

    return Array.from({ length: availableSteps }, (_, index) => {
      const steps = index + 1
      return {
        steps,
        points: steps * POINTS_PER_DISCOUNT_STEP,
        percent: steps * DISCOUNT_PERCENT_PER_STEP,
      }
    })
  }

  private discountedAmount(amount: number, discountPercent: number) {
    const safePercent = Math.min(
      MAX_DISCOUNT_STEPS * DISCOUNT_PERCENT_PER_STEP,
      Math.max(0, Number(discountPercent || 0))
    )
    return Math.round(amount * (safePercent / 100) * 100) / 100
  }

  private parseRequestDate(value: unknown) {
    const date = String(value || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

    const parsed = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'local' }).startOf('day')
    const minimum = DateTime.now().startOf('day')
    const maximum = minimum.plus({ years: MAX_REQUEST_DATE_YEARS }).endOf('day')

    return parsed.isValid && parsed >= minimum && parsed <= maximum ? parsed : null
  }

  private parseTime(value: unknown) {
    const time = String(value || '').trim()
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null
    return time
  }

  private arrivalWindowDefaults(schedule: string | null) {
    const firstWindow = this.parseGardenerSchedule(schedule)[0]
    if (!firstWindow) return { start: '08:00', end: '10:00' }

    const startMinutes = this.timeToMinutes(firstWindow.start)
    const endMinutes = this.timeToMinutes(firstWindow.end)
    const suggestedEnd = Math.min(endMinutes, startMinutes + 120)

    return {
      start: firstWindow.start,
      end: this.minutesToTime(suggestedEnd > startMinutes ? suggestedEnd : endMinutes),
    }
  }

  private isWithinGardenerSchedule(
    date: DateTime,
    requestedStart: string,
    requestedEnd: string,
    schedule: string | null
  ) {
    const windows = this.parseGardenerSchedule(schedule)
    if (!windows.length) return true

    const weekday = date.weekday
    const startMinutes = this.timeToMinutes(requestedStart)
    const endMinutes = this.timeToMinutes(requestedEnd)

    return windows.some(
      (window) =>
        window.days.includes(weekday) &&
        startMinutes >= this.timeToMinutes(window.start) &&
        endMinutes <= this.timeToMinutes(window.end)
    )
  }

  private parseGardenerSchedule(schedule: string | null): ScheduleWindow[] {
    if (!schedule) return []

    return schedule
      .split(/\n+/)
      .map((line) => {
        const times = Array.from(line.matchAll(/\b(\d{1,2})(?::(\d{2}))\s*(AM|PM)?\b/gi))
          .map((match) => this.normalizeScheduleTime(match[1], match[2], match[3]))
          .filter((time): time is string => Boolean(time))
          .slice(0, 2)
        const days = this.parseScheduleDays(line)

        return days.length && times.length === 2 ? { days, start: times[0], end: times[1] } : null
      })
      .filter((window): window is ScheduleWindow => Boolean(window))
  }

  private parseScheduleDays(value: string) {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    const dayOrder = [1, 2, 3, 4, 5, 6, 7]
    const aliases: Array<[number, string[]]> = [
      [1, ['lunes', 'monday', 'mon', 'lun']],
      [2, ['martes', 'tuesday', 'tue', 'mar']],
      [3, ['miercoles', 'wednesday', 'wed', 'mie']],
      [4, ['jueves', 'thursday', 'thu', 'jue']],
      [5, ['viernes', 'friday', 'fri', 'vie']],
      [6, ['sabado', 'saturday', 'sat', 'sab']],
      [7, ['domingo', 'sunday', 'sun', 'dom']],
    ]

    if (/\b(toda la semana|every day|daily|all week)\b/.test(normalized)) return dayOrder
    if (/\b(fin de semana|weekend)\b/.test(normalized)) return [6, 7]
    if (/\b(lunes a viernes|lun-vie|mon-fri|monday to friday)\b/.test(normalized)) {
      return [1, 2, 3, 4, 5]
    }

    const found = aliases
      .filter(([, names]) => names.some((name) => new RegExp(`\\b${name}\\b`).test(normalized)))
      .map(([day]) => day)

    if (found.length >= 2 && /\b(a|to|-)\b/.test(normalized)) {
      const first = found[0]
      const last = found[found.length - 1]
      if (last > first) return dayOrder.slice(first - 1, last)
    }

    return found
  }

  private normalizeScheduleTime(hoursValue: string, minutes: string, period?: string) {
    let hours = Number(hoursValue)
    const normalizedPeriod = period?.toLowerCase()
    if (!Number.isInteger(hours) || hours < 0 || hours > 23) return null
    if (normalizedPeriod === 'pm' && hours < 12) hours += 12
    if (normalizedPeriod === 'am' && hours === 12) hours = 0
    return `${String(hours).padStart(2, '0')}:${minutes}`
  }

  private timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  private formatArrivalWindow(serviceRequest: ServiceRequest) {
    if (!serviceRequest.arrivalWindowStart || !serviceRequest.arrivalWindowEnd) {
      return 'No arrival range selected'
    }

    return `${DateTime.fromFormat(serviceRequest.arrivalWindowStart, 'HH:mm').toFormat('h:mm a')} - ${DateTime.fromFormat(serviceRequest.arrivalWindowEnd, 'HH:mm').toFormat('h:mm a')}`
  }

  private cleanOptional(value: unknown) {
    const clean = String(value || '').trim()
    return clean || null
  }

  private safeRequestOld(values: Record<string, unknown>) {
    const safeValues = { ...values }
    delete safeValues.card_number
    delete safeValues.card_cvc
    delete safeValues.card_expiry
    return safeValues
  }

  private parseServiceType(value: unknown): ServiceType | null {
    const normalized = String(value || '').trim()
    const allowed: ServiceType[] = [
      'maintenance',
      'garden_design',
      'consultation',
      'delivery',
      'other',
    ]
    return allowed.includes(normalized as ServiceType) ? (normalized as ServiceType) : null
  }

  private parsePaymentMethod(value: unknown) {
    const method = String(value || '')
      .trim()
      .toLowerCase()
    return ['cash', 'paypal', 'card'].includes(method)
      ? (method as 'cash' | 'paypal' | 'card')
      : null
  }

  private gardenerPaymentMethods(value?: string | null) {
    const selected = new Set(
      String(value || '')
        .split(/[\n,;|]+/)
        .map((method) => method.trim().toLowerCase())
        .filter(Boolean)
    )
    const methods = [
      { value: 'card', label: 'Card' },
      { value: 'paypal', label: 'PayPal' },
      { value: 'cash', label: 'Cash' },
    ].filter((method) => selected.has(method.value))

    return methods.length ? methods : [{ value: 'cash', label: 'Cash' }]
  }

  private refundHeldPayment(serviceRequest: ServiceRequest, now: DateTime) {
    if (serviceRequest.paymentStatus !== 'held') return

    serviceRequest.paymentStatus = 'refunded'
    serviceRequest.refundedAmount = Number(serviceRequest.heldAmount || 0)
    serviceRequest.paymentRefundedAt = now
  }

  private async refundRedeemedPoints(serviceRequest: ServiceRequest, trx: any, now: DateTime) {
    const points = Number(serviceRequest.pointsRedeemed || 0)
    if (points <= 0 || serviceRequest.pointsRefundedAt) return

    const profile = await AccountProfile.query({ client: trx })
      .where('userId', serviceRequest.clientUserId)
      .forUpdate()
      .first()

    if (!profile) return

    profile.useTransaction(trx)
    profile.rewardPoints = Number(profile.rewardPoints || 0) + points
    await profile.save()

    serviceRequest.pointsRefundedAt = now
  }

  private clearPrivateLocation(serviceRequest: ServiceRequest, now: DateTime) {
    serviceRequest.address = null
    serviceRequest.latitude = null
    serviceRequest.longitude = null
    serviceRequest.googlePlaceId = null
    serviceRequest.locationRemovedAt = now
  }

  private parseCoordinate(value: unknown, minimum: number, maximum: number) {
    if (value === null || value === undefined || String(value).trim() === '') return null
    const coordinate = Number(value)
    return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
      ? coordinate
      : null
  }

  private hasRequiredResponse(value: string | null) {
    return Boolean(value && value.length >= MIN_RESPONSE_LENGTH && value.length <= 2000)
  }

  private mapsLinks(serviceRequest: ServiceRequest) {
    const coordinates =
      serviceRequest.latitude !== null && serviceRequest.longitude !== null
        ? `${serviceRequest.latitude},${serviceRequest.longitude}`
        : null
    const destination = coordinates || serviceRequest.address
    const encodedDestination = destination ? encodeURIComponent(destination) : null

    return {
      mapUrl: encodedDestination
        ? coordinates
          ? `https://www.openstreetmap.org/?mlat=${serviceRequest.latitude}&mlon=${serviceRequest.longitude}#map=18/${serviceRequest.latitude}/${serviceRequest.longitude}`
          : `https://www.openstreetmap.org/search?query=${encodedDestination}`
        : null,
      directionsUrl: encodedDestination
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`
        : null,
      hasPreciseLocation: Boolean(coordinates),
      latitude: serviceRequest.latitude,
      longitude: serviceRequest.longitude,
      locationRemoved: Boolean(serviceRequest.locationRemovedAt),
    }
  }

  private serviceTypeFor(value: string): ServiceType {
    const normalized = value.toLowerCase()
    if (normalized.includes('garden')) return 'garden_design'
    if (normalized.includes('irrigation')) return 'consultation'
    if (normalized.includes('delivery')) return 'delivery'
    return 'maintenance'
  }

  private formatServiceRequest(serviceRequest: ServiceRequest) {
    const scheduledFor = serviceRequest.scheduledFor
    const client = serviceRequest.client
    const clientProfile = client.accountProfile || null

    return {
      ...this.mapsLinks(serviceRequest),
      id: serviceRequest.id,
      clientName: clientProfile?.displayName || client.fullName || client.username,
      clientUsername: client.username,
      clientProfileHref: `/users/${client.username}`,
      clientPhoto: this.profileMediaUrl(
        client.id,
        clientProfile?.avatarUrl || client.profilePicture,
        clientProfile?.updatedAt || client.updatedAt
      ),
      clientInitial: this.profileInitial(
        clientProfile?.displayName || client.fullName || client.username
      ),
      clientEmail: client.email,
      clientPhone: client.phone || 'No phone provided',
      serviceType: serviceRequest.serviceType,
      serviceTypeLabel: this.serviceTypeLabel(serviceRequest.serviceType),
      status: serviceRequest.status,
      statusLabel: this.requestStatusLabel(serviceRequest),
      scheduledFor: scheduledFor ? scheduledFor.toFormat('DD') : 'No date selected',
      scheduledForInput: scheduledFor ? scheduledFor.toISODate() : '',
      arrivalWindow: this.formatArrivalWindow(serviceRequest),
      address: serviceRequest.locationRemovedAt
        ? 'Location removed after the request closed'
        : serviceRequest.address || 'No location provided',
      notes: serviceRequest.notes || 'No notes provided.',
      budget: this.formatMoney(serviceRequest.budget, 'No budget'),
      ...this.paymentDetails(serviceRequest),
      finalAmount: this.formatMoney(serviceRequest.finalAmount, 'Pending final amount'),
      finalAmountInput: serviceRequest.finalAmount
        ? Number(serviceRequest.finalAmount).toFixed(2)
        : '',
      gardenerResponse: serviceRequest.gardenerResponse || null,
      createdAt: serviceRequest.createdAt.toFormat('DD, h:mm a'),
      completedAt: serviceRequest.completedAt
        ? serviceRequest.completedAt.toFormat('DD, h:mm a')
        : null,
      verifiedAt: serviceRequest.verifiedAt
        ? serviceRequest.verifiedAt.toFormat('DD, h:mm a')
        : null,
      isVerified: Boolean(serviceRequest.verifiedAt),
      clientConfirmed: Boolean(serviceRequest.clientConfirmedAt),
      gardenerConfirmed: Boolean(serviceRequest.gardenerConfirmedAt),
      confirmationPending:
        Boolean(serviceRequest.clientConfirmedAt) !== Boolean(serviceRequest.gardenerConfirmedAt),
      waitingForLabel: this.waitingForConfirmationLabel(serviceRequest),
      rewardPointsAwarded: Number(serviceRequest.rewardPointsAwarded || 0),
      isThisWeek: scheduledFor ? scheduledFor.hasSame(DateTime.now(), 'week') : false,
      canAccept: serviceRequest.status === 'pending',
      canSchedule:
        ['pending', 'accepted'].includes(serviceRequest.status) &&
        !serviceRequest.clientConfirmedAt &&
        !serviceRequest.gardenerConfirmedAt,
      canConfirmComplete:
        ['accepted', 'scheduled'].includes(serviceRequest.status) &&
        !serviceRequest.gardenerConfirmedAt,
      canCancel:
        ['pending', 'accepted', 'scheduled'].includes(serviceRequest.status) &&
        !serviceRequest.clientConfirmedAt &&
        !serviceRequest.gardenerConfirmedAt,
    }
  }

  private formatSentServiceRequest(
    serviceRequest: ServiceRequest,
    viewerProfile?: AccountProfile | null
  ) {
    const scheduledFor = serviceRequest.scheduledFor
    const gardener = serviceRequest.gardenerProfile
    const profile = gardener?.user?.accountProfile || null
    const gardenerName =
      profile?.displayName || gardener?.user?.fullName || gardener?.user?.username || 'Gardener'
    const finalAmount = Number(serviceRequest.finalAmount || 0)
    const payableFinalAmount = Math.max(
      0,
      finalAmount - this.discountedAmount(finalAmount, serviceRequest.discountPercent)
    )

    return {
      ...this.mapsLinks(serviceRequest),
      id: serviceRequest.id,
      serviceType: serviceRequest.serviceType,
      serviceTypeLabel: this.serviceTypeLabel(serviceRequest.serviceType),
      status: serviceRequest.status,
      statusLabel: this.requestStatusLabel(serviceRequest),
      scheduledFor: scheduledFor ? scheduledFor.toFormat('DD') : 'No date selected',
      arrivalWindow: this.formatArrivalWindow(serviceRequest),
      address: serviceRequest.locationRemovedAt
        ? 'Location removed after the request closed'
        : serviceRequest.address || 'No location provided',
      notes: serviceRequest.notes || 'No notes provided.',
      budget: this.formatMoney(serviceRequest.budget, 'No budget'),
      ...this.paymentDetails(serviceRequest),
      finalAmount: this.formatMoney(serviceRequest.finalAmount, 'Pending final amount'),
      gardenerResponse: serviceRequest.gardenerResponse || null,
      createdAt: serviceRequest.createdAt.toFormat('DD, h:mm a'),
      completedAt: serviceRequest.completedAt
        ? serviceRequest.completedAt.toFormat('DD, h:mm a')
        : null,
      verifiedAt: serviceRequest.verifiedAt
        ? serviceRequest.verifiedAt.toFormat('DD, h:mm a')
        : null,
      isVerified: Boolean(serviceRequest.verifiedAt),
      clientConfirmed: Boolean(serviceRequest.clientConfirmedAt),
      gardenerConfirmed: Boolean(serviceRequest.gardenerConfirmedAt),
      confirmationPending:
        Boolean(serviceRequest.clientConfirmedAt) !== Boolean(serviceRequest.gardenerConfirmedAt),
      waitingForLabel: this.waitingForConfirmationLabel(serviceRequest),
      canConfirmComplete:
        ['accepted', 'scheduled'].includes(serviceRequest.status) &&
        !serviceRequest.clientConfirmedAt,
      canCancel:
        ['pending', 'accepted', 'scheduled'].includes(serviceRequest.status) &&
        !serviceRequest.clientConfirmedAt &&
        !serviceRequest.gardenerConfirmedAt,
      rewardPointsAwarded: Number(serviceRequest.rewardPointsAwarded || 0),
      potentialRewardPoints:
        viewerProfile?.subscriptionPlan === 'premium' &&
        ['card', 'paypal'].includes(serviceRequest.paymentMethod || '') &&
        payableFinalAmount > 0
          ? Math.round(payableFinalAmount * REWARD_POINTS_PER_DOLLAR)
          : 0,
      isPremiumClient: viewerProfile?.subscriptionPlan === 'premium',
      rewardsEligible: ['card', 'paypal'].includes(serviceRequest.paymentMethod || ''),
      isThisWeek: scheduledFor ? scheduledFor.hasSame(DateTime.now(), 'week') : false,
      gardenerName,
      gardenerUsername: gardener?.user?.username || null,
      gardenerPhoto:
        gardener && gardener.user
          ? this.profileMediaUrl(
              gardener.userId,
              profile?.avatarUrl || gardener.user.profilePicture,
              profile?.updatedAt || gardener.user.updatedAt
            )
          : null,
      gardenerInitial: this.profileInitial(gardenerName),
      gardenerSpecialty: gardener?.headline || 'Plant maintenance',
      gardenerExperience: `${gardener?.experienceYears || 0} years of experience`,
      gardenerRating: Number(gardener?.ratingAverage || 0).toFixed(1),
      gardenerLocation: gardener?.serviceArea || 'Service area not provided',
      gardenerSchedule: gardener?.availabilitySchedule || 'Available by appointment',
      gardenerPhone: gardener?.publicPhone || gardener?.user?.phone || 'No phone provided',
      gardenerEmail: gardener?.user?.email || 'No email provided',
      gardenerServices: gardener?.services?.map((service) => service.name) || [],
      gardenerProfileHref: gardener?.user?.username ? `/users/${gardener.user.username}` : null,
    }
  }

  private profileInitial(name: string) {
    return (Array.from(name.trim())[0] || 'P').toLocaleUpperCase('en')
  }

  private serviceTypeLabel(serviceType: ServiceType) {
    const labels: Record<ServiceType, string> = {
      maintenance: 'Maintenance',
      garden_design: 'Garden design',
      consultation: 'Consultation',
      delivery: 'Delivery',
      other: 'Other',
    }

    return labels[serviceType]
  }

  private requestStatusLabel(serviceRequest: ServiceRequest) {
    if (serviceRequest.verifiedAt) return 'Completed'
    if (serviceRequest.clientConfirmedAt && !serviceRequest.gardenerConfirmedAt) {
      return 'Awaiting gardener'
    }
    if (serviceRequest.gardenerConfirmedAt && !serviceRequest.clientConfirmedAt) {
      return 'Awaiting client'
    }

    return serviceRequest.status.charAt(0).toUpperCase() + serviceRequest.status.slice(1)
  }

  private waitingForConfirmationLabel(serviceRequest: ServiceRequest) {
    if (serviceRequest.clientConfirmedAt && !serviceRequest.gardenerConfirmedAt) {
      return 'Waiting for gardener confirmation'
    }
    if (serviceRequest.gardenerConfirmedAt && !serviceRequest.clientConfirmedAt) {
      return 'Waiting for client confirmation'
    }

    return null
  }

  private formatMoney(value: number | null, fallback: string) {
    const amount = Number(value || 0)
    return amount > 0
      ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : fallback
  }

  private paymentDetails(serviceRequest: ServiceRequest) {
    const labels = {
      held: 'Payment held',
      released: 'Payment released',
      refunded: 'Payment refunded',
    }

    const isCash = serviceRequest.paymentMethod === 'cash'
    const isPaypal = serviceRequest.paymentMethod === 'paypal'

    return {
      paymentStatus: serviceRequest.paymentStatus,
      paymentStatusLabel: isCash
        ? serviceRequest.verifiedAt
          ? 'Cash payment confirmed'
          : 'Cash payment on completion'
        : serviceRequest.paymentStatus
          ? labels[serviceRequest.paymentStatus]
          : 'Payment unavailable',
      paymentMethodLabel:
        serviceRequest.paymentBrand && serviceRequest.paymentLastFour
          ? `${serviceRequest.paymentBrand} ending in ${serviceRequest.paymentLastFour}`
          : isPaypal
            ? 'PayPal'
            : isCash
              ? 'Cash'
              : 'Card',
      isCashPayment: isCash,
      hasPaymentHold: !isCash && Number(serviceRequest.heldAmount || 0) > 0,
      heldAmount: this.formatMoney(serviceRequest.heldAmount, isCash ? 'Cash' : 'No payment held'),
      heldAmountInput: isCash ? '' : Number(serviceRequest.budget || 0).toFixed(2),
      releasedAmount: this.formatMoney(serviceRequest.releasedAmount, 'Not released'),
      refundedAmount: this.formatMoney(serviceRequest.refundedAmount, 'No refund'),
      hasRefund: Number(serviceRequest.refundedAmount || 0) > 0,
      paymentHeldAt: serviceRequest.paymentHeldAt
        ? serviceRequest.paymentHeldAt.toFormat('DD, h:mm a')
        : null,
      pointsRedeemed: Number(serviceRequest.pointsRedeemed || 0),
      pointsRefunded: Boolean(serviceRequest.pointsRefundedAt),
      discountPercent: Number(serviceRequest.discountPercent || 0),
      discountAmount: this.formatMoney(serviceRequest.discountAmount, 'No discount'),
      hasPointsDiscount: Number(serviceRequest.discountPercent || 0) > 0,
    }
  }
}
