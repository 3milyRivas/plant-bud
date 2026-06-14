import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import ServiceRequest from '#models/service_request'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Gardener dashboard', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('shows real gardener workload and earnings on desktop', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { gardenerUser } = await createDashboardScenario()
    await browserContext.loginAs(gardenerUser)

    const page = await visit('/gardener/dashboard')
    const dashboard = page.locator('[data-gardener-dashboard="pc"]')
    await dashboard.waitFor()

    await dashboard.getByRole('heading', { name: 'Good work starts with a clear day.' }).waitFor()
    await dashboard.getByText('New requests').waitFor()
    await dashboard.getByText('$85.00', { exact: true }).first().waitFor()
    await dashboard.getByText('Garden maintenance', { exact: true }).first().waitFor()
    await dashboard.getByText('Plant consultation').first().waitFor()
    const toolsMenu = dashboard.locator('[data-app-nav-menu]').first()
    assert.include((await toolsMenu.locator('summary').textContent()) || '', 'Tools')
    assert.equal(await toolsMenu.locator('a[href="/gardener/dashboard"]').count(), 1)
    assert.equal(await dashboard.locator('[data-dashboard-upcoming]').count(), 0)
  })

  test('uses the compact phone dashboard without horizontal page overflow', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const { gardenerUser } = await createDashboardScenario()
    await browserContext.loginAs(gardenerUser)

    const page = await visit('/gardener/dashboard')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await page.reload()

    const dashboard = page.locator('[data-gardener-dashboard="phone"]')
    await dashboard.waitFor()
    await dashboard.getByRole('heading', { name: 'Your workday, at a glance.' }).waitFor()
    await page.locator('[data-phone-bottom-nav]').waitFor()
    assert.equal(await dashboard.locator('[data-dashboard-mobile-stats] > *').count(), 4)
    assert.isTrue(
      await dashboard
        .locator('[data-dashboard-upcoming]')
        .evaluate((track) => track.scrollWidth > track.clientWidth)
    )
    assert.isTrue(
      await dashboard.evaluate(
        (element) =>
          element.ownerDocument.documentElement.scrollWidth <=
          element.ownerDocument.documentElement.clientWidth
      )
    )

    const mainBox = await dashboard.locator('main').boundingBox()
    const bottomNavBox = await page.locator('[data-phone-bottom-nav]').boundingBox()
    assert.isNotNull(mainBox)
    assert.isNotNull(bottomNavBox)
    assert.isAtMost(mainBox!.x + mainBox!.width, 390)
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

  test('does not allow client accounts into the gardener dashboard', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const client = await User.create({
      first_name: 'Dashboard',
      last_name: 'Client',
      username: 'dashboard.client',
      email: 'dashboard.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: client.id,
      displayName: 'Dashboard Client',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    await browserContext.loginAs(client)

    const page = await visit('/gardener/dashboard')
    await page.waitForTimeout(300)
    assert.equal(await page.locator('[data-gardener-dashboard]').count(), 0)
    assert.notEqual(page.url().endsWith('/gardener/dashboard'), true)

    await page.goto('/homepage')
    assert.equal(
      await page.getByRole('link', { name: 'Gardener dashboard', exact: true }).count(),
      0
    )
  })
})

async function createDashboardScenario() {
  const gardenerUser = await User.create({
    first_name: 'Daily',
    last_name: 'Gardener',
    username: 'daily.gardener',
    email: 'daily.gardener@example.com',
    password: 'PlantBud123!',
    role: 'gardener',
  })
  await AccountProfile.create({
    userId: gardenerUser.id,
    displayName: 'Daily Gardener',
    subscriptionPlan: 'premium',
    rewardPoints: 0,
    scannerMonthlyLimit: 25,
  })
  const gardener = await GardenerProfile.create({
    userId: gardenerUser.id,
    headline: 'Garden care specialist',
    serviceArea: 'San Salvador',
    availabilitySchedule: 'Mon-Sat 8:00 AM - 5:00 PM',
    publicPhone: '7000-0000',
    paymentMethods: 'Cash, Card',
    isAvailable: true,
    experienceYears: 6,
    ratingAverage: 4.8,
    ratingCount: 18,
  })
  await gardener.related('services').createMany([
    {
      name: 'Garden maintenance',
      description: 'Complete garden maintenance',
      basePrice: 50,
      durationMinutes: 120,
      isActive: true,
    },
    {
      name: 'Plant consultation',
      description: 'Plant health consultation',
      basePrice: 30,
      durationMinutes: 60,
      isActive: true,
    },
  ])

  const firstClient = await createClient('First', 'first.dashboard.client')
  const secondClient = await createClient('Second', 'second.dashboard.client')
  const now = DateTime.now()

  await ServiceRequest.createMany([
    {
      clientUserId: firstClient.id,
      gardenerProfileId: gardener.id,
      serviceType: 'maintenance',
      status: 'pending',
      scheduledFor: now.plus({ days: 2 }).startOf('day'),
      arrivalWindowStart: '09:00',
      arrivalWindowEnd: '11:00',
      address: 'Colonia Escalon, San Salvador',
      notes: 'Full garden maintenance and pruning requested.',
      budget: 60,
      paymentStatus: 'held',
      paymentMethod: 'card',
      heldAmount: 60,
      pointsRedeemed: 0,
      discountPercent: 0,
      discountAmount: 0,
      rewardPointsAwarded: 0,
    },
    {
      clientUserId: secondClient.id,
      gardenerProfileId: gardener.id,
      serviceType: 'consultation',
      status: 'scheduled',
      scheduledFor: now.plus({ days: 4 }).startOf('day'),
      arrivalWindowStart: '13:00',
      arrivalWindowEnd: '14:00',
      address: 'Antiguo Cuscatlan, La Libertad',
      notes: 'Plant consultation for several indoor plants.',
      budget: 35,
      paymentStatus: 'held',
      paymentMethod: 'cash',
      heldAmount: 35,
      pointsRedeemed: 0,
      discountPercent: 0,
      discountAmount: 0,
      rewardPointsAwarded: 0,
    },
    {
      clientUserId: firstClient.id,
      gardenerProfileId: gardener.id,
      serviceType: 'maintenance',
      status: 'completed',
      scheduledFor: now.minus({ days: 3 }).startOf('day'),
      notes: 'Completed garden maintenance service.',
      budget: 100,
      paymentStatus: 'released',
      paymentMethod: 'cash',
      finalAmount: 85,
      releasedAmount: 85,
      completedAt: now.minus({ days: 3 }),
      verifiedAt: now.minus({ days: 3 }),
      clientConfirmedAt: now.minus({ days: 3 }),
      gardenerConfirmedAt: now.minus({ days: 3 }),
      pointsRedeemed: 0,
      discountPercent: 0,
      discountAmount: 0,
      rewardPointsAwarded: 0,
    },
  ])

  return { gardenerUser }
}

async function createClient(name: string, username: string) {
  const user = await User.create({
    first_name: name,
    last_name: 'Client',
    username,
    email: `${username}@example.com`,
    password: 'PlantBud123!',
    role: 'client',
  })
  await AccountProfile.create({
    userId: user.id,
    displayName: `${name} Client`,
    subscriptionPlan: 'free',
    rewardPoints: 0,
    scannerMonthlyLimit: 5,
  })
  return user
}
