import Alpine from 'alpinejs'

const eyeIcon = `
  <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
`

const eyeOffIcon = `
  <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.06-5.94"></path>
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-3.22 4.36"></path>
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88"></path>
    <path d="M1 1l22 22"></path>
  </svg>
`

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

function initAuthForms() {
  const authPages = document.querySelectorAll('[data-auth-page]')

  authPages.forEach((page) => {
    page.querySelectorAll('[data-password-toggle]').forEach((button) => {
      if (button.dataset.passwordToggleReady === 'true') return

      const targetId = button.getAttribute('data-password-toggle')
      const input = targetId ? page.querySelector(`#${CSS.escape(targetId)}`) : null

      if (!input) return

      button.dataset.passwordToggleReady = 'true'
      button.innerHTML = eyeIcon
      button.setAttribute('aria-label', 'Show password')

      button.addEventListener('click', () => {
        const shouldShow = input.type === 'password'

        input.type = shouldShow ? 'text' : 'password'
        button.innerHTML = shouldShow ? eyeOffIcon : eyeIcon
        button.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password')
      })
    })

    page.querySelectorAll('[data-username-input]').forEach((input) => {
      input.addEventListener('input', () => {
        input.value = input.value
          .toLowerCase()
          .replace(/[^a-z0-9._]/g, '')
          .replace(/\.{2,}/g, '.')
          .replace(/^\./g, '')
          .slice(0, 30)
      })
    })

    page.querySelectorAll('[data-nursery-name-input]').forEach((input) => {
      input.addEventListener('input', () => {
        input.value = input.value
          .replace(/[^\p{L}\p{N} .&'-]/gu, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/^[ .&'-]+/g, '')
          .slice(0, 80)
      })
    })

    page.querySelectorAll('[data-phone-input]').forEach(bindPhoneInput)

    page.querySelectorAll('[data-dui-input]').forEach((input) => {
      input.addEventListener('input', () => {
        input.value = formatNumberMask(input.value, 9, 8)
      })
    })

    page.querySelectorAll('form').forEach((form) => {
      form.setAttribute('novalidate', 'novalidate')

      form.addEventListener('submit', (event) => {
        clearClientErrors(form)

        const invalidInput = validateAuthForm(form)

        if (invalidInput) {
          event.preventDefault()
          invalidInput.focus()
        }
      })
    })
  })
}

function initProfilePage() {
  const page = document.querySelector('[data-profile-page]')

  if (!page) return

  page.querySelectorAll('[data-phone-input]').forEach(bindPhoneInput)
  page.querySelectorAll('[data-social-handle]').forEach(bindSocialHandleInput)

  page.querySelectorAll('[data-profile-file-input]').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      const targetId = input.getAttribute('data-preview-target')
      const fallbackId = input.getAttribute('data-preview-fallback')
      const preview = targetId ? page.querySelector(`#${CSS.escape(targetId)}`) : null
      const fallback = fallbackId ? page.querySelector(`#${CSS.escape(fallbackId)}`) : null

      if (!file || !preview) return

      if (preview.dataset.previewUrl) URL.revokeObjectURL(preview.dataset.previewUrl)

      preview.dataset.previewUrl = URL.createObjectURL(file)
      preview.src = preview.dataset.previewUrl
      preview.classList.remove('hidden')
      fallback?.classList.add('hidden')
    })
  })

  initAvatarCropper(page)
}

function initAvatarCropper(page) {
  const input = page.querySelector('[data-avatar-input]')
  const previewTargetId = input?.getAttribute('data-preview-target')
  const fallbackTargetId = input?.getAttribute('data-preview-fallback')
  const preview = previewTargetId ? page.querySelector(`#${CSS.escape(previewTargetId)}`) : null
  const fallback = fallbackTargetId ? page.querySelector(`#${CSS.escape(fallbackTargetId)}`) : null
  const cropper = page.querySelector('[data-avatar-cropper]')
  const frame = page.querySelector('[data-avatar-crop-frame]')
  const image = page.querySelector('[data-avatar-crop-image]')
  const zoomInput = page.querySelector('[data-avatar-zoom]')
  const applyButton = page.querySelector('[data-avatar-apply]')
  const cancelButtons = page.querySelectorAll('[data-avatar-cancel]')

  if (!input || !preview || !cropper || !frame || !image || !zoomInput || !applyButton) return

  const state = {
    imageUrl: '',
    previewUrl: '',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  }

  input.addEventListener('change', () => {
    const file = input.files?.[0]

    if (!file) return

    if (state.imageUrl) URL.revokeObjectURL(state.imageUrl)

    state.imageUrl = URL.createObjectURL(file)
    state.zoom = 1
    state.offsetX = 0
    state.offsetY = 0
    zoomInput.value = '1'
    image.src = state.imageUrl
    cropper.classList.remove('hidden')
    cropper.classList.add('flex')
    cropper.setAttribute('aria-hidden', 'false')
  })

  image.addEventListener('load', () => {
    state.naturalWidth = image.naturalWidth
    state.naturalHeight = image.naturalHeight
    clampCropOffsets(state, frame)
    updateCropImage(state, frame, image)
  })

  zoomInput.addEventListener('input', () => {
    state.zoom = Number(zoomInput.value) || 1
    clampCropOffsets(state, frame)
    updateCropImage(state, frame, image)
  })

  frame.addEventListener('pointerdown', (event) => {
    state.isDragging = true
    state.startX = event.clientX
    state.startY = event.clientY
    state.originX = state.offsetX
    state.originY = state.offsetY
    frame.setPointerCapture?.(event.pointerId)
  })

  frame.addEventListener('pointermove', (event) => {
    if (!state.isDragging) return

    state.offsetX = state.originX + event.clientX - state.startX
    state.offsetY = state.originY + event.clientY - state.startY
    clampCropOffsets(state, frame)
    updateCropImage(state, frame, image)
  })

  const stopDragging = (event) => {
    state.isDragging = false
    frame.releasePointerCapture?.(event.pointerId)
  }

  frame.addEventListener('pointerup', stopDragging)
  frame.addEventListener('pointercancel', stopDragging)

  cancelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      input.value = ''
      closeAvatarCropper(cropper)
    })
  })

  applyButton.addEventListener('click', async () => {
    const blob = await createCroppedAvatarBlob(state, frame, image)

    if (!blob) return

    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl)

    state.previewUrl = URL.createObjectURL(blob)
    preview.src = state.previewUrl
    preview.classList.remove('hidden')
    fallback?.classList.add('hidden')

    if (typeof DataTransfer !== 'undefined') {
      const transfer = new DataTransfer()
      const croppedFile = new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' })

      transfer.items.add(croppedFile)
      input.files = transfer.files
    }

    closeAvatarCropper(cropper)
  })
}

function closeAvatarCropper(cropper) {
  cropper.classList.add('hidden')
  cropper.classList.remove('flex')
  cropper.setAttribute('aria-hidden', 'true')
}

function getCropMetrics(state, frame) {
  const cropSize = frame.getBoundingClientRect().width

  if (!cropSize || !state.naturalWidth || !state.naturalHeight) return null

  const baseScale = Math.max(cropSize / state.naturalWidth, cropSize / state.naturalHeight)
  const drawWidth = state.naturalWidth * baseScale * state.zoom
  const drawHeight = state.naturalHeight * baseScale * state.zoom

  return {
    cropSize,
    drawWidth,
    drawHeight,
    x: (cropSize - drawWidth) / 2 + state.offsetX,
    y: (cropSize - drawHeight) / 2 + state.offsetY,
  }
}

function clampCropOffsets(state, frame) {
  const metrics = getCropMetrics(state, frame)

  if (!metrics) return

  const maxX = Math.max(0, (metrics.drawWidth - metrics.cropSize) / 2)
  const maxY = Math.max(0, (metrics.drawHeight - metrics.cropSize) / 2)

  state.offsetX = Math.min(maxX, Math.max(-maxX, state.offsetX))
  state.offsetY = Math.min(maxY, Math.max(-maxY, state.offsetY))
}

function updateCropImage(state, frame, image) {
  const metrics = getCropMetrics(state, frame)

  if (!metrics) return

  image.style.width = `${metrics.drawWidth}px`
  image.style.height = `${metrics.drawHeight}px`
  image.style.transform = `translate(${metrics.x}px, ${metrics.y}px)`
}

function createCroppedAvatarBlob(state, frame, image) {
  const metrics = getCropMetrics(state, frame)

  if (!metrics) return Promise.resolve(null)

  const canvasSize = 512
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const scale = canvasSize / metrics.cropSize

  canvas.width = canvasSize
  canvas.height = canvasSize

  if (!context) return Promise.resolve(null)

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvasSize, canvasSize)
  context.drawImage(
    image,
    metrics.x * scale,
    metrics.y * scale,
    metrics.drawWidth * scale,
    metrics.drawHeight * scale
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}

function bindPhoneInput(input) {
  if (input.dataset.phoneMaskReady === 'true') return

  input.dataset.phoneMaskReady = 'true'
  input.addEventListener('input', () => {
    input.value = formatNumberMask(input.value, 8, 4)
  })
}

function bindSocialHandleInput(input) {
  if (input.dataset.socialHandleReady === 'true') return

  input.dataset.socialHandleReady = 'true'
  input.addEventListener('blur', () => {
    input.value = input.value.trim()
  })
}

function validateAuthForm(form) {
  const inputs = Array.from(form.querySelectorAll('[data-required-message]'))
  let firstInvalidInput = null

  for (const input of inputs) {
    const value = input.value.trim()
    const message = input.getAttribute('data-required-message') || 'This field is required'

    if (!value) {
      showClientError(input, message)
      firstInvalidInput ||= input
      continue
    }

    if (input.matches('[data-username-input]') && !isValidUsername(value)) {
      showClientError(
        input,
        'Use 3-30 letters, numbers, periods, or underscores. No ending period or double periods.'
      )
      firstInvalidInput ||= input
      continue
    }

    if (input.matches('[data-nursery-name-input]') && !isValidNurseryName(value)) {
      showClientError(
        input,
        'Use 3-80 letters, numbers, spaces, periods, apostrophes, hyphens, or &.'
      )
      firstInvalidInput ||= input
      continue
    }

    const confirmWith = input.getAttribute('data-confirm-with')
    const passwordInput = confirmWith ? form.querySelector(`#${CSS.escape(confirmWith)}`) : null

    if (passwordInput && input.value !== passwordInput.value) {
      showClientError(input, 'Passwords do not match')
      firstInvalidInput ||= input
    }
  }

  return firstInvalidInput
}

function showClientError(input, message) {
  const anchor = input.parentElement?.classList.contains('relative') ? input.parentElement : input
  const error = document.createElement('p')

  input.setAttribute('aria-invalid', 'true')
  error.className = 'auth-client-error text-red-200 font-bold text-xs mt-2'
  error.textContent = message
  anchor.insertAdjacentElement('afterend', error)
}

function clearClientErrors(form) {
  form.querySelectorAll('.auth-client-error').forEach((error) => error.remove())
  form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
    if (!input.hasAttribute('data-invalid')) input.removeAttribute('aria-invalid')
  })
}

function isValidUsername(value) {
  return /^(?!.*\.\.)(?!.*\.$)[a-z0-9][a-z0-9._]{2,29}$/.test(value)
}

function isValidNurseryName(value) {
  return /^[\p{L}\p{N}][\p{L}\p{N} .&'-]{1,78}[\p{L}\p{N}]$/u.test(value)
}

function formatNumberMask(value, maxDigits, splitAt) {
  const numbers = value.replace(/\D/g, '').slice(0, maxDigits)

  return numbers.length > splitAt
    ? `${numbers.slice(0, splitAt)}-${numbers.slice(splitAt)}`
    : numbers
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthForms()
  initProfilePage()
})

Alpine.start()
