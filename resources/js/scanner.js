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

let selectedPlantFile = null

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

  const transfer = new DataTransfer()
  transfer.items.add(file)
  input.files = transfer.files
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

function renderList(targetId, items) {
  const target = document.getElementById(targetId)

  if (!target) return

  target.innerHTML = (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')
}

function renderEducation(education) {
  const target = document.getElementById('education')

  if (!target || !education) return

  target.innerHTML = `
    <p>${escapeHtml(education.description || '')}</p>
    <p><b>Facts:</b></p>
    <ul>${(education.facts || []).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
    <p><b>Interesting:</b></p>
    <ul>${(education.interesting_facts || []).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
  `
}

function renderMatches(matches) {
  const target = document.getElementById('matches')

  if (!target) return

  target.innerHTML = (matches || [])
    .map((match) => {
      const url = escapeHtml(match.google_search || '#')
      const image = escapeHtml(match.image || '')
      const name = escapeHtml(match.name || 'Unknown')
      const confidence = escapeHtml(match.confidence ?? 0)

      return `
        <button type="button" data-match-url="${url}" class="cursor-pointer overflow-hidden rounded-xl border border-[#416543]/12 bg-white text-left shadow-sm transition hover:scale-105">
          <img src="${image}" class="h-28 w-full object-cover" alt="">
          <span class="block p-2">
            <span class="block text-sm font-bold text-[#113e14]">${name}</span>
            <span class="block text-xs font-black text-[#dca15d]">${confidence}%</span>
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

function renderPremiumInsights(insights) {
  if (!premiumInsightsBox || !insights) return

  premiumInsightsBox.classList.remove('hidden')

  const careScore = document.getElementById('careScore')
  const dashboard = document.getElementById('premiumDashboard')
  const comparisons = document.getElementById('premiumComparisons')
  const tracking = document.getElementById('premiumTracking')
  const followUp = document.getElementById('premiumFollowUp')

  if (careScore) {
    careScore.textContent = `${insights.care_score?.score ?? '-'} - ${insights.care_score?.label ?? 'Signal'}`
  }

  if (dashboard) {
    dashboard.innerHTML = (insights.dashboard || [])
      .map(
        (item) => `
          <div class="rounded-2xl bg-white/10 p-4">
            <p class="text-xs font-black uppercase tracking-[0.14em] text-[#ebe3a7]">${escapeHtml(item.label)}</p>
            <p class="mt-2 text-3xl font-black">${escapeHtml(item.value)}</p>
            <p class="mt-1 text-xs font-semibold text-white/65">${escapeHtml(item.detail)}</p>
          </div>
        `
      )
      .join('')
  }

  if (comparisons) {
    comparisons.innerHTML = (insights.comparisons || [])
      .map(
        (item) => `
          <p class="rounded-xl bg-white/10 px-3 py-2">
            <b>${escapeHtml(item.name)}</b> · ${escapeHtml(item.confidence)}%<br>
            <span class="text-white/60">${escapeHtml(item.note)}</span>
          </p>
        `
      )
      .join('')
  }

  if (tracking) {
    tracking.innerHTML = (insights.tracking_recommendations || [])
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('')
  }

  if (followUp) followUp.textContent = insights.follow_up || ''
}

function renderScan(data) {
  document.getElementById('species').innerText = data.species || '-'
  document.getElementById('health').innerText = data.health?.status || '-'
  document.getElementById('confidenceText').innerText = `${data.confidence ?? '-'}%`
  document.getElementById('reliabilityText').innerText = data.reliability?.level || '-'

  setStatus(data.health?.status || 'done')
  renderList('causes', data.causes || [])
  renderEducation(data.plant_education)
  renderList('tips', data.plant_education?.care_guide?.general || [])
  renderMatches(data.matches || [])
  renderPremiumInsights(data.premium_insights)
  updateUsage(data.usage)
}

input.addEventListener('change', (event) => setFile(event.target.files[0]))
initPhoneUpload({ input, onFile: setFile, tool: 'scanner' })

document.getElementById('previewBox').addEventListener('dragover', (event) => event.preventDefault())
document.getElementById('previewBox').addEventListener('drop', (event) => {
  event.preventDefault()
  setFile(event.dataTransfer.files[0])
})

scanBtn.addEventListener('click', async () => {
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
