import type { HttpContext } from '@adonisjs/core/http'

export default class GeneralsController {
  /**
   * Display client's homepage
   */
  async displayHomepage({ view }: HttpContext) {
    return view.render('pages/clients/homepage')
  }
}
