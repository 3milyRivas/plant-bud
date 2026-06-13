let activePoll = null
let activeCamera = null
let cameraPreviewUrl = null
let cameraStream = null

export function initPhoneUpload({ input, onFile, tool = 'plant-bud' }) {
  if (!input || typeof onFile !== 'function') return

  bindUploadMenus()
  bindCameraModal()

  document.querySelectorAll(`[data-phone-upload-trigger][data-phone-upload-input="#${input.id}"]`).forEach((button) => {
    if (button.dataset.phoneUploadReady === 'true') return

    button.dataset.phoneUploadReady = 'true'
    button.addEventListener('click', () => {
      closeUploadMenus()
      openPhoneUpload({
        input,
        onFile,
        tool: button.dataset.phoneUploadTool || tool,
        toolLabel: button.dataset.phoneUploadToolLabel || 'Plant Bud',
      })
    })
  })

  document.querySelectorAll(`[data-phone-camera-trigger][data-phone-upload-input="#${input.id}"]`).forEach((button) => {
    if (button.dataset.phoneCameraReady === 'true') return

    button.dataset.phoneCameraReady = 'true'
    button.addEventListener('click', () => {
      closeUploadMenus()
      openDeviceCamera({
        input,
        onFile,
        toolLabel: button.dataset.phoneUploadToolLabel || 'Plant Bud',
      })
    })
  })
}

function bindCameraModal() {
  const modal = document.querySelector('[data-phone-camera-modal]')

  if (!modal || modal.dataset.phoneCameraReady === 'true') return

  const cameraInput = modal.querySelector('[data-phone-camera-input]')
  const capture = modal.querySelector('[data-phone-camera-capture]')
  const retake = modal.querySelector('[data-phone-camera-retake]')
  const usePhoto = modal.querySelector('[data-phone-camera-use]')

  modal.dataset.phoneCameraReady = 'true'
  cameraInput?.addEventListener('change', () => {
    const file = cameraInput.files?.[0]

    if (file) reviewCameraPhoto(file)
  })
  capture?.addEventListener('click', captureCameraPhoto)
  retake?.addEventListener('click', startCameraPreview)
  usePhoto?.addEventListener('click', confirmCameraPhoto)
}

function openDeviceCamera({ input, onFile, toolLabel }) {
  activeCamera = { input, onFile, toolLabel, file: null }
  openCameraModal()
  startCameraPreview()
}

function openCameraModal() {
  const modal = document.querySelector('[data-phone-camera-modal]')
  const label = modal?.querySelector('[data-phone-camera-tool-label]')

  if (!modal || !activeCamera) return

  if (label) label.textContent = activeCamera.toolLabel
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  modal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('overflow-hidden')
}

async function startCameraPreview() {
  const modal = document.querySelector('[data-phone-camera-modal]')
  const video = modal?.querySelector('[data-phone-camera-video]')
  const preview = modal?.querySelector('[data-phone-camera-preview]')
  const status = modal?.querySelector('[data-phone-camera-status]')
  const title = modal?.querySelector('[data-phone-camera-title]')
  const help = modal?.querySelector('[data-phone-camera-help]')
  const reviewHelp = modal?.querySelector('[data-phone-camera-review-help]')
  const liveActions = modal?.querySelector('[data-phone-camera-live-actions]')
  const reviewActions = modal?.querySelector('[data-phone-camera-review-actions]')

  if (!modal || !video || !activeCamera) return

  stopCameraStream()
  releaseCameraPreview()
  activeCamera.file = null
  preview?.classList.add('hidden')
  preview?.removeAttribute('src')
  video.classList.add('hidden')
  status?.classList.remove('hidden')
  if (status) status.textContent = 'Starting camera...'
  if (title) title.textContent = 'Take a photo'
  help?.classList.remove('hidden')
  reviewHelp?.classList.add('hidden')
  liveActions?.classList.remove('hidden')
  reviewActions?.classList.add('hidden')
  reviewActions?.classList.remove('grid')

  if (!navigator.mediaDevices?.getUserMedia) {
    launchCameraInput()
    return
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    })
    video.srcObject = cameraStream
    await video.play()
    status?.classList.add('hidden')
    video.classList.remove('hidden')
  } catch {
    launchCameraInput()
  }
}

function captureCameraPhoto() {
  const modal = document.querySelector('[data-phone-camera-modal]')
  const video = modal?.querySelector('[data-phone-camera-video]')
  const canvas = modal?.querySelector('[data-phone-camera-canvas]')

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) return

  const maxSide = 2048
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      reviewCameraPhoto(
        new File([blob], `plant-bud-camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
      )
    },
    'image/jpeg',
    0.9
  )
}

function launchCameraInput() {
  const cameraInput = document.querySelector('[data-phone-camera-input]')

  if (!cameraInput || !activeCamera) return

  cameraInput.value = ''
  cameraInput.click()
}

function reviewCameraPhoto(file) {
  const modal = document.querySelector('[data-phone-camera-modal]')
  const video = modal?.querySelector('[data-phone-camera-video]')
  const preview = modal?.querySelector('[data-phone-camera-preview]')
  const status = modal?.querySelector('[data-phone-camera-status]')
  const title = modal?.querySelector('[data-phone-camera-title]')
  const help = modal?.querySelector('[data-phone-camera-help]')
  const reviewHelp = modal?.querySelector('[data-phone-camera-review-help]')
  const liveActions = modal?.querySelector('[data-phone-camera-live-actions]')
  const reviewActions = modal?.querySelector('[data-phone-camera-review-actions]')

  if (!modal || !preview || !activeCamera) return

  stopCameraStream()
  releaseCameraPreview()
  activeCamera.file = file
  cameraPreviewUrl = URL.createObjectURL(file)
  preview.src = cameraPreviewUrl
  video?.classList.add('hidden')
  status?.classList.add('hidden')
  preview.classList.remove('hidden')
  if (title) title.textContent = 'Review your photo'
  help?.classList.add('hidden')
  reviewHelp?.classList.remove('hidden')
  liveActions?.classList.add('hidden')
  reviewActions?.classList.remove('hidden')
  reviewActions?.classList.add('grid')
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  modal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('overflow-hidden')
}

function confirmCameraPhoto() {
  if (!activeCamera?.file) return

  const { input, onFile, file } = activeCamera

  setInputFile(input, file)
  onFile(file)
  closeCameraReview()
}

function closeCameraReview() {
  const modal = document.querySelector('[data-phone-camera-modal]')
  const cameraInput = modal?.querySelector('[data-phone-camera-input]')
  const preview = modal?.querySelector('[data-phone-camera-preview]')

  stopCameraStream()
  modal?.classList.add('hidden')
  modal?.classList.remove('flex')
  modal?.setAttribute('aria-hidden', 'true')
  if (cameraInput) cameraInput.value = ''
  if (preview) preview.removeAttribute('src')
  releaseCameraPreview()
  activeCamera = null
  document.body.classList.remove('overflow-hidden')
}

function stopCameraStream() {
  cameraStream?.getTracks().forEach((track) => track.stop())
  cameraStream = null

  const video = document.querySelector('[data-phone-camera-video]')
  if (video) video.srcObject = null
}

function releaseCameraPreview() {
  if (!cameraPreviewUrl) return

  URL.revokeObjectURL(cameraPreviewUrl)
  cameraPreviewUrl = null
}

function bindUploadMenus() {
  document.querySelectorAll('[data-phone-upload-menu]').forEach((menu) => {
    if (menu.dataset.phoneUploadMenuReady === 'true') return

    const button = menu.querySelector('[data-phone-upload-menu-button]')
    const panel = menu.querySelector('[data-phone-upload-menu-panel]')

    menu.dataset.phoneUploadMenuReady = 'true'

    button?.addEventListener('click', (event) => {
      event.stopPropagation()
      const willOpen = panel?.classList.contains('hidden')
      closeUploadMenus()
      panel?.classList.toggle('hidden', !willOpen)
    })

    panel?.addEventListener('click', (event) => event.stopPropagation())
    menu.querySelectorAll('[data-phone-upload-computer]').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault()
        closeUploadMenus()

        const selector =
          item.getAttribute('for') || item.dataset.phoneUploadInput?.replace(/^#/, '')
        const input = selector ? document.getElementById(selector) : null

        input?.click()
      })
    })
  })

  if (document.body.dataset.phoneUploadDocumentReady === 'true') return

  document.body.dataset.phoneUploadDocumentReady = 'true'
  document.addEventListener('click', closeUploadMenus)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeUploadMenus()
      closePhoneUpload()
      closeCameraReview()
    }
  })
}

function closeUploadMenus() {
  document.querySelectorAll('[data-phone-upload-menu-panel]').forEach((panel) => {
    panel.classList.add('hidden')
  })
}

async function openPhoneUpload({ input, onFile, tool, toolLabel }) {
  const modal = document.querySelector('[data-phone-upload-modal]')
  const qr = modal?.querySelector('[data-phone-upload-qr]')
  const status = modal?.querySelector('[data-phone-upload-status]')
  const link = modal?.querySelector('[data-phone-upload-link]')
  const linkToggle = modal?.querySelector('[data-phone-upload-link-toggle]')
  const linkPanel = modal?.querySelector('[data-phone-upload-link-panel]')
  const copyStatus = modal?.querySelector('[data-phone-upload-copy-status]')
  const label = modal?.querySelector('[data-phone-upload-tool-label]')

  if (!modal || !qr || !status || !link) return

  clearActivePoll()
  modal.classList.remove('hidden')
  modal.classList.add('flex')
  document.body.classList.add('overflow-hidden')

  qr.innerHTML = `<div class="flex aspect-square items-center justify-center rounded-2xl bg-[#416543]/8 text-center text-sm font-black text-[#416543]">Preparing secure QR...</div>`
  status.textContent = 'Preparing secure upload link...'
  link.textContent = 'Generating link...'
  delete link.dataset.url
  linkPanel?.classList.add('hidden')
  copyStatus?.classList.add('hidden')
  if (linkToggle) linkToggle.textContent = 'Show link'
  if (label) label.textContent = toolLabel

  try {
    const response = await fetch('/phone-upload/sessions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ tool }),
    })

    const data = await response.json()

    if (!response.ok || !data?.ok) throw new Error(data?.error || 'Could not create phone upload')

    qr.innerHTML = data.qrSvg
    link.textContent = data.uploadUrl
    link.dataset.url = data.uploadUrl
    status.textContent = 'Waiting for phone upload...'

    activePoll = window.setInterval(() => {
      pollPhoneUpload(data, { input, onFile, status })
    }, 1800)
  } catch {
    status.textContent = 'Could not create the QR. Try again.'
    qr.innerHTML = `<div class="flex aspect-square items-center justify-center rounded-2xl bg-red-50 px-6 text-center text-sm font-black text-red-800">QR unavailable</div>`
  }
}

async function pollPhoneUpload(session, { input, onFile, status }) {
  try {
    const response = await fetch(session.statusPath, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })

    if (response.status === 410) {
      clearActivePoll()
      status.textContent = 'This QR expired. Generate a new one.'
      return
    }

    const data = await response.json()

    if (!data?.ready) return

    clearActivePoll()
    status.textContent = 'Image received. Loading it here...'

    const imageResponse = await fetch(data.imagePath)
    const blob = await imageResponse.blob()
    const extension = extensionFromMime(blob.type)
    const file = new File([blob], data.fileName || `phone-upload.${extension}`, {
      type: blob.type || data.mimeType || 'image/jpeg',
    })

    setInputFile(input, file)
    onFile(file)

    status.textContent = 'Done. Your image is ready.'
    window.setTimeout(closePhoneUpload, 900)
  } catch {
    status.textContent = 'Still waiting for the phone upload...'
  }
}

function setInputFile(input, file) {
  const transfer = new DataTransfer()

  transfer.items.add(file)
  input.files = transfer.files
}

function clearActivePoll() {
  if (!activePoll) return
  window.clearInterval(activePoll)
  activePoll = null
}

function closePhoneUpload() {
  const modal = document.querySelector('[data-phone-upload-modal]')

  clearActivePoll()
  modal?.classList.add('hidden')
  modal?.classList.remove('flex')
  document.body.classList.remove('overflow-hidden')
}

function extensionFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

document.addEventListener('click', (event) => {
  const close = event.target.closest?.('[data-phone-upload-close]')
  const modal = event.target.closest?.('[data-phone-upload-modal]')
  const linkToggle = event.target.closest?.('[data-phone-upload-link-toggle]')
  const linkButton = event.target.closest?.('[data-phone-upload-link]')

  if (close) closePhoneUpload()
  if (event.target === modal) closePhoneUpload()
  if (linkToggle) toggleManualLink(linkToggle)
  if (linkButton) copyManualLink(linkButton)

  const cameraClose = event.target.closest?.('[data-phone-camera-close]')
  const cameraModal = event.target.closest?.('[data-phone-camera-modal]')

  if (cameraClose || event.target === cameraModal) closeCameraReview()
})

function toggleManualLink(button) {
  const modal = button.closest('[data-phone-upload-modal]')
  const panel = modal?.querySelector('[data-phone-upload-link-panel]')
  const copyStatus = modal?.querySelector('[data-phone-upload-copy-status]')

  if (!panel) return

  const willShow = panel.classList.contains('hidden')

  panel.classList.toggle('hidden', !willShow)
  button.textContent = willShow ? 'Hide link' : 'Show link'
  copyStatus?.classList.add('hidden')
}

async function copyManualLink(button) {
  const url = button.dataset.url || button.textContent.trim()
  const modal = button.closest('[data-phone-upload-modal]')
  const copyStatus = modal?.querySelector('[data-phone-upload-copy-status]')

  if (!url || url === 'Generating link...') return

  await copyText(url)

  copyStatus?.classList.remove('hidden')
  if (copyStatus) {
    copyStatus.textContent = 'Copied to clipboard'
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')

    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}
