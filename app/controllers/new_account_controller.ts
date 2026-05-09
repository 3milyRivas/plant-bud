import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import GardenerProfile from '#models/gardener_profile'

export default class NewAccountController {
  async createClient({ view }: HttpContext) {
    return view.render('pages/auth/signup_client')
  }

  async createGardener({ view }: HttpContext) {
    return view.render('pages/auth/signup_gardener')
  }

  async store({ request, response, auth, session }: HttpContext) {
    try {
      const payload = await request.validateUsing(signupValidator)

      const username = payload.username.toLowerCase().replace(/[^a-z0-9_]/g, '')

      const emailExists = await User.findBy('email', payload.email)
      const usernameExists = await User.findBy('username', username)

      const phoneExists = payload.phone
        ? await User.findBy('phone', payload.phone)
        : null

      const duiExists = payload.dui
        ? await User.findBy('dui', payload.dui)
        : null

      const errors: Record<string, string[]> = {}

      if (emailExists) errors.email = ['Email already exists']
      if (usernameExists) errors.username = ['Username already exists']
      if (phoneExists) errors.phone = ['Phone already exists']
      if (duiExists) errors.dui = ['DUI already exists']

      if (Object.keys(errors).length > 0) {
        session.flash('errors', errors)
        session.flash('old', request.all())
        return response.redirect().back()
      }

      const user = await User.create({
        username,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        password: payload.password,
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
    } catch {
      session.flash('errors', {
        auth: ['Signup failed'],
      })

      return response.redirect().back()
    }
  }
}