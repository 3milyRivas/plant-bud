import User from '#models/user'
import { redirectBackWithFormErrors } from '#services/form_errors'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ response, view }: HttpContext) {
    this.preventAuthPageCaching(response)
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

  async destroy({ auth, response, session }: HttpContext) {
    await auth.use('web').logout()
    session.clear()
    session.regenerate()
    this.preventAuthPageCaching(response)

    return response.redirect().toRoute('session.create')
  }

  private preventAuthPageCaching(response: HttpContext['response']) {
    response.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    response.header('Pragma', 'no-cache')
    response.header('Expires', '0')
  }
}
