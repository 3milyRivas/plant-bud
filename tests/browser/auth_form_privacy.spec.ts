import AccountProfile from '#models/account_profile'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Authentication form privacy', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('login data only survives its immediate validation redirect', async ({ visit, assert }) => {
    const page = await visit('/login')
    const initialResponse = await page.reload()

    assert.include(initialResponse?.headers()['cache-control'], 'no-store')
    assert.equal(
      await page.locator('form[data-auth-form="login"]').getAttribute('autocomplete'),
      'off'
    )

    await page.getByLabel('Email or username').fill('first.account@example.com')
    await page.getByLabel('Password', { exact: true }).fill('incorrect-password')
    await page.getByRole('button', { name: 'Login' }).click()
    await page.getByText('Invalid credentials').waitFor()

    assert.equal(
      await page.getByLabel('Email or username').inputValue(),
      'first.account@example.com'
    )
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '')

    await page.reload()

    assert.equal(await page.getByLabel('Email or username').inputValue(), '')
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '')
  })

  test('signup fields do not leak into another account form', async ({ visit, assert }) => {
    const page = await visit('/signup/client')

    assert.equal(
      await page.locator('form[data-auth-form="signup"]').getAttribute('autocomplete'),
      'off'
    )
    assert.equal(
      await page.getByLabel('Password', { exact: true }).getAttribute('autocomplete'),
      'new-password'
    )

    await page.getByLabel('Username').fill('first.user')
    await page.getByLabel('Display Name').fill('First User')
    await page.getByLabel('Email').fill('first.user@example.com')
    await page.getByLabel('Phone Number').fill('7000-1234')
    await page.locator('form[data-auth-form="signup"]').evaluate((form) => {
      ;(form as any).submit()
    })
    await page.waitForURL('/signup/client')

    assert.equal(await page.getByLabel('Username').inputValue(), 'first.user')
    assert.equal(await page.getByLabel('Email').inputValue(), 'first.user@example.com')
    assert.equal(await page.getByLabel('Phone Number').inputValue(), '7000-1234')
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '')

    await page.goto('/signup/gardener')

    assert.equal(await page.getByLabel('Username').inputValue(), '')
    assert.equal(await page.getByLabel('Email').inputValue(), '')
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '')
  })

  test('client signup requires a phone number', async ({ visit, assert }) => {
    const page = await visit('/signup/client')

    await page.getByLabel('Username').fill('phone.required')
    await page.getByLabel('Display Name').fill('Phone Required')
    await page.getByLabel('Email').fill('phone.required@example.com')
    await page.getByLabel('Password', { exact: true }).fill('PlantBud123!')
    await page.getByLabel('Confirm Password').fill('PlantBud123!')
    await page.locator('form[data-auth-form="signup"]').evaluate((form) => {
      ;(form as any).submit()
    })

    await page.waitForURL('/signup/client')
    await page.getByText('Phone number is required').waitFor()
    assert.equal(await User.findBy('email', 'phone.required@example.com'), null)
  })

  test('logout cannot resurrect the first database account', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Logout',
      last_name: 'Check',
      username: 'logout.check',
      email: 'logout.check@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Logout Check',
      subscriptionPlan: 'free',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })

    await browserContext.loginAs(user)
    const page = await visit('/homepage')
    await page
      .locator('form[action="/logout"]')
      .first()
      .evaluate((form) => {
        ;(form as any).submit()
      })
    await page.waitForURL('/login')

    await page.goto('/register')
    await page.getByRole('heading', { name: /Welcome to Plant Bud/i }).waitFor()
    assert.equal(page.url().endsWith('/register'), true)

    await page.goto('/signup/client')
    await page.getByRole('heading', { name: 'Create Account' }).waitFor()
    assert.equal(page.url().endsWith('/signup/client'), true)

    await page.goto('/register')
    await page.getByRole('button', { name: /Start Demo/i }).click()
    await page.waitForURL('/homepage')

    const guest = await User.query().whereLike('username', 'guest_%').orderBy('id', 'desc').first()
    assert.isNotNull(guest)
    assert.notEqual(guest?.id, user.id)
    assert.equal(guest?.role, 'client')
  })
})
