import AccountProfile from '#models/account_profile'
import GardenProject from '#models/garden_project'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Garden projects', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('projects belong to the account and persist the full designer workflow', async ({
    browserContext,
    visit,
    assert,
  }) => {
    const user = await User.create({
      first_name: 'Project',
      last_name: 'Owner',
      username: 'project.owner',
      email: 'project.owner@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    await AccountProfile.create({
      userId: user.id,
      displayName: 'Project Owner',
      subscriptionPlan: 'premium',
      rewardPoints: 0,
      scannerMonthlyLimit: 5,
    })

    const otherUser = await User.create({
      first_name: 'Other',
      last_name: 'Owner',
      username: 'other.project.owner',
      email: 'other.project.owner@example.com',
      password: 'PlantBud123!',
      role: 'client',
    })
    const otherProject = await GardenProject.create({
      userId: otherUser.id,
      name: 'Private garden',
      description: null,
      stateJson: JSON.stringify({ els: [] }),
      inventoryJson: '[]',
      baseImageName: null,
      itemCount: 0,
    })

    await browserContext.loginAs(user)

    const library = await visit('/designer')
    await library.setViewportSize({ width: 390, height: 844 })
    await library.setExtraHTTPHeaders({ 'sec-ch-ua-mobile': '?1' })
    await library.reload()
    await library.getByRole('heading', { name: 'Garden projects' }).waitFor()
    assert.equal(await library.locator('[data-designer-project-card]').count(), 0)
    assert.equal(
      await library.getByRole('button', { name: 'Create project' }).evaluate(
        (button) => button.ownerDocument.defaultView?.getComputedStyle(button).backgroundColor
      ),
      'rgb(220, 161, 93)'
    )

    await library.getByLabel('Project name').fill('Courtyard retreat')
    await library.getByLabel('Short note').fill('Shade plants and a reading corner')
    await library.getByRole('button', { name: 'Create project' }).click()
    await library.waitForURL(/\/designer\/projects\/\d+$/)
    await library.getByRole('button', { name: 'Upload image' }).waitFor()
    assert.equal(
      await library.getByRole('link', { name: 'Projects' }).evaluate(
        (link) => link.ownerDocument.defaultView?.getComputedStyle(link).backgroundColor
      ),
      'rgb(220, 161, 93)'
    )

    const createdProject = await GardenProject.query().where('userId', user.id).firstOrFail()
    assert.equal(createdProject.name, 'Courtyard retreat')

    const photo = {
      name: 'project-garden.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    }
    await library.locator('#upload').setInputFiles(photo)
    await library.locator('#baseImage').waitFor({ state: 'visible' })

    const assetDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    await library.evaluate((src) => (globalThis as any).loadFromInventory(src), assetDataUrl)
    await library.locator('#canvas-container .draggable').waitFor()
    await library.waitForFunction(() => {
      const status = (globalThis as any).document.querySelector('[data-designer-save-status]')
      return status?.textContent === 'Saved to Plant Bud'
    })

    await createdProject.refresh()
    assert.equal(createdProject.itemCount, 1)
    assert.isNotNull(createdProject.baseImageName)

    await library.goto('/designer')
    await library.getByRole('link', { name: 'Open Courtyard retreat' }).waitFor()
    assert.equal(await library.locator('[data-designer-project-card]').count(), 1)

    await library.getByRole('button', { name: 'Duplicate' }).click()
    await library.waitForURL('/designer')
    assert.equal(
      await GardenProject.query()
        .where('userId', user.id)
        .count('* as total')
        .then((rows) => Number(rows[0].$extras.total)),
      2
    )

    const privateResponse = await library.goto(`/designer/projects/${otherProject.id}`)
    assert.equal(privateResponse?.status(), 404)

    await library.goto('/designer')
    await library.getByRole('button', { name: 'Delete' }).first().click()
    await library.getByRole('heading', { name: 'Delete this garden?' }).waitFor()
    const modalBox = await library.locator('.designer-delete-dialog').boundingBox()
    const viewport = await library.locator('html').evaluate(() => ({
      width: (globalThis as any).innerWidth,
      height: (globalThis as any).innerHeight,
    }))
    assert.isNotNull(modalBox)
    assert.closeTo(modalBox!.x + modalBox!.width / 2, viewport.width / 2, 2)
    assert.closeTo(modalBox!.y + modalBox!.height / 2, viewport.height / 2, 8)
    assert.include(
      await library.locator('[data-designer-delete-project-name]').textContent(),
      'Courtyard retreat'
    )
    assert.equal(
      await library.locator('[data-designer-delete-modal]').getAttribute('aria-hidden'),
      'false'
    )
    await library.getByRole('button', { name: 'Keep project' }).click()
    assert.equal(
      await library.locator('[data-designer-delete-modal]').getAttribute('aria-hidden'),
      'true'
    )
    assert.equal(
      await GardenProject.query()
        .where('userId', user.id)
        .count('* as total')
        .then((rows) => Number(rows[0].$extras.total)),
      2
    )

    await library.getByRole('button', { name: 'Delete' }).first().click()
    await Promise.all([
      library.waitForNavigation(),
      library.getByRole('button', { name: 'Delete permanently' }).click(),
    ])
    assert.equal(
      await GardenProject.query()
        .where('userId', user.id)
        .count('* as total')
        .then((rows) => Number(rows[0].$extras.total)),
      1
    )
    await library.goto('/designer')
    assert.equal(await library.locator('[data-designer-project-card]').count(), 1)
  })
})
