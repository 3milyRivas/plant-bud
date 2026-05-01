import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import NewAccountController from '#controllers/new_account_controller'

/* general views */
router.on('/').render('pages/welcome').as('home')
router.on('/register').render('pages/register')
router.on('/plants').render('pages/plants').as('plants')

/* clients views */
router.on('/homepage').render('pages/clients/homepage')
router.on('/nurseries').render('pages/clients/nurseries')
router.on('/profile').render('pages/clients/profile').as('profile')
router.on('/request').render('pages/services/request').as('request')

/* auth (login only) */
router
  .group(() => {
    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

/* logout */
router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())

/* SIGNUP (nuevo sistema) */
router.get('/signup/client', [NewAccountController, 'createClient']).as('signup.client')
router.get('/signup/gardener', [NewAccountController, 'createGardener']).as('signup.gardener')
router.post('/signup', [NewAccountController, 'store']).as('new_account.store')