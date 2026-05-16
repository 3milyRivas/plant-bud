import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async store({ request, response, session, auth }: HttpContext) {
    const email = request.input('email')?.toLowerCase().trim()
    const password = request.input('password')

    if (!email || !password) {
      session.flash('errors', {
        auth: ['Email and password are required'],
      })
      return response.redirect().back()
    }

    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)

      return response.redirect().toRoute('home')
    } catch {
      session.flash('errors', {
        auth: ['Invalid credentials'],
      })
      return response.redirect().back()
    }
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()

    return response.redirect().toRoute('session.create')
  }
}
