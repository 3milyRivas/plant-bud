import type { HttpContext } from '@adonisjs/core/http'

export default class HomepagesController {
  async index({ auth, view }: HttpContext) {
    const user = auth.user!

    await user.load('accountProfile')

    if (user.role === 'gardener') {
      await user.load('gardenerProfile')

      return view.render('pages/homepages/gardener', {
        user,
        accountProfile: user.accountProfile,
        gardenerProfile: user.gardenerProfile,
      })
    }

    if (user.role === 'nursery') {
      await user.load('nurseryProfile')

      return view.render('pages/homepages/nursery', {
        user,
        accountProfile: user.accountProfile,
        nurseryProfile: user.nurseryProfile,
      })
    }

    return view.render('pages/homepages/client', {
      user,
      accountProfile: user.accountProfile,
    })
  }
}
