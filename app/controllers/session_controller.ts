import User from '#models/user'
import { redirectBackWithFormErrors } from '#services/form_errors'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async store({ request, response, session, auth }: HttpContext) {
    const login = request.input('email')?.toLowerCase().trim()
    const password = request.input('password')

    if (!login || !password) {
      return redirectBackWithFormErrors(
        { request, response, session },
        {
          ...(login ? {} : { email: ['Email or username is required'] }),
          ...(password ? {} : { password: ['Password is required'] }),
        }
      )
    }

    try {
      const user = await User.verifyCredentials(login, password)
      await auth.use('web').login(user)

      return response.redirect().toRoute('homepage')
    } catch {
      return redirectBackWithFormErrors(
        { request, response, session },
        {
          auth: ['Invalid credentials'],
        }
      )
    }
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()

    return response.redirect().toRoute('session.create')
  }
}
