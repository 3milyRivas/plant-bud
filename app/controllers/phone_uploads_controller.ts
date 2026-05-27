import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { createQrSvg } from '#services/simple_qr'

type PhoneUploadSession = {
  token: string
  tool: string
  createdAt: number
  expiresAt: number
  filePath?: string
  fileName?: string
  mimeType?: string
  uploadedAt?: number
}

const SESSION_TTL = 10 * 60 * 1000
const sessions = new Map<string, PhoneUploadSession>()

export default class PhoneUploadsController {
  async create({ request, response }: HttpContext) {
    this.cleanupExpiredSessions()

    const tool = ['scanner', 'designer'].includes(request.input('tool')) ? request.input('tool') : 'plant-bud'
    const token = this.createToken()
    const now = Date.now()
    const session: PhoneUploadSession = {
      token,
      tool,
      createdAt: now,
      expiresAt: now + SESSION_TTL,
    }

    sessions.set(token, session)

    const uploadPath = `/phone-upload/${token}`
    const statusPath = `/phone-upload/sessions/${token}`
    const imagePath = `/phone-upload/sessions/${token}/image`
    const uploadUrl = this.absoluteUrl(request, uploadPath)
    const qrSvg = createQrSvg(uploadUrl)

    return response.ok({
      ok: true,
      token,
      uploadUrl,
      uploadPath,
      statusPath,
      imagePath,
      expiresAt: new Date(session.expiresAt).toISOString(),
      qrSvg,
    })
  }

  async show({ params, view }: HttpContext) {
    const session = this.getValidSession(params.token)

    if (!session) {
      return view.render('pages/mobile_upload', {
        expired: true,
        uploaded: false,
        error: null,
        token: params.token,
        tool: 'Plant Bud',
      })
    }

    return view.render('pages/mobile_upload', {
      expired: false,
      uploaded: Boolean(session.filePath),
      error: null,
      token: session.token,
      tool: this.toolLabel(session.tool),
      expiresAt: new Date(session.expiresAt).toISOString(),
    })
  }

  async upload({ params, request, response, view }: HttpContext) {
    const session = this.getValidSession(params.token)

    if (!session) {
      if (this.wantsJson(request)) return response.gone({ ok: false, error: 'Upload link expired' })

      return view.render('pages/mobile_upload', {
        expired: true,
        uploaded: false,
        error: null,
        token: params.token,
        tool: 'Plant Bud',
      })
    }

    const image = request.file('image', {
      size: '12mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!image || !image.isValid) {
      const error = 'Choose a JPG, PNG, or WEBP image smaller than 12MB.'

      if (this.wantsJson(request)) return response.badRequest({ ok: false, error })

      return view.render('pages/mobile_upload', {
        expired: false,
        uploaded: false,
        error,
        token: session.token,
        tool: this.toolLabel(session.tool),
        expiresAt: new Date(session.expiresAt).toISOString(),
      })
    }

    const directory = app.makePath('storage/phone_uploads', session.token)
    const extension = image.extname || 'jpg'
    const fileName = `upload.${extension}`

    await fs.mkdir(directory, { recursive: true })
    await image.move(directory, {
      name: fileName,
      overwrite: true,
    })

    session.fileName = fileName
    session.filePath = path.join(directory, fileName)
    session.mimeType = this.mimeType(extension)
    session.uploadedAt = Date.now()

    if (this.wantsJson(request)) {
      return response.ok({
        ok: true,
        ready: true,
      })
    }

    return view.render('pages/mobile_upload', {
      expired: false,
      uploaded: true,
      error: null,
      token: session.token,
      tool: this.toolLabel(session.tool),
      expiresAt: new Date(session.expiresAt).toISOString(),
    })
  }

  async status({ params, response }: HttpContext) {
    const session = this.getValidSession(params.token)

    if (!session) return response.gone({ ok: false, expired: true })

    return response.ok({
      ok: true,
      ready: Boolean(session.filePath),
      imagePath: session.filePath ? `/phone-upload/sessions/${session.token}/image` : null,
      fileName: session.fileName || null,
      mimeType: session.mimeType || null,
      expiresAt: new Date(session.expiresAt).toISOString(),
    })
  }

  async image({ params, response }: HttpContext) {
    const session = this.getValidSession(params.token)

    if (!session?.filePath || !session.mimeType) {
      return response.notFound({ ok: false, error: 'Image not found' })
    }

    response.header('Content-Type', session.mimeType)
    return response.download(session.filePath, false)
  }

  private createToken() {
    return randomBytes(24).toString('base64url')
  }

  private getValidSession(token?: string) {
    if (!token) return null

    const session = sessions.get(token)

    if (!session) return null

    if (session.expiresAt < Date.now()) {
      sessions.delete(token)
      this.deleteSessionFiles(session).catch(() => {})
      return null
    }

    return session
  }

  private cleanupExpiredSessions() {
    const now = Date.now()

    sessions.forEach((session, token) => {
      if (session.expiresAt >= now) return
      sessions.delete(token)
      this.deleteSessionFiles(session).catch(() => {})
    })
  }

  private async deleteSessionFiles(session: PhoneUploadSession) {
    await fs.rm(app.makePath('storage/phone_uploads', session.token), {
      force: true,
      recursive: true,
    })
  }

  private absoluteUrl(request: HttpContext['request'], pathToUse: string) {
    const origin = this.phoneReachableOrigin(request)

    return `${origin}${pathToUse}`
  }

  private phoneReachableOrigin(request: HttpContext['request']) {
    const configuredOrigin = this.configuredPhoneOrigin()
    if (configuredOrigin) return configuredOrigin

    const protocol = request.protocol()
    const requestHost = request.host() || 'localhost'
    const requestOrigin = request.header('origin')
    const originHost = requestOrigin ? this.hostnameFromOrigin(requestOrigin) : null
    const hostName = originHost || this.hostnameFromHost(requestHost)

    if (hostName && !this.isLocalHost(hostName)) {
      return requestOrigin || `${protocol}://${requestHost}`
    }

    const lanAddress = this.lanAddress()
    const port = this.portFromHost(requestHost)

    if (lanAddress) {
      return `${protocol}://${lanAddress}${port ? `:${port}` : ''}`
    }

    return requestOrigin || `${protocol}://${requestHost}`
  }

  private configuredPhoneOrigin() {
    const rawOrigin = process.env.PHONE_UPLOAD_ORIGIN?.trim()

    if (!rawOrigin) return null

    try {
      const url = new URL(rawOrigin)

      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

      return url.origin
    } catch {
      return null
    }
  }

  private hostnameFromOrigin(origin: string) {
    try {
      return new URL(origin).hostname
    } catch {
      return null
    }
  }

  private hostnameFromHost(host: string) {
    if (host.startsWith('[')) {
      const end = host.indexOf(']')
      return end === -1 ? host : host.slice(1, end)
    }

    const parts = host.split(':')

    return parts.length > 1 ? parts.slice(0, -1).join(':') : host
  }

  private portFromHost(host: string) {
    if (host.startsWith('[')) {
      const end = host.indexOf(']')
      const port = host.slice(end + 1).replace(/^:/, '')

      return port || null
    }

    const parts = host.split(':')

    return parts.length > 1 ? parts.at(-1) || null : null
  }

  private isLocalHost(host: string) {
    const normalizedHost = host.replace(/^\[|\]$/g, '').toLowerCase()

    return ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(normalizedHost)
  }

  private lanAddress() {
    const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) => {
      return (addresses || [])
        .filter((address) => {
          return address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')
        })
        .map((address) => ({
          address: address.address,
          score: this.networkScore(name, address.address),
        }))
    })

    candidates.sort((left, right) => left.score - right.score)

    return candidates[0]?.address || null
  }

  private networkScore(name: string, address: string) {
    let score = 10

    if (address.startsWith('192.168.')) score = 0
    else if (address.startsWith('10.')) score = 1
    else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) score = 2

    if (/virtual|vmware|docker|wsl|hyper-v|loopback|bluetooth/i.test(name)) score += 50

    return score
  }

  private mimeType(extension: string) {
    switch (extension.toLowerCase()) {
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      default:
        return 'image/jpeg'
    }
  }

  private toolLabel(tool: string) {
    if (tool === 'scanner') return 'Plant scanner'
    if (tool === 'designer') return 'Garden designer'

    return 'Plant Bud'
  }

  private wantsJson(request: HttpContext['request']) {
    return request.header('x-requested-with') === 'XMLHttpRequest' || request.accepts(['json', 'html']) === 'json'
  }
}
