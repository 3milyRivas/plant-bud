import { detectDeviceFrontend, resolvePageTemplate } from '#services/device_frontend'
import { appUrl } from '#config/app'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class DeviceFrontendMiddleware {
  async handle({ request, response, view }: HttpContext, next: NextFn) {
    const frontend = detectDeviceFrontend(request.headers())
    const baseUrl = appUrl.replace(/\/$/, '')
    const render = view.render.bind(view)
    const renderSync = view.renderSync.bind(view)

    view.share({
      frontend,
      canonicalUrl: new URL(request.url(), `${baseUrl}/`).toString(),
      socialImageUrl: `${baseUrl}/social/plant-bud-social.png`,
    })
    view.render = (template, state) => render(resolvePageTemplate(template, frontend), state)
    view.renderSync = (template, state) =>
      renderSync(resolvePageTemplate(template, frontend), state)

    response.header('Accept-CH', 'Sec-CH-UA-Mobile')
    response.header('Vary', 'User-Agent, Sec-CH-UA-Mobile')

    return next()
  }
}
