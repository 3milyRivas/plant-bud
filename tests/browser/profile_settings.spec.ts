import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import NurseryProfile from '#models/nursery_profile'
import NurseryCatalogCategory from '#models/nursery_catalog_category'
import NurseryProduct from '#models/nursery_product'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Profile settings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('gardener payout destinations use fixed demo card and PayPal details', async ({
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
    await profilePage.locator('[data-payment-method-checkbox][value="Card"]').check({ force: true })
    assert.isFalse(await profilePage.locator('input[name="payout_paypal_email"]').isEditable())
    assert.isFalse(await profilePage.locator('input[name="payout_card_number"]').isEditable())
    assert.equal(
      await profilePage.locator('input[name="payout_paypal_email"]').inputValue(),
      'testplantbud@gmail.com'
    )
    assert.equal(
      await profilePage.locator('input[name="payout_card_number"]').inputValue(),
      '0000 0000 0000 0000'
    )
    await profilePage.locator('input[name="payout_paypal_email"]').evaluate((input) => {
      input.value = 'manipulated@example.com'
    })
    await profilePage.locator('input[name="payout_card_number"]').evaluate((input) => {
      input.value = '4242 4242 4242 4242'
    })
    await profilePage.getByRole('button', { name: 'Save changes' }).click()
    await profilePage.waitForURL('**/profile')

    await gardener.refresh()
    assert.include(gardener.paymentMethods || '', 'Paypal')
    assert.include(gardener.paymentMethods || '', 'Card')
    assert.equal(gardener.payoutPaypalEmail, 'testplantbud@gmail.com')
    assert.equal(gardener.payoutCardholderName, 'Plant Bud Demo Account')
    assert.equal(gardener.payoutCardBrand, 'Demo Card')
    assert.equal(gardener.payoutCardLastFour, '0000')
  })

  test('nursery PayPal payout destination is fixed to the demo account', async ({
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
    assert.isFalse(
      await communityProfile.locator('input[name="payout_paypal_email"]').isEditable()
    )
    await communityProfile.locator('input[name="payout_paypal_email"]').evaluate((input) => {
      input.value = 'nursery.manipulated@example.com'
    })
    await communityProfile.getByRole('button', { name: 'Save changes' }).click()
    await communityProfile.waitForURL('**/profile')

    await nursery.refresh()
    assert.include(nursery.paymentMethods || '', 'Paypal')
    assert.equal(nursery.payoutPaypalEmail, 'testplantbud@gmail.com')
    assert.isNull(nursery.payoutCardLastFour)
  })

  test('nursery can save a public map location and expose directions', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Mapped',
      last_name: 'Nursery',
      username: 'mapped.nursery',
      email: 'mapped.nursery@example.com',
      phone: '7000-0004',
      password: 'PlantBud123!',
      role: 'nursery',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Mapped Nursery',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const nursery = await NurseryProfile.create({
      userId: user.id,
      nurseryName: 'Mapped Nursery',
      nurserySlug: `mapped-nursery-${user.id}`,
      ownerName: 'Mapped Nursery',
      publicPhone: '7000-0004',
      publicEmail: user.email,
      paymentMethods: 'Cash',
      isActive: true,
      ratingAverage: 0,
      ratingCount: 0,
    })

    await browserContext.loginAs(user)
    const settingsPage = await visit('/profile/settings')
    await settingsPage.locator('input[name="city"]').fill('San Salvador')
    await settingsPage.locator('input[name="address"]').fill('Colonia Escalon')
    await settingsPage.locator('input[name="latitude"]').evaluate((element: { value: string }) => {
      element.value = '13.7081000'
    })
    await settingsPage.locator('input[name="longitude"]').evaluate((element: { value: string }) => {
      element.value = '-89.2423000'
    })
    await settingsPage
      .locator('input[name="address"]')
      .evaluate((element: { setCustomValidity: (message: string) => void }) => {
        element.setCustomValidity('')
      })
    await settingsPage.getByRole('button', { name: 'Save changes' }).click()
    await settingsPage.waitForURL('**/profile')

    await nursery.refresh()
    assert.equal(Number(nursery.latitude), 13.7081)
    assert.equal(Number(nursery.longitude), -89.2423)

    const publicProfile = await visit(`/users/${user.username}`)
    assert.equal(await publicProfile.locator('[data-public-nursery-map]').count(), 1)
    await publicProfile
      .getByRole('link', { name: 'How to get there' })
      .getAttribute('href')
      .then((href) => {
        assert.equal(
          href,
          'https://www.google.com/maps/dir/?api=1&destination=13.7081,-89.2423&travelmode=driving'
        )
      })
  })

  test('nursery can create catalog categories and publish products', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Catalog',
      last_name: 'Nursery',
      username: 'catalog.nursery',
      email: 'catalog.nursery@example.com',
      phone: '7000-0005',
      password: 'PlantBud123!',
      role: 'nursery',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Catalog Nursery',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })
    const nursery = await NurseryProfile.create({
      userId: user.id,
      nurseryName: 'Catalog Nursery',
      nurserySlug: `catalog-nursery-${user.id}`,
      ownerName: 'Catalog Nursery',
      publicPhone: '7000-0005',
      publicEmail: user.email,
      paymentMethods: 'Cash',
      isActive: true,
      ratingAverage: 0,
      ratingCount: 0,
    })

    await browserContext.loginAs(user)
    const settingsPage = await visit('/profile/settings')
    const categoryForm = settingsPage.locator('form[action="/profile/catalog/categories"]')
    await categoryForm.locator('input[name="name"]').fill('Pots')
    await categoryForm.getByRole('button', { name: 'Add' }).click()
    await settingsPage.waitForURL('**/profile/settings#catalog-settings')

    const productForm = settingsPage.locator('form[action="/profile/catalog/products"]')
    await productForm.locator('input[name="name"]').fill('Terracotta pot')
    await productForm.locator('select[name="category"]').selectOption('Pots')
    await productForm.locator('input[name="price"]').fill('12.50')
    await productForm.locator('input[name="stock"]').fill('8')
    await productForm
      .locator('textarea[name="description"]')
      .fill('Hand-finished pot for indoor plants.')
    await productForm.getByRole('button', { name: 'Publish product' }).click()
    await settingsPage.waitForURL('**/profile/settings#catalog-settings')

    for (const categoryName of ['Fertilizers', 'Tools', 'Seeds', 'Decor']) {
      const extraCategoryForm = settingsPage.locator('form[action="/profile/catalog/categories"]')
      await extraCategoryForm.locator('input[name="name"]').fill(categoryName)
      await extraCategoryForm.getByRole('button', { name: 'Add' }).click()
      await settingsPage.waitForURL('**/profile/settings#catalog-settings')
    }

    const categories = await NurseryCatalogCategory.query().where('nurseryProfileId', nursery.id)
    const product = await NurseryProduct.findBy('nurseryProfileId', nursery.id)
    assert.lengthOf(categories, 5)
    assert.isTrue(
      await settingsPage
        .locator('form[action="/profile/catalog/categories"]')
        .getByRole('button', { name: 'Add' })
        .isDisabled()
    )
    assert.equal(product?.name, 'Terracotta pot')
    assert.equal(product?.category, 'Pots')
    assert.equal(Number(product?.price), 12.5)

    for (let index = 1; index <= 6; index += 1) {
      await NurseryProduct.create({
        nurseryProfileId: nursery.id,
        name: `Catalog plant ${index}`,
        category: 'Plants',
        description: `Plant number ${index}`,
        price: 5 + index,
        stock: index,
        imageUrl: null,
        isActive: true,
      })
    }

    const publicProfile = await visit(`/users/${user.username}`)
    const publicCatalog = publicProfile.locator('#public-nursery-catalog')
    await publicCatalog.getByRole('button', { name: /Pots/ }).click()
    await publicCatalog.getByText('Terracotta pot').waitFor()
    await publicCatalog.getByText('$12.50').waitFor()
    await publicCatalog.getByRole('button', { name: /All/ }).click()
    await publicCatalog.getByText('1-6 of 7 products').waitFor()
    await publicCatalog.getByRole('button', { name: 'Next' }).click()
    await publicCatalog.getByText('7-7 of 7 products').waitFor()
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
