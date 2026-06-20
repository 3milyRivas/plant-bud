import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path, { extname, relative, resolve as resolvePath, sep } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import {
  buildDesignerAssetSearchProfile,
  rankDesignerAssetPhotos,
  type DesignerAssetPhoto,
} from '#services/designer_asset_search'
import axios from 'axios'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import SubscriptionService from '#services/subscription_service'
import GardenProject from '#models/garden_project'
import { DateTime } from 'luxon'

const projectImageOptions = {
  size: '12mb',
  extnames: ['jpg', 'jpeg', 'png', 'webp'],
}
const projectImagePattern = /^garden-\d+-[0-9a-f-]+\.(jpg|jpeg|png|webp)$/i
const emptyProjectState = JSON.stringify({
  els: [],
  zIndexCounter: 10,
  layerCounter: 0,
  canvasWidth: 0,
  canvasHeight: 0,
})
export default class GardenDesignerController {
  private subscriptions = new SubscriptionService()
  private pexelsUrl = 'https://api.pexels.com/v1/search'
  private pythonServerUrl = 'http://127.0.0.1:5000/remove-background'
  private pythonVersionCheck =
    'import sys; raise SystemExit(0 if (3, 10) <= sys.version_info < (3, 13) else 1)'
  private localAssets = [
    {
      id: 'local-plant-1',
      alt: 'ornamental plant',
      tags: ['plant', 'ornamental', 'flower', 'garden'],
      url: '/resources/images/homepagee/plant-1.png',
    },
    {
      id: 'local-plant-2',
      alt: 'green plant',
      tags: ['plant', 'leaf', 'garden'],
      url: '/resources/images/homepagee/plant-2.png',
    },
    {
      id: 'local-plant-3',
      alt: 'garden plant',
      tags: ['plant', 'garden', 'leaf'],
      url: '/resources/images/homepagee/plant-3.png',
    },
    {
      id: 'local-plant-4',
      alt: 'decorative plant',
      tags: ['plant', 'decorative', 'garden'],
      url: '/resources/images/homepagee/plant-4.png',
    },
    {
      id: 'local-plant-5',
      alt: 'potted plant',
      tags: ['plant', 'pot', 'potted', 'garden'],
      url: '/resources/images/homepagee/plant-5.png',
    },
    {
      id: 'local-plant-6',
      alt: 'large plant',
      tags: ['plant', 'large', 'garden'],
      url: '/resources/images/homepagee/plant-6.png',
    },
    {
      id: 'local-succulent',
      alt: 'succulent plant',
      tags: ['plant', 'succulent', 'cactus'],
      url: '/resources/images/homepagee/succulents.png',
    },
    {
      id: 'local-tulip',
      alt: 'tulip flower',
      tags: ['plant', 'flower', 'tulip', 'ornamental'],
      url: '/resources/images/homepagee/tulip.png',
    },
    {
      id: 'local-maintenance',
      alt: 'garden maintenance tool',
      tags: ['tool', 'maintenance', 'garden'],
      url: '/resources/images/homepagee/maintenance.png',
    },
    {
      id: 'local-hand',
      alt: 'gardening hand',
      tags: ['tool', 'hand', 'garden'],
      url: '/resources/images/homepagee/hand.png',
    },
  ]

  async index({ auth, response, session, view }: HttpContext) {
    const user = auth.user!
    const subscription = await this.subscriptions.getSubscriptionSummary(user)

    if (!subscription.isPremium) {
      session.flash('error', 'The 2D Garden Designer is included with Plant Bud Premium.')

      return response.redirect().toRoute('plans.index')
    }

    const projects = await GardenProject.query()
      .where('userId', user.id)
      .orderBy('updatedAt', 'desc')

    return view.render('pages/garden/projects', {
      user,
      accountProfile: subscription.profile,
      subscription,
      projects: projects.map((project) => this.projectCard(project)),
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response, session } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)
    if (!premiumAccess.allowed) return response.redirect().toRoute('plans.index')

    const name = this.cleanText(request.input('name'), 80) || 'Untitled garden'
    const description = this.cleanText(request.input('description'), 240)
    const project = await GardenProject.create({
      userId: auth.user!.id,
      name,
      description,
      stateJson: emptyProjectState,
      inventoryJson: '[]',
      baseImageName: null,
      itemCount: 0,
      lastOpenedAt: DateTime.now(),
    })

    session.flash('success', 'Garden project created.')
    return response.redirect().toRoute('garden_designer.projects.show', { id: project.id })
  }

  async show({ auth, params, response, session, view }: HttpContext) {
    const user = auth.user!
    const subscription = await this.subscriptions.getSubscriptionSummary(user)

    if (!subscription.isPremium) {
      session.flash('error', 'The 2D Garden Designer is included with Plant Bud Premium.')
      return response.redirect().toRoute('plans.index')
    }

    const project = await this.findOwnedProject(user.id, params.id)
    if (!project) return response.notFound('Garden project not found')

    project.lastOpenedAt = DateTime.now()
    await project.save()

    return view.render('pages/garden/designer', {
      user,
      accountProfile: subscription.profile,
      subscription,
      project: this.projectPayload(project),
      projectJson: JSON.stringify(this.projectPayload(project)).replace(/</g, '\\u003c'),
    })
  }

  async update(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)
    if (!premiumAccess.allowed) return response.status(402).json(premiumAccess.payload)

    const project = await this.findOwnedProject(auth.user!.id, params.id)
    if (!project) return response.notFound({ error: 'Garden project not found' })

    const name = this.cleanText(request.input('name'), 80)
    const description = this.cleanText(request.input('description'), 240)
    const state = request.input('state')
    const inventory = request.input('inventory')

    if (name) project.name = name
    if (request.input('description') !== undefined) project.description = description

    if (state !== undefined) {
      const stateJson = typeof state === 'string' ? state : JSON.stringify(state)
      if (stateJson.length > 15_000_000) {
        return response.status(413).json({ error: 'Project state is too large' })
      }
      project.stateJson = stateJson
      project.itemCount = this.projectItemCount(stateJson)
    }

    if (inventory !== undefined) {
      const inventoryJson = typeof inventory === 'string' ? inventory : JSON.stringify(inventory)
      project.inventoryJson = inventoryJson.slice(0, 15_000_000)
    }

    await project.save()
    return response.ok({
      ok: true,
      project: this.projectPayload(project),
    })
  }

  async storeImage(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)
    if (!premiumAccess.allowed) return response.status(402).json(premiumAccess.payload)

    const project = await this.findOwnedProject(auth.user!.id, params.id)
    if (!project) return response.notFound({ error: 'Garden project not found' })

    const image = request.file('image', projectImageOptions)
    if (!image || !image.isValid) {
      return response.badRequest({
        error: 'Use a JPG, PNG or WEBP garden image smaller than 12 MB.',
      })
    }

    const directory = this.projectImageDirectory(auth.user!.id, project.id)
    const extension = (image.extname || 'jpg').toLowerCase()
    const fileName = `garden-${project.id}-${randomUUID()}.${extension}`

    await fs.mkdir(directory, { recursive: true })
    await image.move(directory, { name: fileName, overwrite: false })

    if (project.baseImageName) {
      await fs.rm(path.join(directory, project.baseImageName), { force: true })
    }

    project.baseImageName = fileName
    await project.save()

    return response.ok({
      ok: true,
      mediaUrl: this.projectMediaUrl(project),
    })
  }

  async duplicate(ctx: HttpContext) {
    const { auth, params, response, session } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)
    if (!premiumAccess.allowed) return response.redirect().toRoute('plans.index')

    const source = await this.findOwnedProject(auth.user!.id, params.id)
    if (!source) return response.notFound('Garden project not found')

    const project = await GardenProject.create({
      userId: source.userId,
      name: `${source.name} copy`.slice(0, 80),
      description: source.description,
      stateJson: source.stateJson,
      inventoryJson: source.inventoryJson,
      baseImageName: null,
      itemCount: source.itemCount,
      lastOpenedAt: null,
    })

    if (source.baseImageName) {
      const sourcePath = path.join(
        this.projectImageDirectory(source.userId, source.id),
        source.baseImageName
      )
      const extension = extname(source.baseImageName).replace('.', '') || 'jpg'
      const fileName = `garden-${project.id}-${randomUUID()}.${extension}`
      const directory = this.projectImageDirectory(project.userId, project.id)

      try {
        await fs.mkdir(directory, { recursive: true })
        await fs.copyFile(sourcePath, path.join(directory, fileName))
        project.baseImageName = fileName
        await project.save()
      } catch {
        await fs.rm(directory, { recursive: true, force: true })
      }
    }

    session.flash('success', 'Garden project duplicated.')
    return response.redirect().toRoute('garden_designer.index')
  }

  async destroy(ctx: HttpContext) {
    const { auth, params, response, session } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)
    if (!premiumAccess.allowed) return response.redirect().toRoute('plans.index')

    const project = await this.findOwnedProject(auth.user!.id, params.id)
    if (!project) return response.notFound({ error: 'Garden project not found' })

    await fs.rm(this.projectImageDirectory(project.userId, project.id), {
      recursive: true,
      force: true,
    })
    await project.delete()

    session.flash('success', 'Garden project deleted.')
    return response.redirect().toRoute('garden_designer.index')
  }

  async media(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)
    if (!premiumAccess.allowed) return response.status(402).send('Premium plan required')

    const project = await this.findOwnedProject(auth.user!.id, params.id)
    if (!project?.baseImageName || !projectImagePattern.test(project.baseImageName)) {
      return response.notFound('Garden image not found')
    }

    const directory = this.projectImageDirectory(project.userId, project.id)
    const filePath = path.resolve(directory, project.baseImageName)
    if (!filePath.startsWith(`${directory}${path.sep}`)) {
      return response.notFound('Garden image not found')
    }

    response
      .header('Cache-Control', 'private, max-age=3600')
      .header('X-Content-Type-Options', 'nosniff')
      .download(filePath, false, (error) => {
        if (error.code === 'ENOENT') return ['Garden image not found', 404]
        return ['Unable to read garden image', 500]
      })
  }

  async searchAssets(ctx: HttpContext) {
    const { request, response } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)

    if (!premiumAccess.allowed) {
      return response.status(402).json(premiumAccess.payload)
    }

    const query = request.input('query')?.toString().trim()
    const perPage = Number(request.input('per_page') ?? 40)
    const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 20), 60) : 40

    if (!query) {
      return response.badRequest({
        error: 'Search query is required',
      })
    }

    const profile = buildDesignerAssetSearchProfile(query)
    const fallbackPhotos = this.searchLocalAssets(profile.translatedQuery).slice(0, 20)
    const apiKey = env.get('PEXELS_API_KEY')?.trim()

    if (!apiKey) {
      return response.ok({
        query,
        photos: fallbackPhotos,
        source: 'local',
      })
    }

    try {
      const { data } = await axios.get(this.pexelsUrl, {
        params: {
          query: profile.apiQuery,
          per_page: safePerPage,
        },
        headers: {
          Authorization: apiKey,
        },
        timeout: 15000,
      })

      const rankedPhotos = rankDesignerAssetPhotos(
        (data.photos || []).map(
          (photo: any): DesignerAssetPhoto => ({
            id: photo.id,
            alt: photo.alt || '',
            url: photo.src?.large2x || photo.src?.original || photo.src?.medium || '',
            thumbnail: photo.src?.medium || photo.src?.small || '',
            photographer: photo.photographer || '',
            photographerUrl: photo.photographer_url || '',
            width: Number(photo.width) || 0,
            height: Number(photo.height) || 0,
          })
        ),
        profile,
        20
      )
      const photos = rankedPhotos.map((photo) => ({
        id: photo.id,
        alt: photo.alt,
        cleanBackground: photo.cleanBackground,
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
        src: {
          medium: photo.thumbnail,
          large2x: photo.url,
          original: photo.url,
        },
      }))

      return response.ok({
        query,
        photos: photos.length ? photos : fallbackPhotos,
        source: photos.length ? 'pexels' : 'local',
        intent: profile.displayQuery,
      })
    } catch (error: any) {
      console.error('PEXELS ERROR:', error?.response?.data || error.message)

      return response.ok({
        query,
        photos: fallbackPhotos,
        source: 'local',
        warning: 'Pexels unavailable. Local assets were used instead.',
      })
    }
  }

  async removeBackground(ctx: HttpContext) {
    const { request, response } = ctx
    const premiumAccess = await this.requirePremiumAccess(ctx)

    if (!premiumAccess.allowed) {
      return response.status(402).json(premiumAccess.payload)
    }

    const imageInput = request.input('image')?.toString()
    const imageUrl = request.input('imageUrl')?.toString()
    let image: string | null

    try {
      image = imageInput || (await this.downloadImageAsDataUrl(imageUrl))
    } catch (error: any) {
      console.error('ASSET DOWNLOAD ERROR:', error?.response?.data || error.message)

      return response.internalServerError({
        error: 'Could not download selected garden asset',
      })
    }

    if (!image?.startsWith('data:image/')) {
      return response.badRequest({
        error: 'Valid image data URL or Pexels image URL is required',
      })
    }

    try {
      const { data } = await axios.post(
        this.pythonServerUrl,
        { image },
        {
          timeout: 60000,
        }
      )

      return response.ok(data)
    } catch {
      const result = await this.runPythonRemoveBackground(image)

      if ('error' in result) {
        return response.internalServerError(result)
      }

      return response.ok(result)
    }
  }

  async process({ request, response }: HttpContext) {
    const image = request.input('image')

    return new Promise((resolve) => {
      const python = spawn('python', ['resources/py/garden.py'])

      let output = ''
      let error = ''

      python.stdin.write(JSON.stringify({ image }))
      python.stdin.end()

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        error += data.toString()
      })

      python.on('close', () => {
        if (error) {
          resolve(response.status(500).json({ error }))
          return
        }

        try {
          resolve(response.json(JSON.parse(output)))
        } catch {
          resolve(
            response.status(500).json({
              error: 'Invalid Python response',
            })
          )
        }
      })
    })
  }

  private runPythonRemoveBackground(image: string) {
    return new Promise<Record<string, unknown>>((resolve) => {
      const pythonCommand = this.getPythonCommand()

      if (!pythonCommand) {
        resolve({
          error: 'Python AI environment was not found',
          detail:
            'Install Python 3.12 and run npm run setup:python before using background removal.',
        })
        return
      }

      const python = spawn(
        pythonCommand.command,
        [...pythonCommand.prefix, app.makePath('resources/py/remove_background.py')],
        {
          cwd: app.makePath(),
        }
      )

      let output = ''
      let error = ''
      let settled = false

      const finish = (result: Record<string, unknown>) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve(result)
      }

      const timeout = setTimeout(() => {
        python.kill()
        finish({ error: 'Background removal timed out' })
      }, 60000)

      python.stdin.on('error', (stdinError) => {
        finish({
          error: 'Could not send image to Python background removal',
          detail: stdinError.message,
        })
      })

      try {
        python.stdin.write(JSON.stringify({ image }))
        python.stdin.end()
      } catch (stdinError: any) {
        finish({
          error: 'Could not send image to Python background removal',
          detail: stdinError.message,
        })
      }

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        error += data.toString()
      })

      python.on('error', (spawnError) => {
        finish({
          error: 'Python background removal could not start',
          detail: spawnError.message,
        })
      })

      python.on('close', (code) => {
        if (code !== 0) {
          finish({
            error: 'Python background removal failed',
            detail: error || `Process exited with code ${code}`,
          })
          return
        }

        try {
          finish(JSON.parse(output))
        } catch {
          finish({
            error: 'Invalid Python response',
            detail: error,
          })
        }
      })
    })
  }

  private async downloadImageAsDataUrl(imageUrl?: string) {
    if (!imageUrl) return null

    if (imageUrl.startsWith('/resources/')) {
      return this.localImageAsDataUrl(imageUrl)
    }

    let url: URL

    try {
      url = new URL(imageUrl)
    } catch {
      return null
    }

    if (url.protocol !== 'https:' || url.hostname !== 'images.pexels.com') {
      return null
    }

    const { data, headers } = await axios.get<ArrayBuffer>(url.toString(), {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024,
    })

    const contentType = headers['content-type'] || 'image/jpeg'
    const base64 = Buffer.from(data).toString('base64')

    return `data:${contentType};base64,${base64}`
  }

  private searchLocalAssets(query: string) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    const matchingAssets = this.localAssets.filter((asset) => {
      const searchable = `${asset.alt} ${asset.tags.join(' ')}`.toLowerCase()
      return terms.every((term) => searchable.includes(term))
    })
    return matchingAssets.map((asset) => ({
      id: asset.id,
      alt: asset.alt,
      src: {
        medium: asset.url,
        large2x: asset.url,
        original: asset.url,
      },
    }))
  }

  private async localImageAsDataUrl(imageUrl: string) {
    const filePath = resolvePath(app.makePath(), imageUrl.replace(/^\/+/, ''))
    const resourcesRoot = resolvePath(app.makePath('resources'))
    const fileRelativePath = relative(resourcesRoot, filePath)

    if (fileRelativePath.startsWith('..') || fileRelativePath.includes(`..${sep}`)) {
      return null
    }

    const buffer = await fs.readFile(filePath)
    const contentType = this.getContentType(filePath)

    return `data:${contentType};base64,${buffer.toString('base64')}`
  }

  private async requirePremiumAccess({ auth }: HttpContext) {
    const user = auth.user!
    const profile = await this.subscriptions.ensureAccountProfile(user)
    const allowed = this.subscriptions.isPremium(profile)

    return {
      allowed,
      payload: allowed
        ? null
        : {
            error: 'Premium plan required',
            upgrade_url: '/plans',
            feature: '2D Garden Designer',
          },
    }
  }

  private findOwnedProject(userId: number, projectId: unknown) {
    const id = Number(projectId)
    if (!Number.isInteger(id) || id <= 0) return null

    return GardenProject.query().where('id', id).where('userId', userId).first()
  }

  private projectPayload(project: GardenProject) {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      state: this.parseJson(project.stateJson, JSON.parse(emptyProjectState)),
      inventory: this.parseJson(project.inventoryJson, []),
      itemCount: project.itemCount,
      mediaUrl: this.projectMediaUrl(project),
      updatedAt: project.updatedAt?.toISO(),
    }
  }

  private projectCard(project: GardenProject) {
    const updatedAt = project.updatedAt || project.createdAt
    const elapsedDays = Math.max(0, Math.floor(DateTime.now().diff(updatedAt, 'days').days))

    return {
      id: project.id,
      name: project.name,
      description: project.description || 'A Plant Bud garden concept ready to keep growing.',
      itemCount: project.itemCount,
      imageUrl: this.projectMediaUrl(project),
      updatedLabel:
        elapsedDays === 0
          ? 'Edited today'
          : elapsedDays === 1
            ? 'Edited yesterday'
            : `Edited ${elapsedDays} days ago`,
      updatedAt: updatedAt.toFormat('LLL d, yyyy'),
    }
  }

  private projectMediaUrl(project: GardenProject) {
    if (!project.baseImageName) return null
    const version = project.updatedAt?.toMillis() || Date.now()
    return `/designer/projects/${project.id}/media?v=${version}`
  }

  private projectImageDirectory(userId: number, projectId: number) {
    return path.resolve(app.makePath('storage/garden_projects', String(userId), String(projectId)))
  }

  private projectItemCount(stateJson: string) {
    const state = this.parseJson<{ els?: unknown[] }>(stateJson, {})
    return Array.isArray(state.els) ? state.els.length : 0
  }

  private parseJson<T>(value: string | null, fallback: T): T {
    if (!value) return fallback

    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }

  private cleanText(value: unknown, maxLength: number) {
    if (typeof value !== 'string') return null
    const cleaned = value.trim().replace(/\s+/g, ' ')
    return cleaned ? cleaned.slice(0, maxLength) : null
  }

  private getContentType(filePath: string) {
    switch (extname(filePath).toLowerCase()) {
      case '.png':
        return 'image/png'
      case '.webp':
        return 'image/webp'
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg'
      default:
        return 'application/octet-stream'
    }
  }

  private getPythonCommand() {
    const windowsPython = app.makePath('.venv/Scripts/python.exe')
    const unixPython = app.makePath('.venv/bin/python')
    const venvCandidates = [
      { command: windowsPython, prefix: [] },
      { command: unixPython, prefix: [] },
    ]
    const hasVenv = venvCandidates.some((candidate) => existsSync(candidate.command))

    for (const candidate of venvCandidates) {
      if (existsSync(candidate.command) && this.isUsablePython(candidate)) return candidate
    }

    if (hasVenv) return null

    const candidates =
      process.platform === 'win32'
        ? [
            { command: 'py', prefix: ['-3'] },
            { command: 'python', prefix: [] },
          ]
        : [
            { command: 'python3', prefix: [] },
            { command: 'python', prefix: [] },
          ]

    for (const candidate of candidates) {
      if (this.isUsablePython(candidate)) return candidate
    }

    return null
  }

  private isUsablePython(candidate: { command: string; prefix: string[] }) {
    const result = spawnSync(
      candidate.command,
      [...candidate.prefix, '-c', this.pythonVersionCheck],
      {
        cwd: app.makePath(),
        stdio: 'ignore',
      }
    )

    return result.status === 0
  }
}
