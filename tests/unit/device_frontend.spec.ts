import { detectDeviceFrontend, resolvePageTemplate } from '#services/device_frontend'
import { test } from '@japa/runner'

test.group('Device frontend selection', () => {
  test('uses PC for desktop and laptop browsers', ({ assert }) => {
    assert.equal(
      detectDeviceFrontend({
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0 Safari/537.36',
        'sec-ch-ua-mobile': '?0',
      }),
      'PC'
    )
  })

  test('uses Phone for smartphones', ({ assert }) => {
    assert.equal(
      detectDeviceFrontend({
        'user-agent':
          'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/136.0 Mobile Safari/537.36',
      }),
      'Phone'
    )
  })

  test('uses Phone for Android tablets and iPads', ({ assert }) => {
    assert.equal(
      detectDeviceFrontend({
        'user-agent':
          'Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 Chrome/136.0 Safari/537.36',
      }),
      'Phone'
    )
    assert.equal(
      detectDeviceFrontend({
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      }),
      'Phone'
    )
  })

  test('prefers the browser mobile client hint when available', ({ assert }) => {
    assert.equal(
      detectDeviceFrontend({
        'user-agent': 'Custom Browser',
        'sec-ch-ua-mobile': '?1',
      }),
      'Phone'
    )
  })

  test('routes only page templates to the selected frontend', ({ assert }) => {
    assert.equal(resolvePageTemplate('pages/welcome', 'PC'), 'pages/PC/welcome')
    assert.equal(resolvePageTemplate('pages/welcome', 'Phone'), 'pages/Phone/welcome')
    assert.equal(resolvePageTemplate('components/app-navbar', 'Phone'), 'components/app-navbar')
    assert.equal(resolvePageTemplate('pages/PC/welcome', 'Phone'), 'pages/PC/welcome')
  })
})
