import AccountProfile from '#models/account_profile'
import AdminAuditLog from '#models/admin_audit_log'
import CommunityPost from '#models/community_post'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

async function createProfile(user: User, displayName: string) {
  await AccountProfile.create({
    userId: user.id,
    displayName,
    subscriptionPlan: 'free',
    rewardPoints: 0,
    scannerMonthlyLimit: 5,
  })
}

test.group('Administration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('standard accounts cannot open the administration panel', async ({
    browserContext,
    visit,
  }) => {
    const user = await User.create({
      first_name: 'Standard',
      last_name: 'Member',
      username: 'standard.member',
      email: 'standard.member@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await createProfile(user, 'Standard Member')

    await browserContext.loginAs(user)
    const page = await visit('/admin')
    await page.waitForURL('**/unauthorized')
  })

  test('protected owner can moderate posts and actions are audited', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const owner =
      (await User.findBy('email', 'davidalfredomenjivar@gmail.com')) ||
      (await User.create({
        first_name: 'David',
        last_name: 'Menjivar',
        username: 'david.owner',
        email: 'davidalfredomenjivar@gmail.com',
        password: 'PlantBud123!',
        role: 'client',
      }))
    owner.password = 'PlantBud123!'
    await owner.save()
    await AccountProfile.firstOrCreate(
      { userId: owner.id },
      {
        userId: owner.id,
        displayName: 'David Menjivar',
        subscriptionPlan: 'free',
        rewardPoints: 0,
        scannerMonthlyLimit: 5,
      }
    )
    const author = await User.create({
      first_name: 'Post',
      last_name: 'Author',
      username: 'post.author',
      email: 'post.author@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await createProfile(author, 'Post Author')
    const post = await CommunityPost.create({
      userId: author.id,
      body: 'Content requiring moderation',
      mediaUrl: '/profiles/banner.png',
      mediaType: 'image',
      visibility: 'public',
    })

    assert.equal(owner.accessLevel, 'owner')
    await browserContext.loginAs(owner)
    const page = await visit('/community')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await page.reload()

    const adminMenu = page.locator('[data-admin-floating-menu]')
    const bottomNav = page.locator('[data-phone-bottom-nav]')
    await adminMenu.waitFor()
    await bottomNav.waitFor()
    const adminButtonBox = await adminMenu.locator('summary').boundingBox()
    const bottomNavBox = await bottomNav.boundingBox()
    assert.isNotNull(adminButtonBox)
    assert.isNotNull(bottomNavBox)
    assert.isAtMost(adminButtonBox!.y + adminButtonBox!.height, bottomNavBox!.y - 6)
    await adminMenu.locator('summary').click()
    const floatingPanelBox = await adminMenu.locator('.admin-floating-menu-panel').boundingBox()
    assert.isNotNull(floatingPanelBox)
    assert.isAtLeast(floatingPanelBox!.x, 8)
    assert.isAtMost(floatingPanelBox!.x + floatingPanelBox!.width, 382)

    await page.goto('/admin')
    await page.getByRole('heading', { name: 'Plant Bud Administration' }).waitFor()
    const moderatedPostCard = page
      .locator(`form[action="/admin/posts/${post.id}/delete"]`)
      .locator('xpath=ancestor::article[1]')
    assert.equal(await moderatedPostCard.locator('[data-admin-post-preview]').count(), 1)
    assert.isTrue(
      await page
        .locator('body')
        .evaluate(
          (body) =>
            body.ownerDocument.documentElement.scrollWidth <=
            body.ownerDocument.documentElement.clientWidth
        )
    )
    await page
      .locator(`form[action="/admin/posts/${post.id}/delete"]`)
      .evaluate((form: { submit: () => void }) => form.submit())
    await page.waitForURL('**/admin#recent-posts')

    assert.isNull(await CommunityPost.find(post.id))
    const audit = await AdminAuditLog.findBy('targetId', String(post.id))
    assert.equal(audit?.action, 'post.deleted')
    assert.equal(audit?.actorEmail, owner.email)

    const createForm = page.locator('form[action="/admin/users"]')
    await createForm.locator('input[name="first_name"]').fill('Admin')
    await createForm.locator('input[name="last_name"]').fill('Created')
    await createForm.locator('input[name="username"]').fill('admin.created')
    await createForm.locator('input[name="email"]').fill('admin.created@example.com')
    await createForm.locator('input[name="password"]').fill('Created123!')
    await createForm.locator('select[name="role"]').selectOption('client')
    await createForm.getByRole('button', { name: 'Create account' }).click()
    await page.getByText('Account admin.created@example.com created.').waitFor()

    const createdUser = await User.findByOrFail('email', 'admin.created@example.com')
    const deleteForm = page.locator(`form[action="/admin/users/${createdUser.id}/delete"]`)
    await deleteForm.locator('input[name="current_password"]').fill('PlantBud123!')
    await deleteForm.evaluate((form: { submit: () => void }) => form.submit())
    await page.getByText('Account admin.created@example.com deleted.').waitFor()

    assert.isNull(await User.find(createdUser.id))
    assert.equal((await AdminAuditLog.query().where('targetId', String(createdUser.id))).length, 2)
  })

  test('administrator cannot delete another privileged account', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const admin = await User.create({
      first_name: 'First',
      last_name: 'Admin',
      username: 'first.admin',
      email: 'first.admin@example.com',
      password: 'PlantBud123!',
      role: 'client',
      accessLevel: 'admin',
    })
    await createProfile(admin, 'First Admin')
    const protectedAdmin = await User.create({
      first_name: 'Second',
      last_name: 'Admin',
      username: 'second.admin',
      email: 'second.admin@example.com',
      password: 'PlantBud123!',
      role: 'client',
      accessLevel: 'admin',
    })
    await createProfile(protectedAdmin, 'Second Admin')

    await browserContext.loginAs(admin)
    const page = await visit('/admin')
    assert.equal(
      await page.locator(`form[action="/admin/users/${protectedAdmin.id}/delete"]`).count(),
      0
    )
  })
})
