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

function initCommunityPage() {
  const page = document.querySelector('[data-community-page]')

  if (!page) return

  page.querySelectorAll('[data-community-post-form]').forEach(bindCommunityPostForm)
  page.querySelectorAll('[data-community-file-trigger]').forEach(bindCommunityFileTrigger)
  page.querySelectorAll('[data-community-image-input]').forEach(bindCommunityImageInput)
  page.querySelectorAll('[data-community-poll-trigger]').forEach(bindCommunityPollTrigger)
  page.querySelectorAll('[data-reaction-form]').forEach(bindCommunityReactionForm)
  page.querySelectorAll('[data-comment-form]').forEach(bindCommunityCommentForm)
  page.querySelectorAll('[data-comment-focus]').forEach(bindCommunityCommentFocus)
  page.querySelectorAll('[data-poll-form]').forEach(bindCommunityPollForm)
  page.querySelectorAll('[data-follow-form]').forEach(bindCommunityFollowForm)
  page.querySelectorAll('[data-share-post]').forEach(bindCommunityShareButton)
}

function bindCommunityPostForm(form) {
  if (form.dataset.communityAjaxReady === 'true') return

  form.dataset.communityAjaxReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearCommunityFormError(form)

    try {
      const formData = createCommunityFormData(form)

      setCommunityFormBusy(form, true)
      const payload = await submitCommunityForm(form, formData)

      if (payload?.ok) {
        prependCommunityPost(form, payload)
        resetCommunityComposer(form)
      }
    } catch (error) {
      if (error.payload?.errors) {
        showCommunityFormError(form, error.payload)
      } else {
        form.submit()
      }
    } finally {
      setCommunityFormBusy(form, false)
    }
  })
}

function bindCommunityFileTrigger(button) {
  if (button.dataset.communityTriggerReady === 'true') return

  button.dataset.communityTriggerReady = 'true'
  button.addEventListener('click', () => {
    const form = button.closest('[data-community-post-form]')
    const details = form?.querySelector('[data-community-options]')
    const input = form?.querySelector('[data-community-image-input]')

    if (details) details.open = true
    input?.click()
  })
}

function bindCommunityImageInput(input) {
  if (input.dataset.communityImageReady === 'true') return

  input.dataset.communityImageReady = 'true'
  input.addEventListener('change', () => {
    const form = input.closest('[data-community-post-form]')
    const fileName = form?.querySelector('[data-community-file-name]')
    const file = input.files?.[0]

    if (!fileName) return

    fileName.textContent = file?.name || ''
    fileName.classList.toggle('hidden', !file)
  })
}

function bindCommunityPollTrigger(button) {
  if (button.dataset.communityTriggerReady === 'true') return

  button.dataset.communityTriggerReady = 'true'
  button.addEventListener('click', () => {
    const form = button.closest('[data-community-post-form]')
    const details = form?.querySelector('[data-community-options]')
    const input = form?.querySelector('[data-community-poll-input]')

    if (details) details.open = true
    input?.focus()
  })
}

function bindCommunityReactionForm(form) {
  if (form.dataset.communityAjaxReady === 'true') return

  form.dataset.communityAjaxReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    try {
      const formData = createCommunityFormData(form)

      setCommunityFormBusy(form, true)
      const payload = await submitCommunityForm(form, formData)

      if (payload?.ok) updateCommunityReaction(form, payload)
    } catch {
      form.submit()
    } finally {
      setCommunityFormBusy(form, false)
    }
  })
}

function bindCommunityCommentForm(form) {
  if (form.dataset.communityAjaxReady === 'true') return

  form.dataset.communityAjaxReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const input = form.querySelector('[name="body"]')

    if (!input?.value.trim()) return

    try {
      const formData = createCommunityFormData(form)

      setCommunityFormBusy(form, true)
      const payload = await submitCommunityForm(form, formData)

      if (payload?.ok) {
        appendCommunityComment(form, payload)
        input.value = ''
      }
    } catch {
      form.submit()
    } finally {
      setCommunityFormBusy(form, false)
    }
  })
}

function bindCommunityPollForm(form) {
  if (form.dataset.communityAjaxReady === 'true') return

  form.dataset.communityAjaxReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    try {
      const formData = createCommunityFormData(form)

      setCommunityFormBusy(form, true)
      const payload = await submitCommunityForm(form, formData)

      if (payload?.ok) updateCommunityPoll(form, payload)
    } catch {
      form.submit()
    } finally {
      setCommunityFormBusy(form, false)
    }
  })
}

function bindCommunityFollowForm(form) {
  if (form.dataset.communityAjaxReady === 'true') return

  form.dataset.communityAjaxReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    try {
      const formData = createCommunityFormData(form)

      setCommunityFormBusy(form, true)
      const payload = await submitCommunityForm(form, formData)

      if (payload?.ok) updateCommunityFollow(form, payload)
    } catch {
      form.submit()
    } finally {
      setCommunityFormBusy(form, false)
    }
  })
}

function createCommunityFormData(form) {
  const formData = new FormData(form)

  formData.set('_ajax', '1')

  return formData
}

async function submitCommunityForm(form, formData) {
  const response = await fetch(form.action, {
    method: form.method || 'POST',
    body: formData,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok || !payload) {
    const error = new Error('Community request failed')
    error.payload = payload
    throw error
  }

  return payload
}

function setCommunityFormBusy(form, isBusy) {
  form.classList.toggle('opacity-70', isBusy)
  form.querySelectorAll('button, input, textarea, select').forEach((control) => {
    control.disabled = isBusy
  })
}

function prependCommunityPost(form, payload) {
  const page = form.closest('[data-community-page]')
  const feed = page?.querySelector('[data-community-feed]')

  if (!feed || !payload.html) return

  feed.insertAdjacentHTML('afterbegin', payload.html)

  const post = feed.querySelector('[data-community-post]')

  if (!post) return

  post.querySelectorAll('[data-reaction-form]').forEach(bindCommunityReactionForm)
  post.querySelectorAll('[data-comment-form]').forEach(bindCommunityCommentForm)
  post.querySelectorAll('[data-poll-form]').forEach(bindCommunityPollForm)
  post.querySelectorAll('[data-comment-focus]').forEach(bindCommunityCommentFocus)
  post.querySelectorAll('[data-share-post]').forEach(bindCommunityShareButton)
}

function resetCommunityComposer(form) {
  form.reset()
  form.querySelectorAll('details').forEach((details) => {
    details.open = false
  })
  form.querySelectorAll('[data-community-file-name]').forEach((fileName) => {
    fileName.textContent = ''
    fileName.classList.add('hidden')
  })
}

function showCommunityFormError(form, payload) {
  const errorTarget = form.querySelector('[data-community-form-error]')
  const errors = payload.errors || {}
  const firstMessage = Object.values(errors)
    .flat()
    .find(Boolean)

  if (!errorTarget || !firstMessage) return

  errorTarget.textContent = firstMessage
  errorTarget.classList.remove('hidden')
}

function clearCommunityFormError(form) {
  const errorTarget = form.querySelector('[data-community-form-error]')

  if (!errorTarget) return

  errorTarget.textContent = ''
  errorTarget.classList.add('hidden')
}

function updateCommunityReaction(form, payload) {
  const post = form.closest('[data-community-post]')
  const type = payload.type || form.getAttribute('data-reaction-type')
  const countKey = type === 'favorite' ? 'favorites' : 'likes'
  const count = post?.querySelector(`[data-reaction-count="${type}"]`)
  const icon = post?.querySelector(`[data-reaction-icon="${type}"]`)

  if (count && payload.counts?.[countKey] !== undefined) {
    count.textContent = payload.counts[countKey]
    count.classList.toggle('text-[#113E14]', payload.active)
    count.classList.toggle('text-black/30', !payload.active)
  }

  if (type === 'like') {
    icon?.classList.toggle('scale-110', payload.active)
  }

  if (type === 'favorite') {
    if (icon) {
      icon.style.backgroundImage = `url('${payload.active ? '/resources/img/favorites2.png' : '/resources/img/favo.png'}')`
    }

    if (!payload.active && document.querySelector('[data-favorites-page]') && post) {
      post.classList.add('opacity-0', 'scale-[0.98]')
      setTimeout(() => {
        post.remove()
        decrementSavedTotal()
      }, 180)
    }
  }
}

function appendCommunityComment(form, payload) {
  const post = form.closest('[data-community-post]')
  const list = post?.querySelector('[data-comments-list]')
  const count = post?.querySelector('[data-comment-count]')
  const comment = payload.comment

  if (!list || !comment) return

  const item = document.createElement('div')
  const link = document.createElement('a')
  const body = document.createElement('p')

  item.className = 'rounded-2xl bg-white/45 px-4 py-2'
  link.className = 'text-xs font-bold text-[#113E14]'
  link.href = `/users/${encodeURIComponent(comment.author.username)}`
  link.textContent = `@${comment.author.username}`
  body.className = 'text-sm font-semibold leading-6 text-black/70'
  body.textContent = comment.body

  item.append(link, body)
  list.append(item)

  if (count && payload.count !== undefined) {
    count.textContent = payload.count
  }
}

function bindCommunityCommentFocus(button) {
  if (button.dataset.communityCommentFocusReady === 'true') return

  button.dataset.communityCommentFocusReady = 'true'
  button.addEventListener('click', () => {
    button.closest('[data-community-post]')?.querySelector('[data-comment-input]')?.focus()
  })
}

function bindCommunityShareButton(button) {
  if (button.dataset.communityShareReady === 'true') return

  button.dataset.communityShareReady = 'true'
  button.addEventListener('click', async () => {
    const target = button.getAttribute('data-share-post') || window.location.pathname
    const url = new URL(target, window.location.origin).toString()

    try {
      await navigator.clipboard.writeText(url)
      button.classList.add('scale-110', 'bg-white/35')
      button.setAttribute('title', 'Copied')
      setTimeout(() => {
        button.classList.remove('scale-110', 'bg-white/35')
        button.removeAttribute('title')
      }, 1100)
    } catch {
      window.location.hash = target.split('#')[1] || ''
    }
  })
}

function updateCommunityPoll(form, payload) {
  const poll = payload.poll
  const pollBox = form.closest('[data-poll]')

  if (!poll || !pollBox) return

  poll.options.forEach((option) => {
    const percent = pollBox.querySelector(`[data-poll-percent="${option.id}"]`)
    const bar = pollBox.querySelector(`[data-poll-bar="${option.id}"]`)
    const button = percent?.closest('button')

    if (percent) percent.textContent = `${option.percent}%`
    if (bar) {
      bar.style.width = `${option.percent}%`
      bar.classList.toggle('bg-[#113E14]', option.selected)
      bar.classList.toggle('bg-[#6C8E6B]', !option.selected)
    }
    if (button) {
      button.classList.toggle('bg-[#113E14]/10', option.selected)
      button.classList.toggle('bg-white/70', !option.selected)
    }
  })

  const votes = pollBox.querySelector('[data-poll-votes]')

  if (votes) votes.textContent = poll.totalVotes
}

function updateCommunityFollow(form, payload) {
  const label = form.querySelector('[data-follow-label]')
  const button = form.querySelector('button')
  const lowerCaseLabel = label?.textContent === label?.textContent?.toLowerCase()
  const nextText = payload.following ? 'Following' : 'Follow'

  if (label) label.textContent = lowerCaseLabel ? nextText.toLowerCase() : nextText

  if (button?.className.includes('rounded-full')) {
    button.classList.toggle('bg-white/15', payload.following)
    button.classList.toggle('text-white', payload.following)
    button.classList.toggle('bg-[#EDE7D6]', !payload.following)
    button.classList.toggle('text-[#1E3D19]', !payload.following)
  }

  document.querySelectorAll('[data-followers-count]').forEach((count) => {
    if (payload.followers !== undefined) count.textContent = payload.followers
  })
}

function decrementSavedTotal() {
  document.querySelectorAll('[data-saved-total]').forEach((count) => {
    count.textContent = Math.max(0, Number(count.textContent || 0) - 1)
  })
}

function initApp() {
  initAuthForms()
  initProfilePage()
  initCommunityPage()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

Alpine.start()
