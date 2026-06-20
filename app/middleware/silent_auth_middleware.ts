import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  getNowBarRequestSummary,
  getUnreadNotificationCount,
} from '#services/notification_service'

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
      const [notificationCount, nowBarRequest] = await Promise.all([
        getUnreadNotificationCount(ctx.auth.user),
        getNowBarRequestSummary(ctx.auth.user),
      ])
      ctx.view.share({
        notificationCount: Math.min(notificationCount, 99),
        nowBarRequest,
      })
    } else {
      ctx.view.share({
        notificationCount: 0,
        nowBarRequest: {
          count: 0,
          label: 'Sign in to track requests',
          status: 'guest',
          href: '/login',
        },
      })
    }

    return next()
  }
}
