function animateCatalogPanel(panel, animationClass) {
  panel?.classList.remove('catalog-switch-in', 'catalog-switch-out')
  void panel?.offsetWidth
  panel?.classList.add(animationClass)
}

function showCatalogPanel(panel) {
  panel.classList.remove('hidden')
  panel.classList.add('flex')
  animateCatalogPanel(panel, 'catalog-switch-in')
}

function hideCatalogPanel(panel) {
  animateCatalogPanel(panel, 'catalog-switch-out')

  window.setTimeout(() => {
    panel.classList.add('hidden')
    panel.classList.remove('flex', 'catalog-switch-out')
  }, 100)
}

function toggleMenu() {
  const sectionMenu = document.querySelector('[data-catalog-section-menu]')
  const familyPanel = document.querySelector('[data-catalog-family-panel]')
  const toggle = document.querySelector('[data-catalog-section-toggle]')
  const switchBar = toggle?.closest('[data-catalog-switch-bar]')

  if (!sectionMenu || !familyPanel) return

  const showingSections = !sectionMenu.classList.contains('hidden')

  if (showingSections) {
    hideCatalogPanel(sectionMenu)
    window.setTimeout(() => showCatalogPanel(familyPanel), 35)
    toggle?.classList.remove('is-section-mode')
    switchBar?.classList.remove('is-section-mode')
    return
  }

  hideCatalogPanel(familyPanel)
  window.setTimeout(() => showCatalogPanel(sectionMenu), 35)
  toggle?.classList.add('is-section-mode')
  switchBar?.classList.add('is-section-mode')
}

window.toggleMenu = toggleMenu
