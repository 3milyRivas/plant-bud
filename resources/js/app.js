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
  initPaymentMethodControls(page)

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

function initPaymentMethodControls(page) {
  page.querySelectorAll('[data-payment-methods]').forEach((group) => {
    if (group.dataset.paymentMethodsReady === 'true') return

    const valueInput = group.querySelector('[data-payment-methods-value]')
    const checkboxes = Array.from(group.querySelectorAll('[data-payment-method-checkbox]'))

    if (!valueInput || !checkboxes.length) return

    const syncValue = () => {
      valueInput.value = checkboxes
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value)
        .join('\n')
    }

    group.dataset.paymentMethodsReady = 'true'
    checkboxes.forEach((checkbox) => checkbox.addEventListener('change', syncValue))
    syncValue()
  })
}

function initProfileRelationsModal() {
  const modal = document.querySelector('[data-profile-relations-modal]')

  if (!modal || modal.dataset.relationsReady === 'true') return

  const title = modal.querySelector('[data-profile-relations-title]')
  const tabs = Array.from(modal.querySelectorAll('[data-relations-tab]'))
  const panels = Array.from(modal.querySelectorAll('[data-profile-relations-panel]'))
  const closeButtons = modal.querySelectorAll('[data-profile-relations-close]')
  const openButtons = document.querySelectorAll('[data-relations-open]')
  const unfollowForms = modal.querySelectorAll('[data-relation-unfollow-form]')
  let previousBodyOverflow = ''

  const setActivePanel = (type) => {
    const requestedType = ['followers', 'following', 'friends'].includes(type) ? type : 'followers'
    const activeType = panels.some((panel) => panel.dataset.profileRelationsPanel === requestedType)
      ? requestedType
      : 'followers'

    title.textContent =
      activeType === 'following' ? 'Following' : activeType === 'friends' ? 'Friends' : 'Followers'

    tabs.forEach((tab) => {
      const isActive = tab.dataset.relationsTab === activeType

      tab.classList.toggle('bg-[#113e14]', isActive)
      tab.classList.toggle('text-[#ebe3a7]', isActive)
      tab.classList.toggle('shadow-md', isActive)
      tab.classList.toggle('bg-white', !isActive)
      tab.classList.toggle('text-[#113e14]', !isActive)
      tab.classList.toggle('shadow-sm', !isActive)
    })

    panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.profileRelationsPanel !== activeType)
    })
  }

  const openModal = (type) => {
    setActivePanel(type)
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    modal.setAttribute('aria-hidden', 'false')
  }

  const closeModal = () => {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
    modal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = previousBodyOverflow
  }

  modal.dataset.relationsReady = 'true'
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setActivePanel(tab.dataset.relationsTab))
  })
  closeButtons.forEach((button) => button.addEventListener('click', closeModal))
  openButtons.forEach((button) => {
    button.addEventListener('click', () => openModal(button.dataset.relationsOpen))
  })
  unfollowForms.forEach(bindRelationUnfollowForm)

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal()
    }
  })
}

function initProfilePostPreview() {
  const modal = document.querySelector('[data-profile-post-modal]')
  const buttons = document.querySelectorAll('[data-profile-post-preview]')

  if (!modal || !buttons.length || modal.dataset.profilePostPreviewReady === 'true') return

  const image = modal.querySelector('[data-profile-post-modal-image]')
  const emptyState = modal.querySelector('[data-profile-post-modal-empty]')
  const body = modal.querySelector('[data-profile-post-modal-body]')
  const meta = modal.querySelector('[data-profile-post-modal-meta]')
  const author = modal.querySelector('[data-profile-post-modal-author]')
  const kind = modal.querySelector('[data-profile-post-modal-kind]')
  const likes = modal.querySelector('[data-profile-post-modal-likes]')
  const favorites = modal.querySelector('[data-profile-post-modal-favorites]')
  const comments = modal.querySelector('[data-profile-post-modal-comments]')
  const pollPanel = modal.querySelector('[data-profile-post-modal-poll]')
  const pollQuestion = modal.querySelector('[data-profile-post-modal-poll-question]')
  const pollTotal = modal.querySelector('[data-profile-post-modal-poll-total]')
  const pollOptions = modal.querySelector('[data-profile-post-modal-poll-options]')
  const deleteForm = modal.querySelector('[data-profile-post-delete-form]')
  const deleteConfirm = modal.querySelector('[data-profile-post-delete-confirm]')
  const deleteOpen = modal.querySelector('[data-profile-post-delete-open]')
  const deleteCancel = modal.querySelector('[data-profile-post-delete-cancel]')
  const closeButtons = modal.querySelectorAll('[data-profile-post-modal-close]')
  let previousBodyOverflow = ''

  const openModal = (button) => {
    const mediaUrl = button.dataset.postMedia || ''
    const deleteAction = button.dataset.postDeleteAction || ''

    if (body) body.textContent = button.dataset.postBody || 'No description yet.'
    if (meta) meta.textContent = button.dataset.postCreated || 'Recently'
    if (author) author.textContent = button.dataset.postAuthor || ''
    if (kind) kind.textContent = button.dataset.postKind || 'Post'
    if (likes) likes.textContent = button.dataset.postLikes || '0'
    if (favorites) favorites.textContent = button.dataset.postFavorites || '0'
    if (comments) comments.textContent = button.dataset.postComments || '0'

    renderProfilePostPoll(button.dataset.postPoll || '', {
      panel: pollPanel,
      question: pollQuestion,
      total: pollTotal,
      options: pollOptions,
    })

    if (image && emptyState) {
      image.classList.toggle('hidden', !mediaUrl)
      emptyState.classList.toggle('hidden', Boolean(mediaUrl))

      if (mediaUrl) image.src = mediaUrl
    }

    if (deleteForm) {
      deleteForm.classList.toggle('hidden', !deleteAction)
      if (deleteAction) deleteForm.setAttribute('action', deleteAction)
    }
    deleteConfirm?.classList.add('hidden')

    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    modal.setAttribute('aria-hidden', 'false')
  }

  const closeModal = () => {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
    modal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = previousBodyOverflow
  }

  modal.dataset.profilePostPreviewReady = 'true'
  buttons.forEach((button) => {
    button.addEventListener('click', () => openModal(button))
  })
  closeButtons.forEach((button) => button.addEventListener('click', closeModal))
  deleteOpen?.addEventListener('click', () => {
    deleteConfirm?.classList.remove('hidden')
  })
  deleteCancel?.addEventListener('click', () => {
    deleteConfirm?.classList.add('hidden')
  })
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal()
    }
  })
}

function renderProfilePostPoll(rawPoll, elements) {
  const { panel, question, total, options } = elements

  if (!panel || !question || !total || !options) return

  let poll = null

  try {
    poll = rawPoll ? JSON.parse(rawPoll) : null
  } catch {
    poll = null
  }

  panel.classList.toggle('hidden', !poll)
  options.replaceChildren()

  if (!poll) return

  question.textContent = poll.question || 'Poll'
  total.textContent = `${poll.totalVotes || 0} ${poll.totalVotes === 1 ? 'vote' : 'votes'}`
  ;(poll.options || []).forEach((option) => {
    const item = document.createElement('div')
    const row = document.createElement('div')
    const label = document.createElement('span')
    const value = document.createElement('span')
    const track = document.createElement('div')
    const bar = document.createElement('div')
    const percent = Number(option.percent || 0)

    item.className = 'space-y-2'
    row.className = 'flex items-center justify-between gap-3 text-xs font-black text-[#113e14]'
    label.className = 'min-w-0 truncate'
    value.className = 'flex-none text-[#416543]'
    track.className = 'h-2 overflow-hidden rounded-full bg-white/80'
    bar.className = 'h-full rounded-full bg-[#dca15d]'
    bar.style.width = `${Math.min(Math.max(percent, 0), 100)}%`
    label.textContent = option.label || 'Option'
    value.textContent = `${percent}% - ${option.votes || 0}`

    row.append(label, value)
    track.append(bar)
    item.append(row, track)
    options.append(item)
  })
}

function initAppNavbarMenus() {
  const closeNavMenus = (exceptMenu = null) => {
    document.querySelectorAll('[data-app-nav-menu][open]').forEach((menu) => {
      if (menu === exceptMenu) return

      menu.removeAttribute('open')
    })
  }

  document.querySelectorAll('[data-app-nav-menu]').forEach((menu) => {
    if (menu.dataset.appNavMenuReady === 'true') return

    const panel = menu.querySelector('.app-nav-menu-panel')
    menu.dataset.appNavMenuReady = 'true'
    menu.addEventListener('mouseenter', () => {
      closeNavMenus(menu)
      menu.setAttribute('open', '')
    })
    menu.addEventListener('toggle', () => {
      if (!menu.open || !panel) return

      closeNavMenus(menu)
      panel.classList.remove('is-entering')
      void panel.offsetWidth
      panel.classList.add('is-entering')
    })
  })

  document.querySelectorAll('[data-catalog-navbar-switcher]').forEach((switcher) => {
    if (switcher.dataset.catalogNavbarSwitcherReady === 'true') return

    const searchPanel = switcher.querySelector('[data-catalog-search-panel]')
    const menuPanel = switcher.querySelector('[data-catalog-menu-panel]')
    const toggle = switcher.querySelector('[data-catalog-navbar-toggle]')
    const label = switcher.querySelector('[data-catalog-navbar-toggle-label]')
    let isSearchMode = false
    const animatePanel = (panel) => {
      panel?.classList.remove('app-navbar-switch-panel-in')
      void panel?.offsetWidth
      panel?.classList.add('app-navbar-switch-panel-in')
    }
    const renderMode = () => {
      searchPanel?.classList.toggle('hidden', !isSearchMode)
      searchPanel?.classList.toggle('flex', isSearchMode)
      menuPanel?.classList.toggle('hidden', isSearchMode)
      menuPanel?.classList.toggle('flex', !isSearchMode)
      toggle?.setAttribute('aria-pressed', isSearchMode ? 'true' : 'false')

      if (label) {
        label.textContent = isSearchMode ? 'Menu' : 'Search'
      }

      if (isSearchMode) {
        closeNavMenus()
      }

      animatePanel(isSearchMode ? searchPanel : menuPanel)
    }

    switcher.dataset.catalogNavbarSwitcherReady = 'true'
    renderMode()
    toggle?.addEventListener('click', () => {
      isSearchMode = !isSearchMode
      renderMode()
    })
  })

  document.querySelectorAll('[data-app-profile-menu]').forEach((menu) => {
    if (menu.dataset.appProfileMenuReady === 'true') return

    const panel = menu.querySelector('.app-navbar-profile-menu')

    menu.dataset.appProfileMenuReady = 'true'
    menu.addEventListener('toggle', () => {
      if (!menu.open || !panel) return

      panel.classList.remove('is-entering')
      void panel.offsetWidth
      panel.classList.add('is-entering')
    })
  })

  if (document.documentElement.dataset.appNavbarMenusReady === 'true') return

  document.documentElement.dataset.appNavbarMenusReady = 'true'
  document.addEventListener('click', (event) => {
    const target = event.target

    if (!(target instanceof Element)) return

    document.querySelectorAll('[data-app-nav-menu][open]').forEach((menu) => {
      if (menu.contains(target)) return

      menu.removeAttribute('open')
    })

    document.querySelectorAll('[data-app-profile-menu][open]').forEach((menu) => {
      if (menu.contains(target)) return

      menu.removeAttribute('open')
    })
  })
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return

    document.querySelectorAll('[data-app-nav-menu][open]').forEach((menu) => {
      menu.removeAttribute('open')
    })

    document.querySelectorAll('[data-app-profile-menu][open]').forEach((menu) => {
      menu.removeAttribute('open')
    })
  })
}

function bindRelationUnfollowForm(form) {
  if (form.dataset.relationUnfollowReady === 'true') return

  form.dataset.relationUnfollowReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const button = form.querySelector('[data-relation-unfollow-button]')
    const userId = form.dataset.relationUserId
    const wasFriend = form.dataset.wasFriend === 'true'

    if (!userId) return

    try {
      const formData = createCommunityFormData(form)

      if (button) {
        button.disabled = true
        button.textContent = '...'
      }

      const payload = await submitCommunityForm(form, formData)

      if (!payload?.ok || payload.following) {
        throw new Error('Unfollow failed')
      }

      removeRelationRows(userId, wasFriend)
      updateRelationCounters({ followingDelta: -1, friendsDelta: wasFriend ? -1 : 0 })
    } catch {
      form.submit()
    }
  })
}

function removeRelationRows(userId, wasFriend) {
  document
    .querySelectorAll(
      `[data-profile-relations-panel="following"] [data-relation-user-id="${CSS.escape(userId)}"], [data-profile-relations-panel="friends"] [data-relation-user-id="${CSS.escape(userId)}"]`
    )
    .forEach((row) => {
      row.classList.add('opacity-0', 'scale-[0.98]')
      setTimeout(() => row.remove(), 160)
    })

  if (!wasFriend) return

  document
    .querySelectorAll(
      `[data-profile-relations-panel="followers"] [data-relation-user-id="${CSS.escape(userId)}"] [data-relation-label]`
    )
    .forEach((label) => label.remove())
}

function updateRelationCounters({ followingDelta = 0, friendsDelta = 0 }) {
  document.querySelectorAll('[data-following-count]').forEach((count) => {
    count.textContent = Math.max(0, Number(count.textContent || 0) + followingDelta)
  })
  document.querySelectorAll('[data-friends-count]').forEach((count) => {
    count.textContent = Math.max(0, Number(count.textContent || 0) + friendsDelta)
  })
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
        'Use 3-15 letters, numbers, periods, or underscores. No ending period or double periods.'
      )
      firstInvalidInput ||= input
      continue
    }

    if (input.matches('[data-nursery-name-input]') && !isValidNurseryName(value)) {
      showClientError(
        input,
        'Use 3-22 letters, numbers, spaces, periods, apostrophes, hyphens, or &.'
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
  return /^(?!.*\.\.)(?!.*\.$)[a-z0-9][a-z0-9._]{2,14}$/.test(value)
}

function isValidNurseryName(value) {
  return /^[\p{L}\p{N}][\p{L}\p{N} .&'-]{1,20}[\p{L}\p{N}]$/u.test(value)
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

  initCommunityNavbar(page)
  page.querySelectorAll('[data-community-post-form]').forEach(bindCommunityPostForm)
  page.querySelectorAll('[data-community-search-form]').forEach(bindCommunitySearchForm)
  page.querySelectorAll('[data-community-file-trigger]').forEach(bindCommunityFileTrigger)
  page.querySelectorAll('[data-community-image-input]').forEach(bindCommunityImageInput)
  page.querySelectorAll('[data-community-poll-trigger]').forEach(bindCommunityPollTrigger)
  page.querySelectorAll('[data-community-lazy-image]').forEach(bindCommunityLazyImage)
  page.querySelectorAll('[data-reaction-form]').forEach(bindCommunityReactionForm)
  page.querySelectorAll('[data-comment-form]').forEach(bindCommunityCommentForm)
  page.querySelectorAll('[data-comment-toggle]').forEach(bindCommunityCommentsToggle)
  page.querySelectorAll('[data-poll-form]').forEach(bindCommunityPollForm)
  page.querySelectorAll('[data-follow-form]').forEach(bindCommunityFollowForm)
  page.querySelectorAll('[data-favorite-account-form]').forEach(bindFavoriteAccountForm)
  page.querySelectorAll('[data-share-post]').forEach(bindCommunityShareButton)
}

function initCommunityNavbar(page) {
  const navbar = page.querySelector('[data-community-navbar]')
  const shell = page.querySelector('[data-community-navbar-shell]')
  const isDynamic = navbar?.getAttribute('data-community-navbar-dynamic') === 'true'
  const brandText = page.querySelector('[data-community-brand-text]')
  const profileText = page.querySelector('[data-community-profile-text]')

  if (!navbar || !shell || page.dataset.communityNavbarReady === 'true') {
    return
  }

  let ticking = false
  let lastScrollY = window.scrollY

  const setNavbarCompact = (compact) => {
    const shouldCompact = isDynamic && compact && window.innerWidth >= 1024

    shell.classList.toggle('py-3.5', !shouldCompact)
    shell.classList.toggle('py-3', shouldCompact)
    shell.classList.toggle('bg-white/20', !shouldCompact)
    shell.classList.toggle('bg-white/24', shouldCompact)
    shell.classList.toggle('shadow-lg', !shouldCompact)
    shell.classList.toggle('shadow-[0_14px_45px_rgba(17,62,20,0.18)]', shouldCompact)
    shell.classList.toggle('scale-[0.985]', shouldCompact)

    brandText?.classList.toggle('lg:block', !shouldCompact)
    brandText?.classList.toggle('lg:hidden', shouldCompact)
    profileText?.classList.toggle('lg:block', !shouldCompact)
    profileText?.classList.toggle('lg:hidden', shouldCompact)
  }

  const setNavbarHidden = (hidden) => {
    if (!isDynamic) return

    navbar.classList.toggle('-translate-y-[115%]', hidden)
    navbar.classList.toggle('opacity-0', hidden)
    page.classList.toggle('community-navbar-away', hidden)
  }

  page.dataset.communityNavbarReady = 'true'
  const updateChrome = () => {
    if (!isDynamic) return

    const currentScrollY = window.scrollY
    const nearTop = currentScrollY < 32
    const scrollingDown = currentScrollY > lastScrollY && currentScrollY > 180

    setNavbarCompact(!nearTop)
    setNavbarHidden(scrollingDown)
    lastScrollY = currentScrollY
  }

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return

      ticking = true
      window.requestAnimationFrame(() => {
        updateChrome()
        ticking = false
      })
    },
    { passive: true }
  )
  window.addEventListener('resize', updateChrome)
  document.addEventListener('mousemove', (event) => {
    if (!isDynamic || event.clientY > 90) return

    setNavbarHidden(false)
  })
  navbar.addEventListener('mouseenter', () => setNavbarHidden(false))
  updateChrome()
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
    const input = form?.querySelector('[data-community-image-input]')

    clearCommunityPollFields(form)
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
    const panel = form?.querySelector('[data-community-poll-panel]')
    const input = form?.querySelector('[data-community-poll-input]')

    clearCommunityImageInput(form)
    panel?.classList.remove('hidden')
    input?.focus()
  })
}

function bindCommunitySearchForm(form) {
  if (form.dataset.communitySearchReady === 'true') return

  const input = form.querySelector('[data-community-search-input]')
  const results = form.querySelector('[data-community-search-results]')

  if (!input || !results) return

  let timer = null
  let controller = null

  const hideResults = () => {
    results.classList.add('hidden')
    results.replaceChildren()
  }

  const scheduleSearch = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(async () => {
      const query = input.value.trim()

      if (!query) {
        hideResults()
        return
      }

      controller?.abort()
      controller = new AbortController()

      try {
        const response = await fetch(
          `/community/search/suggestions?q=${encodeURIComponent(query)}`,
          {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          }
        )
        if (!response.ok) {
          hideResults()
          return
        }

        const payload = await response.json()

        if (input.value.trim() !== query) return

        renderCommunitySearchResults(results, payload)
      } catch (error) {
        if (error.name !== 'AbortError') hideResults()
      }
    }, 170)
  }

  form.dataset.communitySearchReady = 'true'
  input.addEventListener('input', scheduleSearch)
  input.addEventListener('focus', scheduleSearch)
  form.addEventListener('submit', hideResults)
  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) hideResults()
  })
}

function renderCommunitySearchResults(results, payload) {
  results.replaceChildren()

  const users = payload?.users || []
  const hashtags = payload?.hashtags || []

  if (!users.length && !hashtags.length) {
    const empty = document.createElement('p')

    empty.className = 'px-4 py-3 text-sm font-bold text-[#113e14]/60'
    empty.textContent = 'No profiles or hashtags found yet.'
    results.append(empty)
    results.classList.remove('hidden')
    return
  }

  if (users.length) {
    results.append(createCommunitySearchHeading('Profiles'))
    users.forEach((user) => results.append(createCommunityUserResult(user)))
  }

  if (hashtags.length) {
    results.append(createCommunitySearchHeading('Hashtags'))
    hashtags.forEach((hashtag) => results.append(createCommunityHashtagResult(hashtag)))
  }

  results.classList.remove('hidden')
}

function createCommunitySearchHeading(label) {
  const heading = document.createElement('p')

  heading.className =
    'px-3 pb-1 pt-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#416543]/70'
  heading.textContent = label

  return heading
}

function getFirstInitial(value) {
  return Array.from(String(value || 'P').trim())[0]?.toUpperCase() || 'P'
}

function createCommunityUserResult(user) {
  const link = document.createElement('a')
  const avatar = document.createElement(user.avatarUrl ? 'img' : 'span')
  const text = document.createElement('span')
  const nameRow = document.createElement('span')
  const name = document.createElement('span')
  const meta = document.createElement('span')
  const premium = document.createElement('span')

  link.href = `/users/${encodeURIComponent(user.username)}`
  link.className =
    'flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/70 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#48AE4D]/35'

  if (user.avatarUrl) {
    avatar.src = user.avatarUrl
    avatar.alt = ''
    avatar.className = 'h-10 w-10 flex-none rounded-full object-cover'
    avatar.loading = 'lazy'
    avatar.decoding = 'async'
  } else {
    avatar.className =
      'flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#113e14] text-sm font-black text-[#ebe3a7]'
    avatar.textContent = getFirstInitial(user.initial)
  }

  text.className = 'min-w-0 leading-tight'
  nameRow.className = 'flex min-w-0 items-center gap-2'
  name.className = 'block truncate text-sm font-black text-[#113e14]'
  name.textContent = user.displayName || user.username
  meta.className = 'block truncate text-xs font-bold text-[#416543]/70'
  meta.textContent = `${user.roleLabel || 'Member'} - @${user.username}`

  nameRow.append(name)

  if (user.isPremium) {
    premium.className = 'profile-badge profile-badge--premium profile-badge--compact shrink-0'
    premium.textContent = 'Premium'
    nameRow.append(premium)
  }

  text.append(nameRow, meta)
  link.append(avatar, text)

  return link
}

function createCommunityHashtagResult(hashtag) {
  const link = document.createElement('a')
  const icon = document.createElement('span')
  const text = document.createElement('span')
  const tag = document.createElement('span')
  const count = document.createElement('span')

  link.href = `/community/hashtags/${encodeURIComponent(hashtag.tag)}`
  link.className =
    'flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/70 focus:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#48AE4D]/35'
  icon.className =
    'flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#ebe3a7] text-lg font-black text-[#113e14]'
  icon.textContent = '#'
  text.className = 'min-w-0 leading-tight'
  tag.className = 'block truncate text-sm font-black text-[#113e14]'
  tag.textContent = `#${hashtag.tag}`
  count.className = 'block truncate text-xs font-bold text-[#416543]/70'
  count.textContent = `${hashtag.postsCount || 0} posts`

  text.append(tag, count)
  link.append(icon, text)

  return link
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

function bindFavoriteAccountForm(form) {
  if (form.dataset.favoriteAccountReady === 'true') return

  form.dataset.favoriteAccountReady = 'true'
  form.addEventListener('submit', async (event) => {
    event.preventDefault()

    try {
      const formData = createCommunityFormData(form)

      setCommunityFormBusy(form, true)
      const payload = await submitCommunityForm(form, formData)

      if (payload?.ok) updateFavoriteAccountButton(form, payload)
    } catch {
      form.submit()
    } finally {
      setCommunityFormBusy(form, false)
    }
  })
}

function updateFavoriteAccountButton(form, payload) {
  const button = form.querySelector('[data-favorite-account-button]')
  const label = form.querySelector('[data-favorite-account-label]')

  if (label) label.textContent = payload.favorite ? 'Favorite' : 'Add favorite'
  if (!button) return

  button.classList.toggle('bg-[#ebe3a7]', payload.favorite)
  button.classList.toggle('text-[#113e14]', payload.favorite)
  button.classList.toggle('bg-white/15', !payload.favorite)
  button.classList.toggle('text-white', !payload.favorite)
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
      'Accept': 'application/json',
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
  post.querySelectorAll('[data-comment-toggle]').forEach(bindCommunityCommentsToggle)
  post.querySelectorAll('[data-share-post]').forEach(bindCommunityShareButton)
  post.querySelectorAll('[data-community-lazy-image]').forEach(bindCommunityLazyImage)
}

function resetCommunityComposer(form) {
  form.reset()
  form.querySelectorAll('details').forEach((details) => {
    details.open = false
  })
  form.querySelectorAll('[data-community-poll-panel]').forEach((panel) => {
    panel.classList.add('hidden')
  })
  form.querySelectorAll('[data-community-file-name]').forEach((fileName) => {
    fileName.textContent = ''
    fileName.classList.add('hidden')
  })
}

function clearCommunityImageInput(form) {
  if (!form) return

  form.querySelectorAll('[data-community-image-input]').forEach((input) => {
    input.value = ''
  })
  form.querySelectorAll('[data-community-file-name]').forEach((fileName) => {
    fileName.textContent = ''
    fileName.classList.add('hidden')
  })
}

function clearCommunityPollFields(form) {
  if (!form) return

  form.querySelectorAll('[data-community-poll-panel]').forEach((panel) => {
    panel.classList.add('hidden')
  })
  form.querySelectorAll('[name="poll_question"], [name="poll_options"]').forEach((input) => {
    input.value = ''
  })
}

function showCommunityFormError(form, payload) {
  const errorTarget = form.querySelector('[data-community-form-error]')
  const errors = payload.errors || {}
  const firstMessage = Object.values(errors).flat().find(Boolean)

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
    count.classList.toggle('text-[#113e14]', payload.active)
    count.classList.toggle('text-[#416543]', !payload.active)
  }

  const button = form.querySelector('button')

  button?.classList.toggle('is-active', payload.active)
  button?.classList.toggle('border-[#dca15d]/35', payload.active)
  button?.classList.toggle('bg-[#ebe3a7]/66', payload.active)

  if (button) {
    button.classList.remove('is-burst')
    void button.offsetWidth
    button.classList.add('is-burst')
    window.setTimeout(() => button.classList.remove('is-burst'), 820)
  }

  if (type === 'like') {
    icon?.classList.toggle('scale-110', payload.active)
    if (icon) {
      icon.style.backgroundImage = `url('${payload.active ? '/resources/images/community/liked.png' : '/resources/images/community/like.png'}')`
    }
  }

  if (type === 'favorite') {
    if (icon) {
      icon.style.backgroundImage = `url('${payload.active ? '/resources/images/community/saved-active.png' : '/resources/images/community/save.png'}')`
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
  const post = getCommunityCommentPost(form)
  const panel = getCommunityCommentsPanel(post)
  const toggle = post?.querySelector('[data-comment-toggle]')
  const list = panel?.querySelector('[data-comments-list]')
  const count = post?.querySelector('[data-comment-count]')
  const comment = payload.comment

  if (!list || !comment) return

  list.querySelector('[data-comments-empty]')?.remove()

  const item = document.createElement('div')
  const row = document.createElement('div')
  const avatarLink = document.createElement('a')
  const text = document.createElement('div')
  const meta = document.createElement('div')
  const link = document.createElement('a')
  const role = document.createElement('span')
  const premium = document.createElement('span')
  const body = document.createElement('p')
  const avatar = document.createElement(comment.author.avatarUrl ? 'img' : 'span')

  item.className = 'rounded-2xl border border-[#416543]/10 bg-white/72 px-4 py-3 shadow-sm'
  row.className = 'flex items-start gap-3'
  avatarLink.className = 'flex-none'
  avatarLink.href = `/users/${encodeURIComponent(comment.author.username)}`
  text.className = 'min-w-0 flex-1'
  meta.className = 'flex flex-wrap items-center gap-2'
  link.className = 'text-xs font-black text-[#113e14]'
  link.href = `/users/${encodeURIComponent(comment.author.username)}`
  link.textContent = `@${comment.author.username}`
  role.className = 'profile-badge profile-badge--role profile-badge--compact'
  role.textContent = comment.author.roleLabel || 'Member'
  premium.className = 'profile-badge profile-badge--premium profile-badge--compact'
  premium.textContent = 'Premium'
  body.className = 'mt-1 text-sm font-semibold leading-6 text-[#113e14]/74'
  body.textContent = comment.body

  if (comment.author.avatarUrl) {
    avatar.src = comment.author.avatarUrl
    avatar.alt = ''
    avatar.loading = 'lazy'
    avatar.decoding = 'async'
    avatar.className = 'h-10 w-10 rounded-full object-cover'
  } else {
    avatar.className =
      'flex h-10 w-10 items-center justify-center rounded-full bg-[#113e14] text-sm font-black text-[#ebe3a7]'
    avatar.textContent = getFirstInitial(comment.author.initial)
  }

  avatarLink.append(avatar)
  meta.append(link, role)
  if (comment.author.isPremium) {
    meta.append(premium)
  }
  text.append(meta, body)
  row.append(avatarLink, text)
  item.append(row)
  list.append(item)

  if (count && payload.count !== undefined) {
    count.textContent = payload.count
  }

  openCommunityComments(post)
  toggle?.setAttribute('aria-expanded', 'true')
  updateCommunityCommentsLabel(post)
}

function bindCommunityCommentsToggle(button) {
  if (button.dataset.communityCommentsToggleReady === 'true') return

  button.dataset.communityCommentsToggleReady = 'true'
  button.addEventListener('click', () => {
    const post = button.closest('[data-community-post]')
    const panel = getCommunityCommentsPanel(post)

    if (!panel || !post) return

    const willOpen = panel.classList.contains('hidden')

    if (willOpen) {
      openCommunityComments(post)
    } else {
      closeCommunityComments(post)
    }

    button.setAttribute('aria-expanded', willOpen ? 'true' : 'false')
    updateCommunityCommentsLabel(post)

    if (willOpen) {
      window.setTimeout(() => post.querySelector('[data-comment-input]')?.focus(), 120)
    }
  })

  const post = button.closest('[data-community-post]')
  const panel = getCommunityCommentsPanel(post)

  panel?.querySelectorAll('[data-comments-close]').forEach((closeButton) => {
    if (closeButton.dataset.communityCommentsCloseReady === 'true') return

    closeButton.dataset.communityCommentsCloseReady = 'true'
    closeButton.addEventListener('click', () => closeCommunityComments(post))
  })

  if (panel && panel.dataset.communityCommentsOverlayReady !== 'true') {
    panel.dataset.communityCommentsOverlayReady = 'true'
    panel.addEventListener('click', (event) => {
      if (event.target === panel) closeCommunityComments(post)
    })
  }

  updateCommunityCommentsLabel(button.closest('[data-community-post]'))
}

function openCommunityComments(post) {
  const panel = getCommunityCommentsPanel(post)
  const toggle = post?.querySelector('[data-comment-toggle]')

  if (!panel) return

  if (panel.parentElement !== document.body) {
    document.body.append(panel)
  }

  panel.classList.remove('hidden')
  panel.classList.add('flex')
  toggle?.setAttribute('aria-expanded', 'true')
  document.body.classList.add('overflow-hidden')
  updateCommunityCommentsLabel(post)
}

function closeCommunityComments(post) {
  const panel = getCommunityCommentsPanel(post)
  const toggle = post?.querySelector('[data-comment-toggle]')

  if (!panel) return

  panel.classList.add('hidden')
  panel.classList.remove('flex')
  toggle?.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('overflow-hidden')
  updateCommunityCommentsLabel(post)
}

function updateCommunityCommentsLabel(post) {
  if (!post) return

  const panel = getCommunityCommentsPanel(post)
  const label = post.querySelector('[data-comment-toggle-label]')

  if (!panel || !label) return

  label.textContent = panel.classList.contains('hidden') ? 'Comments' : 'Hide'
}

function getCommunityCommentPost(form) {
  const directPost = form.closest('[data-community-post]')
  const postId = form.getAttribute('data-comment-post-id')

  return directPost || (postId ? document.querySelector(`[data-community-post="${postId}"]`) : null)
}

function getCommunityCommentsPanel(post) {
  const postId = post?.getAttribute('data-community-post')

  return (
    post?.querySelector('[data-comments-panel]') ||
    (postId
      ? document.querySelector(`[data-comments-panel][data-comments-post-id="${postId}"]`)
      : null)
  )
}

function bindCommunityLazyImage(image) {
  if (image.dataset.communityLazyReady === 'true') return

  const markLoaded = () => image.classList.add('is-loaded')

  image.dataset.communityLazyReady = 'true'
  image.addEventListener('load', markLoaded, { once: true })
  image.addEventListener('error', () => image.classList.add('is-loaded'), { once: true })

  if (image.complete) markLoaded()
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
    if (percent) {
      percent.classList.toggle('text-[#dca15d]', option.selected)
      percent.classList.toggle('text-[#416543]', !option.selected)
    }
    if (bar) {
      bar.style.width = `${option.percent}%`
      bar.classList.toggle('bg-[#113e14]', option.selected)
      bar.classList.toggle('bg-[#a8b841]', !option.selected)
    }
    if (button) {
      button.classList.toggle('bg-[#113e14]/10', option.selected)
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
    button.classList.toggle('bg-[#dca15d]', !payload.following)
    button.classList.toggle('text-[#113e14]', !payload.following)
  }

  document.querySelectorAll('[data-followers-count]').forEach((count) => {
    if (payload.followers !== undefined) count.textContent = payload.followers
  })

  document.querySelectorAll('[data-friend-badge]').forEach((badge) => {
    if (payload.isFriend === undefined) return

    badge.classList.toggle('hidden', !payload.isFriend)
  })
}

function decrementSavedTotal() {
  document.querySelectorAll('[data-saved-total]').forEach((count) => {
    count.textContent = Math.max(0, Number(count.textContent || 0) - 1)
  })
}

function initPlantCatalogSearch() {
  document.querySelectorAll('[data-plant-search]').forEach((form) => {
    if (form.dataset.plantSearchReady === 'true') return

    const input = form.querySelector('[data-plant-search-input]')
    const resultsBox = form.querySelector('[data-plant-search-results]')

    if (!input || !resultsBox) return

    let searchTimeout = null
    let activeRequest = null

    form.dataset.plantSearchReady = 'true'

    const closeResults = () => {
      resultsBox.classList.add('hidden')
      input.setAttribute('aria-expanded', 'false')
    }

    const openResults = () => {
      resultsBox.classList.remove('hidden')
      input.setAttribute('aria-expanded', 'true')
    }

    const runSearch = async () => {
      const query = input.value.trim()

      activeRequest?.abort()

      if (query.length < 2) {
        renderPlantSearchStatus(resultsBox, query ? 'Keep typing to search the catalog.' : '')
        if (!query) closeResults()
        return
      }

      activeRequest = new AbortController()
      renderPlantSearchStatus(resultsBox, 'Searching...')
      openResults()

      try {
        const searchUrl = new URL('/plants/search', window.location.origin)
        searchUrl.searchParams.set('q', query)
        searchUrl.searchParams.set('search', query)
        searchUrl.searchParams.set('query', query)

        const response = await fetch(searchUrl, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
          cache: 'no-store',
          signal: activeRequest.signal,
        })

        if (!response.ok) throw new Error('Plant search failed')

        const payload = await response.json()
        const results = Array.isArray(payload) ? payload : payload.results || []
        renderPlantSearchResults(
          resultsBox,
          results.length > 0 ? results : getLocalPlantSearchResults(query)
        )
        openResults()
      } catch (error) {
        if (error.name === 'AbortError') return

        renderPlantSearchResults(resultsBox, getLocalPlantSearchResults(query))
        openResults()
      }
    }

    input.addEventListener('input', () => {
      window.clearTimeout(searchTimeout)
      searchTimeout = window.setTimeout(runSearch, 160)
    })

    input.addEventListener('focus', () => {
      if (resultsBox.children.length > 0 && input.value.trim().length >= 2) {
        openResults()
      }
    })

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeResults()
        input.blur()
      }
    })

    form.addEventListener('submit', (event) => {
      event.preventDefault()

      const firstResult = resultsBox.querySelector('[data-plant-search-result]')

      if (firstResult) {
        navigateToPlant(firstResult.getAttribute('href'), event)
        closeResults()
        return
      }

      runSearch()
    })

    resultsBox.addEventListener('click', (event) => {
      const link = event.target.closest('[data-plant-search-result]')

      if (!link) return

      navigateToPlant(link.getAttribute('href'), event)
      closeResults()
    })

    document.addEventListener('click', (event) => {
      if (!form.contains(event.target)) closeResults()
    })
  })

  highlightPlantFromHash()
}

function renderPlantSearchStatus(resultsBox, message) {
  resultsBox.replaceChildren()

  if (!message) return

  const status = document.createElement('p')
  status.className = 'px-4 py-3 text-sm font-bold text-[#113e14]/70'
  status.textContent = message
  resultsBox.append(status)
}

function renderPlantSearchResults(resultsBox, results) {
  resultsBox.replaceChildren()

  if (results.length === 0) {
    renderPlantSearchStatus(
      resultsBox,
      'No matches yet. Try a plant name, scientific name, or family.'
    )
    return
  }

  results.forEach((plant) => {
    const link = document.createElement('a')
    const image = document.createElement('img')
    const content = document.createElement('span')
    const name = document.createElement('span')
    const meta = document.createElement('span')
    const badge = document.createElement('span')

    link.href = plant.href
    link.dataset.plantSearchResult = 'true'
    link.className =
      'flex items-center gap-3 rounded-[1rem] px-3 py-2 text-left transition hover:bg-white/80 focus:bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#48AE4D]/45'
    link.setAttribute('role', 'option')

    image.src = plant.imageUrl || `/${plant.image}`
    image.alt = ''
    image.className = 'h-12 w-12 flex-none rounded-xl object-cover shadow-sm'
    image.loading = 'lazy'
    image.decoding = 'async'
    image.addEventListener('error', () => image.remove())

    content.className = 'min-w-0 flex-1'
    name.className = 'block truncate text-sm font-black text-[#113e14]'
    name.textContent = plant.name
    meta.className = 'block truncate text-xs font-semibold text-[#113e14]/60'
    meta.textContent = `${plant.scientificName} - ${plant.family}`

    badge.className =
      'hidden rounded-full bg-[#113e14]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#113e14] sm:inline-flex'
    badge.textContent = plant.catalog

    content.append(name, meta)
    link.append(image, content, badge)
    resultsBox.append(link)
  })
}

function getLocalPlantSearchResults(query) {
  const normalizedQuery = normalizePlantSearchValue(query)

  if (normalizedQuery.length < 2) return []

  return Array.from(document.querySelectorAll('[data-plant-card]'))
    .map((card) => {
      const section = card.closest('.category-section')
      const name = card.querySelector('h3')?.textContent?.trim() || ''
      const scientificName =
        Array.from(card.querySelectorAll('p'))
          .map((item) => item.textContent?.trim() || '')
          .find((text) => text && !text.toLowerCase().includes('scientific name')) || ''
      const image = card.querySelector('img')?.getAttribute('src') || ''
      const family = section?.id || ''
      const searchable = normalizePlantSearchValue(`${name} ${scientificName} ${family}`)

      if (!card.id || !searchable.includes(normalizedQuery)) return null

      return {
        id: card.id,
        name,
        scientificName,
        family: family ? family.charAt(0).toUpperCase() + family.slice(1) : 'Current catalog',
        catalog: 'Current catalog',
        imageUrl: image,
        href: `${window.location.pathname}#${card.id}`,
      }
    })
    .filter(Boolean)
    .slice(0, 8)
}

function normalizePlantSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function navigateToPlant(href, event) {
  if (!href) return

  const targetUrl = new URL(href, window.location.origin)

  if (
    targetUrl.origin === window.location.origin &&
    targetUrl.pathname === window.location.pathname
  ) {
    event.preventDefault()
    window.history.pushState({}, '', `${targetUrl.pathname}${targetUrl.hash}`)
    highlightPlantFromHash()
    return
  }

  window.location.href = targetUrl.toString()
}

function highlightPlantFromHash() {
  if (!window.location.hash) return

  const targetId = decodeURIComponent(window.location.hash.slice(1))
  const target = document.getElementById(targetId)

  if (!target?.matches('[data-plant-card]')) return

  const section = target.closest('.category-section')

  if (section) {
    revealPlantCategory(section)
  }

  window.requestAnimationFrame(() => {
    document.querySelectorAll('.plant-catalog-highlight').forEach((plant) => {
      plant.classList.remove('plant-catalog-highlight')
    })

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('plant-catalog-highlight')

    window.setTimeout(() => {
      target.classList.remove('plant-catalog-highlight')
    }, 2800)
  })
}

function revealPlantCategory(section) {
  if (typeof window.showCategory === 'function') {
    window.showCategory(null, section.id)
    return
  }

  document.querySelectorAll('.category-section').forEach((categorySection) => {
    categorySection.classList.toggle('hidden', categorySection !== section)
  })

  document.querySelectorAll('.category-btn').forEach((button) => {
    const target =
      button.dataset.categoryTarget || button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    const isActive = target === section.id

    button.classList.toggle('bg-[#113e14]', isActive)
    button.classList.toggle('text-white', isActive)
    button.classList.toggle('shadow-md', isActive)
    button.classList.toggle('text-[#2D2B2B]', !isActive)
  })
}

window.addEventListener('hashchange', highlightPlantFromHash)
window.PlantBudCatalog = {
  ...(window.PlantBudCatalog || {}),
  highlightFromHash: highlightPlantFromHash,
}

function initApp() {
  initAuthForms()
  initProfilePage()
  initProfileRelationsModal()
  initProfilePostPreview()
  initAppNavbarMenus()
  initCommunityPage()
  initPlantCatalogSearch()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

Alpine.start()
