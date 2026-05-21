import type { HttpContext } from '@adonisjs/core/http'
import fs from 'node:fs/promises'
import axios from 'axios'
import env from '#start/env'


export default class PlantsController {
  private apiKey = env.get('PLANT_ID_API_KEY')
  private url = 'https://api.plant.id/v3/identification'

  public async scan({ request, response }: HttpContext) {
    const image = request.file('image', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],      
    })

    if (!image) {
      return response.badRequest({
        error: 'No image uploaded',
      })
    }

    const tmpPath = image.tmpPath || image.filePath

    if (!tmpPath) {
      return response.internalServerError({
        error: 'Uploaded file path not available',
      })
    }

    let buffer: Buffer

    try {
      buffer = await fs.readFile(tmpPath)
    } catch (err) {
      return response.internalServerError({
        error: 'Could not read uploaded file',
        detail: err,
      })
    }

    const base64 = buffer.toString('base64')

    const payload = {
      images: [`data:image/jpeg;base64,${base64}`],

      similar_images: true,
      health: 'all',
      disease_model: 'full',
      classification_level: 'all',
      symptoms: true,
    }

    let apiRes

    try {
      apiRes = await axios.post(this.url, payload, {
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      })
    } catch (err: any) {
      console.error('PLANT.ID ERROR:', err?.response?.data || err.message)

      return response.internalServerError({
        error: 'Plant.id request failed',
        detail: err?.response?.data || err.message,
      })
    }

    const apiData = apiRes.data || {}
    const result = apiData.result || apiData || {}

    const suggestions = result?.classification?.suggestions || result?.suggestions || []

    const top = suggestions[0] || {}

    const species = this.getSpecies(top)
    const confidence = this.getConfidence(suggestions)
    const reliability = this.getReliability(suggestions)
    const health = this.getHealth(result)
    const causes = this.getCauses(result)
    const matches = this.getMatches(suggestions)
    const plantInfo = this.getPlantInfo(top, result)
    const plantEducation = this.buildEducation(species, confidence, health, plantInfo)

    return response.ok({
      species,
      confidence,
      reliability,
      health,
      causes,
      matches,
      plant_info: plantInfo,
      plant_education: plantEducation,
      debug_raw: result,
    })
  }
  

  private getSpecies(top: any) {
    return top?.name || top?.species?.scientificName || top?.scientific_name || 'Unknown plant'
  }

  private getConfidence(suggestions: any[]) {
    if (!Array.isArray(suggestions) || !suggestions.length) {
      return 0
    }

    return Math.round((suggestions[0]?.probability || 0) * 100)
  }

  private getReliability(suggestions: any[]) {
    if (!Array.isArray(suggestions) || suggestions.length < 2) {
      return {
        score: this.getConfidence(suggestions),
        level: 'low',
      }
    }

    const first = suggestions[0]?.probability || 0
    const second = suggestions[1]?.probability || 0
    const score = Math.round(first * 100)
    const gap = first - second

    if (gap < 0.07) {
      return { score, level: 'low' }
    }

    if (score >= 80) {
      return { score, level: 'high' }
    }

    if (score >= 50) {
      return { score, level: 'medium' }
    }

    return { score, level: 'low' }
  }

  private getMatches(suggestions: any[]) {
    return (suggestions || []).slice(0, 6).map((s: any) => {
      const name = s?.name || 'Unknown'

      return {
        name,
        confidence: Math.round((s?.probability || 0) * 100),
        image: s?.similar_images?.[0]?.url || s?.plant_details?.url || null,
        google_search: `https://www.google.com/search?q=${encodeURIComponent(`${name} plant`)}`,
      }
    })
  }

  private getHealth(result: any) {
    const healthAssessment = result?.health_assessment || {}
    const diseases = result?.disease?.suggestions || healthAssessment?.diseases || []

    const healthyProbability = healthAssessment?.healthy_probability || 0

    let status = 'unknown'

    if (typeof healthAssessment?.is_healthy === 'boolean') {
      status = healthAssessment.is_healthy ? 'healthy' : 'unhealthy'
    } else if (diseases.length) {
      status = 'unhealthy'
    } else if (healthyProbability > 0) {
      status = healthyProbability >= 0.5 ? 'healthy' : 'unhealthy'
    }

    return {
      status,
      probability: Math.round(healthyProbability * 100),
      diseases,
    }
  }

  private getCauses(result: any) {
    const diseases = result?.disease?.suggestions || result?.health_assessment?.diseases || []

    if (!diseases.length) {
      return [
        'No diseases were detected.',
        'No significant visual stress symptoms.',
        'General plant condition appears stable.',
      ]
    }

    return diseases.map((d: any) => {
      return d?.description || d?.name || 'Possible environmental stress.'
    })
  }

  private getPlantInfo(top: any, result: any) {
    const details = top?.plant_details || {}

    const taxonomy =
      details?.taxonomy || result?.classification?.suggestions?.[0]?.plant_details?.taxonomy || {}

    return {
      description:
        details?.wiki_description || details?.description || 'No detailed description available.',

      taxonomy,

      common_names: details?.common_names || [],

      watering: details?.watering || 'Moderate watering recommended.',

      sunlight: details?.sunlight || 'Bright indirect light is recommended.',

      edible_parts: details?.edible_parts || [],

      wikipedia: details?.url || null,
    }
  }

  private buildEducation(species: string, confidence: number, health: any, plantInfo: any) {
    return {
      description:
        plantInfo?.description || `${species} was identified with ${confidence}% confidence.`,

      taxonomy_summary: {
        kingdom: plantInfo?.taxonomy?.kingdom || 'Unknown',
        family: plantInfo?.taxonomy?.family || 'Unknown',
        genus: plantInfo?.taxonomy?.genus || 'Unknown',
        order: plantInfo?.taxonomy?.order || 'Unknown',
      },

      facts: [
        `Identification confidence: ${confidence}%`,
        `Health status: ${health.status}`,
        `Recommended watering: ${plantInfo?.watering}`,
        `Recommended sunlight: ${plantInfo?.sunlight}`,
      ],

      interesting_facts: [
        'Plants adapt their growth to available light.',
        'Overwatering is one of the most common causes of plant decline.',
        'Roots require oxygen as well as moisture.',
        'Stress symptoms can appear before visible damage is severe.',
      ],

      care_guide: {
        watering: plantInfo?.watering,
        sunlight: plantInfo?.sunlight,
        soil: 'Well-draining soil is recommended.',
        general: [
          'Avoid waterlogging.',
          'Ensure good drainage.',
          'Protect from sudden temperature changes.',
        ],
      },
    }
  }

}



