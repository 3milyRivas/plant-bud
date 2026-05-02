import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import Hash from '@adonisjs/core/services/hash'
import GardenerProfile from '#models/gardener_profile'

export default class NewAccountController {
  async createClient({ view }: HttpContext) {
    return view.render('pages/auth/signup_client')
  }

  async createGardener({ view }: HttpContext) {
    return view.render('pages/auth/signup_gardener')
  }

  async store({ request, response, auth, session }: HttpContext) {
    console.log('🔥 STORE HIT')

    const payload = await request.validateUsing(signupValidator)

    const errors: Record<string, string[]> = {}

    const existingEmail = await User.findBy('email', payload.email)
    if (existingEmail) {
      errors.email = ['This email is already in use']
    }

    const existingUsername = await User.findBy('username', payload.username)
    if (existingUsername) {
      errors.username = ['This username is already in use']
    }

    if (payload.phone) {
      const existingPhone = await User.findBy('phone', payload.phone)
      if (existingPhone) {
        errors.phone = ['This phone number is already in use']
      }
    }

    if (payload.dui) {
      const existingDui = await User.findBy('dui', payload.dui)
      if (existingDui) {
        errors.dui = ['This DUI is already in use']
      }
    }

    if (Object.keys(errors).length > 0) {
      session.flash('errors', errors)
      session.flash('old', request.all())

      return response.redirect().back()
    }

    const user = await User.create({
      username: payload.username,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      password: await Hash.make(payload.password),
      role: payload.role,
      phone: payload.phone ?? null,
      dui: payload.dui ?? null,
    })

    if (payload.role === 'gardener') {
      await GardenerProfile.create({
        userId: user.id,
        availabilitySchedule: '',
        servicesOffered: '',
      })
    }

    await auth.use('web').login(user)

    return response.redirect().toRoute('home')
  }
}