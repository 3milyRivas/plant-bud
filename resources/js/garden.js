import { initPhoneUpload, preparePhoneImage } from './phone_upload.js'

const upload = document.getElementById('upload')
const baseImage = document.getElementById('baseImage')
const container = document.getElementById('canvas-container')
const loadingText = document.getElementById('loadingText')
const placeholder = document.getElementById('canvas-placeholder')

const searchInput = document.getElementById('searchInput')
const searchModal = document.getElementById('searchModal')
const searchResults = document.getElementById('searchResults')
const inventoryContainer = document.getElementById('inventory')

let selected = null
let deleteBtn = null
let resizer = null
let inventory = []

let zIndexCounter = 10
let locked = new WeakSet()

let history = []
let redoStack = []
let isRestoring = false
let activeInteraction = null
let interactionFrame = 0
let pendingInteractionEvent = null

const isPhoneViewport = () => window.matchMedia('(max-width: 767px)').matches
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max))

function setMobileStudioPanel(panelName) {
  if (!isPhoneViewport()) return

  document.querySelectorAll('[data-designer-studio-tab]').forEach(tab => {
    const isActive = tab.dataset.designerStudioTab === panelName
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-selected', String(isActive))
  })

  document.querySelectorAll('[data-designer-studio-panel]').forEach(panel => {
    const isActive = panel.dataset.designerStudioPanel === panelName
    panel.classList.toggle('is-active', isActive)
    panel.hidden = !isActive
  })
}

function initMobileStudio() {
  if (!isPhoneViewport()) return

  const assetsSlot = document.querySelector('[data-designer-assets-slot]')
  const editSlot = document.querySelector('[data-designer-edit-slot]')
  const searchSection = document.querySelector('.phone-designer-search')
  const inventorySection = document.querySelector('.phone-designer-inventory')
  const editSection = document.querySelector('.phone-designer-edit')

  if (!assetsSlot || !editSlot || !searchSection || !inventorySection || !editSection) return

  assetsSlot.append(searchSection, inventorySection)
  editSlot.append(editSection)

  document.querySelectorAll('[data-designer-studio-tab]').forEach(tab => {
    tab.addEventListener('click', () => setMobileStudioPanel(tab.dataset.designerStudioTab))
  })

  setMobileStudioPanel('assets')
}

const canvas = document.getElementById("canvas-container")
const img = document.getElementById("baseImage")
const fileInput = document.getElementById("upload")

let hasBaseImage = false
let activeBaseImageUrl = null
let baseImageLoadToken = 0
const designerDraftDatabase = 'plant-bud-designer'
const designerDraftStore = 'drafts'
const designerDraftKey = 'base-image'

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
})

initPhoneUpload({ input: fileInput, onFile: handleFile, tool: 'designer' })
restoreDesignerImage()

let canvasResizeFrame = 0
window.addEventListener('resize', () => {
  if (!baseImage?.naturalWidth) return
  cancelAnimationFrame(canvasResizeFrame)
  canvasResizeFrame = requestAnimationFrame(() => {
    fitCanvasToImage()
    syncCanvasBackground()
  })
})

canvas.addEventListener("dragover", (e) => {
    if (hasBaseImage) return
    e.preventDefault()
    canvas.classList.add("ring-4", "ring-[#dca15d]")
})

canvas.addEventListener("dragleave", () => {
    if (hasBaseImage) return
    canvas.classList.remove("ring-4", "ring-[#dca15d]")
})

canvas.addEventListener("drop", (e) => {
    if (hasBaseImage) return

    e.preventDefault()
    canvas.classList.remove("ring-4", "ring-[#dca15d]")

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
})

async function handleFile(file, { persist = true } = {}) {
    if (!file.type.startsWith("image/")) return

    const loadToken = ++baseImageLoadToken
    if (persist && isPhoneViewport()) await persistDesignerImage(file)
    const preparedFile = await prepareBaseImage(file)

    if (loadToken !== baseImageLoadToken) return
    if (persist && preparedFile !== file && isPhoneViewport()) {
        await persistDesignerImage(preparedFile)
    }

    const url = URL.createObjectURL(preparedFile)
    const previousUrl = activeBaseImageUrl

    img.onload = () => {
        if (loadToken !== baseImageLoadToken) {
            URL.revokeObjectURL(url)
            return
        }

        activeBaseImageUrl = url
        if (previousUrl) URL.revokeObjectURL(previousUrl)
        placeholder.classList.add("hidden")
        img.classList.remove("hidden")
        hasBaseImage = true
        fitCanvasToImage()
        syncCanvasBackground()
    }

    img.onerror = () => {
        URL.revokeObjectURL(url)
    }

    img.src = url
}

async function prepareBaseImage(file) {
    if (!isPhoneViewport()) return file

    return preparePhoneImage(file)
}

async function restoreDesignerImage() {
    if (!isPhoneViewport() || baseImage?.naturalWidth) return

    const file = await readDesignerImage()
    if (file) handleFile(file, { persist: false })
}

async function persistDesignerImage(file) {
    try {
        const database = await openDesignerDatabase()
        const transaction = database.transaction(designerDraftStore, 'readwrite')
        transaction.objectStore(designerDraftStore).put(file, designerDraftKey)
        await finishDesignerTransaction(transaction)
        database.close()
    } catch {
        // The designer remains usable when private browsing blocks IndexedDB.
    }
}

async function readDesignerImage() {
    try {
        const database = await openDesignerDatabase()
        const transaction = database.transaction(designerDraftStore, 'readonly')
        const request = transaction.objectStore(designerDraftStore).get(designerDraftKey)
        const file = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
        database.close()
        return file
    } catch {
        return null
    }
}

function openDesignerDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(designerDraftDatabase, 1)
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(designerDraftStore)) {
                request.result.createObjectStore(designerDraftStore)
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

function finishDesignerTransaction(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
    })
}

function fitCanvasToImage() {
    if (!baseImage?.naturalWidth) return

    const isPhone = window.matchMedia('(max-width: 767px)').matches
    const workspaceWidth = document.getElementById('workspace')?.clientWidth || 0
    const maxW = isPhone ? Math.max(280, workspaceWidth - 2) : 1100
    const maxH = window.innerHeight * (isPhone ? 0.72 : 0.75)

    const w = baseImage.naturalWidth
    const h = baseImage.naturalHeight
    const scale = Math.min(maxW / w, maxH / h, isPhone ? Number.POSITIVE_INFINITY : 1)

    container.style.width = (w * scale) + "px"
    container.style.height = (h * scale) + "px"
    container.dataset.imageFit = 'natural'
}

function syncCanvasBackground() {
    if (!baseImage?.src) return

    let bg = document.getElementById("image-bg")

    if (isPhoneViewport()) {
        bg?.remove()
        return
    }

    if (!bg) {
        bg = document.createElement("div")
        bg.id = "image-bg"

        bg.style.position = "absolute"
        bg.style.inset = "0"
        bg.style.backgroundSize = "cover"
        bg.style.backgroundPosition = "center"
        bg.style.transform = "scale(1.2)"
        bg.style.filter = "blur(35px) brightness(0.6)"
        bg.style.pointerEvents = "none"

        bg.style.zIndex = "0"

        container.style.position = "relative"
        container.style.isolation = "isolate"

        container.prepend(bg)
    }

    bg.style.backgroundImage = `url(${baseImage.src})`
}

function snapshot() {
  const els = [...container.querySelectorAll('.draggable')].map(el => ({
    src: el.src,
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    height: el.style.height,
    zIndex: el.style.zIndex,
    rotation: el.dataset.rotation || "0",
    flip: el.dataset.flip || "1",
    flipY: el.dataset.flipY || "1",
    locked: el.dataset.locked || "0"
  }))
  return JSON.stringify({ els, zIndexCounter })
}

function saveState() {
  if (isRestoring) return
  const state = snapshot()
  if (history[history.length - 1] === state) return
  history.push(state)
  if (history.length > 80) history.shift()
  redoStack = []
}

function restore(stateStr) {
  const state = JSON.parse(stateStr)

  isRestoring = true
  container.querySelectorAll('.draggable').forEach(e => e.remove())

  zIndexCounter = state.zIndexCounter ?? 10

  state.els.forEach(d => {
    const el = document.createElement('img')

    el.src = d.src
    el.className = 'draggable absolute w-[110px] h-[110px] select-none'
    el.draggable = false

    el.style.left = d.left
    el.style.top = d.top
    el.style.width = d.width
    el.style.height = d.height
    el.style.zIndex = d.zIndex

    el.dataset.rotation = d.rotation
    el.dataset.flip = d.flip
    el.dataset.flipY = d.flipY || "1"
    el.dataset.locked = d.locked

    if (d.locked === "1") locked.add(el)

    applyTransform(el)
    makeInteractive(el)

    container.appendChild(el)
  })

  clearSelection()
  isRestoring = false
}

function undo() {
  if (history.length <= 1) return
  const current = history.pop()
  redoStack.push(current)
  restore(history[history.length - 1])
}

function redo() {
  if (!redoStack.length) return
  const state = redoStack.pop()
  history.push(state)
  restore(state)
}

function applyTransform(el) {
  const r = parseFloat(el.dataset.rotation || "0")
  const f = parseFloat(el.dataset.flip || "1")
  const fy = parseFloat(el.dataset.flipY || "1")
  el.style.transform = `rotate(${r}deg) scaleX(${f}) scaleY(${fy})`
  el.style.transformOrigin = "center"
}

function togglePlaceholder() {
  if (!placeholder) return
  const has = baseImage.src && baseImage.naturalWidth
  placeholder.classList.toggle('hidden', !!has)
  if (!has) {
    container.style.width = "800px"
    container.style.height = "560px"
  }
}

function optimizeSearchQuery(q) {
  const s = q.toLowerCase().trim()
  const plants = ['tree','mango','palm','banana','coconut','plant','flower','rose','orchid','fern','bush','shrub']
  return plants.some(w => s.includes(w))
    ? `${s} isolated plant white background`
    : `${s} isolated object clean background`
}

function filterBadResults(photos) {
  const bad = ['camera','phone','laptop','person','people','car','street','building','city','office']
  return photos.filter(p => !bad.some(b => (p.alt || '').toLowerCase().includes(b)))
}

function openSearchModal() {
  searchModal.classList.remove('hidden')
  searchModal.classList.add('flex')
  searchModal.setAttribute('aria-hidden', 'false')
}

function closeSearchModal() {
  searchModal.classList.add('hidden')
  searchModal.classList.remove('flex')
  searchModal.setAttribute('aria-hidden', 'true')
}

function blockIfNoBase() {
  return !(baseImage?.src && baseImage.naturalWidth)
}

async function searchPexels() {
  if (blockIfNoBase()) return

  const raw = searchInput.value.trim()
  if (!raw) return

  const query = optimizeSearchQuery(raw)

  searchResults.innerHTML = `<div class="col-span-full text-center text-[#ebe3a7]/70 font-semibold">Searching...</div>`
  openSearchModal()

  try {
    const res = await fetch(
      `/designer/search-assets?query=${encodeURIComponent(query)}&per_page=15`
    )

    if (!res.ok) throw new Error('Asset search failed')

    const data = await res.json()
    const photos = filterBadResults(data.photos || [])

    searchResults.innerHTML = photos.map(p => {
      const url = p.src.large2x || p.src.original
      const preview = p.src.medium

      return `
        <button onclick="selectSearchResult('${url}')" class="rounded-2xl overflow-hidden bg-white/10 border border-white/12 hover:scale-105 transition">
          <img src="${preview}" class="w-full h-44 object-cover pointer-events-none">
        </button>
      `
    }).join('')
  } catch {
    searchResults.innerHTML = `<div class="col-span-full text-center text-[#ebe3a7]/70 font-semibold">Search failed</div>`
  }
}

async function selectSearchResult(url) {
  if (blockIfNoBase()) return
  closeSearchModal()
  await removeBackground(url)
}

async function removeBackground(url) {
  if (blockIfNoBase()) return

  loadingText.classList.remove('hidden')
  loadingText.setAttribute('aria-hidden', 'false')

  try {
    const resp = await fetch('/designer/remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url })
    })

    const data = await resp.json()

    if (!resp.ok || !data.image) {
      throw new Error(data.error || data.detail || 'Garden designer backend error')
    }

    addElement(data.image)
    saveToInventory(data.image)

  } catch (error) {
    alert(error.message || 'Garden designer backend error')
  } finally {
    loadingText.classList.add('hidden')
    loadingText.setAttribute('aria-hidden', 'true')
  }
}

function saveToInventory(src) {
  if (inventory.includes(src)) return
  inventory.push(src)
  renderInventory()
}

function renderInventory() {
  inventoryContainer.innerHTML = inventory.map(src => `
    <button onclick="loadFromInventory('${src}')" class="rounded-xl overflow-hidden border border-white/16">
      <img src="${src}" class="w-full h-20 object-contain bg-white/10">
    </button>
  `).join('')
}

function loadFromInventory(src) {
  if (blockIfNoBase()) return
  addElement(src)
}

function addElement(src) {
  const el = document.createElement('img')
  const itemSize = isPhoneViewport()
    ? clamp(container.clientWidth * 0.3, 72, 112)
    : 110
  const left = Math.max(0, (container.clientWidth - itemSize) / 2)
  const top = Math.max(0, (container.clientHeight - itemSize) / 2)

  el.src = src
  el.className = 'draggable absolute w-[110px] h-[110px] select-none'
  el.draggable = false
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.width = `${itemSize}px`
  el.style.height = `${itemSize}px`
  el.width = Math.round(itemSize)
  el.height = Math.round(itemSize)
  el.style.zIndex = ++zIndexCounter

  el.dataset.rotation = "0"
  el.dataset.flip = "1"
  el.dataset.flipY = "1"
  el.dataset.locked = "0"

  applyTransform(el)

  container.appendChild(el)
  makeInteractive(el)
  select(el)

  saveState()
}

function stopActiveInteraction({ save = true } = {}) {
  if (!activeInteraction) return

  if (interactionFrame) {
    cancelAnimationFrame(interactionFrame)
    interactionFrame = 0
  }

  if (pendingInteractionEvent) {
    activeInteraction.update(pendingInteractionEvent)
    pendingInteractionEvent = null
  }

  activeInteraction.controller.abort()
  activeInteraction.target.classList.remove('is-manipulating')
  document.documentElement.classList.remove('designer-is-manipulating')
  activeInteraction = null

  if (save) saveState()
}

function startPointerInteraction(event, target, update) {
  stopActiveInteraction({ save: false })

  const controller = new AbortController()
  const pointerId = event.pointerId
  activeInteraction = { controller, pointerId, target, update }
  target.classList.add('is-manipulating')
  document.documentElement.classList.add('designer-is-manipulating')

  try {
    target.setPointerCapture(pointerId)
  } catch {
    // Window listeners still complete the gesture when capture is unavailable.
  }

  const queueUpdate = pointerEvent => {
    if (!activeInteraction || pointerEvent.pointerId !== pointerId) return
    pointerEvent.preventDefault()
    pendingInteractionEvent = pointerEvent

    if (interactionFrame) return
    interactionFrame = requestAnimationFrame(() => {
      interactionFrame = 0
      if (!activeInteraction || !pendingInteractionEvent) return
      const nextEvent = pendingInteractionEvent
      pendingInteractionEvent = null
      activeInteraction.update(nextEvent)
    })
  }

  const finish = pointerEvent => {
    if (!activeInteraction || pointerEvent.pointerId !== pointerId) return
    stopActiveInteraction()
  }

  window.addEventListener('pointermove', queueUpdate, { signal: controller.signal, passive: false })
  window.addEventListener('pointerup', finish, { signal: controller.signal })
  window.addEventListener('pointercancel', finish, { signal: controller.signal })
  target.addEventListener('lostpointercapture', finish, { signal: controller.signal })
}

function makeInteractive(el) {
  el.draggable = false

  el.addEventListener('pointerdown', event => {
    if (locked.has(el) || event.button > 0) return

    event.preventDefault()
    event.stopPropagation()
    select(el)

    const startX = event.clientX
    const startY = event.clientY
    const startLeft = el.offsetLeft
    const startTop = el.offsetTop

    startPointerInteraction(event, el, pointerEvent => {
      const maxLeft = container.clientWidth - el.offsetWidth
      const maxTop = container.clientHeight - el.offsetHeight
      const nextLeft = clamp(startLeft + pointerEvent.clientX - startX, 0, maxLeft)
      const nextTop = clamp(startTop + pointerEvent.clientY - startY, 0, maxTop)

      el.style.left = `${nextLeft}px`
      el.style.top = `${nextTop}px`
      updateControls()
    })
  })
}

function select(el) {
  clearSelection()
  selected = el
  el.classList.add('ring-4','ring-[#dca15d]')
  showControls(el)
  setMobileStudioPanel('edit')
}

function showControls(target) {
  deleteBtn?.remove()
  resizer?.remove()

  deleteBtn = document.createElement('button')
  deleteBtn.textContent = '×'
  deleteBtn.type = 'button'
  deleteBtn.setAttribute('aria-label', 'Delete selected asset')
  deleteBtn.className = 'designer-selection-control designer-selection-delete absolute z-[999] bg-red-500 text-white rounded-full'

  resizer = document.createElement('div')
  resizer.setAttribute('role', 'button')
  resizer.setAttribute('aria-label', 'Resize selected asset')
  resizer.className = 'designer-selection-control designer-selection-resize absolute z-[999] bg-[#dca15d]'

  deleteBtn.onclick = e => {
    e.stopPropagation()
    stopActiveInteraction({ save: false })
    target.remove()
    clearSelection()
    saveState()
  }
  deleteBtn.onpointerdown = e => e.stopPropagation()

  resizer.onpointerdown = event => {
    if (event.button > 0) return
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startY = event.clientY
    const startWidth = target.offsetWidth
    const startHeight = target.offsetHeight
    const aspectRatio = startWidth / Math.max(startHeight, 1)
    const minSize = isPhoneViewport() ? 48 : 36
    const maxWidth = Math.max(minSize, container.clientWidth - target.offsetLeft)
    const maxHeight = Math.max(minSize, container.clientHeight - target.offsetTop)

    startPointerInteraction(event, resizer, pointerEvent => {
      const horizontalDelta = pointerEvent.clientX - startX
      const verticalDelta = (pointerEvent.clientY - startY) * aspectRatio
      const delta = Math.abs(horizontalDelta) > Math.abs(verticalDelta)
        ? horizontalDelta
        : verticalDelta
      const width = clamp(startWidth + delta, minSize, Math.min(maxWidth, maxHeight * aspectRatio))
      const height = width / aspectRatio

      target.style.width = `${width}px`
      target.style.height = `${height}px`
      updateControls()
    })
  }

  container.appendChild(deleteBtn)
  container.appendChild(resizer)
  updateControls()
}

function updateControls() {
  if (!selected) return

  const x = selected.offsetLeft
  const y = selected.offsetTop
  const w = selected.offsetWidth
  const h = selected.offsetHeight
  const controlInset = isPhoneViewport() ? 20 : 14

  if (deleteBtn) {
    deleteBtn.style.left = `${x + w - controlInset}px`
    deleteBtn.style.top = `${y + controlInset}px`
  }

  if (resizer) {
    resizer.style.left = `${x + w - controlInset}px`
    resizer.style.top = `${y + h - controlInset}px`
  }
}

function clearSelection() {
  stopActiveInteraction({ save: false })
  selected?.classList.remove('ring-4')
  selected = null
  deleteBtn?.remove()
  resizer?.remove()
}

container.addEventListener('pointerdown', e => {
  if (e.target === container || e.target === baseImage) clearSelection()
})

function clearAll() {
  container.querySelectorAll('.draggable').forEach(e => e.remove())
  clearSelection()
  saveState()
}

function rotateSelected() {
  if (!selected) return
  selected.dataset.rotation = (parseFloat(selected.dataset.rotation) || 0) + 15
  applyTransform(selected)
  saveState()
}

function flipSelected() {
  if (!selected) return
  selected.dataset.flip = (parseFloat(selected.dataset.flip) === 1 ? -1 : 1)
  applyTransform(selected)
  saveState()
}

function flipYSelected() {
  if (!selected) return
  selected.dataset.flipY = (parseFloat(selected.dataset.flipY) === 1 ? -1 : 1)
  applyTransform(selected)
  saveState()
}

function duplicateSelected() {
  if (!selected) return
  const copy = selected.cloneNode(true)
  copy.style.left = clamp(
    selected.offsetLeft + 20,
    0,
    container.clientWidth - selected.offsetWidth
  ) + "px"
  copy.style.top = clamp(
    selected.offsetTop + 20,
    0,
    container.clientHeight - selected.offsetHeight
  ) + "px"
  copy.style.zIndex = ++zIndexCounter
  applyTransform(copy)
  makeInteractive(copy)
  container.appendChild(copy)
  saveState()
}

function deleteSelected() {
  if (!selected) return
  selected.remove()
  clearSelection()
  saveState()
}

function bringFront() {
  if (!selected) return
  selected.style.zIndex = ++zIndexCounter
  saveState()
}

function sendBack() {
  if (!selected) return
  selected.style.zIndex = 2
  saveState()
}

function toggleLock() {
  if (!selected) return
  const state = selected.dataset.locked === "1"
  selected.dataset.locked = state ? "0" : "1"

  if (state) locked.delete(selected)
  else locked.add(selected)

  saveState()
}

async function sendToBackend() {
  if (!baseImage?.src) return

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = baseImage.naturalWidth
  canvas.height = baseImage.naturalHeight

  const scaleX = baseImage.naturalWidth / Math.max(container.clientWidth, 1)
  const scaleY = baseImage.naturalHeight / Math.max(container.clientHeight, 1)

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height)

  const elements = [...container.querySelectorAll('.draggable')]

  for (const el of elements) {
    const img = new Image()
    img.src = el.src
    await img.decode().catch(() => {})

    const x = parseFloat(el.style.left || 0) * scaleX
    const y = parseFloat(el.style.top || 0) * scaleY
    const w = el.offsetWidth * scaleX
    const h = el.offsetHeight * scaleY

    const r = parseFloat(el.dataset.rotation || 0)
    const fx = parseFloat(el.dataset.flip || 1)
    const fy = parseFloat(el.dataset.flipY || 1)

    ctx.save()

    ctx.translate(x + w / 2 + 6, y + h / 2 + 6)
    ctx.rotate((r * Math.PI) / 180)
    ctx.scale(fx, fy)
    ctx.filter = "blur(6px) brightness(0.4)"
    ctx.drawImage(img, -w / 2, -h / 2, w, h)

    ctx.restore()

    ctx.save()

    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate((r * Math.PI) / 180)
    ctx.scale(fx, fy)
    ctx.filter = "none"
    ctx.drawImage(img, -w / 2, -h / 2, w, h)

    ctx.restore()
  }

  ctx.globalAlpha = 0.03
  ctx.fillStyle = "#fff"
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(0, i * 10, canvas.width, 1)
  }

  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'garden-ai.png'
  a.click()
  URL.revokeObjectURL(a.href)
}

window.undo = undo
window.redo = redo
window.searchPexels = searchPexels
window.selectSearchResult = selectSearchResult
window.closeSearchModal = closeSearchModal
window.loadFromInventory = loadFromInventory
window.clearSelection = clearSelection
window.clearAll = clearAll
window.rotateSelected = rotateSelected
window.flipSelected = flipSelected
window.flipYSelected = flipYSelected
window.duplicateSelected = duplicateSelected
window.deleteSelected = deleteSelected
window.bringFront = bringFront
window.sendBack = sendBack
window.toggleLock = toggleLock
window.sendToBackend = sendToBackend

baseImage?.addEventListener('load', togglePlaceholder)
initMobileStudio()
togglePlaceholder()
renderInventory()
saveState()
