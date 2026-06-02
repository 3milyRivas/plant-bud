import type { HttpContext } from '@adonisjs/core/http'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import https from 'node:https'
import axios from 'axios'
import env from '#start/env'
import PlantScan from '#models/plant_scan'
import SubscriptionService from '#services/subscription_service'


export default class PlantsController {
  private subscriptions = new SubscriptionService()
  private apiKey = env.get('PLANT_ID_API_KEY')
  private url = 'https://api.plant.id/v3/identification'

  public async showScanner({ auth, view }: HttpContext) {
    const user = auth.user!
    const subscription = await this.subscriptions.getSubscriptionSummary(user)

    return view.render('pages/scanner/scanner', {
      user,
      accountProfile: subscription.profile,
      subscription,
    })
  }

  public async scan({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const image = request.file('image', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],      
    })

    if (!image) {
      return response.badRequest({
        error: 'No image uploaded',
      })
    }

    if (!image.isValid) {
      return response.badRequest({
        error: 'Image must be JPG, PNG, or WEBP and smaller than 10MB',
      })
    }

    const profile = await this.subscriptions.ensureAccountProfile(user)
    const scannerAccess = await this.subscriptions.canUseScanner(user, profile)

    if (!scannerAccess.allowed) {
      return response.status(402).json({
        error: 'Free scanner limit reached',
        message: `You have used all ${scannerAccess.usage.limit} Plant Scanner scans for this month.`,
        upgrade_url: '/plans',
        usage: scannerAccess.usage,
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

    const imageHash = createHash('sha256').update(buffer).digest('hex')
    const imageDataUrl = this.getImageDataUrl(buffer)

    const payload = {
      images: [imageDataUrl],

      similar_images: true,
      health: 'all',
      disease_model: 'full',
      classification_level: 'all',
      symptoms: true,
    }

    let apiRes

    try {
      apiRes = await this.requestPlantId(payload)
    } catch (err: any) {
      const plantIdError = this.getPlantIdError(err)

      console.error('PLANT.ID ERROR:', plantIdError.detail)

      return response.status(plantIdError.status).json({
        error: 'Plant.id request failed',
        message: plantIdError.message,
        detail: plantIdError.detail,
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

    const scanResult = {
      species,
      confidence,
      reliability,
      health,
      causes,
      matches,
      plant_info: plantInfo,
      plant_education: plantEducation,
      debug_raw: result,
    }
    const recentScans = await PlantScan.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .limit(8)
    const premiumInsights = this.subscriptions.isPremium(profile)
      ? this.buildPremiumInsights(scanResult, recentScans)
      : null

    await this.subscriptions.recordScan({
      user,
      profile,
      result: scanResult,
      imageHash,
      premiumInsights,
    })

    const usage = await this.subscriptions.getScannerUsage(user, profile)

    return response.ok({
      ...scanResult,
      plan: this.subscriptions.getPlan(profile),
      usage,
      premium_insights: premiumInsights,
    })
  }
  

  private getSpecies(top: any) {
    return top?.name || top?.species?.scientificName || top?.scientific_name || 'Unknown plant'
  }

  private async requestPlantId(payload: Record<string, unknown>) {
    try {
      return await this.postPlantId(payload)
    } catch (error: any) {
      if (!this.isCertificateChainError(error)) throw error

      console.warn('PLANT.ID TLS WARNING: retrying with local certificate fallback')

      return this.postPlantId(payload, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      })
    }
  }

  private postPlantId(payload: Record<string, unknown>, options: Record<string, unknown> = {}) {
    return axios.post(this.url, payload, {
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      ...options,
    })
  }

  private isCertificateChainError(error: any) {
    return ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(error?.code)
  }

  private getPlantIdError(error: any) {
    const statusCode = Number(error?.response?.status || 0)
    const detail = error?.response?.data || error?.message || 'Unknown Plant.id error'

    if (statusCode === 401 || statusCode === 403) {
      return {
        status: 502,
        message: 'Plant.id rejected the configured API key.',
        detail,
      }
    }

    if (statusCode === 429) {
      return {
        status: 503,
        message: 'Plant.id rate limit was reached. Please try again later.',
        detail,
      }
    }

    if (this.isCertificateChainError(error)) {
      return {
        status: 502,
        message:
          'Plant.id could not be reached because this machine rejected its TLS certificate chain.',
        detail,
      }
    }

    return {
      status: 502,
      message: 'Plant.id is unavailable right now. Please try another scan in a moment.',
      detail,
    }
  }

  private getImageDataUrl(buffer: Buffer) {
    return `data:${this.detectImageMimeType(buffer)};base64,${buffer.toString('base64')}`
  }

  private detectImageMimeType(buffer: Buffer) {
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp'
    }

    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
      return 'image/png'
    }

    return 'image/jpeg'
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

  private buildPremiumInsights(scanResult: any, recentScans: PlantScan[]) {
    const healthStatus = scanResult.health?.status || 'unknown'
    const reliabilityLevel = scanResult.reliability?.level || 'low'
    const confidence = Number(scanResult.confidence || 0)
    const careScore = this.getCareScore(confidence, healthStatus, reliabilityLevel)
    const sameSpeciesScans = recentScans.filter(
      (scan) => scan.species.toLowerCase() === scanResult.species.toLowerCase()
    )
    const unhealthyScans = recentScans.filter((scan) => scan.healthStatus === 'unhealthy')
    const topMatches = (scanResult.matches || []).slice(0, 3)

    return {
      care_score: careScore,
      dashboard: [
        {
          label: 'Profile scans',
          value: recentScans.length + 1,
          detail: 'Includes this scan',
        },
        {
          label: 'Repeated plant',
          value: sameSpeciesScans.length,
          detail: sameSpeciesScans.length
            ? 'This species already appears in your scan history'
            : 'First saved scan for this species',
        },
        {
          label: 'Health alerts',
          value: unhealthyScans.length + (healthStatus === 'unhealthy' ? 1 : 0),
          detail: 'Unhealthy scans in recent history',
        },
      ],
      comparisons: topMatches.map((match: any, index: number) => ({
        name: match.name,
        confidence: match.confidence,
        note:
          index === 0
            ? 'Primary candidate. Compare leaf shape, growth habit, and visible stress.'
            : 'Secondary candidate. Useful if the primary match looks visually off.',
      })),
      tracking_recommendations: this.getTrackingRecommendations(scanResult, sameSpeciesScans),
      follow_up:
        healthStatus === 'unhealthy'
          ? 'Take another photo in 7 days from similar lighting to compare recovery signs.'
          : 'Save a new scan after watering or fertilizing changes to build a healthy baseline.',
    }
  }

  private getCareScore(confidence: number, healthStatus: string, reliabilityLevel: string) {
    let score = Math.min(Math.max(confidence, 0), 100)

    if (healthStatus === 'healthy') score += 8
    if (healthStatus === 'unhealthy') score -= 18
    if (reliabilityLevel === 'low') score -= 10
    if (reliabilityLevel === 'high') score += 5

    score = Math.min(Math.max(score, 0), 100)

    return {
      score,
      label: score >= 82 ? 'Strong signal' : score >= 58 ? 'Needs follow-up' : 'Watch closely',
    }
  }

  private getTrackingRecommendations(scanResult: any, sameSpeciesScans: PlantScan[]) {
    const recommendations = [
      'Save one clear leaf close-up and one full plant photo for future comparisons.',
      'Track watering, sunlight, and soil changes beside the scan date.',
    ]

    if (sameSpeciesScans.length) {
      recommendations.push('Compare this scan with the previous saved record for the same species.')
    }

    if (scanResult.health?.status === 'unhealthy') {
      recommendations.push('Mark the visible symptom area and scan again after treatment.')
    }

    return recommendations
  }

}



