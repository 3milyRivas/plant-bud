export type DeviceFrontend = 'PC' | 'Phone'

type HeaderValue = string | string[] | undefined
type RequestHeaders = Record<string, HeaderValue>

const phonePattern =
  /android.+mobile|blackberry|iemobile|iphone|ipod|mobile|opera mini|windows phone/i
const tabletPattern = /android(?!.*mobile)|ipad|kindle|playbook|silk|tablet/i
const ipadDesktopPattern = /macintosh/i
const ipadMobileTokenPattern = /mobile\/[\w]+/i

function headerValue(headers: RequestHeaders, name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value.join(' ') : value || ''
}

export function detectDeviceFrontend(headers: RequestHeaders): DeviceFrontend {
  const mobileClientHint = headerValue(headers, 'sec-ch-ua-mobile').trim()

  if (mobileClientHint === '?1' || mobileClientHint === '1') {
    return 'Phone'
  }

  const userAgent = headerValue(headers, 'user-agent')
  const isIpadUsingDesktopUserAgent =
    ipadDesktopPattern.test(userAgent) && ipadMobileTokenPattern.test(userAgent)

  if (
    phonePattern.test(userAgent) ||
    tabletPattern.test(userAgent) ||
    isIpadUsingDesktopUserAgent
  ) {
    return 'Phone'
  }

  return 'PC'
}

export function resolvePageTemplate(template: string, frontend: DeviceFrontend) {
  const normalizedTemplate = template.replaceAll('\\', '/')

  if (
    !normalizedTemplate.startsWith('pages/') ||
    normalizedTemplate.startsWith('pages/PC/') ||
    normalizedTemplate.startsWith('pages/Phone/')
  ) {
    return normalizedTemplate
  }

  return normalizedTemplate.replace(/^pages\//, `pages/${frontend}/`)
}
