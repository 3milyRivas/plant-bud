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

const canvas = document.getElementById("canvas-container")
const img = document.getElementById("baseImage")
const fileInput = document.getElementById("upload")

let hasBaseImage = false

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
})

canvas.addEventListener("dragover", (e) => {
    if (hasBaseImage) return
    e.preventDefault()
    canvas.classList.add("ring-4", "ring-[#EDE7D6]")
})

canvas.addEventListener("dragleave", () => {
    if (hasBaseImage) return
    canvas.classList.remove("ring-4", "ring-[#EDE7D6]")
})

canvas.addEventListener("drop", (e) => {
    if (hasBaseImage) return

    e.preventDefault()
    canvas.classList.remove("ring-4", "ring-[#EDE7D6]")

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
})

function handleFile(file) {
    if (!file.type.startsWith("image/")) return

    const url = URL.createObjectURL(file)

    img.onload = () => {
        placeholder.classList.add("hidden")
        img.classList.remove("hidden")
        hasBaseImage = true
        fitCanvasToImage()
        syncCanvasBackground()
    }

    img.src = url
}

function fitCanvasToImage() {
    if (!baseImage?.naturalWidth) return

    const maxW = 1100
    const maxH = window.innerHeight * 0.75

    const w = baseImage.naturalWidth
    const h = baseImage.naturalHeight

    const scale = Math.min(maxW / w, maxH / h, 1)

    container.style.width = (w * scale) + "px"
    container.style.height = (h * scale) + "px"
}

function syncCanvasBackground() {
    if (!baseImage?.src) return

    let bg = document.getElementById("image-bg")

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
  history.push(snapshot())
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

upload?.addEventListener('change', e => {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    baseImage.onload = () => {
      togglePlaceholder()
      hasBaseImage = true
      fitCanvasToImage()
      syncCanvasBackground()
    }
    baseImage.src = reader.result
  }
  reader.readAsDataURL(file)
})

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
}

function closeSearchModal() {
  searchModal.classList.add('hidden')
  searchModal.classList.remove('flex')
}

function blockIfNoBase() {
  return !(baseImage?.src && baseImage.naturalWidth)
}

async function searchPexels() {
  if (blockIfNoBase()) return

  const raw = searchInput.value.trim()
  if (!raw) return

  const query = optimizeSearchQuery(raw)

  searchResults.innerHTML = `<div class="col-span-full text-center text-white/60">Searching...</div>`
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
        <button onclick="selectSearchResult('${url}')" class="rounded-2xl overflow-hidden bg-white/10 hover:scale-105 transition">
          <img src="${preview}" class="w-full h-44 object-cover pointer-events-none">
        </button>
      `
    }).join('')
  } catch {
    searchResults.innerHTML = `<div class="col-span-full text-center text-white/60">Search failed</div>`
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
  }
}

function saveToInventory(src) {
  if (inventory.includes(src)) return
  inventory.push(src)
  renderInventory()
}

function renderInventory() {
  inventoryContainer.innerHTML = inventory.map(src => `
    <button onclick="loadFromInventory('${src}')" class="rounded-xl overflow-hidden border border-white/20">
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

  el.src = src
  el.className = 'draggable absolute w-[110px] h-[110px] select-none'
  el.style.left = '120px'
  el.style.top = '120px'
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

function makeInteractive(el) {
  let ox = 0, oy = 0

  el.addEventListener('pointerdown', e => {
    if (locked.has(el)) return

    e.preventDefault()
    select(el)

    el.setPointerCapture(e.pointerId)

    ox = e.clientX - el.offsetLeft
    oy = e.clientY - el.offsetTop

    const move = ev => {
      el.style.left = `${ev.clientX - ox}px`
      el.style.top = `${ev.clientY - oy}px`
      updateControls()
    }

    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      saveState()
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  })
}

function select(el) {
  clearSelection()
  selected = el
  el.classList.add('ring-4','ring-[#EDE7D6]')
  showControls(el)
}

function showControls(target) {
  deleteBtn?.remove()
  resizer?.remove()

  deleteBtn = document.createElement('button')
  deleteBtn.textContent = '×'
  deleteBtn.className = 'absolute z-[999] w-6 h-6 bg-red-500 text-white rounded-full'

  resizer = document.createElement('div')
  resizer.className = 'absolute z-[999] w-3 h-3 bg-[#EDE7D6]'

  deleteBtn.onclick = e => {
    e.stopPropagation()
    target.remove()
    clearSelection()
    saveState()
  }

  let sx=0, sy=0, sw=0, sh=0

  resizer.onpointerdown = e => {
    sx = e.clientX
    sy = e.clientY
    sw = target.offsetWidth
    sh = target.offsetHeight

    const move = ev => {
      target.style.width = `${sw + (ev.clientX - sx)}px`
      target.style.height = `${sh + (ev.clientY - sy)}px`
      updateControls()
    }

    const up = () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      saveState()
    }

    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
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

  if (deleteBtn) {
    deleteBtn.style.left = `${x + w - 10}px`
    deleteBtn.style.top = `${y - 10}px`
  }

  if (resizer) {
    resizer.style.left = `${x + w - 6}px`
    resizer.style.top = `${y + h - 6}px`
  }
}

function clearSelection() {
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
  copy.style.left = (selected.offsetLeft + 20) + "px"
  copy.style.top = (selected.offsetTop + 20) + "px"
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

  const scaleX = baseImage.naturalWidth / baseImage.offsetWidth
  const scaleY = baseImage.naturalHeight / baseImage.offsetHeight

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
togglePlaceholder()
renderInventory()
saveState()
