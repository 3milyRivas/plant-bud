let activePoll = null

export function initPhoneUpload({ input, onFile, tool = 'plant-bud' }) {
  if (!input || typeof onFile !== 'function') return

  bindUploadMenus()

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
      item.addEventListener('click', closeUploadMenus)
    })
  })

  if (document.body.dataset.phoneUploadDocumentReady === 'true') return

  document.body.dataset.phoneUploadDocumentReady = 'true'
  document.addEventListener('click', closeUploadMenus)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeUploadMenus()
      closePhoneUpload()
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
