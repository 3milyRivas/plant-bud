import AccountProfile from '#models/account_profile'
import Follow from '#models/follow'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Frontend layout', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('login renders and signup remains scrollable on a laptop viewport', async ({
    visit,
    assert,
  }) => {
    const loginPage = await visit('/login')
    await loginPage.setViewportSize({ width: 1280, height: 720 })
    await loginPage.reload()
    await loginPage.getByRole('heading', { name: 'Welcome back' }).waitFor()

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
    const registerViewport = await registerPage.locator('[data-register-page]').evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
    }))
    const centeredRegister = await registerPage.locator('[data-register-content]').boundingBox()
    assert.isNotNull(centeredRegister)
    assert.closeTo(
      centeredRegister!.x + centeredRegister!.width / 2,
      registerViewport.width / 2,
      3
    )
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
    await communityPage.setViewportSize({ width: 1440, height: 900 })
    await communityPage.reload()
    await communityPage
      .locator('[data-pb-navbar-account] a[aria-label="Notifications, 1 unread"]')
      .waitFor()
    assert.match(await communityPage.title(), /^\(1\) /)

    const notificationPage = await visit('/notification')
    await notificationPage.getByText('New follower', { exact: true }).waitFor()
    await notificationPage.getByText('1', { exact: true }).first().waitFor()
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
      await readPage.locator('[data-pb-navbar-account] a[aria-label^="Notifications"]').getAttribute(
        'aria-label'
      ),
      'Notifications'
    )
    assert.notMatch(await readPage.title(), /^\(\d+\) /)
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

    await browserContext.loginAs(user)

    const communityPage = await visit('/community')
    await communityPage.setViewportSize({ width: 1440, height: 900 })
    await communityPage.reload()
    await communityPage
      .locator('[data-pb-navbar-account] a[aria-label^="Notifications"]')
      .waitFor()

    const servicesMenu = communityPage.locator('[data-app-nav-menu]').filter({
      has: communityPage.getByText('Services', { exact: true }),
    })
    assert.equal(await servicesMenu.locator('a[href="/ornamental"]').count(), 1)

    const layoutBox = await communityPage.locator('[data-community-layout]').boundingBox()
    assert.isNotNull(layoutBox)
    assert.closeTo(layoutBox!.x + layoutBox!.width / 2, 720, 3)

    const scannerPage = await visit('/scanner')
    await scannerPage.getByRole('button', { name: 'Upload image' }).waitFor()
    await scannerPage.getByRole('button', { name: 'Analyze plant' }).waitFor()
    await scannerPage
      .locator('[data-pb-navbar-account] a[aria-label^="Notifications"]')
      .waitFor()

    const designerPage = await visit('/designer')
    await designerPage.getByRole('button', { name: 'Upload image' }).waitFor()
    await designerPage.getByRole('button', { name: 'Download design' }).waitFor()
    await designerPage
      .locator('[data-pb-navbar-account] a[aria-label^="Notifications"]')
      .waitFor()
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
})
