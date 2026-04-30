/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

/*general views*/
router.on('/').render('pages/welcome').as('home')
router.on('/register').render('pages/register')
router.on('/plants').render('pages/plants').as('plants')

/*clients views*/
router.on('/homepage').render('pages/clients/homepage')
router.on('/nurseries').render('pages/clients/nurseries')
router.on('/profile').render('pages/clients/profile').as('profile')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())
  