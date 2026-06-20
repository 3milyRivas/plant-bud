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
const layersContainer = document.getElementById('designerLayers')
const projectNameInput = document.getElementById('designerProjectName')
const saveStatus = document.querySelector('[data-designer-save-status]')
const sizeInput = document.querySelector('[data-designer-size]')
const rotationInput = document.querySelector('[data-designer-rotation]')
const opacityInput = document.querySelector('[data-designer-opacity]')
const projectDataNode = document.getElementById('designerProjectData')
const projectRoot = document.querySelector('[data-designer-project-id]')
const designerProjectId = Number(projectRoot?.dataset.designerProjectId || 0)
const csrfToken = document.querySelector('[data-designer-csrf] input[name="_csrf"]')?.value || ''
const initialProject = readInitialProject()

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
let layerCounter = 0
let designerZoom = 1
let gridEnabled = false
let projectRestoreStarted = false
let projectSaveTimer = 0

const isPhoneViewport = () => window.matchMedia('(max-width: 767px)').matches
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max))

function freeMovementBounds(element) {
  const visibleGrip = Math.min(
    isPhoneViewport() ? 40 : 30,
    Math.max(18, element.offsetWidth * 0.3),
    Math.max(18, element.offsetHeight * 0.3)
  )

  return {
    minLeft: -element.offsetWidth + visibleGrip,
    maxLeft: container.clientWidth - visibleGrip,
    minTop: -element.offsetHeight + visibleGrip,
    maxTop: container.clientHeight - visibleGrip,
  }
}

function setMobileStudioPanel(panelName) {
  if (!isPhoneViewport()) return

  document.querySelectorAll('[data-designer-studio-tab]').forEach((tab) => {
    const isActive = tab.dataset.designerStudioTab === panelName
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-selected', String(isActive))
  })

  document.querySelectorAll('[data-designer-studio-panel]').forEach((panel) => {
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
  const layersSection = document.querySelector('.designer-layers-section')

  if (!assetsSlot || !editSlot || !searchSection || !inventorySection || !editSection) return

  assetsSlot.append(searchSection, inventorySection)
  editSlot.append(editSection)
  if (layersSection) editSlot.append(layersSection)

  document.querySelectorAll('[data-designer-studio-tab]').forEach((tab) => {
    tab.addEventListener('click', () => setMobileStudioPanel(tab.dataset.designerStudioTab))
  })

  setMobileStudioPanel('assets')
}

const canvas = document.getElementById('canvas-container')
const img = document.getElementById('baseImage')
const fileInput = document.getElementById('upload')

let hasBaseImage = false
let activeBaseImageUrl = null
let baseImageLoadToken = 0
const designerDraftDatabase = 'plant-bud-designer'
const designerDraftStore = 'drafts'
const designerDraftKey = `base-image-${designerProjectId || 'legacy'}`
const designerProjectKey = `project-state-${designerProjectId || 'legacy'}`

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (file) handleFile(file)
})

initPhoneUpload({ input: fileInput, onFile: handleFile, tool: 'designer' })
restoreDesignerImage()

function readInitialProject() {
  if (!projectDataNode) return null

  try {
    return JSON.parse(projectDataNode.textContent || 'null')
  } catch {
    return null
  }
}

let canvasResizeFrame = 0
window.addEventListener('resize', () => {
  if (!baseImage?.naturalWidth) return
  cancelAnimationFrame(canvasResizeFrame)
  canvasResizeFrame = requestAnimationFrame(() => {
    fitCanvasToImage()
    syncCanvasBackground()
  })
})

canvas.addEventListener('dragover', (e) => {
  if (hasBaseImage) return
  e.preventDefault()
  canvas.classList.add('ring-4', 'ring-[#dca15d]')
})

canvas.addEventListener('dragleave', () => {
  if (hasBaseImage) return
  canvas.classList.remove('ring-4', 'ring-[#dca15d]')
})

canvas.addEventListener('drop', (e) => {
  if (hasBaseImage) return

  e.preventDefault()
  canvas.classList.remove('ring-4', 'ring-[#dca15d]')

  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
})

async function handleFile(file, { persist = true } = {}) {
  if (!file.type.startsWith('image/')) return

  const loadToken = ++baseImageLoadToken
  const preparedFile = await prepareBaseImage(file)

  if (loadToken !== baseImageLoadToken) return
  if (persist) {
    const uploaded = await uploadDesignerImage(preparedFile)
    if (!uploaded) setSaveStatus('Saved on this device only')
    await persistDesignerImage(preparedFile)
    resetDesignElements()
    projectRestoreStarted = true
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
    placeholder.classList.add('hidden')
    img.classList.remove('hidden')
    hasBaseImage = true
    fitCanvasToImage()
    syncCanvasBackground()
    updateWorkspaceSummary()
    if (!projectRestoreStarted) restoreDesignerProject()
    else saveState()
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
  if (baseImage?.naturalWidth) return
  if (initialProject?.mediaUrl) return

  const file = await readDesignerImage()
  if (file) handleFile(file, { persist: false })
}

async function uploadDesignerImage(file) {
  if (!designerProjectId) return false

  try {
    const formData = new FormData()
    formData.append('image', file, file.name || `garden-${Date.now()}.jpg`)
    if (csrfToken) formData.append('_csrf', csrfToken)

    const response = await fetch(`/designer/projects/${designerProjectId}/image`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData,
    })
    const data = await response.json()

    return response.ok && data?.ok
  } catch {
    return false
  }
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

async function persistDesignerProject() {
  const projectState = {
    snapshot: snapshot(),
    inventory,
    projectName: projectNameInput?.value?.trim() || 'My garden concept',
    gridEnabled,
    savedAt: Date.now(),
  }

  try {
    const database = await openDesignerDatabase()
    const transaction = database.transaction(designerDraftStore, 'readwrite')
    transaction.objectStore(designerDraftStore).put(projectState, designerProjectKey)
    await finishDesignerTransaction(transaction)
    database.close()

    if (!designerProjectId) {
      setSaveStatus('Saved locally')
      return
    }

    const response = await fetch(`/designer/projects/${designerProjectId}`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
      },
      body: JSON.stringify({
        name: projectState.projectName,
        state: JSON.parse(projectState.snapshot),
        inventory,
      }),
    })

    if (!response.ok) throw new Error('Server save failed')
    setSaveStatus('Saved to Plant Bud')
  } catch {
    setSaveStatus('Saved on this device only')
  }
}

async function readDesignerProject() {
  try {
    const database = await openDesignerDatabase()
    const transaction = database.transaction(designerDraftStore, 'readonly')
    const request = transaction.objectStore(designerDraftStore).get(designerProjectKey)
    const project = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return project
  } catch {
    return null
  }
}

async function restoreDesignerProject() {
  if (projectRestoreStarted) return
  projectRestoreStarted = true

  const serverSnapshot = initialProject?.state ? JSON.stringify(initialProject.state) : null
  const project = serverSnapshot
    ? {
        snapshot: serverSnapshot,
        inventory: initialProject.inventory,
        projectName: initialProject.name,
        gridEnabled: false,
      }
    : await readDesignerProject()

  if (!project?.snapshot) {
    saveState()
    return
  }

  inventory = Array.isArray(project.inventory) ? project.inventory : []
  if (projectNameInput && project.projectName) projectNameInput.value = project.projectName
  gridEnabled = Boolean(project.gridEnabled)
  container.classList.toggle('designer-grid-enabled', gridEnabled)
  updateToggleButton(document.querySelector('[data-designer-grid]'), gridEnabled)
  renderInventory()
  restore(project.snapshot)
  history = [project.snapshot]
  redoStack = []
  setSaveStatus(serverSnapshot ? 'Saved to Plant Bud' : 'Project restored locally')
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

function scheduleProjectSave() {
  if (isRestoring) return
  setSaveStatus('Saving...')
  window.clearTimeout(projectSaveTimer)
  projectSaveTimer = window.setTimeout(persistDesignerProject, 350)
}

function setSaveStatus(message) {
  if (saveStatus) saveStatus.textContent = message
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

  container.style.width = w * scale + 'px'
  container.style.height = h * scale + 'px'
  container.dataset.imageFit = 'natural'
  applyDesignerZoom()
}

function syncCanvasBackground() {
  if (!baseImage?.src) return

  let bg = document.getElementById('image-bg')

  if (isPhoneViewport()) {
    bg?.remove()
    return
  }

  if (!bg) {
    bg = document.createElement('div')
    bg.id = 'image-bg'

    bg.style.position = 'absolute'
    bg.style.inset = '0'
    bg.style.backgroundSize = 'cover'
    bg.style.backgroundPosition = 'center'
    bg.style.transform = 'scale(1.2)'
    bg.style.filter = 'blur(35px) brightness(0.6)'
    bg.style.pointerEvents = 'none'

    bg.style.zIndex = '0'

    container.style.position = 'relative'
    container.style.isolation = 'isolate'

    container.prepend(bg)
  }

  bg.style.backgroundImage = `url(${baseImage.src})`
}

function snapshot() {
  const els = [...container.querySelectorAll('.draggable')].map((el) => ({
    id: el.dataset.layerId,
    name: el.dataset.layerName,
    src: el.src,
    left: el.style.left,
    top: el.style.top,
    width: el.style.width,
    height: el.style.height,
    zIndex: el.style.zIndex,
    rotation: el.dataset.rotation || '0',
    flip: el.dataset.flip || '1',
    flipY: el.dataset.flipY || '1',
    locked: el.dataset.locked || '0',
    opacity: el.dataset.opacity || '1',
    hidden: el.dataset.hidden || '0',
  }))
  return JSON.stringify({
    els,
    zIndexCounter,
    layerCounter,
    canvasWidth: container.clientWidth,
    canvasHeight: container.clientHeight,
    gridEnabled,
  })
}

function saveState() {
  if (isRestoring) return
  const state = snapshot()
  if (history[history.length - 1] === state) return
  history.push(state)
  if (history.length > 80) history.shift()
  redoStack = []
  renderLayers()
  updateWorkspaceSummary()
  scheduleProjectSave()
}

function restore(stateStr) {
  const state = JSON.parse(stateStr)
  const scaleX =
    container.clientWidth / Math.max(Number(state.canvasWidth) || container.clientWidth, 1)
  const scaleY =
    container.clientHeight / Math.max(Number(state.canvasHeight) || container.clientHeight, 1)

  isRestoring = true
  container.querySelectorAll('.draggable').forEach((e) => e.remove())
  locked = new WeakSet()

  zIndexCounter = state.zIndexCounter ?? 10
  const stateElements = Array.isArray(state.els) ? state.els : []
  layerCounter = state.layerCounter ?? stateElements.length
  gridEnabled = Boolean(state.gridEnabled)
  container.classList.toggle('designer-grid-enabled', gridEnabled)
  updateToggleButton(document.querySelector('[data-designer-grid]'), gridEnabled)

  stateElements.forEach((d) => {
    const el = document.createElement('img')

    el.src = d.src
    el.className = 'draggable absolute w-[110px] h-[110px] select-none'
    el.draggable = false

    el.style.left = `${parseFloat(d.left || 0) * scaleX}px`
    el.style.top = `${parseFloat(d.top || 0) * scaleY}px`
    el.style.width = `${parseFloat(d.width || 110) * scaleX}px`
    el.style.height = `${parseFloat(d.height || 110) * scaleY}px`
    el.style.zIndex = d.zIndex

    el.dataset.layerId = d.id || `layer-${++layerCounter}`
    el.dataset.layerName = d.name || `Object ${layerCounter}`
    el.dataset.rotation = d.rotation
    el.dataset.flip = d.flip
    el.dataset.flipY = d.flipY || '1'
    el.dataset.locked = d.locked
    el.dataset.opacity = d.opacity || '1'
    el.dataset.hidden = d.hidden || '0'
    el.style.opacity = el.dataset.opacity
    el.classList.toggle('designer-layer-hidden', el.dataset.hidden === '1')

    if (d.locked === '1') locked.add(el)

    applyTransform(el)
    makeInteractive(el)

    container.appendChild(el)
  })

  clearSelection()
  isRestoring = false
  renderLayers()
  updateWorkspaceSummary()
}

function undo() {
  if (history.length <= 1) return
  const current = history.pop()
  redoStack.push(current)
  restore(history[history.length - 1])
  scheduleProjectSave()
}

function redo() {
  if (!redoStack.length) return
  const state = redoStack.pop()
  history.push(state)
  restore(state)
  scheduleProjectSave()
}

function applyTransform(el) {
  const r = parseFloat(el.dataset.rotation || '0')
  const f = parseFloat(el.dataset.flip || '1')
  const fy = parseFloat(el.dataset.flipY || '1')
  el.style.transform = `rotate(${r}deg) scaleX(${f}) scaleY(${fy})`
  el.style.transformOrigin = 'center'
}

function togglePlaceholder() {
  if (!placeholder) return
  const has = baseImage.src && baseImage.naturalWidth
  placeholder.classList.toggle('hidden', !!has)
  if (!has) {
    container.style.width = '800px'
    container.style.height = '560px'
  }
}

function openSearchModal() {
  searchModal.classList.remove('hidden')
  searchModal.classList.add('flex')
  searchModal.setAttribute('aria-hidden', 'false')
}

function resetDesignElements() {
  clearSelection()
  container.querySelectorAll('.draggable').forEach((element) => element.remove())
  history = []
  redoStack = []
  inventory = []
  zIndexCounter = 10
  layerCounter = 0
  renderInventory()
  renderLayers()
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

  searchResults.innerHTML = `<div class="designer-search-state">Finding clean, relevant assets...</div>`
  openSearchModal()

  try {
    const res = await fetch(`/designer/search-assets?query=${encodeURIComponent(raw)}&per_page=40`)

    if (!res.ok) throw new Error('Asset search failed')

    const data = await res.json()
    renderSearchResults(data.photos || [], data.intent || raw)
  } catch {
    searchResults.innerHTML = `<div class="designer-search-state is-error">Search failed. Try a more specific object name.</div>`
  }
}

function renderSearchResults(photos, intent) {
  photos = photos.slice(0, 20)
  searchResults.replaceChildren()
  const resultCount = document.querySelector('[data-designer-search-count]')
  if (resultCount) {
    resultCount.textContent = photos.length
      ? `${photos.length} ${intent} options`
      : `No precise matches for ${intent}`
  }

  if (!photos.length) {
    const empty = document.createElement('div')
    empty.className = 'designer-search-state'
    empty.textContent = 'No precise matches yet. Try “garden table”, “palm” or “outdoor chair”.'
    searchResults.appendChild(empty)
    return
  }

  photos.forEach((photo) => {
    const url = photo.src?.large2x || photo.src?.original || photo.src?.medium
    const preview = photo.src?.medium || url
    if (!url || !preview) return

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'designer-search-result'
    button.setAttribute('aria-label', `Use ${photo.alt || intent}`)
    button.addEventListener('click', () => selectSearchResult(url, photo.alt || intent))

    const imageWrap = document.createElement('span')
    imageWrap.className = 'designer-search-result-image'
    const image = document.createElement('img')
    image.src = preview
    image.alt = ''
    image.loading = 'lazy'
    image.decoding = 'async'
    imageWrap.appendChild(image)

    const copy = document.createElement('span')
    copy.className = 'designer-search-result-copy'
    const title = document.createElement('strong')
    title.textContent = photo.alt || intent
    const badge = document.createElement('small')
    badge.textContent = photo.cleanBackground ? 'Clean background' : 'AI cutout ready'
    copy.append(title, badge)
    button.append(imageWrap, copy)
    searchResults.appendChild(button)
  })
}

async function selectSearchResult(url, label = 'Garden object') {
  if (blockIfNoBase()) return
  closeSearchModal()
  await removeBackground(url, label)
}

async function removeBackground(url, label) {
  if (blockIfNoBase()) return

  loadingText.classList.remove('hidden')
  loadingText.setAttribute('aria-hidden', 'false')

  try {
    const resp = await fetch('/designer/remove-background', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url }),
    })

    const data = await resp.json()

    if (!resp.ok || !data.image) {
      throw new Error(data.error || data.detail || 'Garden designer backend error')
    }

    addElement(data.image, label)
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
  if (!inventory.length) {
    inventoryContainer.innerHTML = `
      <div class="col-span-1 sm:col-span-2 text-center py-8 rounded-3xl bg-white/10 border border-white/14">
        <p class="text-white/55 text-sm font-semibold">No assets yet. Search above to build your palette.</p>
      </div>
    `
    return
  }

  inventoryContainer.innerHTML = inventory
    .map(
      (src) => `
    <button type="button" data-inventory-src="${encodeURIComponent(src)}" class="rounded-xl overflow-hidden border border-white/16">
      <img src="${src}" class="w-full h-20 object-contain bg-white/10">
    </button>
  `
    )
    .join('')

  inventoryContainer.querySelectorAll('[data-inventory-src]').forEach((button) => {
    button.addEventListener('click', () =>
      loadFromInventory(decodeURIComponent(button.dataset.inventorySrc))
    )
  })
}

function loadFromInventory(src) {
  if (blockIfNoBase()) return
  addElement(src)
}

function addElement(src, label = 'Garden object') {
  const el = document.createElement('img')
  const itemSize = isPhoneViewport() ? clamp(container.clientWidth * 0.3, 72, 112) : 110
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

  el.dataset.layerId = `layer-${++layerCounter}`
  el.dataset.layerName = label.slice(0, 60)
  el.dataset.rotation = '0'
  el.dataset.flip = '1'
  el.dataset.flipY = '1'
  el.dataset.locked = '0'
  el.dataset.opacity = '1'
  el.dataset.hidden = '0'

  applyTransform(el)

  container.appendChild(el)
  makeInteractive(el)
  select(el)

  saveState()
}

function renderLayers() {
  if (!layersContainer) return

  const elements = [...container.querySelectorAll('.draggable')].sort(
    (a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0)
  )

  document.querySelectorAll('[data-designer-layer-count]').forEach((count) => {
    count.textContent = String(elements.length)
  })

  layersContainer.replaceChildren()

  if (!elements.length) {
    const empty = document.createElement('p')
    empty.className = 'designer-layers-empty'
    empty.textContent = 'Your placed objects will appear here.'
    layersContainer.appendChild(empty)
    return
  }

  elements.forEach((element, index) => {
    const row = document.createElement('div')
    row.className = 'designer-layer-row'
    row.classList.toggle('is-selected', element === selected)
    row.classList.toggle('is-hidden', element.dataset.hidden === '1')

    const selectButton = document.createElement('button')
    selectButton.type = 'button'
    selectButton.className = 'designer-layer-select'
    selectButton.setAttribute('aria-label', `Select ${element.dataset.layerName}`)

    const thumbnail = document.createElement('img')
    thumbnail.src = element.src
    thumbnail.alt = ''

    const copy = document.createElement('span')
    const name = document.createElement('strong')
    name.textContent = element.dataset.layerName || `Object ${elements.length - index}`
    const meta = document.createElement('small')
    meta.textContent =
      element.dataset.locked === '1' ? 'Locked' : `Layer ${elements.length - index}`
    copy.append(name, meta)
    selectButton.append(thumbnail, copy)
    selectButton.addEventListener('click', () => select(element))

    const visibility = document.createElement('button')
    visibility.type = 'button'
    visibility.className = 'designer-layer-action'
    visibility.textContent = element.dataset.hidden === '1' ? 'Show' : 'Hide'
    visibility.setAttribute('aria-label', `${visibility.textContent} ${element.dataset.layerName}`)
    visibility.addEventListener('click', () => {
      element.dataset.hidden = element.dataset.hidden === '1' ? '0' : '1'
      element.classList.toggle('designer-layer-hidden', element.dataset.hidden === '1')
      if (element.dataset.hidden === '1' && selected === element) clearSelection()
      saveState()
    })

    const lock = document.createElement('button')
    lock.type = 'button'
    lock.className = 'designer-layer-action'
    lock.textContent = element.dataset.locked === '1' ? 'Unlock' : 'Lock'
    lock.setAttribute('aria-label', `${lock.textContent} ${element.dataset.layerName}`)
    lock.addEventListener('click', () => {
      setElementLocked(element, element.dataset.locked !== '1')
      saveState()
    })

    row.append(selectButton, visibility, lock)
    layersContainer.appendChild(row)
  })
}

function setElementLocked(element, shouldLock) {
  element.dataset.locked = shouldLock ? '1' : '0'
  if (shouldLock) locked.add(element)
  else locked.delete(element)
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

  const queueUpdate = (pointerEvent) => {
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

  const finish = (pointerEvent) => {
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

  el.addEventListener('pointerdown', (event) => {
    if (locked.has(el) || event.button > 0) return

    event.preventDefault()
    event.stopPropagation()
    select(el)

    const startX = event.clientX
    const startY = event.clientY
    const startLeft = el.offsetLeft
    const startTop = el.offsetTop

    startPointerInteraction(event, el, (pointerEvent) => {
      const bounds = freeMovementBounds(el)
      const nextLeft = clamp(
        startLeft + (pointerEvent.clientX - startX) / designerZoom,
        bounds.minLeft,
        bounds.maxLeft
      )
      const nextTop = clamp(
        startTop + (pointerEvent.clientY - startY) / designerZoom,
        bounds.minTop,
        bounds.maxTop
      )

      el.style.left = `${nextLeft}px`
      el.style.top = `${nextTop}px`
      updateControls()
    })
  })
}

function select(el) {
  if (el.dataset.hidden === '1') return
  clearSelection()
  selected = el
  el.classList.add('ring-4', 'ring-[#dca15d]')
  showControls(el)
  syncPrecisionControls()
  renderLayers()
  setMobileStudioPanel('edit')
}

function showControls(target) {
  deleteBtn?.remove()
  resizer?.remove()

  deleteBtn = document.createElement('button')
  deleteBtn.textContent = '×'
  deleteBtn.type = 'button'
  deleteBtn.setAttribute('aria-label', 'Delete selected asset')
  deleteBtn.className =
    'designer-selection-control designer-selection-delete absolute z-[999] bg-red-500 text-white rounded-full'

  resizer = document.createElement('div')
  resizer.setAttribute('role', 'button')
  resizer.setAttribute('aria-label', 'Resize selected asset')
  resizer.className =
    'designer-selection-control designer-selection-resize absolute z-[999] bg-[#dca15d]'

  deleteBtn.onclick = (e) => {
    e.stopPropagation()
    stopActiveInteraction({ save: false })
    target.remove()
    clearSelection()
    saveState()
  }
  deleteBtn.onpointerdown = (e) => e.stopPropagation()

  resizer.onpointerdown = (event) => {
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

    startPointerInteraction(event, resizer, (pointerEvent) => {
      const horizontalDelta = (pointerEvent.clientX - startX) / designerZoom
      const verticalDelta = ((pointerEvent.clientY - startY) / designerZoom) * aspectRatio
      const delta =
        Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta
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
  const controlRadius = isPhoneViewport() ? 20 : 14
  const minControlPosition = controlRadius + 2
  const maxControlX = Math.max(minControlPosition, container.clientWidth - controlRadius - 2)
  const maxControlY = Math.max(minControlPosition, container.clientHeight - controlRadius - 2)

  if (deleteBtn) {
    deleteBtn.style.left = `${clamp(x + w - controlInset, minControlPosition, maxControlX)}px`
    deleteBtn.style.top = `${clamp(y + controlInset, minControlPosition, maxControlY)}px`
  }

  if (resizer) {
    resizer.style.left = `${clamp(x + w - controlInset, minControlPosition, maxControlX)}px`
    resizer.style.top = `${clamp(y + h - controlInset, minControlPosition, maxControlY)}px`
  }
}

function clearSelection() {
  stopActiveInteraction({ save: false })
  selected?.classList.remove('ring-4')
  selected = null
  deleteBtn?.remove()
  resizer?.remove()
  syncPrecisionControls()
  renderLayers()
}

container.addEventListener('pointerdown', (e) => {
  if (e.target === container || e.target === baseImage) clearSelection()
})

function clearAll() {
  container.querySelectorAll('.draggable').forEach((e) => e.remove())
  clearSelection()
  saveState()
}

function rotateSelected() {
  if (!selected) return
  selected.dataset.rotation = (parseFloat(selected.dataset.rotation) || 0) + 15
  applyTransform(selected)
  syncPrecisionControls()
  saveState()
}

function updateWorkspaceSummary() {
  const count = container.querySelectorAll('.draggable').length
  document.querySelectorAll('[data-designer-layer-count]').forEach((element) => {
    element.textContent = String(count)
  })
}

function updateToggleButton(button, active) {
  if (!button) return
  button.setAttribute('aria-pressed', String(active))
  button.classList.toggle('is-active', active)
}

function applyDesignerZoom() {
  container.style.zoom = String(designerZoom)
  document.querySelectorAll('[data-designer-zoom-label]').forEach((label) => {
    label.textContent = `${Math.round(designerZoom * 100)}%`
  })
}

function changeDesignerZoom(delta) {
  designerZoom = clamp(Math.round((designerZoom + delta) * 100) / 100, 0.65, 1.6)
  applyDesignerZoom()
}

function toggleOriginalView() {
  const active = !container.classList.contains('designer-show-original')
  clearSelection()
  container.classList.toggle('designer-show-original', active)
  updateToggleButton(document.querySelector('[data-designer-compare]'), active)
}

function toggleGrid() {
  gridEnabled = !gridEnabled
  container.classList.toggle('designer-grid-enabled', gridEnabled)
  updateToggleButton(document.querySelector('[data-designer-grid]'), gridEnabled)
  scheduleProjectSave()
}

function bindDesignerStudioControls() {
  document.querySelectorAll('[data-designer-search-suggestion]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!searchInput) return
      searchInput.value = button.dataset.designerSearchSuggestion || ''
      searchPexels()
    })
  })

  searchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    searchPexels()
  })

  document.querySelector('[data-designer-compare]')?.addEventListener('click', toggleOriginalView)
  document.querySelector('[data-designer-grid]')?.addEventListener('click', toggleGrid)
  document
    .querySelector('[data-designer-zoom-in]')
    ?.addEventListener('click', () => changeDesignerZoom(0.1))
  document
    .querySelector('[data-designer-zoom-out]')
    ?.addEventListener('click', () => changeDesignerZoom(-0.1))
  document.querySelector('[data-designer-reset-view]')?.addEventListener('click', () => {
    designerZoom = 1
    applyDesignerZoom()
  })

  sizeInput?.addEventListener('input', () => resizeSelected(Number(sizeInput.value)))
  sizeInput?.addEventListener('change', saveState)
  rotationInput?.addEventListener('input', () => {
    if (!selected) return
    selected.dataset.rotation = rotationInput.value
    applyTransform(selected)
    syncPrecisionControls()
  })
  rotationInput?.addEventListener('change', saveState)
  opacityInput?.addEventListener('input', () => {
    if (!selected) return
    const opacity = Number(opacityInput.value) / 100
    selected.dataset.opacity = String(opacity)
    selected.style.opacity = String(opacity)
    syncPrecisionControls()
  })
  opacityInput?.addEventListener('change', saveState)

  document.querySelectorAll('[data-designer-align]').forEach((button) => {
    button.addEventListener('click', () => alignSelected(button.dataset.designerAlign))
  })

  projectNameInput?.addEventListener('input', scheduleProjectSave)

  document.addEventListener('keydown', (event) => {
    const target = event.target
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      event.shiftKey ? redo() : undo()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
      event.preventDefault()
      deleteSelected()
      return
    }
    if (!selected || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return

    event.preventDefault()
    const distance = event.shiftKey ? 10 : 1
    const left =
      selected.offsetLeft +
      (event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0)
    const top =
      selected.offsetTop +
      (event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0)
    const bounds = freeMovementBounds(selected)
    selected.style.left = `${clamp(left, bounds.minLeft, bounds.maxLeft)}px`
    selected.style.top = `${clamp(top, bounds.minTop, bounds.maxTop)}px`
    updateControls()
    saveState()
  })
}

function flipSelected() {
  if (!selected) return
  selected.dataset.flip = parseFloat(selected.dataset.flip) === 1 ? -1 : 1
  applyTransform(selected)
  saveState()
}

function flipYSelected() {
  if (!selected) return
  selected.dataset.flipY = parseFloat(selected.dataset.flipY) === 1 ? -1 : 1
  applyTransform(selected)
  saveState()
}

function duplicateSelected() {
  if (!selected) return
  const copy = selected.cloneNode(true)
  const bounds = freeMovementBounds(selected)
  copy.style.left = clamp(selected.offsetLeft + 20, bounds.minLeft, bounds.maxLeft) + 'px'
  copy.style.top = clamp(selected.offsetTop + 20, bounds.minTop, bounds.maxTop) + 'px'
  copy.style.zIndex = ++zIndexCounter
  copy.dataset.layerId = `layer-${++layerCounter}`
  copy.dataset.layerName = `${selected.dataset.layerName || 'Object'} copy`
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
  const state = selected.dataset.locked === '1'
  setElementLocked(selected, !state)
  if (!state) clearSelection()

  saveState()
}

function syncPrecisionControls() {
  const disabled = !selected
  const width = selected ? Math.round(selected.offsetWidth) : 110
  const rotation = selected ? Math.round(parseFloat(selected.dataset.rotation || '0')) : 0
  const opacity = selected ? Math.round(parseFloat(selected.dataset.opacity || '1') * 100) : 100

  if (sizeInput) {
    sizeInput.disabled = disabled
    sizeInput.value = String(width)
  }
  if (rotationInput) {
    rotationInput.disabled = disabled
    rotationInput.value = String(rotation)
  }
  if (opacityInput) {
    opacityInput.disabled = disabled
    opacityInput.value = String(opacity)
  }

  document.querySelector('[data-designer-size-value]')?.replaceChildren(`${width} px`)
  document.querySelector('[data-designer-rotation-value]')?.replaceChildren(`${rotation} deg`)
  document.querySelector('[data-designer-opacity-value]')?.replaceChildren(`${opacity}%`)
  document
    .querySelector('[data-designer-precision-controls]')
    ?.classList.toggle('is-disabled', disabled)
}

function resizeSelected(width) {
  if (!selected) return
  const aspectRatio = selected.offsetWidth / Math.max(selected.offsetHeight, 1)
  const maxWidth = Math.max(40, container.clientWidth - selected.offsetLeft)
  const maxHeight = Math.max(40, container.clientHeight - selected.offsetTop)
  const nextWidth = clamp(width, 40, Math.min(maxWidth, maxHeight * aspectRatio))
  selected.style.width = `${nextWidth}px`
  selected.style.height = `${nextWidth / aspectRatio}px`
  updateControls()
  syncPrecisionControls()
}

function alignSelected(axis) {
  if (!selected) return
  if (axis === 'horizontal') {
    selected.style.left = `${Math.max(0, (container.clientWidth - selected.offsetWidth) / 2)}px`
  } else {
    selected.style.top = `${Math.max(0, (container.clientHeight - selected.offsetHeight) / 2)}px`
  }
  updateControls()
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
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height)

  const elements = [...container.querySelectorAll('.draggable')].filter(
    (element) => element.dataset.hidden !== '1'
  )

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
    const opacity = parseFloat(el.dataset.opacity || 1)

    ctx.save()

    ctx.globalAlpha = opacity * 0.45
    ctx.translate(x + w / 2 + 6, y + h / 2 + 6)
    ctx.rotate((r * Math.PI) / 180)
    ctx.scale(fx, fy)
    ctx.filter = 'blur(6px) brightness(0.4)'
    ctx.drawImage(img, -w / 2, -h / 2, w, h)

    ctx.restore()

    ctx.save()

    ctx.globalAlpha = opacity
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate((r * Math.PI) / 180)
    ctx.scale(fx, fy)
    ctx.filter = 'none'
    ctx.drawImage(img, -w / 2, -h / 2, w, h)

    ctx.restore()
  }

  ctx.globalAlpha = 0.03
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(0, i * 10, canvas.width, 1)
  }

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))

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

function initializeStoredBaseImage() {
  if (!baseImage?.naturalWidth || activeBaseImageUrl) return

  hasBaseImage = true
  fitCanvasToImage()
  syncCanvasBackground()
  togglePlaceholder()
  restoreDesignerProject()
}

baseImage?.addEventListener('load', initializeStoredBaseImage)
if (baseImage?.complete) initializeStoredBaseImage()
initMobileStudio()
bindDesignerStudioControls()
togglePlaceholder()
renderInventory()
renderLayers()
syncPrecisionControls()
applyDesignerZoom()
history = [snapshot()]
