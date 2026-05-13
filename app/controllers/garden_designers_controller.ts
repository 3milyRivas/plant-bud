import { spawn } from 'node:child_process'
import type { HttpContext } from '@adonisjs/core/http'

export default class GardenDesignerController {
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
}

searchAssets()