import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import ServiceRequest from '#models/service_request'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Service request workflow', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('clients can redeem up to 20 percent and cancelled requests return the points', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Points',
      last_name: 'Client',
      username: 'points.discount.client',
      email: 'points.discount.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const clientProfile = await AccountProfile.create({
      userId: clientUser.id,
      displayName: 'Points Client',
      subscriptionPlan: 'premium',
      rewardPoints: 1200,
      scannerMonthlyLimit: 5,
    })
    const gardenerUser = await User.create({
      first_name: 'Discount',
      last_name: 'Gardener',
      username: 'discount.gardener',
      email: 'discount.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Discount gardener',
      serviceArea: 'San Salvador',
      paymentMethods: 'PayPal, Cash',
      isAvailable: true,
      experienceYears: 3,
      ratingAverage: 4,
      ratingCount: 1,
    })

    await browserContext.loginAs(clientUser)
    const page = await visit(`/request/${gardener.id}`)
    await page.locator('input[name="payment_method"][value="paypal"]').check()
    await page.locator('input[name="budget"]').fill('100')
    await page.locator('input[name="location"]').fill('Colonia Escalon, San Salvador')
    await page.locator('input[name="latitude"]').evaluate((input) => {
      input.value = '13.7018520'
    })
    await page.locator('input[name="longitude"]').evaluate((input) => {
      input.value = '-89.2242270'
    })
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page
      .locator('input[name="scheduled_for"]')
      .fill(DateTime.now().plus({ days: 7 }).toISODate()!)
    await page
      .locator('textarea[name="notes"]')
      .fill('Complete garden maintenance requested with a points discount.')
    await page.locator('input[name="paypal_email"]').fill('points.client@example.com')
    await page.locator('input[name="intent_confirmed"]').check()

    const discountSelect = page.locator('select[name="discount_steps"]')
    await discountSelect.selectOption('2')
    await page.getByText('20% · $20.00', { exact: true }).waitFor()
    await page.getByText('$80.00', { exact: true }).last().waitFor()

    await discountSelect.evaluate((select) => {
      const option = select.ownerDocument.createElement('option')
      option.value = '3'
      option.textContent = 'Manipulated 30%'
      select.append(option)
      select.value = '3'
    })
    await page.getByRole('button', { name: 'Protect payment & send request' }).click()
    await page.waitForURL(`**/request/${gardener.id}`)
    assert.equal(
      await ServiceRequest.query().where('clientUserId', clientUser.id).count('* as total').then(
        (rows) => Number(rows[0].$extras.total)
      ),
      0
    )
    await clientProfile.refresh()
    assert.equal(clientProfile.rewardPoints, 1200)

    await page.locator('input[name="payment_method"][value="paypal"]').check()
    await page.locator('input[name="paypal_email"]').fill('points.client@example.com')
    await page.locator('select[name="discount_steps"]').selectOption('2')
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page.locator('input[name="intent_confirmed"]').check()
    await page.getByRole('button', { name: 'Protect payment & send request' }).click()
    await page.waitForURL('**/requested')

    const serviceRequest = await ServiceRequest.query()
      .where('clientUserId', clientUser.id)
      .firstOrFail()
    await clientProfile.refresh()
    assert.equal(serviceRequest.pointsRedeemed, 1000)
    assert.equal(serviceRequest.discountPercent, 20)
    assert.equal(Number(serviceRequest.discountAmount), 20)
    assert.equal(Number(serviceRequest.heldAmount), 80)
    assert.equal(clientProfile.rewardPoints, 200)
    await page.getByText(/20% off.*1,000 points redeemed/).waitFor()

    await page.getByRole('button', { name: 'Cancel request' }).click()
    await page.waitForURL('**/requested')
    await serviceRequest.refresh()
    await clientProfile.refresh()
    assert.equal(serviceRequest.status, 'cancelled')
    assert.isNotNull(serviceRequest.pointsRefundedAt)
    assert.isNotNull(serviceRequest.locationRemovedAt)
    assert.isNull(serviceRequest.address)
    assert.isNull(serviceRequest.latitude)
    assert.isNull(serviceRequest.longitude)
    assert.equal(clientProfile.rewardPoints, 1200)
  })

  test('request screens always use the latest profile photos', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Avatar',
      last_name: 'Client',
      username: 'avatar.request.client',
      email: 'avatar.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const clientProfile = await AccountProfile.create({
      userId: clientUser.id,
      displayName: 'Avatar Client',
      avatarUrl: `/profile/media/${clientUser.id}/avatar/client-latest.png`,
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const gardenerUser = await User.create({
      first_name: 'Avatar',
      last_name: 'Gardener',
      username: 'avatar.request.gardener',
      email: 'avatar.request.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardenerProfile = await AccountProfile.create({
      userId: gardenerUser.id,
      displayName: 'Avatar Gardener',
      avatarUrl: `/profile/media/${gardenerUser.id}/avatar/gardener-latest.png`,
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Avatar gardener',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 2,
      ratingAverage: 0,
      ratingCount: 0,
    })
    await ServiceRequest.create({
      clientUserId: clientUser.id,
      gardenerProfileId: gardener.id,
      serviceType: 'maintenance',
      status: 'pending',
      address: 'San Salvador',
      notes: 'Request created to verify refreshed profile photos.',
      budget: 50,
      paymentMethod: 'cash',
      paymentStatus: null,
      scheduledFor: DateTime.now().plus({ days: 5 }),
    })

    await browserContext.loginAs(clientUser)
    const requestPage = await visit(`/request/${gardener.id}`)
    const requestGardenerPhoto = await requestPage
      .getByRole('img', { name: 'Avatar Gardener' })
      .getAttribute('src')
    assert.include(requestGardenerPhoto || '', 'gardener-latest.png?v=')

    const clientRequestedPage = await visit('/requested')
    const sentGardenerPhoto = await clientRequestedPage
      .getByRole('img', { name: 'Avatar Gardener' })
      .getAttribute('src')
    assert.include(sentGardenerPhoto || '', 'gardener-latest.png?v=')
    const clientNavbarPhoto = await clientRequestedPage
      .locator('[data-app-profile-menu] summary img')
      .getAttribute('src')
    assert.include(clientNavbarPhoto || '', 'client-latest.png?v=')

    await browserContext.loginAs(gardenerUser)
    const gardenerRequestedPage = await visit('/requested')
    const receivedClientPhoto = await gardenerRequestedPage
      .getByRole('img', { name: 'Avatar Client' })
      .getAttribute('src')
    assert.include(receivedClientPhoto || '', 'client-latest.png?v=')
    const gardenerNavbarPhoto = await gardenerRequestedPage
      .locator('[data-app-profile-menu] summary img')
      .getAttribute('src')
    assert.include(gardenerNavbarPhoto || '', 'gardener-latest.png?v=')

    assert.isNotNull(clientProfile.updatedAt)
    assert.isNotNull(gardenerProfile.updatedAt)
  })

  test('accounts without a profile photo use their generated initial in request screens', async ({
    browserContext,
    visit,
  }) => {
    const clientUser = await User.create({
      first_name: 'Initial',
      last_name: 'Client',
      username: 'initial.request.client',
      email: 'initial.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: clientUser.id,
      displayName: 'Initial Client',
      avatarUrl: null,
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const gardenerUser = await User.create({
      first_name: 'Panchito',
      last_name: 'Nuevo',
      username: 'panchito.nuevo',
      email: 'panchito.nuevo@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
      profilePicture: null,
    })
    await AccountProfile.create({
      userId: gardenerUser.id,
      displayName: 'Panchito',
      avatarUrl: null,
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'New gardener',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 0,
      ratingAverage: 4,
      ratingCount: 1,
    })
    await ServiceRequest.create({
      clientUserId: clientUser.id,
      gardenerProfileId: gardener.id,
      serviceType: 'maintenance',
      status: 'pending',
      address: 'San Salvador',
      notes: 'Request created to verify generated profile initials.',
      budget: 50,
      paymentMethod: 'cash',
      paymentStatus: null,
      scheduledFor: DateTime.now().plus({ days: 5 }),
    })

    await browserContext.loginAs(clientUser)
    const requestPage = await visit(`/request/${gardener.id}`)
    await requestPage.getByLabel('Panchito').getByText('P', { exact: true }).waitFor()
    await requestPage.getByLabel('4.0 out of 5 stars').waitFor()

    const requestedPage = await visit('/requested')
    await requestedPage.getByLabel('Panchito').getByText('P', { exact: true }).waitFor()
    await requestedPage.getByLabel('4.0 out of 5 stars').waitFor()
  })

  test('unavailable gardener profiles remain visible in the catalog and search', async ({
    visit,
  }) => {
    const gardenerUser = await User.create({
      first_name: 'Hidden',
      last_name: 'Gardener',
      username: 'hidden.gardener',
      email: 'hidden.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    await AccountProfile.create({
      userId: gardenerUser.id,
      displayName: 'Hidden Gardener',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Paused garden care',
      serviceArea: 'Santa Tecla',
      isAvailable: false,
      experienceYears: 2,
      ratingAverage: 0,
      ratingCount: 0,
    })

    const page = await visit('/maintenance')
    await page.getByText('Hidden Gardener', { exact: true }).first().waitFor()
    await page.locator('[data-gardener-search-input]').fill('hidden.gardener')
    await page
      .locator('[data-gardener-search-results]')
      .getByText('Hidden Gardener', { exact: true })
      .waitFor()
    await page
      .locator('[data-gardener-search-results]')
      .getByText(/Unavailable/)
      .waitFor()
  })

  test('client and gardener complete a request and premium points are awarded once', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Premium',
      last_name: 'Client',
      username: 'premium.request.client',
      email: 'premium.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const clientProfile = await AccountProfile.create({
      userId: clientUser.id,
      displayName: 'Premium Client',
      subscriptionPlan: 'premium',
      rewardPoints: 600,
      scannerMonthlyLimit: 5,
    })
    const gardenerUser = await User.create({
      first_name: 'Workflow',
      last_name: 'Gardener',
      username: 'workflow.gardener',
      email: 'workflow.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Request workflow gardener',
      serviceArea: 'San Salvador',
      paymentMethods: 'Cash, Card',
      isAvailable: true,
      experienceYears: 4,
      ratingAverage: 5,
      ratingCount: 1,
    })

    await browserContext.loginAs(clientUser)
    const publicProfilePage = await visit(`/users/${gardenerUser.username}`)
    await publicProfilePage
      .getByRole('link', { name: 'Request service' })
      .waitFor()
    assert.equal(
      await publicProfilePage.getByRole('link', { name: 'Request service' }).getAttribute('href'),
      `/request/${gardener.id}`
    )

    const requestPage = await visit(`/request/${gardener.id}`)
    await requestPage.locator('input[name="payment_method"][value="card"]').check()
    await requestPage.locator('input[name="budget"]').fill('150')
    await requestPage
      .locator('input[name="location"]')
      .fill('Colonia Escalon, San Salvador, El Salvador')
    await requestPage.locator('input[name="latitude"]').evaluate((input) => {
      input.value = '13.7018520'
    })
    await requestPage.locator('input[name="longitude"]').evaluate((input) => {
      input.value = '-89.2242270'
    })
    await requestPage.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await requestPage
      .locator('input[name="scheduled_for"]')
      .fill(DateTime.now().plus({ days: 7 }).toISODate()!)
    await requestPage
      .locator('textarea[name="notes"]')
      .fill('Prune and refresh the balcony plants.')
    await requestPage.locator('input[name="cardholder_name"]').fill('Premium Client')
    await requestPage.locator('input[name="card_number"]').fill('1234567890123456')
    await requestPage.locator('input[name="card_expiry"]').fill('1230')
    await requestPage.locator('input[name="card_cvc"]').fill('123')
    await requestPage.locator('select[name="discount_steps"]').selectOption('1')
    await requestPage.locator('input[name="intent_confirmed"]').check()
    await requestPage.getByRole('button', { name: 'Protect payment & send request' }).click()
    await requestPage.waitForURL('**/requested')

    const serviceRequest = await ServiceRequest.query()
      .where('clientUserId', clientUser.id)
      .where('gardenerProfileId', gardener.id)
      .firstOrFail()

    assert.equal(serviceRequest.status, 'pending')
    assert.equal(serviceRequest.paymentStatus, 'held')
    assert.equal(Number(serviceRequest.heldAmount), 135)
    assert.equal(serviceRequest.pointsRedeemed, 500)
    assert.equal(serviceRequest.discountPercent, 10)
    assert.equal(Number(serviceRequest.discountAmount), 15)
    assert.equal(serviceRequest.paymentBrand, 'Card')
    assert.equal(serviceRequest.paymentLastFour, '3456')
    assert.equal(Number(serviceRequest.latitude), 13.701852)
    assert.equal(Number(serviceRequest.longitude), -89.224227)

    await browserContext.loginAs(gardenerUser)
    const gardenerPage = await visit('/requested')
    assert.equal(await gardenerPage.locator('[data-private-request-map]').count(), 1)
    assert.include(
      (await gardenerPage
        .getByRole('link', { name: 'Directions in Google Maps' })
        .getAttribute('href')) || '',
      'https://www.google.com/maps/dir/?api=1&destination='
    )
    const acceptForm = gardenerPage
      .locator(`form[action="/requested/${serviceRequest.id}/action"]`)
      .filter({ has: gardenerPage.locator('input[value="accept"]') })
    await acceptForm
      .locator('textarea[name="gardener_response"]')
      .fill('I can take care of this service request.')
    await acceptForm.getByRole('button', { name: 'Accept', exact: true }).click()
    await gardenerPage.waitForLoadState('networkidle')
    await serviceRequest.refresh()
    assert.equal(serviceRequest.status, 'accepted')

    const scheduleForm = gardenerPage
      .locator(`form[action="/requested/${serviceRequest.id}/action"]`)
      .filter({ has: gardenerPage.locator('input[value="schedule"]') })
    await scheduleForm
      .locator('input[name="scheduled_for"]')
      .fill(DateTime.now().plus({ days: 10 }).toISODate()!)
    await scheduleForm
      .locator('textarea[name="gardener_response"]')
      .fill('I will arrive in the morning on this date.')
    await scheduleForm.getByRole('button', { name: 'Set date' }).click()
    await gardenerPage.waitForLoadState('networkidle')
    await serviceRequest.refresh()
    assert.equal(serviceRequest.status, 'scheduled')

    await browserContext.loginAs(clientUser)
    const clientPage = await visit('/requested')
    await clientPage.getByRole('button', { name: 'Service completed' }).click()
    await clientPage.waitForLoadState('networkidle')
    await serviceRequest.refresh()
    await clientProfile.refresh()

    assert.isNotNull(serviceRequest.clientConfirmedAt)
    assert.isNull(serviceRequest.gardenerConfirmedAt)
    assert.equal(serviceRequest.status, 'scheduled')
    assert.equal(serviceRequest.rewardPointsAwarded, 0)
    assert.equal(clientProfile.rewardPoints, 100)
    assert.equal(serviceRequest.paymentStatus, 'held')
    assert.equal(Number(serviceRequest.releasedAmount), 0)

    await browserContext.loginAs(gardenerUser)
    const completionPage = await visit('/requested')
    const staleCompletionPage = await visit('/requested')
    const completeForm = completionPage
      .locator(`form[action="/requested/${serviceRequest.id}/action"]`)
      .filter({ has: completionPage.locator('input[value="confirm_complete"]') })
    await completeForm.locator('input[name="final_amount"]').fill('120.50')
    await completeForm
      .locator('textarea[name="gardener_response"]')
      .fill('Work completed and plants refreshed.')
    await completeForm.getByRole('button', { name: 'Service completed' }).click()
    await completionPage.waitForLoadState('networkidle')
    await serviceRequest.refresh()
    await clientProfile.refresh()

    assert.equal(serviceRequest.status, 'completed')
    assert.isNotNull(serviceRequest.gardenerConfirmedAt)
    assert.isNotNull(serviceRequest.verifiedAt)
    assert.equal(Number(serviceRequest.finalAmount), 120.5)
    assert.equal(serviceRequest.rewardPointsAwarded, 5423)
    assert.equal(clientProfile.rewardPoints, 5523)
    assert.equal(serviceRequest.paymentStatus, 'released')
    assert.equal(Number(serviceRequest.discountAmount), 12.05)
    assert.equal(Number(serviceRequest.releasedAmount), 108.45)
    assert.equal(Number(serviceRequest.refundedAmount), 26.55)
    assert.isNotNull(serviceRequest.locationRemovedAt)
    assert.isNull(serviceRequest.address)
    assert.isNull(serviceRequest.latitude)
    assert.isNull(serviceRequest.longitude)
    assert.equal(await completionPage.locator('[data-private-request-map]').count(), 0)
    await completionPage.getByText('Location removed after the request closed').waitFor()

    const staleCompleteForm = staleCompletionPage
      .locator(`form[action="/requested/${serviceRequest.id}/action"]`)
      .filter({ has: staleCompletionPage.locator('input[value="confirm_complete"]') })
    await staleCompleteForm.locator('input[name="final_amount"]').fill('120.50')
    await staleCompleteForm
      .locator('textarea[name="gardener_response"]')
      .fill('Work completed and plants refreshed.')
    await staleCompleteForm.getByRole('button', { name: 'Service completed' }).click()
    await staleCompletionPage.waitForLoadState('networkidle')
    await serviceRequest.refresh()
    await clientProfile.refresh()

    assert.equal(serviceRequest.rewardPointsAwarded, 5423)
    assert.equal(clientProfile.rewardPoints, 5523)
    assert.equal(serviceRequest.paymentStatus, 'released')
    assert.equal(Number(serviceRequest.releasedAmount), 108.45)
    assert.equal(Number(serviceRequest.refundedAmount), 26.55)
  })

  test('server rejects manipulated dates and incomplete request fields', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Strict',
      last_name: 'Client',
      username: 'strict.request.client',
      email: 'strict.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const gardenerUser = await User.create({
      first_name: 'Strict',
      last_name: 'Gardener',
      username: 'strict.request.gardener',
      email: 'strict.request.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Strict request gardener',
      serviceArea: 'San Salvador',
      paymentMethods: 'Card',
      isAvailable: true,
      experienceYears: 3,
      ratingAverage: 5,
      ratingCount: 1,
    })

    await browserContext.loginAs(clientUser)
    const page = await visit(`/request/${gardener.id}`)
    await page.locator('input[name="payment_method"][value="card"]').check()
    await page.locator('input[name="budget"]').fill('75')
    await page.locator('input[name="location"]').fill('Avenida Masferrer Norte, San Salvador')
    await page.locator('input[name="latitude"]').evaluate((input) => {
      input.value = '13.7050000'
    })
    await page.locator('input[name="longitude"]').evaluate((input) => {
      input.value = '-89.2400000'
    })
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page
      .locator('textarea[name="notes"]')
      .fill('Trim the garden and inspect the irrigation system.')
    await page.locator('input[name="cardholder_name"]').fill('Strict Client')
    await page.locator('input[name="card_number"]').fill('4242424242424242')
    await page.locator('input[name="card_expiry"]').fill('1230')
    await page.locator('input[name="card_cvc"]').fill('123')
    await page.locator('input[name="intent_confirmed"]').check()
    await page.locator('input[name="scheduled_for"]').evaluate((dateInput) => {
      dateInput.disabled = true
      const manipulated = dateInput.ownerDocument.createElement('input')
      manipulated.type = 'hidden'
      manipulated.name = 'scheduled_for'
      manipulated.value = '20266-01-01'
      dateInput.form?.appendChild(manipulated)
    })
    await page.getByRole('button', { name: 'Protect payment & send request' }).click()
    await page.waitForLoadState('networkidle')

    await page.getByText(/Choose a valid service date/).waitFor()
    const requests = await ServiceRequest.query().where('clientUserId', clientUser.id)
    assert.lengthOf(requests, 0)
  })

  test('cash requests are available only when the gardener accepts cash and do not hold funds', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Cash',
      last_name: 'Client',
      username: 'cash.request.client',
      email: 'cash.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const clientProfile = await AccountProfile.create({
      userId: clientUser.id,
      displayName: 'Cash Client',
      subscriptionPlan: 'premium',
      rewardPoints: 250,
      scannerMonthlyLimit: 5,
    })
    const gardenerUser = await User.create({
      first_name: 'Cash',
      last_name: 'Gardener',
      username: 'cash.request.gardener',
      email: 'cash.request.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Cash garden services',
      serviceArea: 'Santa Tecla',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 2,
      ratingAverage: 5,
      ratingCount: 1,
    })

    await browserContext.loginAs(clientUser)
    const page = await visit(`/request/${gardener.id}`)
    await page.locator('input[name="payment_method"][value="cash"]').waitFor()
    assert.equal(await page.locator('input[name="payment_method"][value="card"]').count(), 0)
    await page.locator('input[name="budget"]').fill('80')
    await page.locator('input[name="location"]').fill('Santa Tecla, La Libertad')
    await page.locator('input[name="latitude"]').evaluate((input) => {
      input.value = '13.6731000'
    })
    await page.locator('input[name="longitude"]').evaluate((input) => {
      input.value = '-89.2891000'
    })
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page
      .locator('input[name="scheduled_for"]')
      .fill(DateTime.now().plus({ days: 5 }).toISODate()!)
    await page
      .locator('textarea[name="notes"]')
      .fill('General garden cleanup and careful hedge trimming.')
    await page.locator('input[name="intent_confirmed"]').check()
    await page.getByRole('button', { name: 'Send request' }).click()
    await page.waitForURL('**/requested')

    const serviceRequest = await ServiceRequest.query()
      .where('clientUserId', clientUser.id)
      .where('gardenerProfileId', gardener.id)
      .firstOrFail()
    assert.equal(serviceRequest.paymentMethod, 'cash')
    assert.isNull(serviceRequest.paymentStatus)
    assert.equal(Number(serviceRequest.heldAmount), 0)

    await browserContext.loginAs(gardenerUser)
    const gardenerPage = await visit('/requested')
    const acceptForm = gardenerPage
      .locator(`form[action="/requested/${serviceRequest.id}/action"]`)
      .filter({ has: gardenerPage.locator('input[value="accept"]') })
    await acceptForm
      .locator('textarea[name="gardener_response"]')
      .fill('I can complete this cash service request.')
    await acceptForm.getByRole('button', { name: 'Accept', exact: true }).click()
    await gardenerPage.waitForLoadState('networkidle')

    await browserContext.loginAs(clientUser)
    const clientPage = await visit('/requested')
    await clientPage.getByText('Cash payments do not earn reward points.').waitFor()
    await clientPage.getByRole('button', { name: 'Service completed' }).click()
    await clientPage.waitForLoadState('networkidle')

    await browserContext.loginAs(gardenerUser)
    const completionPage = await visit('/requested')
    const completeForm = completionPage
      .locator(`form[action="/requested/${serviceRequest.id}/action"]`)
      .filter({ has: completionPage.locator('input[value="confirm_complete"]') })
    await completeForm.locator('input[name="final_amount"]').fill('80')
    await completeForm
      .locator('textarea[name="gardener_response"]')
      .fill('Cash received and service completed.')
    await completeForm.getByRole('button', { name: 'Service completed' }).click()
    await completionPage.waitForLoadState('networkidle')

    await serviceRequest.refresh()
    await clientProfile.refresh()
    assert.equal(serviceRequest.status, 'completed')
    assert.equal(serviceRequest.rewardPointsAwarded, 0)
    assert.equal(clientProfile.rewardPoints, 250)
  })

  test('server rejects a manually typed location without an OpenStreetMap pin', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Map',
      last_name: 'Client',
      username: 'map.request.client',
      email: 'map.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const gardenerUser = await User.create({
      first_name: 'Map',
      last_name: 'Gardener',
      username: 'map.request.gardener',
      email: 'map.request.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Mapped garden services',
      serviceArea: 'San Salvador',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 2,
      ratingAverage: 5,
      ratingCount: 1,
    })

    await browserContext.loginAs(clientUser)
    const page = await visit(`/request/${gardener.id}`)
    await page.locator('input[name="budget"]').fill('80')
    await page.locator('input[name="location"]').fill('Typed address without a map pin')
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page
      .locator('input[name="scheduled_for"]')
      .fill(DateTime.now().plus({ days: 5 }).toISODate()!)
    await page
      .locator('textarea[name="notes"]')
      .fill('General garden cleanup and careful hedge trimming.')
    await page.locator('input[name="intent_confirmed"]').check()
    await page.locator('[data-service-request-form]').evaluate((form) => {
      const latitude = form.querySelector('input[name="latitude"]')
      const longitude = form.querySelector('input[name="longitude"]')
      const location = form.querySelector('input[name="location"]')
      if (latitude) latitude.value = ''
      if (longitude) longitude.value = ''
      if (location) location.setCustomValidity('')
      form.submit()
    })
    await page.waitForLoadState('networkidle')
    await page.getByText(/select the exact service location on the map/i).waitFor()
    const requests = await ServiceRequest.query().where('clientUserId', clientUser.id)
    assert.lengthOf(requests, 0)
  })

  test('arrival ranges must fit the gardener schedule for the selected day', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const clientUser = await User.create({
      first_name: 'Timed',
      last_name: 'Client',
      username: 'timed.request.client',
      email: 'timed.request.client@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const gardenerUser = await User.create({
      first_name: 'Timed',
      last_name: 'Gardener',
      username: 'timed.request.gardener',
      email: 'timed.request.gardener@example.com',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    const gardener = await GardenerProfile.create({
      userId: gardenerUser.id,
      headline: 'Scheduled garden services',
      serviceArea: 'San Salvador',
      availabilitySchedule: 'De lunes a viernes, de 7:00 AM a 3:00 PM',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 3,
      ratingAverage: 5,
      ratingCount: 1,
    })
    const serviceDate = DateTime.now().plus({ weeks: 1 }).startOf('week').plus({ days: 1 })

    await browserContext.loginAs(clientUser)
    const page = await visit(`/request/${gardener.id}`)
    await page.locator('input[name="budget"]').fill('80')
    await page.locator('input[name="location"]').fill('Colonia Escalon, San Salvador')
    await page.locator('input[name="latitude"]').evaluate((input) => {
      input.value = '13.7018520'
    })
    await page.locator('input[name="longitude"]').evaluate((input) => {
      input.value = '-89.2242270'
    })
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page.locator('input[name="scheduled_for"]').fill(serviceDate.toISODate()!)
    await page.locator('input[name="arrival_window_start"]').fill('14:00')
    await page.locator('input[name="arrival_window_end"]').fill('16:00')
    await page
      .locator('textarea[name="notes"]')
      .fill('Trim the hedges and perform general maintenance around the garden.')
    await page.locator('input[name="intent_confirmed"]').check()
    await page.getByRole('button', { name: 'Send request' }).click()
    await page.getByText(/within the gardener's published availability/i).waitFor()
    assert.lengthOf(await ServiceRequest.query().where('clientUserId', clientUser.id), 0)

    await page.locator('input[name="arrival_window_start"]').fill('09:00')
    await page.locator('input[name="arrival_window_end"]').fill('11:00')
    await page.locator('input[name="location"]').evaluate((input) => {
      input.setCustomValidity('')
    })
    await page.locator('input[name="intent_confirmed"]').check()
    await page.getByRole('button', { name: 'Send request' }).click()
    await page.waitForURL('**/requested')

    const serviceRequest = await ServiceRequest.query()
      .where('clientUserId', clientUser.id)
      .firstOrFail()
    assert.equal(serviceRequest.arrivalWindowStart, '09:00')
    assert.equal(serviceRequest.arrivalWindowEnd, '11:00')
    await page.getByText('Arrival: 9:00 AM - 11:00 AM').waitFor()
  })
})
