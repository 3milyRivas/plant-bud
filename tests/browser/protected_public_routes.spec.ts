import AccountProfile from '#models/account_profile'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const protectedGetRoutes = [
  '/register',
  '/ornamental',
  '/horticultural',
  '/succulent',
  '/care1',
  '/care2',
  '/care3',
  '/plants/search?q=rose',
  '/maintenance',
  '/maintenance/suggestions?q=garden',
  '/request',
  '/request/999999',
  '/nurseries',
  '/nurseries/suggestions?q=plant',
  '/profile/media/999999/avatar/missing.png',
  '/nursery-catalog/media/999999/missing.png',
]

test.group('Protected catalog and directory routes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('redirects anonymous visitors to login', async ({ visit, assert }) => {
    for (const path of protectedGetRoutes) {
      const page = await visit(path)
      assert.include(page.url(), '/login')
    }
  })

  test('allows any authenticated role through the authentication boundary', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const users = await Promise.all(
      (['client', 'gardener', 'nursery'] as const).map(async (role) => {
        const user = await User.create({
          first_name: 'Protected',
          last_name: role,
          username: `protected.${role}`,
          email: `protected.${role}@example.com`,
          password: 'PlantBud123!',
          role,
        })
        await AccountProfile.create({
          userId: user.id,
          displayName: `Protected ${role}`,
          subscriptionPlan: 'free',
          rewardPoints: 0,
          scannerMonthlyLimit: 5,
        })
        return user
      })
    )

    for (const user of users) {
      await browserContext.loginAs(user)

      for (const path of ['/register', '/ornamental', '/maintenance', '/nurseries']) {
        const page = await visit(path)
        assert.notInclude(page.url(), '/login')
      }
    }
  })
})
