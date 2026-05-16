import type { HttpContext } from '@adonisjs/core/http'

export default class RoleMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>, roles: string[]) {
    const user = ctx.auth.user

    if (!user) {
      return ctx.response.redirect('/login')
    }

    if (!roles.includes(user.role)) {
      return ctx.response.redirect('/unauthorized')
    }

    await next()
  }
}
