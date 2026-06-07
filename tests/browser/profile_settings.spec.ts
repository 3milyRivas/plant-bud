import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Profile settings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('gardener can configure private card and PayPal payout destinations', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Payout',
      last_name: 'Gardener',
      username: 'payout.gardener',
      email: 'payout.gardener@example.com',
      phone: '7000-0001',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Payout Gardener',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const gardener = await GardenerProfile.create({
      userId: user.id,
      headline: 'Payout gardener',
      serviceArea: 'San Salvador',
      publicPhone: '7000-0001',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 2,
      ratingAverage: 0,
      ratingCount: 0,
    })

    await browserContext.loginAs(user)
    const profilePage = await visit('/profile')
    await profilePage.getByRole('link', { name: 'Edit profile' }).click()
    await profilePage.waitForURL('**/profile/settings')

    await profilePage
      .locator('[data-payment-method-checkbox][value="Paypal"]')
      .check({ force: true })
    await profilePage
      .locator('[data-payment-method-checkbox][value="Card"]')
      .check({ force: true })
    await profilePage.locator('input[name="payout_paypal_email"]').fill('payments@example.com')
    await profilePage.locator('input[name="payout_cardholder_name"]').fill('Payout Gardener')
    await profilePage.locator('input[name="payout_card_number"]').fill('4242424242424242')
    await profilePage.getByRole('button', { name: 'Save changes' }).click()
    await profilePage.waitForURL('**/profile')

    await gardener.refresh()
    assert.include(gardener.paymentMethods || '', 'Paypal')
    assert.include(gardener.paymentMethods || '', 'Card')
    assert.equal(gardener.payoutPaypalEmail, 'payments@example.com')
    assert.equal(gardener.payoutCardholderName, 'Payout Gardener')
    assert.equal(gardener.payoutCardBrand, 'Visa')
    assert.equal(gardener.payoutCardLastFour, '4242')
    assert.notInclude(JSON.stringify(gardener.serialize()), '4242424242424242')
  })

  test('nursery can configure a PayPal payout account from its own profile', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Payout',
      last_name: 'Nursery',
      username: 'payout.nursery',
      email: 'payout.nursery@example.com',
      phone: '7000-0002',
      password: 'PlantBud123!',
      role: 'nursery',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Payout Nursery',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const nursery = await NurseryProfile.create({
      userId: user.id,
      nurseryName: 'Payout Nursery',
      nurserySlug: `payout-nursery-${user.id}`,
      ownerName: 'Payout Nursery',
      publicPhone: '7000-0002',
      publicEmail: user.email,
      paymentMethods: 'Cash',
      isActive: true,
      ratingAverage: 0,
      ratingCount: 0,
    })

    await browserContext.loginAs(user)
    const communityProfile = await visit(`/users/${user.username}`)
    await communityProfile.getByRole('link', { name: 'Edit profile' }).click()
    await communityProfile.waitForURL('**/profile/settings')

    await communityProfile
      .locator('[data-payment-method-checkbox][value="Paypal"]')
      .check({ force: true })
    await communityProfile
      .locator('input[name="payout_paypal_email"]')
      .fill('nursery.payments@example.com')
    await communityProfile.getByRole('button', { name: 'Save changes' }).click()
    await communityProfile.waitForURL('**/profile')

    await nursery.refresh()
    assert.include(nursery.paymentMethods || '', 'Paypal')
    assert.equal(nursery.payoutPaypalEmail, 'nursery.payments@example.com')
    assert.isNull(nursery.payoutCardLastFour)
  })

  test('gardener can update availability directly from their profile', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Quick',
      last_name: 'Status',
      username: 'quick.status',
      email: 'quick.status@example.com',
      phone: '7000-0003',
      password: 'PlantBud123!',
      role: 'gardener',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Quick Status',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const gardener = await GardenerProfile.create({
      userId: user.id,
      headline: 'Quick status gardener',
      paymentMethods: 'Cash',
      isAvailable: true,
      experienceYears: 1,
      ratingAverage: 0,
      ratingCount: 0,
    })

    await browserContext.loginAs(user)
    const profilePage = await visit('/profile')
    await profilePage.getByRole('button', { name: 'Unavailable' }).click()
    await profilePage.waitForURL('**/profile')

    await gardener.refresh()
    assert.isFalse(Boolean(gardener.isAvailable))
    await profilePage.getByText('You are now unavailable for new service requests.').waitFor()
    await profilePage.getByText('Paused', { exact: true }).waitFor()
  })
})
