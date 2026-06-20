import AccountProfile from '#models/account_profile'
import Follow from '#models/follow'
import GardenProject from '#models/garden_project'
import GardenerProfile from '#models/gardener_profile'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Frontend layout', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('advertises the PWA while preserving the selected frontend', async ({ visit, assert }) => {
    const desktopPage = await visit('/')
    assert.equal(
      await desktopPage.locator('link[rel="manifest"]').getAttribute('href'),
      '/site.webmanifest'
    )
    assert.equal(await desktopPage.locator('body').getAttribute('data-frontend'), 'PC')
    assert.equal(await desktopPage.locator('[data-pwa-install]').count(), 0)

    const phonePage = await visit('/')
    await phonePage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await phonePage.reload()

    assert.equal(
      await phonePage.locator('link[rel="manifest"]').getAttribute('href'),
      '/site.webmanifest'
    )
    assert.equal(await phonePage.locator('body').getAttribute('data-frontend'), 'Phone')
    assert.equal(
      await phonePage.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content'),
      'yes'
    )
    assert.equal(await phonePage.locator('[data-pwa-install]').count(), 0)
  })

  test('preserves device selection on not found pages', async ({ visit, assert }) => {
    const desktopPage = await visit('/missing-plant-bud-page')
    assert.equal(await desktopPage.locator('body').getAttribute('data-frontend'), 'PC')
    assert.equal(await desktopPage.locator('link[rel="manifest"]').count(), 1)

    const phonePage = await visit('/missing-plant-bud-page')
    await phonePage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await phonePage.reload()

    assert.equal(await phonePage.locator('body').getAttribute('data-frontend'), 'Phone')
    assert.equal(await phonePage.locator('[data-pwa-install]').count(), 0)
  })

  test('nursery directory stays organized and touch-friendly on phones', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Nursery',
      last_name: 'Visitor',
      username: 'nursery.directory.visitor',
      email: 'nursery.directory.visitor@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await browserContext.loginAs(user)

    const page = await visit('/nurseries')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await page.reload()

    const root = page.locator('[data-phone-nurseries]')
    await root.waitFor()
    await root.getByRole('heading', { name: /Find a place where/i }).waitFor()
    assert.equal(await root.locator('.phone-nursery-shortcuts a').count(), 3)

    const heroBox = await root.locator('.nursery-hero').boundingBox()
    const mapBox = await root.locator('.nursery-map-shell').boundingBox()
    assert.isNotNull(heroBox)
    assert.isNotNull(mapBox)
    assert.isAtLeast(heroBox!.x, 0)
    assert.isAtMost(heroBox!.x + heroBox!.width, 390)
    assert.isAtLeast(mapBox!.x, 0)
    assert.isAtMost(mapBox!.x + mapBox!.width, 390)

    const accountCards = root.locator('.nursery-account-card')
    if ((await accountCards.count()) > 0) {
      const firstCard = accountCards.first()
      const cardBox = await firstCard.boundingBox()
      assert.isNotNull(cardBox)
      assert.isAtMost(cardBox!.x + cardBox!.width, 390)
      assert.equal(await firstCard.locator('.nursery-account-metrics > div').count(), 3)
      assert.isTrue(await firstCard.getByRole('link', { name: 'Go to profile' }).isVisible())
    }

    assert.equal(
      await root.evaluate(
        (element) =>
          element.ownerDocument.documentElement.scrollWidth <=
          element.ownerDocument.documentElement.clientWidth
      ),
      true
    )
  })

  test('welcome page keeps its visual impact and organization on phones', async ({
    visit,
    assert,
  }) => {
    const page = await visit('/')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await page.reload()

    const root = page.locator('[data-phone-welcome]')
    await root.waitFor()
    const heroHeading = root.locator('.phone-welcome-v2-hero h1')
    const headingStyle = await heroHeading.evaluate((heading) => {
      const style = heading.ownerDocument.defaultView?.getComputedStyle(heading)
      return {
        fontSize: Number.parseFloat(style?.fontSize || '0'),
        lineHeight: Number.parseFloat(style?.lineHeight || '0'),
      }
    })
    assert.isAtLeast(headingStyle.fontSize, 50)
    assert.isBelow(headingStyle.lineHeight, headingStyle.fontSize)

    const collage = (await root.locator('.phone-welcome-v2-hero-gallery').boundingBox())!
    assert.isAtLeast(collage.x, 0)
    assert.isAtMost(collage.x + collage.width, 390)
    assert.isTrue(
      await root
        .locator('.phone-welcome-v2-hero-gallery article')
        .first()
        .evaluate((card) => {
          const style = card.ownerDocument.defaultView?.getComputedStyle(card)
          return (
            style?.alignItems === 'center' &&
            style.justifyContent === 'center' &&
            style.textAlign === 'center'
          )
        })
    )
    assert.isAtMost(
      await root
        .locator('.phone-welcome-v2-benefits article')
        .first()
        .evaluate((card) => card.getBoundingClientRect().height),
      170
    )

    assert.isTrue(
      await root
        .locator('.phone-welcome-v2-stats .phone-welcome-v2-scroll')
        .evaluate((track) => track.scrollWidth > track.clientWidth)
    )
    assert.isTrue(
      await root
        .locator('.phone-welcome-v2-audience .phone-welcome-v2-scroll')
        .evaluate((track) => track.scrollWidth > track.clientWidth)
    )
    assert.equal(
      await root.evaluate(
        (element) =>
          element.ownerDocument.documentElement.scrollWidth <=
          element.ownerDocument.documentElement.clientWidth
      ),
      true
    )
    assert.equal((await root.locator('a[href="/register"]').count()) >= 3, true)
  })

  test('login renders and signup remains scrollable on a laptop viewport', async ({
    visit,
    assert,
  }) => {
    const loginPage = await visit('/login')
    await loginPage.setViewportSize({ width: 1280, height: 720 })
    await loginPage.reload()
    await loginPage.getByRole('heading', { name: 'Welcome back' }).waitFor()
    const loginVisualState = await loginPage.locator('[data-auth-page]').evaluate((root) => {
      const card = root.querySelector('.auth-card')!
      const logo = root.querySelector('img[src*="pb-logo"]')!
      const submit = root.querySelector('button[type="submit"]')!
      const styles = root.ownerDocument.defaultView!

      return {
        cardAnimation: styles.getComputedStyle(card).animationName,
        cardBackground: styles.getComputedStyle(card).backgroundColor,
        logoTransform: styles.getComputedStyle(logo).transform,
        submitBackground: styles.getComputedStyle(submit).backgroundColor,
      }
    })
    assert.equal(loginVisualState.cardAnimation, 'none')
    assert.equal(loginVisualState.cardBackground, 'rgba(250, 248, 235, 0.98)')
    assert.equal(loginVisualState.logoTransform, 'none')
    assert.equal(loginVisualState.submitBackground, 'rgb(220, 161, 93)')

    const signupPage = await visit('/signup/gardener')
    await signupPage.setViewportSize({ width: 1280, height: 720 })
    await signupPage.reload()

    const scrollState = await signupPage
      .locator('[data-auth-page] > .relative > [class*="overflow-y-auto"]')
      .evaluate((element) => {
        const start = element.scrollTop
        element.scrollTop = element.scrollHeight

        return {
          moved: element.scrollTop > start,
          hasOverflow: element.scrollHeight > element.clientHeight,
        }
      })

    assert.isTrue(scrollState.hasOverflow)
    assert.isTrue(scrollState.moved)

    await signupPage.setViewportSize({ width: 390, height: 844 })
    await signupPage.reload()
    const mobileScrollMoved = await signupPage
      .locator('[data-auth-page] > .relative > [class*="overflow-y-auto"]')
      .evaluate((element) => {
        element.scrollTop = element.scrollHeight
        return element.scrollTop > 0
      })

    assert.isTrue(mobileScrollMoved)

    const registerPage = await visit('/register')
    await registerPage.setViewportSize({ width: 1280, height: 560 })
    await registerPage.reload()
    const laptopRegisterScroll = await registerPage
      .locator('[data-register-page]')
      .evaluate((element) => {
        const hasOverflow = element.scrollHeight > element.clientHeight
        element.scrollTop = element.scrollHeight
        return { hasOverflow, moved: element.scrollTop > 0 }
      })
    assert.isTrue(laptopRegisterScroll.hasOverflow)
    assert.isTrue(laptopRegisterScroll.moved)

    await registerPage.setViewportSize({ width: 1280, height: 900 })
    await registerPage.reload()
    const registerViewport = await registerPage
      .locator('[data-register-page]')
      .evaluate((element) => ({
        width: element.clientWidth,
        height: element.clientHeight,
      }))
    const centeredRegister = await registerPage.locator('[data-register-content]').boundingBox()
    assert.isNotNull(centeredRegister)
    assert.closeTo(centeredRegister!.x + centeredRegister!.width / 2, registerViewport.width / 2, 3)
    assert.closeTo(
      centeredRegister!.y + centeredRegister!.height / 2,
      registerViewport.height / 2,
      3
    )

    await registerPage.setViewportSize({ width: 390, height: 844 })
    await registerPage.reload()
    const phoneRegisterScroll = await registerPage
      .locator('[data-register-page]')
      .evaluate((element) => {
        const hasOverflow = element.scrollHeight > element.clientHeight
        element.scrollTop = element.scrollHeight
        return { hasOverflow, moved: element.scrollTop > 0 }
      })
    assert.isTrue(phoneRegisterScroll.hasOverflow)
    assert.isTrue(phoneRegisterScroll.moved)
  })

  test('phone authentication screens stay polished and usable', async ({ visit, assert }) => {
    const authPages = [
      { path: '/login', role: 'login' },
      { path: '/signup/client', role: 'client' },
      { path: '/signup/gardener', role: 'gardener' },
      { path: '/signup/nursery', role: 'nursery' },
    ]

    for (const authPage of authPages) {
      const page = await visit(authPage.path)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await page.reload()

      const root = page.locator(`[data-phone-auth="${authPage.role}"]`)
      await root.waitFor()
      const cardBox = (await root.locator('.phone-auth-card').boundingBox())!
      assert.isAtLeast(cardBox.x, 10)
      assert.isAtMost(cardBox.x + cardBox.width, 380)
      assert.equal(
        await root
          .locator('.phone-auth-card')
          .evaluate(
            (card) => card.ownerDocument.defaultView?.getComputedStyle(card).backgroundColor
          ),
        'rgba(250, 248, 235, 0.98)'
      )
      assert.isAtLeast(
        await root
          .locator('.phone-auth-heading img')
          .evaluate((logo) => logo.getBoundingClientRect().width),
        190
      )
      assert.isAtLeast(
        await root
          .locator('.phone-auth-card input:not([type="hidden"])')
          .first()
          .evaluate((input) => input.getBoundingClientRect().height),
        48
      )
      assert.equal(
        await root.evaluate(
          (element) =>
            element.ownerDocument.documentElement.scrollWidth <=
            element.ownerDocument.documentElement.clientWidth
        ),
        true
      )

      const paneScroll = await root.locator('.phone-auth-pane').evaluate((pane) => {
        const hasOverflow = pane.scrollHeight > pane.clientHeight
        pane.scrollTop = pane.scrollHeight
        return { hasOverflow, moved: pane.scrollTop > 0 }
      })

      if (authPage.role === 'login') {
        assert.isFalse(paneScroll.hasOverflow)
      } else {
        assert.isTrue(paneScroll.hasOverflow)
        assert.isTrue(paneScroll.moved)
      }
    }
  })

  test('notification count appears in the navbar and browser title, then clears when read', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const [user, follower] = await Promise.all([
      User.create({
        first_name: 'Notify',
        last_name: 'Client',
        username: 'notify.client',
        email: 'notify.client@example.com',
        password: 'PlantBud123!',
        role: 'client',
      }),
      User.create({
        first_name: 'New',
        last_name: 'Follower',
        username: 'new.follower',
        email: 'new.follower@example.com',
        password: 'PlantBud123!',
        role: 'client',
      }),
    ])
    await Promise.all([
      AccountProfile.create({
        userId: user.id,
        displayName: 'Notify Client',
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      }),
      AccountProfile.create({
        userId: follower.id,
        displayName: 'New Follower',
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      }),
    ])
    await Follow.create({ followerId: follower.id, followingId: user.id })
    await browserContext.loginAs(user)

    const communityPage = await visit('/community')
    await communityPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?0' })
    await communityPage.setViewportSize({ width: 1440, height: 900 })
    await communityPage.reload()
    await communityPage
      .locator('[data-pb-navbar-account] a[aria-label="Notifications, 1 unread"]')
      .waitFor()
    assert.match(await communityPage.title(), /^\(1\) /)

    await communityPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await communityPage.setViewportSize({ width: 390, height: 844 })
    await communityPage.reload()
    const phoneNotificationButton = communityPage.getByLabel('Notifications, 1 unread')
    await phoneNotificationButton.waitFor()
    assert.equal(
      (
        await phoneNotificationButton.locator('[data-phone-notification-count]').textContent()
      )?.trim(),
      '1'
    )
    const notificationIconBox = await phoneNotificationButton.locator('img').boundingBox()
    const notificationCountBox = await phoneNotificationButton
      .locator('[data-phone-notification-count]')
      .boundingBox()
    assert.isNotNull(notificationIconBox)
    assert.isNotNull(notificationCountBox)
    assert.isAbove(notificationCountBox!.x, notificationIconBox!.x)

    for (const route of ['/homepage', '/ornamental', '/scanner', '/maintenance', '/profile']) {
      const routePage = await visit(route)
      await routePage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await routePage.setViewportSize({ width: 390, height: 844 })
      await routePage.reload()
      const routeNotificationButton = routePage.getByLabel('Notifications, 1 unread')
      await routeNotificationButton.waitFor()
      assert.include(
        (await routeNotificationButton.getAttribute('class')) || '',
        'phone-navbar-notification--counted'
      )
      assert.equal(
        (await routePage.locator('[data-phone-notification-count]').textContent())?.trim(),
        '1'
      )
    }

    const notificationPage = await visit('/notification')
    await notificationPage.getByText('New follower', { exact: true }).waitFor()
    await notificationPage.getByText('1', { exact: true }).first().waitFor()
    const notificationCommunityMenu = notificationPage.locator('[data-app-nav-menu]').filter({
      has: notificationPage.getByText('Community', { exact: true }),
    })
    assert.notInclude(
      (await notificationCommunityMenu.locator('summary').getAttribute('class')) || '',
      'bg-[#ebe3a7]'
    )
    await notificationPage
      .getByRole('button', { name: 'Clear all notifications and mark them as read' })
      .click()
    await notificationPage.waitForURL('**/notification')
    await notificationPage.getByRole('heading', { name: 'Quiet for now' }).waitFor()

    const notificationProfile = await AccountProfile.findByOrFail('userId', user.id)
    assert.isNotNull(notificationProfile.notificationsSeenAt)
    assert.isNotNull(notificationProfile.notificationsClearedAt)

    const readPage = await visit('/community')
    assert.equal(
      await readPage
        .locator('[data-pb-navbar-account] a[aria-label^="Notifications"]')
        .getAttribute('aria-label'),
      'Notifications'
    )
    assert.notMatch(await readPage.title(), /^\(\d+\) /)
  })

  test('plans and notifications use dedicated comfortable phone layouts', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const [user, follower] = await Promise.all([
      User.create({
        first_name: 'Mobile',
        last_name: 'Plans',
        username: 'mobile.plans',
        email: 'mobile.plans@example.com',
        password: 'PlantBud123!',
        role: 'client',
      }),
      User.create({
        first_name: 'Mobile',
        last_name: 'Notifier',
        username: 'mobile.notifier',
        email: 'mobile.notifier@example.com',
        password: 'PlantBud123!',
        role: 'client',
      }),
    ])
    await Promise.all([
      AccountProfile.create({
        userId: user.id,
        displayName: 'Mobile Plans',
        subscriptionPlan: 'free',
        rewardPoints: 25,
        scannerMonthlyLimit: 5,
      }),
      AccountProfile.create({
        userId: follower.id,
        displayName: 'Mobile Notifier',
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      }),
    ])
    await Follow.create({ followerId: follower.id, followingId: user.id })
    await browserContext.loginAs(user)

    const plansPage = await visit('/plans')
    await plansPage.setViewportSize({ width: 390, height: 844 })
    await plansPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await plansPage.reload()
    const plansRoot = plansPage.locator('[data-phone-plans]')
    await plansRoot.waitFor()
    const summaryTops = await plansRoot
      .locator('.phone-plans-summary > div')
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
    assert.equal(summaryTops.length, 3)
    assert.equal(new Set(summaryTops).size, 1)
    const premiumBox = await plansRoot.locator('.phone-plan-card--premium').boundingBox()
    const freeBox = await plansRoot.locator('.phone-plan-card--free').boundingBox()
    assert.isNotNull(premiumBox)
    assert.isNotNull(freeBox)
    assert.isBelow(premiumBox!.y, freeBox!.y)
    assert.isTrue(
      await plansRoot
        .locator('.phone-premium-benefits')
        .evaluate((benefits) => benefits.scrollWidth > benefits.clientWidth)
    )
    assert.isFalse(
      await plansRoot.evaluate(
        (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
      )
    )

    const notificationPage = await visit('/notification')
    await notificationPage.setViewportSize({ width: 390, height: 844 })
    await notificationPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await notificationPage.reload()
    const notificationRoot = notificationPage.locator('[data-phone-notifications]')
    await notificationRoot.waitFor()
    assert.equal(
      await notificationRoot
        .locator('.phone-notifications-sidebar')
        .evaluate(
          (sidebar) => sidebar.ownerDocument.defaultView?.getComputedStyle(sidebar).display
        ),
      'none'
    )
    assert.equal(await notificationRoot.locator('.phone-notification-card').count(), 1)
    const actionTops = await notificationRoot
      .locator('.phone-notifications-actions > *')
      .evaluateAll((actions) =>
        actions.map((action) => Math.round(action.getBoundingClientRect().top))
      )
    assert.equal(new Set(actionTops).size, 1)
    assert.isFalse(
      await notificationRoot.evaluate(
        (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
      )
    )
  })

  test('catalog families and their care guides are organized for phones', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Catalog',
      last_name: 'Viewer',
      username: 'catalog.viewer',
      email: 'catalog.viewer@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await browserContext.loginAs(user)

    const catalogs = [
      { path: '/ornamental', kind: 'ornamental' },
      { path: '/horticultural', kind: 'horticultural' },
      { path: '/succulent', kind: 'succulent' },
    ]
    const catalogCardWidths: number[] = []

    for (const catalog of catalogs) {
      const page = await visit(catalog.path)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await page.reload()
      const root = page.locator(`[data-phone-catalog="${catalog.kind}"]`)
      await root.waitFor()
      const visibleSection = root.locator('.category-section:not(.hidden)')
      await visibleSection.waitFor()
      assert.match(
        await visibleSection.evaluate(
          (section) =>
            section.ownerDocument.defaultView?.getComputedStyle(section).gridTemplateColumns || ''
        ),
        /\S+\s+\S+/
      )
      assert.isAtMost((await root.locator('.catalog-page-hero img').boundingBox())!.height, 220)
      assert.equal(await root.locator('.catalog-search-panel a[href^="/care"]').count(), 1)
      const cards = root.locator('.category-section:not(.hidden) .plant-catalog-card')
      assert.isAbove(await cards.count(), 1)
      const cardLayout = await cards.first().evaluate((card) => {
        const image = card.querySelector('img')
        const action = card.querySelector('a')
        const cardBox = card.getBoundingClientRect()
        const imageBox = image?.getBoundingClientRect()
        const actionBox = action?.getBoundingClientRect()
        return {
          fits: Boolean(
            image &&
            action &&
            imageBox &&
            actionBox &&
            card.scrollWidth <= card.clientWidth &&
            imageBox.left >= cardBox.left &&
            imageBox.right <= cardBox.right &&
            actionBox.left >= cardBox.left &&
            actionBox.right <= cardBox.right &&
            actionBox.bottom <= cardBox.bottom + 1
          ),
          card: { left: cardBox.left, right: cardBox.right, bottom: cardBox.bottom },
          image: imageBox
            ? { left: imageBox.left, right: imageBox.right, bottom: imageBox.bottom }
            : null,
          action: actionBox
            ? { left: actionBox.left, right: actionBox.right, bottom: actionBox.bottom }
            : null,
          scrollWidth: card.scrollWidth,
          clientWidth: card.clientWidth,
        }
      })
      catalogCardWidths.push((await cards.first().boundingBox())!.width)
      assert.isTrue(
        cardLayout.fits,
        `Catalog card layout overflowed: ${JSON.stringify(cardLayout)}`
      )
      assert.isTrue(
        await root
          .locator('[data-catalog-family-panel]')
          .evaluate((panel) => panel.scrollWidth >= panel.clientWidth)
      )
      await root.locator('[data-catalog-section-toggle]').click()
      await root.locator('[data-catalog-section-menu]:not(.hidden)').waitFor()
      assert.isTrue(
        await root.locator('[data-catalog-section-menu]').evaluate((menu) => {
          const links = [...menu.querySelectorAll('a')]
          if (links.length !== 3) return false
          const menuBox = menu.getBoundingClientRect()
          const firstBox = links[0].getBoundingClientRect()
          const lastBox = links[2].getBoundingClientRect()
          const linksCenter = (firstBox.left + lastBox.right) / 2
          return Math.abs(linksCenter - (menuBox.left + menuBox.width / 2)) < 2
        })
      )
      assert.equal(
        await root.evaluate(
          (element) => element.ownerDocument.defaultView?.getComputedStyle(element).overflowX
        ),
        'hidden'
      )
    }
    assert.isAtMost(Math.max(...catalogCardWidths) - Math.min(...catalogCardWidths), 1)

    const careGuides = [
      { path: '/care1', kind: 'ornamental' },
      { path: '/care2', kind: 'horticultural' },
      { path: '/care3', kind: 'succulent' },
    ]

    for (const care of careGuides) {
      const page = await visit(care.path)
      await page.setViewportSize({ width: 390, height: 844 })
      await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await page.reload()
      await page.locator(`[data-phone-care-page="${care.kind}"]`).waitFor()
      const careHeaderBox = (await page.locator('.care-page-header').boundingBox())!
      assert.isAtMost(careHeaderBox.height, 440)
      assert.isAtMost(Math.abs(careHeaderBox.y), 1)
      assert.isAtMost(
        (await page.locator('.phone-care-intro .homepage-hero-media').boundingBox())!.height,
        240
      )
      assert.isTrue(
        await page
          .locator('.phone-care-species .grid')
          .evaluate((track) => track.scrollWidth > track.clientWidth)
      )
      assert.equal(
        await page
          .locator('.phone-care-species')
          .evaluate(
            (section) =>
              section.ownerDocument.defaultView?.getComputedStyle(section).backgroundColor
          ),
        'rgb(65, 101, 67)'
      )
      assert.isTrue(
        await page
          .locator('.care-tip-grid')
          .evaluate((track) => track.scrollWidth > track.clientWidth)
      )
      assert.equal(
        await page
          .locator('.care-focus-panel')
          .evaluate(
            (panel) => panel.ownerDocument.defaultView?.getComputedStyle(panel).borderRadius
          ),
        '20px'
      )
      assert.equal(
        await page
          .locator('body')
          .evaluate((body) => body.ownerDocument.defaultView?.getComputedStyle(body).overflowX),
        'hidden'
      )
      assert.equal(await page.locator('.care-closing').count(), 1)
      assert.equal(await page.locator('.care-closing a[href="/nurseries"]').count(), 1)
      assert.match(
        await page
          .locator('.care-closing > .grid')
          .evaluate(
            (closing) =>
              closing.ownerDocument.defaultView?.getComputedStyle(closing).gridTemplateColumns || ''
          ),
        /\S+/
      )
    }
  })

  test('desktop navigation and tool actions stay consistent', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Layout',
      last_name: 'Client',
      username: 'layout.client',
      email: 'layout.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Layout Client',
      subscriptionPlan: 'premium',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const desktopDesignerProject = await GardenProject.create({
      userId: user.id,
      name: 'Desktop garden',
      description: 'Desktop designer layout test',
      stateJson: JSON.stringify({ els: [], zIndexCounter: 10, layerCounter: 0 }),
      inventoryJson: '[]',
      baseImageName: null,
      itemCount: 0,
    })

    await browserContext.loginAs(user)

    const communityPage = await visit('/community')
    await communityPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?0' })
    await communityPage.setViewportSize({ width: 1440, height: 900 })
    await communityPage.reload()
    await communityPage.locator('[data-pb-navbar-account] a[aria-label^="Notifications"]').waitFor()

    const servicesMenu = communityPage.locator('[data-app-nav-menu]').filter({
      has: communityPage.getByText('Services', { exact: true }),
    })
    assert.equal(await servicesMenu.locator('a[href="/ornamental"]').count(), 1)

    const layoutBox = await communityPage.locator('[data-community-layout]').boundingBox()
    assert.isNotNull(layoutBox)
    assert.closeTo(layoutBox!.x + layoutBox!.width / 2, 720, 3)

    const scannerPage = await visit('/scanner')
    await scannerPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?0' })
    await scannerPage.reload()
    await scannerPage.getByRole('button', { name: 'Upload image' }).waitFor()
    await scannerPage.getByRole('button', { name: 'Upload image' }).click()
    await scannerPage.locator('[data-phone-upload-trigger]').first().waitFor()
    await scannerPage.getByRole('button', { name: 'Analyze plant' }).waitFor()
    await scannerPage.locator('[data-pb-navbar-account] a[aria-label^="Notifications"]').waitFor()

    const designerPage = await visit('/designer')
    await designerPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?0' })
    await designerPage.reload()
    await designerPage.getByRole('heading', { name: 'Garden projects' }).waitFor()
    await designerPage.getByRole('link', { name: 'Open Desktop garden' }).waitFor()
    await designerPage.goto(`/designer/projects/${desktopDesignerProject.id}`)
    await designerPage.getByRole('button', { name: 'Upload image' }).waitFor()
    await designerPage.getByRole('button', { name: 'Upload image' }).click()
    await designerPage.locator('[data-phone-upload-trigger]').first().waitFor()
    await designerPage.getByRole('button', { name: 'Download design' }).waitFor()
    await designerPage.getByRole('button', { name: 'Original' }).waitFor()
    await designerPage.getByRole('button', { name: 'Grid' }).waitFor()
    assert.equal(await designerPage.locator('[data-designer-zoom-label]').textContent(), '100%')
    assert.equal(await designerPage.locator('#designerLayers').count(), 1)
    assert.equal(await designerPage.locator('.designer-asset-search-hints button').count(), 3)
    assert.equal(
      await designerPage
        .locator('.designer-asset-search-panel')
        .evaluate((panel) => panel.ownerDocument.defaultView?.getComputedStyle(panel).color),
      'rgb(17, 62, 20)'
    )
    await designerPage.locator('[data-pb-navbar-account] a[aria-label^="Notifications"]').waitFor()
  })

  test('free scanner prominently shows remaining uses and the monthly reset date', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Free',
      last_name: 'Scanner',
      username: 'free.scanner',
      email: 'free.scanner@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Free Scanner',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    await browserContext.loginAs(user)

    const scannerPage = await visit('/scanner')
    const usage = scannerPage.getByLabel('Free scanner usage')
    await usage.getByText('5 of 5 analyses available', { exact: true }).waitFor()
    assert.match((await usage.locator('[data-scanner-reset]').textContent()) || '', /^Restores on /)
    await usage.getByRole('link', { name: 'Get unlimited scans' }).waitFor()
  })

  test('client, gardener, and nursery homepages use the organized phone layout', async ({
    browserContext,
    visit,
    assert,
  }) => {
    for (const role of ['client', 'gardener', 'nursery'] as const) {
      const user = await User.create({
        first_name: 'Phone',
        last_name: role,
        username: `phone.home.${role}`,
        email: `phone.home.${role}@example.com`,
        phone: '7000-0099',
        password: 'PlantBud123!',
        role,
      })
      await AccountProfile.create({
        userId: user.id,
        displayName: `Phone ${role}`,
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      })

      await browserContext.loginAs(user)
      const page = await visit('/homepage')
      await page.setViewportSize({ width: 390, height: 844 })
      await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await page.reload()

      const homepage = page.locator(`[data-phone-homepage="${role}"]`)
      await homepage.waitFor()
      const heroImage = homepage.locator('.phone-homepage-visual .homepage-hero-media')
      const heroImageBox = await heroImage.boundingBox()
      assert.isNotNull(heroImageBox)
      assert.isAtMost(heroImageBox!.height, 260)
      const statusBox = await homepage.locator('.phone-homepage-status').boundingBox()
      assert.isNotNull(statusBox)
      assert.isAtLeast(statusBox!.y, heroImageBox!.y + heroImageBox!.height)

      const actions = homepage.locator('.phone-homepage-actions a')
      assert.equal(await actions.count(), 2)
      const actionBoxes = await actions.evaluateAll((links) =>
        links.map((link) => {
          const box = link.getBoundingClientRect()
          return { top: Math.round(box.top), width: Math.round(box.width) }
        })
      )
      assert.equal(actionBoxes[0].top, actionBoxes[1].top)
      assert.closeTo(actionBoxes[0].width, actionBoxes[1].width, 2)

      const toolsTrack = homepage.locator('[data-phone-homepage-track="tools"]')
      const toolCards = await toolsTrack.locator(':scope > a').evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect()
          return { top: Math.round(box.top), width: Math.round(box.width) }
        })
      )
      assert.equal(toolCards.length, 3)
      assert.equal(toolCards[0].top, toolCards[1].top)
      assert.isAbove(toolCards[2].top, toolCards[0].top)
      assert.isAbove(toolCards[2].width, toolCards[0].width)

      const roleNavigation = homepage.locator('.phone-homepage-navigation-grid')
      assert.equal(await roleNavigation.locator(':scope > a').count(), 4)
      assert.isFalse(
        await homepage.evaluate(
          (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
        )
      )

      if (role === 'client') {
        const plantPath = homepage.locator('[data-phone-homepage-track="explore"] > a').first()
        const plantPathBox = await plantPath.boundingBox()
        const plantPathImageBox = await plantPath.locator(':scope > img').boundingBox()
        assert.isNotNull(plantPathBox)
        assert.isNotNull(plantPathImageBox)
        assert.closeTo(plantPathImageBox!.width, plantPathBox!.width, 1)
        assert.closeTo(plantPathImageBox!.height, plantPathBox!.height, 1)
      }
    }
  })

  test('phone gardener services stay organized from discovery through request tracking', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const client = await User.create({
      first_name: 'Mobile',
      last_name: 'Services',
      username: 'mobile.services.client',
      email: 'mobile.services.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: client.id,
      displayName: 'Mobile Services',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })

    const gardeners: GardenerProfile[] = []
    for (const index of [1, 2]) {
      const gardenerUser = await User.create({
        first_name: 'Phone',
        last_name: `Gardener ${index}`,
        username: `phone.services.gardener.${index}`,
        email: `phone.services.gardener.${index}@example.com`,
        password: 'PlantBud123!',
        role: 'gardener',
      })
      await AccountProfile.create({
        userId: gardenerUser.id,
        displayName: `Phone Gardener ${index}`,
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      })
      gardeners.push(
        await GardenerProfile.create({
          userId: gardenerUser.id,
          headline: 'Mobile garden maintenance',
          serviceArea: 'San Salvador',
          availabilitySchedule: 'Monday to Friday, 8:00 AM to 4:00 PM',
          paymentMethods: 'Cash',
          isAvailable: true,
          experienceYears: index + 2,
          ratingAverage: 5,
          ratingCount: 2,
        })
      )
    }

    await browserContext.loginAs(client)
    const servicesPage = await visit('/maintenance')
    await servicesPage.setViewportSize({ width: 390, height: 844 })
    await servicesPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await servicesPage.reload()

    const servicesRoot = servicesPage.locator('[data-phone-services]')
    await servicesRoot.waitFor()
    assert.equal(
      await servicesRoot.getByRole('link', { name: /Find nurseries/i }).getAttribute('href'),
      '/nurseries'
    )
    const shortcuts = servicesRoot.locator('.phone-services-shortcuts > a')
    assert.equal(await shortcuts.count(), 4)
    const shortcutTops = await shortcuts.evaluateAll((items) =>
      items.map((item) => Math.round(item.getBoundingClientRect().top))
    )
    assert.equal(shortcutTops[0], shortcutTops[1])
    assert.equal(shortcutTops[2], shortcutTops[3])
    assert.isAbove(shortcutTops[2], shortcutTops[0])
    assert.isTrue(
      await servicesRoot
        .locator('.phone-services-featured-track')
        .evaluate((track) => track.scrollWidth > track.clientWidth)
    )
    const featuredCards = servicesRoot.locator(
      '.phone-services-featured-track > .phone-provider-card'
    )
    const featuredLayout = await featuredCards.evaluateAll((cards) =>
      cards.slice(0, 2).map((card) => {
        const box = card.getBoundingClientRect()
        const actions = card.querySelector('.provider-card-actions')?.getBoundingClientRect()
        return {
          height: Math.round(box.height),
          actionsTop: Math.round(actions?.top || 0),
        }
      })
    )
    assert.equal(featuredLayout[0].height, featuredLayout[1].height)
    assert.equal(featuredLayout[0].actionsTop, featuredLayout[1].actionsTop)
    const catalogCards = servicesRoot.locator('.phone-services-catalog .phone-provider-card')
    assert.isAtLeast(await catalogCards.count(), 2)
    const catalogBoxes = await catalogCards
      .first()
      .locator('xpath=..')
      .locator(':scope > .phone-provider-card')
      .evaluateAll((cards) =>
        cards.map((card) => {
          const box = card.getBoundingClientRect()
          return {
            top: Math.round(box.top),
            width: Math.round(box.width),
            height: Math.round(box.height),
          }
        })
      )
    assert.equal(catalogBoxes[0].top, catalogBoxes[1].top)
    assert.closeTo(catalogBoxes[0].width, catalogBoxes[1].width, 2)
    assert.equal(catalogBoxes[0].height, catalogBoxes[1].height)
    assert.isAtMost(catalogBoxes[0].width, 190)
    assert.equal(await catalogCards.first().locator('.provider-card-metrics > span').count(), 4)
    assert.isTrue(await catalogCards.first().locator('.provider-card-services').isVisible())
    assert.isFalse(
      await catalogCards
        .first()
        .locator('.provider-card-scroll')
        .evaluate((content) => content.scrollHeight > content.clientHeight + 1)
    )
    assert.isFalse(
      await catalogCards.first().evaluate((card) => card.scrollHeight > card.clientHeight + 1)
    )
    const catalogActions = catalogCards.locator('.provider-card-actions')
    assert.equal(await catalogActions.count(), await catalogCards.count())
    assert.isTrue(await catalogActions.first().getByText('Request', { exact: true }).isVisible())
    assert.isTrue(await catalogActions.first().getByText('Profile', { exact: true }).isVisible())
    assert.isFalse(
      await servicesRoot.evaluate(
        (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
      )
    )

    const requestPage = await visit(`/request/${gardeners[0].id}`)
    await requestPage.setViewportSize({ width: 390, height: 844 })
    await requestPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await requestPage.reload()
    const requestRoot = requestPage.locator('[data-phone-service-request]')
    await requestRoot.waitFor()
    assert.equal(await requestRoot.locator('.phone-request-steps span').count(), 3)
    const requestProviderBox = await requestRoot.locator('.phone-request-provider').boundingBox()
    assert.isNotNull(requestProviderBox)
    assert.isAtMost(requestProviderBox!.height, 300)
    assert.isFalse(
      await requestRoot.evaluate(
        (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
      )
    )

    const requestedPage = await visit('/requested')
    await requestedPage.setViewportSize({ width: 390, height: 844 })
    await requestedPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await requestedPage.reload()
    const requestedRoot = requestedPage.locator('[data-phone-requested]')
    await requestedRoot.waitFor()
    assert.equal(await requestedRoot.locator('.phone-requested-stats > div').count(), 4)
    assert.equal(
      await requestedRoot.getByRole('link', { name: 'Find nurseries' }).getAttribute('href'),
      '/nurseries'
    )
  })

  test('own profiles, settings, and public profiles are comfortable on phones for every role', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const users: User[] = []

    for (const role of ['client', 'gardener', 'nursery'] as const) {
      const user = await User.create({
        first_name: 'Phone',
        last_name: `Profile ${role}`,
        username: `phone.profile.${role}`,
        email: `phone.profile.${role}@example.com`,
        phone: '7000-0088',
        password: 'PlantBud123!',
        role,
      })
      await AccountProfile.create({
        userId: user.id,
        displayName: `Phone Profile ${role}`,
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      })
      users.push(user)

      await browserContext.loginAs(user)
      const homepage = await visit('/homepage')
      await homepage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await homepage.setViewportSize({ width: 390, height: 844 })
      await homepage.reload()

      const ownProfile = await visit('/profile')
      await ownProfile.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await ownProfile.setViewportSize({ width: 390, height: 844 })
      await ownProfile.reload()
      const ownRoot = ownProfile.locator(`[data-phone-profile="own"][data-profile-role="${role}"]`)
      await ownRoot.waitFor()
      const ownHero = ownRoot.locator('[data-phone-profile-hero]')
      assert.isAtMost((await ownHero.locator(':scope > div').first().boundingBox())!.height, 160)
      assert.isFalse(
        await ownRoot.evaluate(
          (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
        )
      )
      const engagementMetrics = ownRoot.locator('.phone-profile-engagement > div')
      const engagementTops = await engagementMetrics.evaluateAll((metrics) =>
        metrics.map((metric) => Math.round(metric.getBoundingClientRect().top))
      )
      assert.equal(engagementTops.length, 3)
      assert.equal(new Set(engagementTops).size, 1)
      const ownPostGrid = ownRoot.locator('.phone-profile-post-grid')
      if (await ownPostGrid.count()) {
        assert.match(
          await ownPostGrid.evaluate(
            (grid) =>
              grid.ownerDocument.defaultView?.getComputedStyle(grid).gridTemplateColumns || ''
          ),
          /\S+\s+\S+\s+\S+/
        )
      }
      const ownPostModal = ownRoot.locator('[data-profile-post-modal]')
      const ownPostModalPanel = ownPostModal.locator(':scope > div')
      assert.equal(
        await ownPostModal.evaluate(
          (modal) => modal.ownerDocument.defaultView?.getComputedStyle(modal).zIndex
        ),
        '100005'
      )
      assert.equal(
        await ownPostModalPanel.evaluate(
          (panel) => panel.ownerDocument.defaultView?.getComputedStyle(panel).flexDirection
        ),
        'column'
      )

      const settings = await visit('/profile/settings')
      await settings.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await settings.setViewportSize({ width: 390, height: 844 })
      await settings.reload()
      const settingsRoot = settings.locator(
        `[data-phone-profile="settings"][data-profile-role="${role}"]`
      )
      await settingsRoot.waitFor()
      assert.isAtMost(
        (await settingsRoot.locator('.phone-profile-settings-preview > div').first().boundingBox())!
          .height,
        160
      )
      const settingsNav = settingsRoot.locator('.phone-profile-settings-header nav')
      assert.isTrue(await settingsNav.evaluate((nav) => nav.scrollWidth >= nav.clientWidth))
      const saveDockBox = await settingsRoot.locator('[data-profile-save-dock]').boundingBox()
      const bottomNavbarBox = await settings.locator('[data-phone-bottom-nav]').boundingBox()
      assert.isNotNull(saveDockBox)
      assert.isNotNull(bottomNavbarBox)
      assert.isAtMost(saveDockBox!.width, 288)
      assert.isAtMost(saveDockBox!.y + saveDockBox!.height + 12, bottomNavbarBox!.y)
      assert.isFalse(
        await settingsRoot.evaluate(
          (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
        )
      )
    }

    await browserContext.loginAs(users[0])
    for (const user of users) {
      const publicProfile = await visit(`/users/${user.username}`)
      await publicProfile.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
      await publicProfile.setViewportSize({ width: 390, height: 844 })
      await publicProfile.reload()
      const publicRoot = publicProfile.locator(
        `[data-phone-profile="public"][data-profile-role="${user.role}"]`
      )
      await publicRoot.waitFor()
      assert.isAtMost(
        (await publicRoot.locator('[data-phone-profile-hero] > div').first().boundingBox())!.height,
        160
      )
      assert.isFalse(
        await publicRoot.evaluate(
          (root) => root.scrollWidth > root.ownerDocument.documentElement.clientWidth
        )
      )

      if (user.role !== 'client') {
        const sidebarBox = await publicRoot.locator('.phone-public-profile-sidebar').boundingBox()
        const feedBox = await publicRoot.locator('.phone-public-profile-feed').boundingBox()
        assert.isNotNull(sidebarBox)
        assert.isNotNull(feedBox)
        assert.isBelow(sidebarBox!.y, feedBox!.y)
      }

      if (user.role === 'gardener') {
        const actionBoxes = await publicRoot
          .locator('.phone-profile-actions > *')
          .evaluateAll((actions) =>
            actions.map((action) => Math.round(action.getBoundingClientRect().top))
          )
        assert.equal(actionBoxes.length, 3)
        assert.isBelow(actionBoxes[0], actionBoxes[1])
        assert.equal(actionBoxes[1], actionBoxes[2])
      }

      const postGrid = publicRoot.locator('.phone-profile-post-grid')
      if (await postGrid.count()) {
        assert.match(
          await postGrid.evaluate(
            (grid) =>
              grid.ownerDocument.defaultView?.getComputedStyle(grid).gridTemplateColumns || ''
          ),
          /\S+\s+\S+\s+\S+/
        )
      }

      const catalogGrid = publicRoot.locator('[data-nursery-catalog-list]')
      if (await catalogGrid.count()) {
        assert.match(
          await catalogGrid.evaluate(
            (grid) =>
              grid.ownerDocument.defaultView?.getComputedStyle(grid).gridTemplateColumns || ''
          ),
          /\S+\s+\S+/
        )
      }
    }
  })

  test('phone scanner and designer can review a camera photo before using it', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Mobile',
      last_name: 'Camera',
      username: 'mobile.camera',
      email: 'mobile.camera@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Mobile Camera',
      subscriptionPlan: 'premium',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const mobileDesignerProject = await GardenProject.create({
      userId: user.id,
      name: 'Mobile garden',
      description: 'Mobile designer camera test',
      stateJson: JSON.stringify({ els: [], zIndexCounter: 10, layerCounter: 0 }),
      inventoryJson: '[]',
      baseImageName: null,
      itemCount: 0,
    })
    await browserContext.loginAs(user)

    const photo = {
      name: 'camera-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    }

    const scannerPage = await visit('/scanner')
    await scannerPage.setViewportSize({ width: 390, height: 844 })
    await scannerPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await scannerPage.reload()
    const scannerNavbarBox = await scannerPage.locator('[data-phone-navbar] > div').boundingBox()
    const scannerContentBox = await scannerPage.locator('[data-phone-first-content]').boundingBox()
    assert.isNotNull(scannerNavbarBox)
    assert.isNotNull(scannerContentBox)
    assert.isAtLeast(scannerContentBox!.y - (scannerNavbarBox!.y + scannerNavbarBox!.height), 8)
    assert.isAtMost(scannerContentBox!.y - (scannerNavbarBox!.y + scannerNavbarBox!.height), 36)
    assert.equal(await scannerPage.locator('.phone-tool-flow span').count(), 3)
    const scannerActionBoxes = await scannerPage
      .locator(
        '[data-tool-action-panel] .tool-action-secondary, [data-tool-action-panel] .tool-action-primary'
      )
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const box = button.getBoundingClientRect()
          return { top: Math.round(box.top), width: Math.round(box.width) }
        })
      )
    assert.equal(scannerActionBoxes[0].top, scannerActionBoxes[1].top)
    assert.closeTo(scannerActionBoxes[0].width, scannerActionBoxes[1].width, 2)
    assert.isAtLeast(
      (await scannerPage.locator('[data-scanner-preview]').boundingBox())!.height,
      260
    )
    const resultOrder = await scannerPage
      .locator(
        '.scan-result-overview, .scan-result-action, .scan-result-causes, .scan-result-guide, .scan-result-matches, .scan-result-education, .scan-result-taxonomy'
      )
      .evaluateAll((sections) =>
        sections.map((section) =>
          Number(section.ownerDocument.defaultView?.getComputedStyle(section).order || 0)
        )
      )
    assert.deepEqual(resultOrder, [2, 3, 8, 6, 4, 7, 5])
    const premiumDashboard = scannerPage.locator('#premiumInsightsBox')
    assert.equal(await premiumDashboard.locator('.premium-dashboard-section').count(), 5)
    assert.deepEqual(await premiumDashboard.locator('.premium-dashboard-label').allTextContents(), [
      'Current signals',
      'Progress over time',
      'Change since the previous scan',
      'Interpretation and follow-up',
      'Personalized insights',
    ])
    assert.match(
      await premiumDashboard
        .locator('.premium-dashboard-metrics')
        .evaluate(
          (metrics) =>
            metrics.ownerDocument.defaultView?.getComputedStyle(metrics).gridTemplateColumns || ''
        ),
      /\S+\s+\S+/
    )
    await scannerPage.getByRole('button', { name: 'Upload image' }).click()
    await scannerPage.getByText('Upload from this device', { exact: true }).waitFor()
    const scannerCameraButton = scannerPage.getByRole('button', { name: 'Open camera' })
    await scannerCameraButton.waitFor()
    assert.equal(
      await scannerPage.locator('[data-phone-camera-input]').getAttribute('capture'),
      'environment'
    )

    const scannerChooserPromise = scannerPage.waitForEvent('filechooser')
    await scannerCameraButton.click()
    await (await scannerChooserPromise).setFiles(photo)
    const scannerReview = scannerPage.locator('[data-phone-camera-modal]')
    await scannerReview.getByRole('heading', { name: 'Review your photo' }).waitFor()
    await scannerReview.getByRole('button', { name: 'Retake photo' }).waitFor()
    assert.equal(
      await scannerPage
        .locator('#plantUpload')
        .evaluate((input: { files?: { length: number } }) => input.files?.length),
      0
    )
    await scannerReview.getByRole('button', { name: 'Use this photo' }).click()
    assert.equal(
      await scannerPage
        .locator('#plantUpload')
        .evaluate((input: { files?: { length: number } }) => input.files?.length),
      1
    )
    await scannerPage.locator('#previewImage:not(.hidden)').waitFor()
    await scannerPage.getByText('Photo ready to analyze', { exact: true }).waitFor()

    const projectLibrary = await visit('/designer')
    await projectLibrary.setViewportSize({ width: 390, height: 844 })
    await projectLibrary.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await projectLibrary.reload()
    await projectLibrary.getByRole('heading', { name: 'Garden projects' }).waitFor()
    await projectLibrary.getByRole('link', { name: 'Open Mobile garden' }).waitFor()

    const designerPage = await visit(`/designer/projects/${mobileDesignerProject.id}`)
    await designerPage.setViewportSize({ width: 390, height: 844 })
    await designerPage.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await designerPage.reload()
    assert.equal(await designerPage.locator('[data-phone-drawer-open-zone]').count(), 0)
    const designerNavbarBox = await designerPage.locator('[data-phone-navbar] > div').boundingBox()
    const designerContentBox = await designerPage
      .locator('[data-phone-first-content]')
      .boundingBox()
    assert.isNotNull(designerNavbarBox)
    assert.isNotNull(designerContentBox)
    assert.isAtLeast(designerContentBox!.y - (designerNavbarBox!.y + designerNavbarBox!.height), 8)
    assert.isAtMost(designerContentBox!.y - (designerNavbarBox!.y + designerNavbarBox!.height), 36)
    assert.equal(await designerPage.locator('.phone-tool-flow span').count(), 3)
    const workspaceBox = await designerPage.locator('.phone-designer-workspace').boundingBox()
    const studioDockBox = await designerPage.locator('[data-designer-mobile-studio]').boundingBox()
    assert.isNotNull(workspaceBox)
    assert.isNotNull(studioDockBox)
    assert.isAtLeast(studioDockBox!.y, workspaceBox!.y)
    assert.equal(await designerPage.locator('[data-designer-studio-tab]').count(), 2)
    assert.equal(
      await designerPage
        .locator('[data-designer-studio-tab="assets"]')
        .getAttribute('aria-selected'),
      'true'
    )
    assert.equal(
      await designerPage.locator('[data-designer-assets-slot] .phone-designer-search').count(),
      1
    )
    assert.equal(
      await designerPage.locator('[data-designer-assets-slot] .phone-designer-inventory').count(),
      1
    )
    const labeledTools = designerPage.locator('.phone-designer-edit .designer-tool-button')
    assert.equal(await labeledTools.count(), 12)
    assert.isTrue(
      await labeledTools
        .first()
        .evaluate(
          (button) =>
            button.ownerDocument.defaultView?.getComputedStyle(button, '::after').content !== 'none'
        )
    )
    await designerPage.getByRole('button', { name: 'Upload image' }).click()
    await designerPage.getByText('Upload from this device', { exact: true }).waitFor()
    await designerPage.getByRole('button', { name: 'Open camera' }).waitFor()
    assert.equal(
      await designerPage.locator('[data-phone-camera-input]').getAttribute('capture'),
      'environment'
    )
    const designerChooserPromise = designerPage.waitForEvent('filechooser')
    await designerPage.getByRole('button', { name: 'Open camera' }).click()
    await (await designerChooserPromise).setFiles(photo)
    const designerReview = designerPage.locator('[data-phone-camera-modal]')
    const designerUsePhoto = designerReview.getByRole('button', { name: 'Use this photo' })
    await designerUsePhoto.waitFor()
    const designerReviewUrl = designerPage.url()
    await designerPage.waitForTimeout(1500)
    assert.equal(designerPage.url(), designerReviewUrl)
    assert.isTrue(await designerUsePhoto.isVisible())
    assert.isTrue(
      await designerPage
        .locator('html')
        .evaluate((element) => element.classList.contains('phone-camera-is-open'))
    )
    await designerUsePhoto.click()
    await designerPage.locator('#baseImage').waitFor({ state: 'visible' })
    await designerPage.locator('#canvas-container[data-image-fit="natural"]').waitFor()
    const canvasBox = await designerPage.locator('#canvas-container').boundingBox()
    const workspaceShellBox = await designerPage
      .locator('[data-designer-workspace-shell]')
      .boundingBox()
    assert.isNotNull(canvasBox)
    assert.isNotNull(workspaceShellBox)
    assert.isAtMost(canvasBox!.width, workspaceShellBox!.width)
    assert.isAtLeast(canvasBox!.height, 280)
    assert.equal(await designerPage.locator('.phone-designer-workspace-guide span').count(), 3)
    const imageDimensions = await designerPage
      .locator('#baseImage')
      .evaluate((image: { naturalWidth: number; naturalHeight: number }) => ({
        width: image.naturalWidth,
        height: image.naturalHeight,
      }))
    const canvasDimensions = await designerPage.locator('#canvas-container').evaluate((canvas) => ({
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    }))
    assert.closeTo(
      canvasDimensions.width / canvasDimensions.height,
      imageDimensions.width / imageDimensions.height,
      0.01
    )
    assert.equal(
      await designerPage
        .locator('.phone-designer-desktop-guide')
        .evaluate((guide) => guide.ownerDocument.defaultView?.getComputedStyle(guide).display),
      'none'
    )
    assert.equal(
      await designerPage.locator('#canvas-container').getAttribute('data-image-fit'),
      'natural'
    )

    const largeCameraPhoto = {
      name: 'large-camera-photo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="4032" height="3024"><rect width="100%" height="100%" fill="#416543"/></svg>'
      ),
    }
    const designerUrl = designerPage.url()
    await designerPage.getByRole('button', { name: 'Upload image' }).click()
    const largePhotoChooserPromise = designerPage.waitForEvent('filechooser')
    await designerPage.getByRole('button', { name: 'Open camera' }).click()
    await (await largePhotoChooserPromise).setFiles(largeCameraPhoto)
    const largePhotoReview = designerPage.locator('[data-phone-camera-modal]')
    await largePhotoReview.getByRole('heading', { name: 'Review your photo' }).waitFor()
    await largePhotoReview.getByRole('button', { name: 'Use this photo' }).click()
    await designerPage.waitForFunction(() => {
      const image = (globalThis as any).document.querySelector('#baseImage')
      return Boolean(image?.naturalWidth && image.naturalWidth <= 2048)
    })
    await designerPage.waitForTimeout(750)
    assert.equal(designerPage.url(), designerUrl)
    const largeBaseImageVisible = await designerPage.locator('#baseImage').isVisible()
    assert.isTrue(largeBaseImageVisible)
    assert.isAtMost(
      await designerPage
        .locator('#baseImage')
        .evaluate((image: { naturalWidth: number }) => image.naturalWidth),
      2048
    )
    assert.equal(await designerPage.locator('#image-bg').count(), 0)
    await designerPage.reload()
    await designerPage.waitForFunction(() => {
      const image = (globalThis as any).document.querySelector('#baseImage')
      return Boolean(image?.naturalWidth)
    })
    assert.equal(designerPage.url(), designerUrl)
    assert.isTrue(await designerPage.locator('#baseImage').isVisible())

    const assetDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    await designerPage.evaluate((src) => (globalThis as any).loadFromInventory(src), assetDataUrl)
    const designAsset = designerPage.locator('#canvas-container .draggable').first()
    await designAsset.waitFor({ state: 'visible' })
    assert.equal(await designerPage.locator('.designer-layer-row').count(), 1)
    assert.equal(
      await designerPage.locator('[data-designer-layer-count]').first().textContent(),
      '1'
    )
    await designerPage.getByRole('button', { name: 'Original' }).click()
    assert.equal(
      await designerPage.getByRole('button', { name: 'Original' }).getAttribute('aria-pressed'),
      'true'
    )
    assert.equal(
      await designAsset.evaluate(
        (element) => element.ownerDocument.defaultView?.getComputedStyle(element).visibility
      ),
      'hidden'
    )
    await designerPage.getByRole('button', { name: 'Original' }).click()
    await designerPage.getByRole('button', { name: 'Grid' }).click()
    assert.equal(
      await designerPage.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed'),
      'true'
    )
    await designerPage.getByRole('button', { name: 'Zoom in' }).click()
    assert.equal(await designerPage.locator('[data-designer-zoom-label]').textContent(), '110%')
    await designerPage.getByRole('button', { name: 'Fit' }).click()
    assert.equal(await designerPage.locator('[data-designer-zoom-label]').textContent(), '100%')
    assert.equal(
      await designerPage.locator('[data-designer-studio-tab="edit"]').getAttribute('aria-selected'),
      'true'
    )
    assert.equal(
      await designerPage.locator('[data-designer-edit-slot] .phone-designer-edit').count(),
      1
    )
    assert.equal(await designerPage.locator('[data-designer-selection-status]').count(), 0)
    assert.equal(
      await labeledTools
        .first()
        .evaluate(
          (button) => button.ownerDocument.defaultView?.getComputedStyle(button).backgroundColor
        ),
      'rgb(17, 62, 20)'
    )
    await designerPage.locator('[data-designer-studio-tab="assets"]').click()
    assert.equal(
      await designerPage.locator('[data-designer-studio-panel="assets"]').getAttribute('hidden'),
      null
    )
    await designAsset.click()
    assert.equal(
      await designerPage.locator('[data-designer-studio-tab="edit"]').getAttribute('aria-selected'),
      'true'
    )

    for (let step = 0; step < 8; step++) {
      const assetBox = await designAsset.boundingBox()
      assert.isNotNull(assetBox)
      await designerPage.mouse.move(
        assetBox!.x + assetBox!.width / 2,
        assetBox!.y + assetBox!.height / 2
      )
      await designerPage.mouse.down()
      await designerPage.mouse.move(
        assetBox!.x + assetBox!.width / 2 + (step % 2 === 0 ? 18 : -14),
        assetBox!.y + assetBox!.height / 2 + 8,
        { steps: 3 }
      )
      await designerPage.mouse.up()
    }

    const movedAssetBox = await designAsset.boundingBox()
    const mobileCanvasBox = await designerPage.locator('#canvas-container').boundingBox()
    assert.isNotNull(movedAssetBox)
    assert.isNotNull(mobileCanvasBox)
    assert.isAtLeast(movedAssetBox!.x, mobileCanvasBox!.x)
    assert.isAtLeast(movedAssetBox!.y, mobileCanvasBox!.y)
    assert.isAtMost(
      movedAssetBox!.x + movedAssetBox!.width,
      mobileCanvasBox!.x + mobileCanvasBox!.width
    )
    assert.isAtMost(
      movedAssetBox!.y + movedAssetBox!.height,
      mobileCanvasBox!.y + mobileCanvasBox!.height
    )

    await designerPage.mouse.move(
      movedAssetBox!.x + movedAssetBox!.width / 2,
      movedAssetBox!.y + movedAssetBox!.height / 2
    )
    await designerPage.mouse.down()
    await designerPage.mouse.move(
      mobileCanvasBox!.x - movedAssetBox!.width,
      mobileCanvasBox!.y - movedAssetBox!.height,
      { steps: 8 }
    )
    await designerPage.mouse.up()
    const overflowingAssetBox = await designAsset.boundingBox()
    assert.isNotNull(overflowingAssetBox)
    assert.isBelow(overflowingAssetBox!.x, mobileCanvasBox!.x)
    assert.isBelow(overflowingAssetBox!.y, mobileCanvasBox!.y)
    assert.isAbove(overflowingAssetBox!.x + overflowingAssetBox!.width, mobileCanvasBox!.x + 20)
    assert.isAbove(overflowingAssetBox!.y + overflowingAssetBox!.height, mobileCanvasBox!.y + 20)

    const deleteControlBox = await designerPage.locator('.designer-selection-delete').boundingBox()
    assert.isNotNull(deleteControlBox)
    assert.isAtLeast(deleteControlBox!.x, mobileCanvasBox!.x)
    assert.isAtLeast(deleteControlBox!.y, mobileCanvasBox!.y)

    const resizeHandle = designerPage.locator('.designer-selection-resize')
    const resizeHandleBox = await resizeHandle.boundingBox()
    assert.isNotNull(resizeHandleBox)
    assert.isAtLeast(resizeHandleBox!.width, 40)
    await designerPage.mouse.move(
      resizeHandleBox!.x + resizeHandleBox!.width / 2,
      resizeHandleBox!.y + resizeHandleBox!.height / 2
    )
    await designerPage.mouse.down()
    await designerPage.mouse.move(
      resizeHandleBox!.x + resizeHandleBox!.width / 2 + 24,
      resizeHandleBox!.y + resizeHandleBox!.height / 2 + 24,
      { steps: 4 }
    )
    await designerPage.mouse.up()
    assert.isAbove((await designAsset.boundingBox())!.width, movedAssetBox!.width)
    const savedAssetWidth = (await designAsset.boundingBox())!.width
    await designerPage.waitForFunction(() => {
      const status = (globalThis as any).document.querySelector('[data-designer-save-status]')
      return status?.textContent === 'Saved to Plant Bud'
    })
    await designerPage.reload()
    await designerPage.waitForFunction(() => {
      const image = (globalThis as any).document.querySelector('#baseImage')
      const asset = (globalThis as any).document.querySelector('#canvas-container .draggable')
      return Boolean(image?.naturalWidth && asset)
    })
    assert.equal(await designerPage.locator('.designer-layer-row').count(), 1)
    assert.closeTo((await designAsset.boundingBox())!.width, savedAssetWidth, 3)

    const processingToast = designerPage.locator('#loadingText')
    await processingToast.evaluate((toast) => toast.classList.remove('hidden'))
    const processingBox = await processingToast.boundingBox()
    const processingNavbarBox = await designerPage.locator('[data-phone-bottom-nav]').boundingBox()
    assert.isNotNull(processingBox)
    assert.isNotNull(processingNavbarBox)
    assert.closeTo(processingBox!.x + processingBox!.width / 2, 195, 2)
    assert.isAtMost(processingBox!.y + processingBox!.height + 8, processingNavbarBox!.y)

    let assetSearchUrl = ''
    await designerPage.route('**/designer/search-assets?**', async (route) => {
      assetSearchUrl = route.request().url()
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          intent: 'table',
          source: 'pexels',
          photos: Array.from({ length: 24 }, (_, index) => ({
            id: index + 1,
            alt: `Garden table ${index + 1}`,
            cleanBackground: true,
            src: {
              medium: assetDataUrl,
              large2x: assetDataUrl,
              original: assetDataUrl,
            },
          })),
        }),
      })
    })
    await designerPage.locator('[data-designer-search-suggestion="garden table"]').click()
    const searchModal = designerPage.locator('#searchModal')
    await searchModal.locator('.designer-search-result').first().waitFor()
    assert.include(assetSearchUrl, 'query=garden%20table')
    assert.include(assetSearchUrl, 'per_page=40')
    assert.equal(await searchModal.locator('.designer-search-result').count(), 20)
    await searchModal.getByText('20 table options', { exact: true }).waitFor()
    const searchPanel = searchModal.locator(':scope > div:last-child > div')
    const searchPanelBox = await searchPanel.boundingBox()
    const bottomNavbar = designerPage.locator('[data-phone-bottom-nav]')
    assert.isNotNull(searchPanelBox)
    assert.closeTo(searchPanelBox!.x + searchPanelBox!.width / 2, 195, 2)
    assert.isAtMost(searchPanelBox!.width, 375)
    assert.isAtLeast(searchPanelBox!.y, 8)
    assert.isAtMost(searchPanelBox!.y + searchPanelBox!.height, 836)
    assert.isAbove(
      Number(
        await searchModal.evaluate(
          (modal) => modal.ownerDocument.defaultView?.getComputedStyle(modal).zIndex
        )
      ),
      Number(
        await bottomNavbar.evaluate(
          (navbar) => navbar.ownerDocument.defaultView?.getComputedStyle(navbar).zIndex
        )
      )
    )
    await searchModal.evaluate((modal) => {
      modal.classList.add('hidden')
      modal.classList.remove('flex')
      modal.setAttribute('aria-hidden', 'true')
    })
    assert.equal(await searchModal.getAttribute('aria-hidden'), 'true')
  })

  test('saved posts stay compact and comfortable on phones', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Saved',
      last_name: 'Collector',
      username: 'saved.collector',
      email: 'saved.collector@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Saved Collector',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    await browserContext.loginAs(user)

    const page = await visit('/favorites')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await page.reload()

    const root = page.locator('[data-phone-saved]')
    await root.waitFor()
    await root.getByRole('heading', { name: 'Saved posts' }).waitFor()
    await root.getByRole('link', { name: 'Explore feed' }).waitFor()
    await root.getByRole('heading', { name: 'Ready when you need them' }).waitFor()

    const mainBox = await root.locator('.phone-saved-main').boundingBox()
    const heroBox = await root.locator('.phone-saved-hero').boundingBox()
    assert.isNotNull(mainBox)
    assert.isNotNull(heroBox)
    assert.isAtLeast(mainBox!.x, 0)
    assert.isAtMost(mainBox!.x + mainBox!.width, 390)
    assert.isAtMost(heroBox!.x + heroBox!.width, 390)
    assert.isTrue(
      await root.evaluate(
        (element) =>
          element.ownerDocument.documentElement.scrollWidth <=
          element.ownerDocument.documentElement.clientWidth
      )
    )

    const emptyState = root.locator('.phone-saved-empty')
    await emptyState.getByRole('heading', { name: 'Your collection is waiting' }).waitFor()
    const bottomNavbar = page.locator('[data-phone-bottom-nav]')
    await bottomNavbar.waitFor()
    await emptyState.scrollIntoViewIfNeeded()
    const emptyBox = await emptyState.boundingBox()
    const bottomNavbarBox = await bottomNavbar.boundingBox()
    assert.isNotNull(emptyBox)
    assert.isNotNull(bottomNavbarBox)
    assert.isAtMost(emptyBox!.x + emptyBox!.width, 390)
    assert.isAtLeast(
      await page
        .locator('body')
        .evaluate((body) =>
          Number.parseFloat(
            body.ownerDocument.defaultView?.getComputedStyle(body).paddingBottom || '0'
          )
        ),
      80
    )
  })

  test('phone frontend uses the dedicated top bar, drawer, and bottom navigation', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Mobile',
      last_name: 'Navigator',
      username: 'mobile.navigator',
      email: 'mobile.navigator@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Mobile Navigator',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    await browserContext.loginAs(user)

    const page = await visit('/community')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await page.route('https://api.open-meteo.com/**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          current: {
            temperature_2m: 29,
            weather_code: 1,
          },
        }),
      })
    })
    await page.reload()

    await page.locator('[data-phone-navbar]').waitFor()
    assert.equal(await page.locator('[data-pb-navbar-shell]').count(), 0)
    assert.equal(await page.locator('[data-phone-top-nav-spacer]').count(), 1)
    assert.equal(
      await page.locator('[data-phone-top-nav-spacer]').evaluate((spacer) => spacer.clientHeight),
      70
    )
    assert.equal(
      await page.locator('body').evaluate((body) => {
        const padding = body.ownerDocument.defaultView?.getComputedStyle(body).paddingBottom || '0'
        return Math.round(Number.parseFloat(padding))
      }),
      86
    )
    await page.locator('img[src="/resources/images/essential/pb-logo.png"]').waitFor()
    await page.getByLabel('Notifications').waitFor()
    const nowBar = page.locator('[data-phone-now-bar]')
    await nowBar.waitFor()
    assert.equal(await nowBar.locator('[data-now-bar-panel]').count(), 3)
    assert.equal(await nowBar.getAttribute('data-now-bar-index'), '0')
    assert.isTrue(await nowBar.locator('[data-now-bar-panel="brand"]').isVisible())
    assert.isTrue(
      await nowBar
        .locator('.phone-now-bar-progress')
        .evaluate((progress) => progress.classList.contains('is-running'))
    )

    await nowBar.getByRole('button', { name: 'Show weather' }).click()
    assert.equal(await nowBar.getAttribute('data-now-bar-index'), '1')
    await nowBar.getByText('Strong sunshine, check watering', { exact: true }).waitFor()
    await nowBar.getByText('29 C - San Salvador', { exact: true }).waitFor()
    assert.equal(
      await nowBar.locator('.phone-now-bar-progress').evaluate((progress) => {
        const animation = progress.ownerDocument.defaultView?.getComputedStyle(
          progress,
          '::after'
        ).animationName
        return animation
      }),
      'phone-now-bar-progress'
    )

    await nowBar.getByRole('button', { name: 'Show requests' }).click()
    assert.equal(await nowBar.getAttribute('data-now-bar-index'), '2')
    await nowBar.getByText('No active requests', { exact: true }).waitFor()

    const nowBarBox = await nowBar.boundingBox()
    assert.isNotNull(nowBarBox)
    assert.isAtMost(nowBarBox!.width, 260)
    assert.isFalse(
      await nowBar.locator('[data-now-bar-weather-main]').evaluate((message) => {
        return message.scrollWidth > message.clientWidth
      })
    )

    const mobileTools = page.locator('[data-community-mobile-tools]')
    await mobileTools.getByRole('heading', { name: 'Useful spaces' }).waitFor()
    const toolsTrack = mobileTools.locator('[data-community-mobile-tools-track]')
    assert.isTrue(await toolsTrack.evaluate((track) => track.scrollWidth > track.clientWidth))
    const mobileToolDetails = mobileTools.locator('.community-mobile-tool-details')
    assert.equal(await mobileToolDetails.count(), 4)
    assert.equal(await mobileToolDetails.locator('[open]').count(), 0)
    const listButtonPositions = await mobileToolDetails
      .locator('summary')
      .evaluateAll((buttons) =>
        buttons.map((button) => Math.round(button.getBoundingClientRect().top))
      )
    assert.equal(new Set(listButtonPositions).size, 1)
    await mobileToolDetails.nth(1).locator('summary').click()
    assert.isTrue(
      await mobileToolDetails.nth(1).evaluate((details) => details.hasAttribute('open'))
    )
    await mobileTools.getByRole('link', { name: 'Scanner', exact: true }).waitFor()
    const trendingDot = mobileTools.getByRole('button', { name: 'Show Trending hashtags' })
    await trendingDot.click()
    await page.waitForTimeout(500)
    assert.equal(await trendingDot.getAttribute('aria-current'), 'true')
    assert.isAbove(await toolsTrack.evaluate((track) => track.scrollLeft), 0)
    assert.equal(await page.locator('[data-community-sidebar]').isVisible(), false)
    const communityLayoutBox = await page.locator('[data-community-layout]').boundingBox()
    const composerBox = await page.locator('[data-community-composer]').boundingBox()
    assert.isNotNull(communityLayoutBox)
    assert.isNotNull(composerBox)
    assert.isAtLeast(communityLayoutBox!.width, 380)
    assert.isAtLeast(composerBox!.width, 370)
    const mobileToolsBox = await mobileTools.boundingBox()
    assert.isNotNull(mobileToolsBox)
    assert.isBelow(mobileToolsBox!.y, composerBox!.y)
    const publishButton = page.getByRole('button', { name: 'Publish' })
    const publishBox = await publishButton.boundingBox()
    assert.isNotNull(publishBox)
    assert.isAtLeast(publishBox!.width, 340)

    const bottomNav = page.locator('[data-phone-bottom-nav]')
    for (const label of ['Home', 'Community', 'Scanner and designer', 'Services', 'Profile']) {
      await bottomNav.getByLabel(label, { exact: true }).waitFor()
    }
    await bottomNav.getByLabel('Scanner and designer', { exact: true }).click()
    const toolsPanel = page.locator('[data-phone-tools-panel]')
    await toolsPanel.getByText('Choose your workspace', { exact: true }).waitFor()
    await toolsPanel.getByRole('link', { name: /Scanner/ }).waitFor()
    await toolsPanel.getByRole('link', { name: /Designer/ }).waitFor()
    await page
      .locator('main')
      .first()
      .click({ position: { x: 10, y: 10 } })
    await toolsPanel.waitFor({ state: 'hidden' })
    await bottomNav.getByLabel('Scanner and designer', { exact: true }).click()
    await toolsPanel.waitFor()

    await page.getByLabel('Open navigation menu').click()
    const drawer = page.locator('[data-phone-nav-drawer]')
    await drawer.getByText('Mobile Navigator', { exact: true }).waitFor()
    await drawer.getByRole('link', { name: /Requested/ }).waitFor()
    await drawer.getByRole('link', { name: /Catalog/ }).waitFor()
    await drawer.getByRole('link', { name: /Saved/ }).waitFor()
    await drawer.getByRole('link', { name: 'Settings' }).waitFor()
    await drawer.getByRole('button', { name: 'Log out' }).waitFor()
    assert.equal(await drawer.locator('[data-phone-drawer-account-actions]').count(), 1)
    assert.isTrue(
      await page
        .locator('body')
        .evaluate((body) => body.classList.contains('phone-drawer-page-locked'))
    )

    const drawerBox = await drawer.boundingBox()
    assert.isNotNull(drawerBox)
    assert.closeTo(drawerBox!.y, 0, 1)
    assert.closeTo(drawerBox!.height, 844, 1)
    await drawer.evaluate((element) => {
      element.scrollTop = element.scrollHeight
      element.scrollTop = 0
    })
    const drawerAfterInternalScroll = await drawer.boundingBox()
    assert.closeTo(drawerAfterInternalScroll!.y, 0, 1)
    assert.closeTo(drawerAfterInternalScroll!.height, 844, 1)
    const swipeY = drawerBox!.y + Math.min(300, drawerBox!.height / 2)

    await page.mouse.move(drawerBox!.x + drawerBox!.width - 35, swipeY)
    await page.mouse.down()
    await page.mouse.move(drawerBox!.x + drawerBox!.width - 70, swipeY + 2, { steps: 4 })
    await page.mouse.up()
    assert.isTrue(await page.locator('[data-phone-nav-toggle]').isChecked())

    await page.mouse.move(drawerBox!.x + drawerBox!.width - 35, swipeY)
    await page.mouse.down()
    await page.mouse.move(drawerBox!.x + 80, swipeY + 3, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(350)
    assert.isFalse(await page.locator('[data-phone-nav-toggle]').isChecked())
    assert.isFalse(
      await page
        .locator('body')
        .evaluate((body) => body.classList.contains('phone-drawer-page-locked'))
    )

    assert.equal(await page.locator('[data-phone-drawer-open-zone]').count(), 0)
    await page.mouse.move(12, 460)
    await page.mouse.down()
    await page.mouse.move(165, 462, { steps: 8 })
    await page.mouse.up()
    assert.isFalse(await page.locator('[data-phone-nav-toggle]').isChecked())

    await page.locator('html').evaluate((element) => {
      element.ownerDocument.defaultView?.scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForTimeout(100)
    await page.locator('html').evaluate((element) => {
      element.ownerDocument.defaultView?.scrollTo({ top: 700, behavior: 'instant' })
    })
    await page.waitForTimeout(150)
    assert.isTrue(
      await page
        .locator('[data-phone-navbar]')
        .evaluate((node) => node.classList.contains('phone-navbar-hidden'))
    )
    assert.isTrue(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-dimmed'))
    )
    await toolsPanel.waitFor({ state: 'hidden' })
    await bottomNav.getByLabel('Scanner and designer', { exact: true }).click()
    assert.isFalse(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-dimmed'))
    )
    assert.isTrue(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-interacting'))
    )
    await page.waitForTimeout(1000)
    assert.isFalse(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-interacting'))
    )
    assert.isTrue(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-dimmed'))
    )
    await page.locator('html').evaluate((element) => {
      const view = element.ownerDocument.defaultView
      view?.scrollTo({ top: 760, behavior: 'instant' })
    })
    await page.waitForTimeout(150)
    assert.isTrue(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-dimmed'))
    )
    await page.locator('html').evaluate((element) => {
      element.ownerDocument.defaultView?.scrollTo({ top: 250, behavior: 'instant' })
    })
    await page.waitForTimeout(150)
    assert.isFalse(
      await page
        .locator('[data-phone-navbar]')
        .evaluate((node) => node.classList.contains('phone-navbar-hidden'))
    )
    assert.isFalse(
      await bottomNav.evaluate((node) => node.classList.contains('phone-bottom-nav-dimmed'))
    )

    await page.goto('/notification')
    await page.locator('[data-phone-navbar]').waitFor()
    assert.notInclude(
      (await page.getByLabel('Community', { exact: true }).getAttribute('class')) || '',
      'bg-[#ebe3a7]'
    )
  })
})
