import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { extname, relative, resolve as resolvePath, sep } from 'node:path'
import type { HttpContext } from '@adonisjs/core/http'
import axios from 'axios'
import env from '#start/env'
import app from '@adonisjs/core/services/app'

export default class GardenDesignerController {
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

  async searchAssets({ request, response }: HttpContext) {
    const query = request.input('query')?.toString().trim()
    const perPage = Number(request.input('per_page') ?? 15)
    const safePerPage = Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 30) : 15

    if (!query) {
      return response.badRequest({
        error: 'Search query is required',
      })
    }

    const fallbackPhotos = this.searchLocalAssets(query)
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
          query,
          per_page: safePerPage,
        },
        headers: {
          Authorization: apiKey,
        },
        timeout: 15000,
      })

      const photos = (data.photos || []).map((photo: any) => ({
        id: photo.id,
        alt: photo.alt,
        src: {
          medium: photo.src?.medium,
          large2x: photo.src?.large2x,
          original: photo.src?.original,
        },
      }))

      return response.ok({
        query,
        photos: photos.length ? photos : fallbackPhotos,
        source: photos.length ? 'pexels' : 'local',
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

  async removeBackground({ request, response }: HttpContext) {
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
            'Install Python 3.12, run npm run setup, and restart npm run dev before using background removal.',
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
    const assets = matchingAssets.length ? matchingAssets : this.localAssets

    return assets.map((asset) => ({
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
