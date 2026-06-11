import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getUnreadNotificationCount } from '#services/notification_service'

/**
 * Silent auth middleware can be used as a global middleware to silent check
 * if the user is logged-in or not.
 *
 * The request continues as usual, even when the user is not logged-in.
 */
export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.check()

    if (ctx.auth.user) {
      await ctx.auth.user.load('accountProfile')
      ctx.view.share({
        notificationCount: Math.min(await getUnreadNotificationCount(ctx.auth.user), 99),
      })
    } else {
      ctx.view.share({ notificationCount: 0 })
    }

    return next()
  }
}
