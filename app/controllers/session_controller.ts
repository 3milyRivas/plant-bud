import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'

export default class SessionController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async store({ request, response, session }: HttpContext) {
    const email = request.input('email')?.toLowerCase().trim()
    const password = request.input('password')

    if (!email || !password) {
      session.flash('errors', {
        auth: ['Email and password are required'],
      })
      return response.redirect().back()
    }

    const user = await User.findBy('email', email)

    if (!user) {
      session.flash('errors', {
        auth: ['Invalid credentials'],
      })
      return response.redirect().back()
    }

    const ok = await hash.verify(user.password, password)

    if (!ok) {
      session.flash('errors', {
        auth: ['Invalid credentials'],
      })
      return response.redirect().back()
    }

    session.put('user_id', user.id)
    session.put('user_role', user.role)

    return response.redirect().toRoute('home')
  }

  async destroy({ session, response }: HttpContext) {
    session.forget('user_id')
    session.forget('user_role')

    return response.redirect().toRoute('session.create')
  }
}