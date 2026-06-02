import SubscriptionService from '#services/subscription_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlansController {
  private subscriptions = new SubscriptionService()

  async index({ auth, view }: HttpContext) {
    const user = auth.user!
    const subscription = await this.subscriptions.getSubscriptionSummary(user)

    return view.render('pages/plans', {
      user,
      accountProfile: subscription.profile,
      subscription,
    })
  }

  async buyPremium({ auth, response, session }: HttpContext) {
    const user = auth.user!
    const profile = await this.subscriptions.upgradeToPremium(user)

    session.flash(
      'success',
      profile.rewardPoints > 0
        ? 'Welcome to Plant Bud Premium. Your plan is active.'
        : 'Plant Bud Premium is active on your account.'
    )

    return response.redirect().toRoute('plans.index')
  }
}
