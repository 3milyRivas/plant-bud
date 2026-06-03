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
  private apiKeys = this.getPlantIdApiKeys()
  private url = 'https://api.plant.id/v3/identification'
  private plantDetails = [
    'common_names',
    'url',
    'description',
    'taxonomy',
    'rank',
    'gbif_id',
    'inaturalist_id',
    'image',
    'synonyms',
    'edible_parts',
    'watering',
    'propagation_methods',
  ]
  private diseaseDetails = ['local_name', 'description', 'treatment', 'cause']

  public async showScanner({ auth, view }: HttpContext) {
    const user = auth.user!
    const subscription = await this.subscriptions.getSubscriptionSummary(user)
    const isPremium = this.subscriptions.isPremium(subscription.profile)
    const scannerHistory = isPremium
      ? this.formatScanHistory(
          await PlantScan.query().where('userId', user.id).orderBy('createdAt', 'desc').limit(18),
          true
        )
      : []

    return view.render('pages/scanner/scanner', {
      user,
      accountProfile: subscription.profile,
      subscription,
      scannerHistory,
      scannerHistoryJson: JSON.stringify(scannerHistory),
      scannerIsPremium: isPremium,
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
    const actionPlan = this.buildActionPlan(health, plantInfo, reliability)

    const scanResult = {
      species,
      common_name: plantInfo.common_name,
      scientific_name: plantInfo.scientific_name,
      confidence,
      reliability,
      health,
      causes,
      matches,
      plant_info: plantInfo,
      plant_education: plantEducation,
      action_plan: actionPlan,
      debug_raw: result,
    }
    const recentScans = await PlantScan.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')
      .limit(8)
    const premiumInsights = this.subscriptions.isPremium(profile)
      ? this.buildPremiumInsights(scanResult, recentScans)
      : null

    const savedScan = await this.subscriptions.recordScan({
      user,
      profile,
      result: scanResult,
      imageHash,
      premiumInsights,
    })

    const usage = await this.subscriptions.getScannerUsage(user, profile)
    const isPremium = this.subscriptions.isPremium(profile)
    const scanHistory = isPremium
      ? this.formatScanHistory(
          await PlantScan.query().where('userId', user.id).orderBy('createdAt', 'desc').limit(18),
          true
        )
      : []

    return response.ok({
      ...scanResult,
      scan_id: savedScan.id,
      plan: this.subscriptions.getPlan(profile),
      usage,
      premium_insights: premiumInsights,
      premium_enabled: isPremium,
      scan_history: scanHistory,
    })
  }

  public async deleteScan({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const scanId = Number(params.id)

    if (!Number.isInteger(scanId) || scanId <= 0) {
      return response.badRequest({ error: 'Invalid scan id' })
    }

    const profile = await this.subscriptions.ensureAccountProfile(user)
    const isPremium = this.subscriptions.isPremium(profile)

    if (!isPremium) {
      return response.forbidden({
        error: 'Premium required',
        message: 'Scan history is available to Premium members only.',
        premium_enabled: false,
        scan_history: [],
      })
    }

    const scan = await PlantScan.query().where('id', scanId).where('userId', user.id).first()

    if (!scan) {
      return response.notFound({ error: 'Scan not found' })
    }

    await scan.delete()

    const scanHistory = this.formatScanHistory(
      await PlantScan.query().where('userId', user.id).orderBy('createdAt', 'desc').limit(18),
      true
    )

    return response.ok({
      deleted: true,
      premium_enabled: isPremium,
      scan_history: scanHistory,
    })
  }
  

  private getSpecies(top: any) {
    return top?.name || top?.species?.scientificName || top?.scientific_name || 'Unknown plant'
  }

  private async requestPlantId(payload: Record<string, unknown>) {
    const keys = this.apiKeys

    if (!keys.length) {
      throw new Error('No Plant.id API keys are configured.')
    }

    let lastError: any = null

    for (const [index, apiKey] of keys.entries()) {
      try {
        return await this.postPlantId(payload, apiKey)
      } catch (error: any) {
        if (this.isCertificateChainError(error)) {
          console.warn('PLANT.ID TLS WARNING: retrying with local certificate fallback')

          return this.postPlantId(payload, apiKey, {
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
            }),
          })
        }

        lastError = error

        if (!this.shouldTryNextPlantIdKey(error) || index === keys.length - 1) {
          throw error
        }

        console.warn(
          `PLANT.ID KEY FALLBACK: key ${index + 1} failed with ${this.getPlantIdErrorCode(
            error
          )}; trying key ${index + 2}.`
        )
      }
    }

    throw lastError
  }

  private postPlantId(
    payload: Record<string, unknown>,
    apiKey: string,
    options: Record<string, unknown> = {}
  ) {
    return axios.post(this.url, payload, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      params: {
        details: this.plantDetails.join(','),
        disease_details: this.diseaseDetails.join(','),
        language: 'en',
      },
      timeout: 30000,
      ...options,
    })
  }

  private getPlantIdApiKeys() {
    const keys = [process.env.PLANT_ID_API_KEYS, env.get('PLANT_ID_API_KEY')]
      .filter(Boolean)
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim())
      .filter(Boolean)

    return [...new Set(keys)]
  }

  private shouldTryNextPlantIdKey(error: any) {
    const statusCode = Number(error?.response?.status || 0)

    return [401, 403, 408, 409, 425, 429, 500, 502, 503, 504].includes(statusCode)
  }

  private getPlantIdErrorCode(error: any) {
    return error?.response?.status || error?.code || 'unknown error'
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

    if (statusCode === 400) {
      return {
        status: 502,
        message: 'Plant.id rejected the scanner request format. Please try again.',
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
      const details = this.getSuggestionDetails(s)
      const commonNames = this.toStringList(details?.common_names)

      return {
        name,
        common_name: commonNames[0] || null,
        confidence: Math.round((s?.probability || 0) * 100),
        image:
          s?.similar_images?.[0]?.url ||
          this.detailImageUrl(details?.image) ||
          s?.plant_details?.url ||
          null,
        family: details?.taxonomy?.family || null,
        google_search: `https://www.google.com/search?q=${encodeURIComponent(`${name} plant`)}`,
      }
    })
  }

  private getHealth(result: any) {
    const healthAssessment = result?.health_assessment || {}
    const diseases = this.getRelevantDiseases(
      result?.disease?.suggestions || healthAssessment?.diseases || []
    )
    const rawDiseases = result?.disease?.suggestions || healthAssessment?.diseases || []
    const plantIdHealth = result?.is_healthy || {}
    const healthyProbability =
      Number(plantIdHealth?.probability ?? healthAssessment?.healthy_probability ?? 0) || 0
    const topDiseaseProbability = Math.max(
      0,
      ...rawDiseases.map((disease: any) => Number(disease?.probability || 0))
    )
    const score = this.getApproximateHealthScore(
      healthyProbability,
      topDiseaseProbability,
      diseases,
      plantIdHealth,
      healthAssessment
    )

    let status = 'healthy'

    if (typeof plantIdHealth?.binary === 'boolean') {
      status =
        plantIdHealth.binary && topDiseaseProbability < 0.18 && healthyProbability >= 0.42
          ? 'healthy'
          : 'unhealthy'
    } else if (typeof healthAssessment?.is_healthy === 'boolean') {
      status = healthAssessment.is_healthy ? 'healthy' : 'unhealthy'
    } else if (topDiseaseProbability >= 0.18) {
      status = 'unhealthy'
    } else if (healthyProbability > 0) {
      status = healthyProbability >= 0.42 ? 'healthy' : 'unhealthy'
    }

    if (!diseases.length && topDiseaseProbability < 0.12) {
      status = 'healthy'
    }

    if (status === 'unhealthy' && !diseases.length && score >= 62) {
      status = 'healthy'
    }

    if (status === 'healthy' && diseases.length >= 2 && score < 48) {
      status = 'unhealthy'
    }

    const normalizedDiseases = diseases.slice(0, 5).map((d: any) => {
      const details = this.getSuggestionDetails(d)

      return {
        name: d?.name || details?.name || 'Possible plant stress',
        confidence: Math.round((d?.probability || 0) * 100),
        description:
          this.detailText(d?.description) ||
          this.detailText(details?.description) ||
          'The image shows a possible visual stress signal.',
        treatment: [
          ...this.toStringList(details?.treatment?.biological),
          ...this.toStringList(details?.treatment?.chemical),
          ...this.toStringList(details?.treatment?.prevention),
        ].slice(0, 4),
      }
    })

    return {
      status,
      probability: Math.round(healthyProbability * 100),
      score,
      score_label: this.getHealthScoreLabel(score),
      diseases: normalizedDiseases,
    }
  }

  private getCauses(result: any) {
    const diseases = this.getRelevantDiseases(
      result?.disease?.suggestions || result?.health_assessment?.diseases || []
    )

    if (!diseases.length) {
      return [
        'No diseases were detected.',
        'No significant visual stress symptoms.',
        'General plant condition appears stable.',
      ]
    }

    return diseases.map((d: any) => {
      const details = this.getSuggestionDetails(d)
      const confidence = Math.round((d?.probability || 0) * 100)
      const name = d?.name || details?.name || 'Possible plant stress'
      const description = this.detailText(d?.description) || this.detailText(details?.description)

      return `${name}${confidence ? ` (${confidence}%)` : ''}${description ? `: ${description}` : ''}`
    })
  }

  private getPlantInfo(top: any, result: any) {
    const details = this.getSuggestionDetails(top)

    const taxonomy =
      details?.taxonomy ||
      result?.classification?.suggestions?.[0]?.details?.taxonomy ||
      result?.classification?.suggestions?.[0]?.plant_details?.taxonomy ||
      {}
    const commonNames = this.toStringList(details?.common_names)
    const scientificName = top?.name || details?.scientific_name || this.getSpecies(top)
    const description =
      this.detailText(details?.wiki_description) ||
      this.detailText(details?.description) ||
      'No detailed description was returned for this plant.'
    const sourceUrl =
      details?.url ||
      details?.wiki_description?.citation ||
      details?.description?.citation ||
      details?.description?.source_url ||
      null

    return {
      common_name: commonNames[0] || null,
      scientific_name: scientificName,
      description,
      source_url: sourceUrl,
      rank: details?.rank || null,
      taxonomy,
      common_names: commonNames,
      synonyms: this.toStringList(details?.synonyms).slice(0, 8),
      watering: this.wateringText(details?.watering) || 'Water when the top soil starts to dry.',
      sunlight:
        this.detailText(details?.sunlight) ||
        this.detailText(details?.best_light_condition) ||
        'Use bright, indirect light until species-specific light needs are confirmed.',
      edible_parts: this.toStringList(details?.edible_parts),
      propagation_methods: this.toStringList(details?.propagation_methods),
      image: this.detailImageUrl(details?.image),
      external_ids: {
        gbif: details?.gbif_id || null,
        inaturalist: details?.inaturalist_id || null,
      },
      wikipedia: sourceUrl,
    }
  }

  private buildEducation(species: string, confidence: number, health: any, plantInfo: any) {
    const taxonomy = plantInfo?.taxonomy || {}
    const facts = [
      plantInfo?.common_name ? `Common name: ${plantInfo.common_name}` : null,
      `Scientific match: ${plantInfo?.scientific_name || species}`,
      taxonomy.family ? `Family: ${taxonomy.family}` : null,
      taxonomy.genus ? `Genus: ${taxonomy.genus}` : null,
      `Identification confidence: ${confidence}%`,
      `Health status: ${health.status}`,
      plantInfo?.watering ? `Watering note: ${plantInfo.watering}` : null,
      plantInfo?.sunlight ? `Light note: ${plantInfo.sunlight}` : null,
    ].filter(Boolean)
    const interestingFacts = [
      plantInfo?.common_names?.length > 1
        ? `This plant has multiple common names: ${plantInfo.common_names.slice(0, 4).join(', ')}.`
        : null,
      taxonomy.family
        ? `Its family, ${taxonomy.family}, helps narrow down care patterns and visual relatives.`
        : null,
      plantInfo?.synonyms?.length
        ? `Some references may list it under older or alternate names such as ${plantInfo.synonyms
            .slice(0, 2)
            .join(', ')}.`
        : null,
      plantInfo?.edible_parts?.length
        ? `Reported edible parts: ${plantInfo.edible_parts.slice(0, 3).join(', ')}. Confirm locally before consuming any plant.`
        : null,
      plantInfo?.propagation_methods?.length
        ? `Common propagation methods include ${plantInfo.propagation_methods
            .slice(0, 3)
            .join(', ')}.`
        : null,
    ].filter(Boolean)

    return {
      description:
        plantInfo?.description || `${species} was identified with ${confidence}% confidence.`,

      taxonomy_summary: {
        kingdom: taxonomy.kingdom || 'Unknown',
        family: taxonomy.family || 'Unknown',
        genus: taxonomy.genus || 'Unknown',
        order: taxonomy.order || 'Unknown',
      },

      facts,

      interesting_facts: interestingFacts.length
        ? interestingFacts
        : [
            'Plants adapt their growth to available light.',
            'Overwatering is one of the most common causes of plant decline.',
            'Roots require oxygen as well as moisture.',
          ],

      care_guide: {
        watering: plantInfo?.watering,
        sunlight: plantInfo?.sunlight,
        soil: 'Use a potting mix that drains well and keeps roots oxygenated.',
        propagation: plantInfo?.propagation_methods?.join(', ') || 'Propagation details unavailable.',
        general: [
          'Avoid waterlogging.',
          'Ensure good drainage.',
          'Protect from sudden temperature changes.',
        ],
      },
    }
  }

  private buildActionPlan(health: any, plantInfo: any, reliability: any) {
    const isUnhealthy = health?.status === 'unhealthy'
    const diseaseNames = (health?.diseases || []).map((d: any) => d.name).filter(Boolean)

    return {
      priority: isUnhealthy ? 'Check symptoms today' : 'Maintain baseline care',
      cadence: isUnhealthy ? 'Rescan in 5-7 days' : 'Rescan in 2-3 weeks',
      next_steps: [
        isUnhealthy
          ? 'Photograph the affected leaf or stem area from the same angle before treatment.'
          : 'Keep this scan as a healthy baseline for future comparisons.',
        plantInfo?.watering
          ? `Watering: ${plantInfo.watering}`
          : 'Check soil moisture before watering.',
        plantInfo?.sunlight
          ? `Light: ${plantInfo.sunlight}`
          : 'Keep the plant in stable bright indirect light while you observe it.',
        reliability?.level === 'low'
          ? 'Take one extra photo with sharper leaves to improve identification reliability.'
          : 'Use the current result as a useful reference point.',
      ],
      watch_for: diseaseNames.length
        ? diseaseNames
        : ['leaf yellowing', 'soft stems', 'new spots', 'wilting after watering'],
    }
  }

  private buildPremiumInsights(scanResult: any, recentScans: PlantScan[]) {
    const healthStatus = scanResult.health?.status || 'unknown'
    const reliabilityLevel = scanResult.reliability?.level || 'low'
    const confidence = Number(scanResult.confidence || 0)
    const careScore = this.getCareScore(
      confidence,
      healthStatus,
      reliabilityLevel,
      scanResult.health?.score
    )
    const sameSpeciesScans = recentScans.filter(
      (scan) => scan.species.toLowerCase() === scanResult.species.toLowerCase()
    )
    const unhealthyScans = recentScans.filter((scan) => scan.healthStatus === 'unhealthy')
    const comparison = this.buildBeforeAfterComparison(scanResult, sameSpeciesScans[0])
    const timeline = this.buildPremiumTimeline(scanResult, sameSpeciesScans)
    const healthTrend = this.getHealthTrendLabel(timeline)

    return {
      care_score: careScore,
      dashboard: [
        {
          label: 'Care score',
          value: careScore.score,
          detail: careScore.label,
        },
        {
          label: 'Tracked species',
          value: sameSpeciesScans.length,
          detail: sameSpeciesScans.length
            ? 'This species already appears in your scan history'
            : 'First saved scan for this species',
        },
        {
          label: 'Trend',
          value: healthTrend.value,
          detail: healthTrend.detail,
        },
        {
          label: 'Health alerts',
          value: unhealthyScans.length + (healthStatus === 'unhealthy' ? 1 : 0),
          detail: 'Unhealthy scans in recent history',
        },
      ],
      comparisons: this.buildTemporalComparisons(scanResult, sameSpeciesScans),
      before_after: comparison,
      timeline,
      premium_cards: [
        {
          title: 'Next best photo',
          body:
            reliabilityLevel === 'low'
              ? 'Take a sharper leaf close-up plus one full-plant photo to tighten the ID.'
              : 'Repeat the same angle next scan so the trend chart stays comparable.',
        },
        {
          title: 'Care signal',
          body:
            healthStatus === 'unhealthy'
              ? 'Focus on symptom progression before changing multiple care variables at once.'
              : 'This is a good baseline scan. Future changes will be easier to spot.',
        },
      ],
      tracking_recommendations: this.getTrackingRecommendations(scanResult, sameSpeciesScans),
      follow_up:
        healthStatus === 'unhealthy'
          ? 'Take another photo in 7 days from similar lighting to compare recovery signs.'
          : 'Save a new scan after watering or fertilizing changes to build a healthy baseline.',
    }
  }

  private buildBeforeAfterComparison(scanResult: any, previousScan?: PlantScan) {
    if (!previousScan) {
      return {
        has_previous: false,
        title: 'First comparable scan',
        summary: 'Scan this plant again to unlock a before/after comparison.',
        metrics: [],
      }
    }

    const previousSummary = previousScan.summaryData as any
    const previousCareScore = this.getCareScore(
      previousScan.confidence,
      previousScan.healthStatus || 'unknown',
      previousScan.reliabilityLevel || 'low'
    )
    const currentCareScore = this.getCareScore(
      scanResult.confidence,
      scanResult.health?.status || 'unknown',
      scanResult.reliability?.level || 'low',
      scanResult.health?.score
    )
    const confidenceDelta = Number(scanResult.confidence || 0) - Number(previousScan.confidence || 0)
    const careDelta = currentCareScore.score - previousCareScore.score

    return {
      has_previous: true,
      title: `Compared with ${previousScan.createdAtLabel}`,
      summary:
        previousScan.healthStatus === scanResult.health?.status
          ? `Health stayed ${scanResult.health?.status || 'unknown'} compared with the previous record.`
          : `Health changed from ${previousScan.healthStatus || 'unknown'} to ${
              scanResult.health?.status || 'unknown'
            }.`,
      previous: {
        id: previousScan.id,
        label: previousScan.createdAtLabel,
        species: previousScan.species,
        common_name: previousSummary?.common_name || previousSummary?.plant_info?.common_name || null,
        health_status: previousScan.healthStatus || 'unknown',
        confidence: previousScan.confidence,
        care_score: previousCareScore.score,
      },
      current: {
        species: scanResult.species,
        common_name: scanResult.common_name,
        health_status: scanResult.health?.status || 'unknown',
        confidence: scanResult.confidence,
        care_score: currentCareScore.score,
      },
      metrics: [
        {
          label: 'Confidence',
          previous: previousScan.confidence,
          current: scanResult.confidence,
          delta: confidenceDelta,
        },
        {
          label: 'Care score',
          previous: previousCareScore.score,
          current: currentCareScore.score,
          delta: careDelta,
        },
      ],
    }
  }

  private buildPremiumTimeline(scanResult: any, recentScans: PlantScan[]) {
    const currentEntry = {
      label: 'Now',
      species: scanResult.species,
      health_status: scanResult.health?.status || 'unknown',
      confidence: Number(scanResult.confidence || 0),
      care_score: this.getCareScore(
        scanResult.confidence,
        scanResult.health?.status || 'unknown',
        scanResult.reliability?.level || 'low',
        scanResult.health?.score
      ).score,
    }
    const historyEntries = recentScans
      .slice(0, 7)
      .reverse()
      .map((scan) => ({
        id: scan.id,
        label: scan.createdAtLabel,
        species: scan.species,
        health_status: scan.healthStatus || 'unknown',
        confidence: scan.confidence,
        care_score: this.getCareScore(
          scan.confidence,
          scan.healthStatus || 'unknown',
          scan.reliabilityLevel || 'low'
        ).score,
      }))

    return [...historyEntries, currentEntry].slice(-8)
  }

  private getHealthTrendLabel(timeline: any[]) {
    if (timeline.length < 2) {
      return {
        value: 'Baseline',
        detail: 'First point saved',
      }
    }

    const previous = timeline[timeline.length - 2]
    const current = timeline[timeline.length - 1]
    const delta = Number(current.care_score || 0) - Number(previous.care_score || 0)

    if (delta > 6) return { value: `+${delta}`, detail: 'Care signal improved' }
    if (delta < -6) return { value: `${delta}`, detail: 'Care signal dropped' }

    return { value: 'Stable', detail: 'Care signal is similar' }
  }

  private getCareScore(
    confidence: number,
    healthStatus: string,
    reliabilityLevel: string,
    healthScore?: number
  ) {
    let score = Math.min(Math.max(confidence, 0), 100)

    if (typeof healthScore === 'number') {
      score = Math.round(score * 0.35 + Math.min(Math.max(healthScore, 0), 100) * 0.65)
    } else {
      if (healthStatus === 'healthy') score += 12
      if (healthStatus === 'unhealthy') score -= 10
    }

    if (reliabilityLevel === 'low') score -= 6
    if (reliabilityLevel === 'high') score += 5

    score = Math.min(Math.max(score, 0), 100)

    return {
      score,
      label: score >= 82 ? 'Strong signal' : score >= 58 ? 'Needs follow-up' : 'Watch closely',
    }
  }

  private buildTemporalComparisons(scanResult: any, sameSpeciesScans: PlantScan[]) {
    if (!sameSpeciesScans.length) {
      return [
        {
          title: 'No previous scan for this plant yet',
          value: 'Baseline',
          note: 'Scan the same species again later to compare real changes over time.',
        },
      ]
    }

    return sameSpeciesScans.slice(0, 3).map((scan) => {
      const previousCareScore = this.getCareScore(
        scan.confidence,
        scan.healthStatus || 'unknown',
        scan.reliabilityLevel || 'low'
      )
      const currentCareScore = this.getCareScore(
        scanResult.confidence,
        scanResult.health?.status || 'unknown',
        scanResult.reliability?.level || 'low',
        scanResult.health?.score
      )
      const delta = currentCareScore.score - previousCareScore.score

      return {
        title: scan.createdAtLabel,
        value: delta > 0 ? `+${delta}` : String(delta),
        note: `Same species: ${scan.species}. Health went from ${scan.healthStatus || 'unknown'} to ${
          scanResult.health?.status || 'unknown'
        }.`,
      }
    })
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

  private formatScanHistory(scans: PlantScan[], includePremium = false) {
    return scans.map((scan) => {
      const summary = (scan.summaryData || {}) as any
      const plantInfo = summary.plant_info || {}
      const premiumInsights = includePremium ? (scan.premiumInsightData as any) : null
      const careScore =
        premiumInsights?.care_score ||
        this.getCareScore(
          scan.confidence,
          scan.healthStatus || 'unknown',
          scan.reliabilityLevel || 'low',
          summary.health?.score
        )
      const matches = this.parseStoredJson(scan.matches, [])
      const causes = this.parseStoredJson(scan.causes, [])
      const commonName = summary.common_name || plantInfo.common_name || null
      const scientificName = summary.scientific_name || plantInfo.scientific_name || scan.species

      return {
        id: scan.id,
        species: scan.species,
        common_name: commonName,
        scientific_name: scientificName,
        display_name: commonName || scientificName || scan.species,
        confidence: scan.confidence,
        health_status: scan.healthStatus || 'unknown',
        reliability_level: scan.reliabilityLevel || 'low',
        created_at_label: scan.createdAtLabel,
        created_at_iso: scan.createdAt?.toISO(),
        plant_info: plantInfo,
        education: summary.plant_education || null,
        action_plan: summary.action_plan || null,
        matches,
        causes,
        premium_insights: premiumInsights || null,
        premium_locked: !includePremium,
        metrics: {
          care_score: careScore.score,
          care_label: careScore.label,
          health_score: summary.health?.score || careScore.score,
          health_score_label: summary.health?.score_label || careScore.label,
          confidence: scan.confidence,
        },
      }
    })
  }

  private getSuggestionDetails(suggestion: any) {
    return suggestion?.details || suggestion?.plant_details || suggestion?.plantDetails || {}
  }

  private getRelevantDiseases(diseases: any[]) {
    return (diseases || [])
      .filter((disease: any) => Number(disease?.probability || 0) >= 0.08)
      .sort((a: any, b: any) => Number(b?.probability || 0) - Number(a?.probability || 0))
  }

  private getApproximateHealthScore(
    healthyProbability: number,
    topDiseaseProbability: number,
    relevantDiseases: any[],
    plantIdHealth: any,
    healthAssessment: any
  ) {
    const healthySignal =
      healthyProbability > 0
        ? healthyProbability
        : plantIdHealth?.binary === true || healthAssessment?.is_healthy === true
          ? 0.72
          : 0.45
    const diseasePenalty = Math.min(Math.max(topDiseaseProbability, 0), 1) * 42
    const relevantPenalty = Math.min(relevantDiseases.length * 7, 21)
    const rawScore = healthySignal * 82 + 12 - diseasePenalty - relevantPenalty

    return Math.min(Math.max(Math.round(rawScore), 18), 96)
  }

  private getHealthScoreLabel(score: number) {
    if (score >= 82) return 'Looks healthy'
    if (score >= 66) return 'Mostly stable'
    if (score >= 48) return 'Needs follow-up'

    return 'Likely stressed'
  }

  private detailText(value: any): string | null {
    if (!value) return null
    if (typeof value === 'string') return value.trim() || null
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) return this.toStringList(value).join(', ') || null
    if (typeof value === 'object') {
      if (typeof value.value === 'string') return value.value.trim() || null
      if (typeof value.text === 'string') return value.text.trim() || null
      if (typeof value.description === 'string') return value.description.trim() || null
      if (typeof value.en === 'string') return value.en.trim() || null
    }

    return null
  }

  private toStringList(value: any): string[] {
    if (!value) return []
    if (typeof value === 'string') return value.trim() ? [value.trim()] : []
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => this.toStringList(item))
        .map((item) => item.trim())
        .filter(Boolean)
    }
    if (typeof value === 'object') {
      if (typeof value.value === 'string') return this.toStringList(value.value)
      if (typeof value.name === 'string') return this.toStringList(value.name)

      return Object.values(value)
        .flatMap((item) => this.toStringList(item))
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return []
  }

  private detailImageUrl(value: any) {
    if (!value) return null
    if (typeof value === 'string') return value
    if (typeof value?.value === 'string') return value.value
    if (typeof value?.url === 'string') return value.url

    return null
  }

  private wateringText(value: any) {
    const directText = this.detailText(value)

    if (directText) return directText

    const min = Number(value?.min || 0)
    const max = Number(value?.max || 0)

    if (!min && !max) return null

    const minLabel = this.wateringLevelLabel(min)
    const maxLabel = this.wateringLevelLabel(max || min)

    return minLabel === maxLabel
      ? `${minLabel} moisture preference`
      : `${minLabel} to ${maxLabel} moisture preference`
  }

  private wateringLevelLabel(value: number) {
    if (value <= 1) return 'Dry'
    if (value === 2) return 'Medium'

    return 'Wet'
  }

  private parseStoredJson(value: string | null, fallback: any) {
    if (!value) return fallback

    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

}



