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

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)

    const user = await User.create({
      firstName: payload.first_name,
      lastName: payload.last_name,
      email: payload.email,
      password: await Hash.make(payload.password),
      role: payload.role,
      phone: payload.phone ?? null,
    })

    if (payload.role === 'gardener') {
      await GardenerProfile.create({
        userId: user.id,
        availabilitySchedule: payload.availability_schedule,
        servicesOffered: payload.services_offered,
      })
    }

    await auth.use('web').login(user)

    return response.redirect().toRoute('home')
  }
}
