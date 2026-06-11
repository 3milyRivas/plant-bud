import { initPhoneUpload } from './phone_upload.js'

const input = document.getElementById('plantUpload')
const preview = document.getElementById('previewImage')
const dropText = document.getElementById('dropText')
const scanBtn = document.getElementById('scanBtn')
const loadingState = document.getElementById('loadingState')
const resultsBox = document.getElementById('resultsBox')
const emptyState = document.getElementById('emptyState')
const limitBox = document.getElementById('scannerLimitBox')
const usageText = document.getElementById('usageText')
const premiumInsightsBox = document.getElementById('premiumInsightsBox')
const historyList = document.getElementById('historyList')
const historyEmpty = document.getElementById('historyEmpty')
const historyCount = document.getElementById('historyCount')
const historyPanel = document.getElementById('historyPanel')
const historyToggle = document.getElementById('historyToggle')
const historyContent = document.getElementById('historyContent')
const historyMoreToggle = document.getElementById('historyMoreToggle')
const historyDashboard = document.getElementById('historyDashboard')
const historyDashboardToggle = document.getElementById('historyDashboardToggle')
const historyDashboardContent = document.getElementById('historyDashboardContent')
const historyStats = document.getElementById('historyStats')
const historyTrendMini = document.getElementById('historyTrendMini')
const historyModal = document.getElementById('scanHistoryModal')
const historyModalTitle = document.getElementById('historyModalTitle')
const historyModalMeta = document.getElementById('historyModalMeta')
const historyModalBody = document.getElementById('historyModalBody')
const historyModalClose = document.getElementById('historyModalClose')
const historyScanDelete = document.getElementById('historyScanDelete')

let selectedPlantFile = null
let scanHistory = readInitialHistory()
let scannerPlan = readScannerPlan()
let activeHistoryScanId = null
let historyPanelExpanded = false
let historyShowingAll = false
let historyDashboardExpanded = false
const HISTORY_PREVIEW_LIMIT = 3

function readInitialHistory() {
  const node = document.getElementById('scannerHistoryData')

  if (!node) return []

  try {
    const parsed = JSON.parse(node.textContent || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readScannerPlan() {
  const node = document.getElementById('scannerPlanData')

  if (!node) return { isPremium: false }

  try {
    return JSON.parse(node.textContent || '{"isPremium":false}')
  } catch {
    return { isPremium: false }
  }
}

function setFile(file) {
  if (!file) return

  selectedPlantFile = file

  const reader = new FileReader()

  reader.onload = (event) => {
    preview.src = event.target.result
    preview.classList.remove('hidden')
    dropText.classList.add('hidden')
  }

  reader.readAsDataURL(file)

  if (typeof DataTransfer !== 'undefined') {
    const transfer = new DataTransfer()
    transfer.items.add(file)
    input.files = transfer.files
  }
}

function setLoading(isLoading) {
  loadingState.classList.toggle('hidden', !isLoading)
  scanBtn.disabled = isLoading
  scanBtn.classList.toggle('opacity-60', isLoading)
}

function setStatus(text) {
  const statusText = document.getElementById('statusText')

  if (statusText) statusText.innerText = text
}

function updateUsage(usage) {
  if (!usage) return

  const label = usage.unlimited ? 'Scanner: unlimited' : `Uses left: ${usage.remaining}/${usage.limit}`
  const asideLabel = usage.unlimited
    ? 'Unlimited scans this month'
    : `${usage.remaining} of ${usage.limit} scans left this month`

  document.querySelectorAll('[data-scanner-usage-label]').forEach((item) => {
    item.textContent = label
  })

  if (usageText) usageText.textContent = asideLabel
  document.querySelectorAll('[data-scanner-remaining]').forEach((item) => {
    item.textContent = usage.unlimited ? 'Unlimited' : String(usage.remaining)
  })
  document.querySelectorAll('[data-scanner-remaining-summary]').forEach((item) => {
    item.textContent = usage.unlimited
      ? 'Unlimited analyses available'
      : `${usage.remaining} of ${usage.limit} analyses available`
  })
  document.querySelectorAll('[data-scanner-reset]').forEach((item) => {
    item.textContent = usage.unlimited
      ? 'No monthly reset needed'
      : `Restores on ${usage.resetLabel || 'the first day of next month'}`
  })
  document.querySelectorAll('[data-scanner-reset-date]').forEach((item) => {
    item.textContent = usage.resetLabel || 'the first day of next month'
  })
  document.querySelectorAll('[data-scanner-progress]').forEach((item) => {
    const percent = usage.unlimited ? 100 : (Number(usage.remaining) / Number(usage.limit || 1)) * 100
    item.style.width = `${Math.max(0, Math.min(percent, 100))}%`
  })
}

function showLimitState(data) {
  setLoading(false)
  resultsBox.classList.add('hidden')
  emptyState.classList.remove('hidden')
  limitBox?.classList.remove('hidden')
  setStatus(data.message || data.error || 'Scanner limit reached')
  updateUsage(data.usage)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function clampPercent(value) {
  return Math.min(Math.max(Number(value || 0), 0), 100)
}

function textOrDash(value) {
  return value ? String(value) : '-'
}

function arrayOf(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function isPremiumScanner() {
  return scannerPlan?.isPremium === true
}

function getScannerCsrfToken() {
  return document
    .querySelector('#scannerHistoryDeleteToken input[name="_csrf"]')
    ?.getAttribute('value')
}

function getDisplayName(scanOrData) {
  return (
    scanOrData?.display_name ||
    scanOrData?.common_name ||
    scanOrData?.plant_info?.common_name ||
    scanOrData?.scientific_name ||
    scanOrData?.plant_info?.scientific_name ||
    scanOrData?.species ||
    'Unknown plant'
  )
}

function metricCard(label, value, detail = '') {
  return `
    <div class="rounded-2xl bg-white/10 p-4">
      <p class="text-xs font-black uppercase tracking-[0.14em] text-[#ebe3a7]">${escapeHtml(label)}</p>
      <p class="mt-2 text-3xl font-black">${escapeHtml(value)}</p>
      ${detail ? `<p class="mt-1 text-xs font-semibold text-white/65">${escapeHtml(detail)}</p>` : ''}
    </div>
  `
}

function lightMetricCard(label, value, detail = '') {
  return `
    <div class="rounded-2xl border border-[#416543]/12 bg-white/75 p-4">
      <p class="text-xs font-black uppercase tracking-[0.14em] text-[#416543]">${escapeHtml(label)}</p>
      <p class="mt-2 text-2xl font-black text-[#113e14]">${escapeHtml(value)}</p>
      ${detail ? `<p class="mt-1 text-xs font-bold text-[#416543]/78">${escapeHtml(detail)}</p>` : ''}
    </div>
  `
}

function progressBar(label, value, detail = '') {
  const percent = clampPercent(value)

  return `
    <div>
      <div class="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em]">
        <span>${escapeHtml(label)}</span>
        <span>${escapeHtml(percent)}%</span>
      </div>
      <div class="mt-2 h-3 overflow-hidden rounded-full bg-white/16">
        <div class="h-full rounded-full bg-[#dca15d]" style="width:${percent}%"></div>
      </div>
      ${detail ? `<p class="mt-1 text-xs font-semibold text-white/62">${escapeHtml(detail)}</p>` : ''}
    </div>
  `
}

function lightProgressBar(label, value, detail = '') {
  const percent = clampPercent(value)

  return `
    <div>
      <div class="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.12em] text-[#416543]">
        <span>${escapeHtml(label)}</span>
        <span>${escapeHtml(percent)}%</span>
      </div>
      <div class="mt-2 h-3 overflow-hidden rounded-full bg-[#416543]/12">
        <div class="h-full rounded-full bg-[#dca15d]" style="width:${percent}%"></div>
      </div>
      ${detail ? `<p class="mt-1 text-xs font-semibold text-[#416543]/72">${escapeHtml(detail)}</p>` : ''}
    </div>
  `
}

function renderExpandableItems(items, options = {}) {
  const values = arrayOf(items)
  const limit = options.limit ?? 4
  const tag = options.tag || 'li'
  const classes = options.classes || ''
  const hiddenClass = options.hiddenClass || 'hidden'

  if (!values.length) return ''

  return `
    ${values
      .map((item, index) => {
        const itemClasses = [classes, index >= limit ? hiddenClass : ''].filter(Boolean).join(' ')
        const classAttr = itemClasses ? ` class="${itemClasses}"` : ''
        const hiddenAttr = index >= limit ? ' data-expandable-extra="true"' : ''

        return `<${tag}${classAttr}${hiddenAttr}>${escapeHtml(item)}</${tag}>`
      })
      .join('')}
    ${
      values.length > limit
        ? `<${tag === 'li' ? 'li' : 'div'} class="${tag === 'li' ? 'list-none' : ''}">
            <button type="button" data-expandable-toggle class="mt-2 rounded-full bg-[#113e14] px-4 py-2 text-xs font-black text-[#ebe3a7] transition hover:bg-[#416543]">
              Show ${values.length - limit} more
            </button>
          </${tag === 'li' ? 'li' : 'div'}>`
        : ''
    }
  `
}

function renderList(targetId, items, limit = 4) {
  const target = document.getElementById(targetId)

  if (!target) return

  target.innerHTML = renderExpandableItems(items, { limit })
}

function renderEducation(education) {
  const target = document.getElementById('education')

  if (!target || !education) return

  target.innerHTML = `
    <p class="text-base font-semibold leading-7">${escapeHtml(education.description || '')}</p>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl bg-white/60 p-4">
        <p class="font-black text-[#113e14]">Useful facts</p>
        <ul class="mt-3 list-disc space-y-1 pl-5">${renderExpandableItems(education.facts, {
          limit: 4,
        })}</ul>
      </div>
      <div class="rounded-2xl bg-white/60 p-4">
        <p class="font-black text-[#113e14]">Interesting data</p>
        <ul class="mt-3 list-disc space-y-1 pl-5">${renderExpandableItems(
          education.interesting_facts,
          { limit: 4 }
        )}</ul>
      </div>
    </div>
  `
}

function renderTaxonomy(plantInfo) {
  const target = document.getElementById('taxonomyGrid')

  if (!target) return

  const taxonomy = plantInfo?.taxonomy || {}
  const rows = [
    ['Family', taxonomy.family],
    ['Genus', taxonomy.genus],
    ['Order', taxonomy.order],
    ['Kingdom', taxonomy.kingdom],
    ['Rank', plantInfo?.rank],
    ['Synonyms', arrayOf(plantInfo?.synonyms).slice(0, 3).join(', ')],
  ].filter((item) => item[1])

  target.innerHTML = rows.length
    ? rows
        .map(
          ([label, value]) => `
            <div class="rounded-xl bg-white/70 px-4 py-3">
              <p class="text-xs font-black uppercase tracking-[0.14em] text-[#416543]">${escapeHtml(label)}</p>
              <p class="mt-1 text-sm font-black text-[#113e14]">${escapeHtml(value)}</p>
            </div>
          `
        )
        .join('')
    : '<p class="text-sm font-semibold text-[#416543]">Taxonomy details were not returned for this scan.</p>'
}

function renderActionPlan(plan) {
  const target = document.getElementById('actionPlan')

  if (!target) return

  if (!plan) {
    target.innerHTML = '<p>No action plan was returned.</p>'
    return
  }

  target.innerHTML = `
    <div class="grid gap-3 sm:grid-cols-2">
      ${lightMetricCard('Priority', plan.priority || '-', plan.cadence || '')}
      ${lightMetricCard('Watch for', arrayOf(plan.watch_for).slice(0, 2).join(', ') || '-', 'Visual follow-up cues')}
    </div>
    <ul class="list-disc space-y-1 pl-5">${renderExpandableItems(plan.next_steps, {
      limit: 4,
    })}</ul>
  `
}

function renderCareGuide(education) {
  const guide = education?.care_guide || {}
  const tips = [
    guide.watering ? `Watering: ${guide.watering}` : null,
    guide.sunlight ? `Light: ${guide.sunlight}` : null,
    guide.soil ? `Soil: ${guide.soil}` : null,
    guide.propagation ? `Propagation: ${guide.propagation}` : null,
    ...arrayOf(guide.general),
  ].filter(Boolean)

  renderList('tips', tips)
}

function renderSources(plantInfo) {
  const target = document.getElementById('sourceLinks')

  if (!target) return

  const items = []

  if (plantInfo?.wikipedia) {
    items.push(`
      <a href="${escapeHtml(plantInfo.wikipedia)}" target="_blank" rel="noopener noreferrer" class="rounded-full bg-[#ebe3a7] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#113e14] transition hover:bg-white">
        Source
      </a>
    `)
  }

  if (plantInfo?.external_ids?.gbif) {
    items.push(`<span class="rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ebe3a7]">GBIF ${escapeHtml(plantInfo.external_ids.gbif)}</span>`)
  }

  if (plantInfo?.external_ids?.inaturalist) {
    items.push(`<span class="rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ebe3a7]">iNaturalist ${escapeHtml(plantInfo.external_ids.inaturalist)}</span>`)
  }

  target.innerHTML = items.join('')
}

function renderMatches(matches) {
  const target = document.getElementById('matches')

  if (!target) return

  target.innerHTML = arrayOf(matches)
    .map((match) => {
      const url = escapeHtml(match.google_search || '#')
      const image = escapeHtml(match.image || '')
      const name = escapeHtml(match.name || 'Unknown')
      const commonName = match.common_name ? `<span class="block text-xs font-bold text-[#416543]">${escapeHtml(match.common_name)}</span>` : ''
      const family = match.family ? `<span class="block text-xs font-semibold text-[#416543]/70">${escapeHtml(match.family)}</span>` : ''
      const confidence = escapeHtml(match.confidence ?? 0)

      return `
        <button type="button" data-match-url="${url}" class="cursor-pointer overflow-hidden rounded-xl border border-[#416543]/12 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          ${
            image
              ? `<img src="${image}" class="h-28 w-full object-cover" alt="">`
              : '<div class="flex h-28 w-full items-center justify-center bg-[#ebe3a7] text-sm font-black text-[#113e14]">No image</div>'
          }
          <span class="block p-3">
            <span class="block text-sm font-black text-[#113e14]">${name}</span>
            ${commonName}
            ${family}
            <span class="mt-2 block text-xs font-black text-[#dca15d]">${confidence}% match</span>
          </span>
        </button>
      `
    })
    .join('')

  target.querySelectorAll('[data-match-url]').forEach((button) => {
    button.addEventListener('click', () => {
      window.open(button.dataset.matchUrl, '_blank', 'noopener,noreferrer')
    })
  })
}

function renderDiseaseCards(health) {
  const target = document.getElementById('diseaseCards')

  if (!target) return

  const diseases = arrayOf(health?.diseases)

  target.innerHTML = diseases.length
    ? diseases
        .map(
          (disease) => `
            <div class="rounded-2xl border border-[#416543]/12 bg-[#ebe3a7]/45 p-4">
              <div class="flex items-start justify-between gap-3">
                <p class="font-black text-[#113e14]">${escapeHtml(disease.name || 'Possible stress')}</p>
                <span class="rounded-full bg-[#113e14] px-3 py-1 text-xs font-black text-[#ebe3a7]">${escapeHtml(disease.confidence || 0)}%</span>
              </div>
              <p class="mt-2 text-sm font-semibold leading-6 text-[#416543]">${escapeHtml(disease.description || '')}</p>
              ${
                arrayOf(disease.treatment).length
                  ? `<ul class="mt-3 list-disc space-y-1 pl-5 text-sm font-semibold text-[#416543]">${renderExpandableItems(
                      disease.treatment,
                      { limit: 3 }
                    )}</ul>`
                  : ''
              }
            </div>
          `
        )
        .join('')
    : ''
}

function renderPremiumInsights(insights) {
  if (!premiumInsightsBox || !insights || !isPremiumScanner()) {
    premiumInsightsBox?.classList.add('hidden')
    return
  }

  premiumInsightsBox.classList.remove('hidden')

  const careScore = document.getElementById('careScore')
  const dashboard = document.getElementById('premiumDashboard')
  const comparisons = document.getElementById('premiumComparisons')
  const tracking = document.getElementById('premiumTracking')
  const followUp = document.getElementById('premiumFollowUp')
  const timeline = document.getElementById('premiumTimeline')
  const beforeAfter = document.getElementById('premiumBeforeAfter')
  const premiumCards = document.getElementById('premiumCards')

  if (careScore) {
    careScore.textContent = `${insights.care_score?.score ?? '-'} - ${insights.care_score?.label ?? 'Signal'}`
  }

  if (dashboard) {
    dashboard.innerHTML = arrayOf(insights.dashboard)
      .map((item) => metricCard(item.label, item.value, item.detail))
      .join('')
  }

  if (timeline) {
    timeline.innerHTML = `
      <p class="font-black text-[#ebe3a7]">Premium timeline</p>
      <div class="mt-4">${renderTimelineBars(insights.timeline || [], true)}</div>
    `
  }

  if (beforeAfter) {
    beforeAfter.innerHTML = renderBeforeAfter(insights.before_after, true)
  }

  if (comparisons) {
    const entries = arrayOf(insights.comparisons)
    const limit = 3
    const hiddenCount = Math.max(entries.length - limit, 0)

    comparisons.innerHTML = `
      <div class="space-y-2" data-expandable-container>
        ${entries
          .map((item, index) => {
            const hiddenClass = index >= limit ? ' hidden' : ''
            const hiddenAttr = index >= limit ? ' data-expandable-extra="true"' : ''

            return `
              <p class="rounded-xl bg-white/10 px-3 py-2${hiddenClass}"${hiddenAttr}>
                <b>${escapeHtml(item.title || item.common_name || item.name)}</b> ${item.value ? `- ${escapeHtml(item.value)}` : ''}<br>
                <span class="text-white/60">${escapeHtml(item.note)}</span>
              </p>
            `
          })
          .join('')}
        ${
          hiddenCount
            ? `<button type="button" data-expandable-toggle class="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-[#ebe3a7] transition hover:bg-white/18">
                Show ${hiddenCount} more
              </button>`
            : ''
        }
      </div>
    `
  }

  if (tracking) {
    tracking.innerHTML = renderExpandableItems(insights.tracking_recommendations, { limit: 4 })
  }

  if (followUp) followUp.textContent = insights.follow_up || ''

  if (premiumCards) {
    premiumCards.innerHTML = arrayOf(insights.premium_cards)
      .map(
        (card) => `
          <div class="rounded-2xl bg-white/10 p-4">
            <p class="font-black text-[#ebe3a7]">${escapeHtml(card.title)}</p>
            <p class="mt-2 text-sm font-semibold leading-6 text-white/70">${escapeHtml(card.body)}</p>
          </div>
        `
      )
      .join('')
  }
}

function renderScan(data) {
  const plantInfo = data.plant_info || {}
  const commonName = data.common_name || plantInfo.common_name || data.species || '-'
  const scientificName = data.scientific_name || plantInfo.scientific_name || data.species || '-'
  const healthStatus = data.health?.status || '-'
  const healthLabel =
    healthStatus === 'healthy'
      ? 'Healthy'
      : data.health?.score
        ? `${healthStatus} - ${data.health.score}% health score`
        : healthStatus

  document.getElementById('commonName').innerText = commonName
  document.getElementById('commonNameCard').innerText = commonName
  document.getElementById('scientificName').innerText = scientificName
  document.getElementById('species').innerText = scientificName
  document.getElementById('health').innerText = healthLabel
  document.getElementById('confidenceText').innerText = `${data.confidence ?? '-'}%`
  document.getElementById('reliabilityText').innerText = data.reliability?.level || '-'
  document.getElementById('scanSummaryText').innerText =
    data.plant_education?.description || `${scientificName} was identified from this image.`

  setStatus(data.health?.status || 'done')
  renderSummaryChips(data)
  renderSources(plantInfo)
  renderTaxonomy(plantInfo)
  renderActionPlan(data.action_plan)
  renderList('causes', data.causes || [])
  renderDiseaseCards(data.health)
  renderEducation(data.plant_education)
  renderCareGuide(data.plant_education)
  renderMatches(data.matches || [])
  scannerPlan = { isPremium: data.premium_enabled === true || data.plan === 'premium' }
  renderPremiumInsights(data.premium_insights)
  updateUsage(data.usage)

  if (Array.isArray(data.scan_history)) {
    renderHistory(data.scan_history)
  }
}

function renderSummaryChips(data) {
  const target = document.getElementById('summaryChips')

  if (!target) return

  const chips = [
    ['Confidence', `${data.confidence ?? '-'}%`],
    ['Reliability', data.reliability?.level || '-'],
    ['Health', data.health?.status || '-'],
    ['Health score', data.health?.score ? `${data.health.score}%` : '-'],
    ['Common names', arrayOf(data.plant_info?.common_names).length || '0'],
  ]

  target.innerHTML = chips
    .map(
      ([label, value]) => `
        <span class="rounded-full bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ebe3a7]">
          ${escapeHtml(label)}: ${escapeHtml(value)}
        </span>
      `
    )
    .join('')
}

function renderHistory(scans) {
  scanHistory = isPremiumScanner() && Array.isArray(scans) ? scans : []

  if (historyCount) historyCount.textContent = scanHistory.length

  if (!isPremiumScanner()) {
    historyPanel?.classList.add('hidden')
    historyDashboard?.classList.add('hidden')
    if (historyList) historyList.innerHTML = ''
    return
  }

  const hasHistory = scanHistory.length > 0

  historyPanel?.classList.remove('hidden')
  historyContent?.classList.toggle('hidden', !historyPanelExpanded)
  historyToggle?.setAttribute('aria-expanded', String(historyPanelExpanded))

  if (historyToggle) {
    historyToggle.textContent = historyPanelExpanded ? 'Hide' : 'Show'
  }

  if (!hasHistory || scanHistory.length <= HISTORY_PREVIEW_LIMIT) {
    historyShowingAll = false
  }

  historyEmpty?.classList.toggle('hidden', hasHistory)
  historyDashboard?.classList.toggle('hidden', !hasHistory)
  historyDashboardContent?.classList.toggle('hidden', !historyDashboardExpanded)
  historyDashboardToggle?.setAttribute('aria-expanded', String(historyDashboardExpanded))

  if (historyDashboardToggle) {
    historyDashboardToggle.textContent = historyDashboardExpanded ? 'Hide dashboard' : 'Show dashboard'
  }

  if (historyList) {
    const visibleScans = historyShowingAll
      ? scanHistory
      : scanHistory.slice(0, HISTORY_PREVIEW_LIMIT)

    historyList.innerHTML = visibleScans
      .map(
        (scan) => `
          <button type="button" data-history-card data-scan-id="${escapeHtml(scan.id)}" class="block w-full rounded-xl bg-white/10 px-3 py-2 text-left transition hover:bg-[#ebe3a7]/18">
            <span class="block truncate text-sm font-black text-white">${escapeHtml(getDisplayName(scan))}</span>
            <span class="mt-1 block text-xs font-bold text-[#ebe3a7]/78">${escapeHtml(
              scan.health_status || 'unknown'
            )} - ${escapeHtml(scan.confidence)}% - ${escapeHtml(scan.created_at_label || 'Recent')}</span>
            <span class="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span class="block h-full rounded-full bg-[#dca15d]" style="width:${clampPercent(
                scan.metrics?.care_score || scan.confidence
              )}%"></span>
            </span>
          </button>
        `
      )
      .join('')

    historyList.querySelectorAll('[data-history-card]').forEach((button) => {
      button.addEventListener('click', () => openHistoryModal(button.dataset.scanId))
    })
  }

  if (historyMoreToggle) {
    const hiddenCount = Math.max(scanHistory.length - HISTORY_PREVIEW_LIMIT, 0)

    historyMoreToggle.classList.toggle('hidden', hiddenCount === 0)
    historyMoreToggle.textContent = historyShowingAll
      ? 'Show fewer records'
      : `Show ${hiddenCount} more records`
  }

  renderHistoryDashboard()
}

function renderHistoryDashboard() {
  if (!historyStats || !historyTrendMini) return

  if (!scanHistory.length || !isPremiumScanner()) {
    historyStats.innerHTML = ''
    historyTrendMini.innerHTML = ''
    return
  }

  const healthy = scanHistory.filter((scan) => scan.health_status === 'healthy').length
  const latest = scanHistory[0]
  const uniquePlants = new Set(scanHistory.map((scan) => scan.scientific_name || scan.species)).size
  const averageCare = Math.round(
    scanHistory.reduce((total, scan) => total + Number(scan.metrics?.care_score || 0), 0) /
      scanHistory.length
  )

  historyStats.innerHTML = [
    lightMetricCard('Saved scans', scanHistory.length, `${uniquePlants} tracked plants`),
    lightMetricCard('Healthy scans', healthy, `${scanHistory.length - healthy} need attention or review`),
    lightMetricCard('Latest score', latest?.metrics?.care_score ?? averageCare, latest?.metrics?.care_label || 'Current signal'),
  ].join('')

  historyTrendMini.innerHTML = renderTimelineBars(
    scanHistory
      .slice(0, 8)
      .reverse()
      .map((scan) => ({
        label: scan.created_at_label,
        species: getDisplayName(scan),
        health_status: scan.health_status,
        confidence: scan.confidence,
        care_score: scan.metrics?.care_score || scan.confidence,
      })),
    false,
    { limit: 4 }
  )
}

function renderTimelineBars(items, dark = false, options = {}) {
  const entries = arrayOf(items)
  const limit = options.limit ?? entries.length
  const hiddenCount = Math.max(entries.length - limit, 0)

  if (!entries.length) {
    return `<p class="text-sm font-semibold ${dark ? 'text-white/64' : 'text-[#416543]'}">No timeline data yet.</p>`
  }

  return `
    <div class="grid gap-3" data-expandable-container>
      ${entries
        .map((item, index) => {
          const value = clampPercent(item.care_score || item.confidence)
          const rowClass = index >= limit ? ' hidden' : ''
          const hiddenAttr = index >= limit ? ' data-expandable-extra="true"' : ''

          return `
            <div class="grid gap-2 md:grid-cols-[9rem_1fr_4rem] md:items-center${rowClass}"${hiddenAttr}>
              <p class="truncate text-xs font-black uppercase tracking-[0.1em] ${dark ? 'text-[#ebe3a7]' : 'text-[#416543]'}">${escapeHtml(
                item.label || 'Scan'
              )}</p>
              <div class="h-3 overflow-hidden rounded-full ${dark ? 'bg-white/14' : 'bg-[#416543]/12'}">
                <div class="h-full rounded-full bg-[#dca15d]" style="width:${value}%"></div>
              </div>
              <p class="text-right text-xs font-black ${dark ? 'text-white' : 'text-[#113e14]'}">${value}%</p>
            </div>
          `
        })
        .join('')}
      ${
        hiddenCount
          ? `<div>
              <button type="button" data-expandable-toggle class="mt-1 rounded-full ${
                dark ? 'bg-white/10 text-[#ebe3a7] hover:bg-white/18' : 'bg-[#113e14] text-[#ebe3a7] hover:bg-[#416543]'
              } px-4 py-2 text-xs font-black transition">
                Show ${hiddenCount} more
              </button>
            </div>`
          : ''
      }
    </div>
  `
}

function renderBeforeAfter(comparison, dark = false) {
  const muted = dark ? 'text-white/66' : 'text-[#416543]'
  const panel = dark ? 'bg-white/10' : 'bg-white/70'

  if (!comparison?.has_previous) {
    return `
      <p class="font-black ${dark ? 'text-[#ebe3a7]' : 'text-[#113e14]'}">Before / after</p>
      <p class="mt-2 text-sm font-semibold leading-6 ${muted}">${escapeHtml(
        comparison?.summary || 'Scan this plant again to compare changes over time.'
      )}</p>
    `
  }

  return `
    <p class="font-black ${dark ? 'text-[#ebe3a7]' : 'text-[#113e14]'}">Before / after</p>
    <p class="mt-2 text-sm font-semibold leading-6 ${muted}">${escapeHtml(comparison.summary || '')}</p>
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div class="rounded-2xl ${panel} p-4">
        <p class="text-xs font-black uppercase tracking-[0.14em] ${muted}">Before</p>
        <p class="mt-1 text-lg font-black">${escapeHtml(
          comparison.previous?.common_name || comparison.previous?.species || 'Previous'
        )}</p>
        <p class="mt-1 text-sm font-semibold ${muted}">${escapeHtml(
          comparison.previous?.health_status || 'unknown'
        )} - ${escapeHtml(comparison.previous?.confidence || 0)}%</p>
      </div>
      <div class="rounded-2xl ${panel} p-4">
        <p class="text-xs font-black uppercase tracking-[0.14em] ${muted}">Now</p>
        <p class="mt-1 text-lg font-black">${escapeHtml(
          comparison.current?.common_name || comparison.current?.species || 'Current'
        )}</p>
        <p class="mt-1 text-sm font-semibold ${muted}">${escapeHtml(
          comparison.current?.health_status || 'unknown'
        )} - ${escapeHtml(comparison.current?.confidence || 0)}%</p>
      </div>
    </div>
    <div class="mt-4 space-y-4">
      ${arrayOf(comparison.metrics)
        .map((metric) => {
          const delta = Number(metric.delta || 0)
          const deltaLabel = delta > 0 ? `+${delta}` : String(delta)

          return `
            <div class="rounded-2xl ${panel} p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="font-black">${escapeHtml(metric.label)}</p>
                <span class="rounded-full bg-[#dca15d] px-3 py-1 text-xs font-black text-[#113e14]">${escapeHtml(
                  deltaLabel
                )}</span>
              </div>
              <div class="mt-3 grid gap-3 md:grid-cols-2">
                ${dark ? progressBar('Before', metric.previous) : lightProgressBar('Before', metric.previous)}
                ${dark ? progressBar('Now', metric.current) : lightProgressBar('Now', metric.current)}
              </div>
            </div>
          `
        })
        .join('')}
    </div>
  `
}

function openHistoryModal(scanId) {
  if (!isPremiumScanner()) return

  const scan = scanHistory.find((item) => String(item.id) === String(scanId))

  if (!scan || !historyModal || !historyModalBody) return

  activeHistoryScanId = scan.id
  historyModalTitle.textContent = getDisplayName(scan)
  historyModalMeta.textContent = `${scan.created_at_label || 'Recent'} - ${
    scan.health_status || 'unknown'
  } - ${scan.confidence}% confidence`
  historyModalBody.innerHTML = renderHistoryDetail(scan)
  historyScanDelete?.classList.remove('hidden')
  historyModal.classList.remove('hidden')
  historyModal.classList.add('flex')
  historyModal.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}

function closeHistoryModal() {
  historyModal?.classList.add('hidden')
  historyModal?.classList.remove('flex')
  historyModal?.setAttribute('aria-hidden', 'true')
  historyScanDelete?.classList.add('hidden')
  activeHistoryScanId = null
  document.body.style.overflow = ''
}

async function deleteActiveHistoryScan() {
  if (!activeHistoryScanId || !historyScanDelete || !isPremiumScanner()) return

  historyScanDelete.disabled = true
  historyScanDelete.textContent = 'Deleting...'

  try {
    const csrfToken = getScannerCsrfToken()
    const body = new URLSearchParams()

    if (csrfToken) {
      body.set('_csrf', csrfToken)
    }

    const response = await fetch(`/scanner/scans/${encodeURIComponent(activeHistoryScanId)}/delete`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      },
      body,
    })
    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : {}

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Could not delete scan')
    }

    if (data.deleted !== true) {
      throw new Error('Could not confirm scan deletion')
    }

    const deletedId = activeHistoryScanId
    scannerPlan = { isPremium: data.premium_enabled === true || isPremiumScanner() }

    const nextHistory = Array.isArray(data.scan_history)
      ? data.scan_history
      : scanHistory.filter((scan) => String(scan.id) !== String(deletedId))

    historyPanelExpanded = nextHistory.length > 0
    if (nextHistory.length <= HISTORY_PREVIEW_LIMIT) {
      historyShowingAll = false
    }

    renderHistory(nextHistory)
    closeHistoryModal()
    setStatus('Scan deleted')
  } catch (error) {
    setStatus(error.message || 'Could not delete scan')
  } finally {
    historyScanDelete.disabled = false
    historyScanDelete.textContent = 'Delete'
  }
}

function renderHistoryDetail(scan) {
  const plantInfo = scan.plant_info || {}
  const education = scan.education || {}
  const premium = scan.premium_insights

  return `
    <div class="grid gap-4 md:grid-cols-3">
      ${lightMetricCard('Care score', scan.metrics?.care_score ?? '-', scan.metrics?.care_label || '')}
      ${lightMetricCard('Health score', scan.metrics?.health_score ?? '-', scan.metrics?.health_score_label || 'Approximate plant condition')}
      ${lightMetricCard('Confidence', `${scan.confidence}%`, scan.reliability_level || '')}
    </div>

    ${
      premium && isPremiumScanner()
        ? `<div class="rounded-2xl bg-[#113e14] p-5 text-white">
            <p class="text-xs font-black uppercase tracking-[0.18em] text-[#ebe3a7]">Premium comparison</p>
            <div class="mt-4">${renderBeforeAfter(premium.before_after, true)}</div>
            <div class="mt-5">${renderTimelineBars(premium.timeline || [], true)}</div>
          </div>`
        : `<div class="rounded-2xl border border-[#416543]/12 bg-white/70 p-5">
            <p class="font-black">Premium detail unavailable</p>
            <p class="mt-2 text-sm font-semibold leading-6 text-[#416543]">This saved scan has the basic record. Premium scans include before/after scoring and timeline intelligence.</p>
          </div>`
    }

    <div class="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div class="rounded-2xl border border-[#416543]/12 bg-white/70 p-5">
        <p class="font-black">What the scan found</p>
        <p class="mt-2 text-sm font-semibold leading-6 text-[#416543]">${escapeHtml(
          education.description || 'No detailed description was saved for this scan.'
        )}</p>
        <ul class="mt-4 list-disc space-y-1 pl-5 text-sm font-semibold text-[#416543]">
          ${renderExpandableItems(education.facts, { limit: 5 })}
        </ul>
      </div>

      <div class="rounded-2xl border border-[#416543]/12 bg-[#ebe3a7]/60 p-5">
        <p class="font-black">Action plan</p>
        <p class="mt-2 text-sm font-black text-[#416543]">${escapeHtml(scan.action_plan?.priority || 'Review scan')}</p>
        <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#416543]/70">${escapeHtml(
          scan.action_plan?.cadence || ''
        )}</p>
        <ul class="mt-4 list-disc space-y-1 pl-5 text-sm font-semibold text-[#416543]">
          ${renderExpandableItems(scan.action_plan?.next_steps, { limit: 4 })}
        </ul>
      </div>
    </div>

    <div class="rounded-2xl border border-[#416543]/12 bg-white/70 p-5">
      <p class="font-black">Top matches</p>
      <div class="mt-4 grid gap-3 md:grid-cols-3">
        ${arrayOf(scan.matches)
          .slice(0, 3)
          .map(
            (match) => `
              <a href="${escapeHtml(match.google_search || '#')}" target="_blank" rel="noopener noreferrer" class="rounded-2xl border border-[#416543]/12 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <p class="font-black">${escapeHtml(match.common_name || match.name || 'Unknown')}</p>
                <p class="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#416543]">${escapeHtml(
                  match.confidence || 0
                )}% match</p>
              </a>
            `
          )
          .join('')}
      </div>
    </div>
  `
}

if (input) {
  input.addEventListener('change', (event) => setFile(event.target.files[0]))
  initPhoneUpload({ input, onFile: setFile, tool: 'scanner' })
}

document.getElementById('previewBox')?.addEventListener('dragover', (event) => event.preventDefault())
document.getElementById('previewBox')?.addEventListener('drop', (event) => {
  event.preventDefault()
  setFile(event.dataTransfer.files[0])
})

scanBtn?.addEventListener('click', async () => {
  const file = selectedPlantFile || input.files[0]

  if (!file) {
    setStatus('Choose an image first')
    return
  }

  limitBox?.classList.add('hidden')
  premiumInsightsBox?.classList.add('hidden')
  setLoading(true)
  resultsBox.classList.add('hidden')
  emptyState.classList.add('hidden')

  const formData = new FormData()
  formData.append('image', file)

  try {
    const response = await fetch('/plants/scan', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      if (response.status === 402) {
        showLimitState(data)
        return
      }

      throw new Error(data.message || data.error || 'Plant scan failed')
    }

    setLoading(false)
    resultsBox.classList.remove('hidden')
    renderScan(data)
  } catch (error) {
    setLoading(false)
    emptyState.classList.remove('hidden')
    setStatus(error.message || 'Plant scan failed')
  }
})

historyModalClose?.addEventListener('click', closeHistoryModal)
historyScanDelete?.addEventListener('click', deleteActiveHistoryScan)
historyToggle?.addEventListener('click', () => {
  historyPanelExpanded = !historyPanelExpanded
  renderHistory(scanHistory)
})
historyMoreToggle?.addEventListener('click', () => {
  historyShowingAll = !historyShowingAll
  renderHistory(scanHistory)
})
historyDashboardToggle?.addEventListener('click', () => {
  historyDashboardExpanded = !historyDashboardExpanded
  renderHistory(scanHistory)
})
historyModal?.addEventListener('click', (event) => {
  if (event.target === historyModal) closeHistoryModal()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !historyModal?.classList.contains('hidden')) {
    closeHistoryModal()
  }
})
document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-expandable-toggle]')

  if (!button) return

  const container = button.closest('[data-expandable-container]') || button.closest('ul, div')
  const hiddenItems = container?.querySelectorAll('[data-expandable-extra]')

  if (!hiddenItems?.length) return

  const shouldShow = Array.from(hiddenItems).some((item) => item.classList.contains('hidden'))

  hiddenItems.forEach((item) => item.classList.toggle('hidden', !shouldShow))
  button.textContent = shouldShow ? 'Show less' : `Show ${hiddenItems.length} more`
})

renderHistory(scanHistory)
