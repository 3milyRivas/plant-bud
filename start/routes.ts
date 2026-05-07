import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import NewAccountController from '#controllers/new_account_controller'

/* general views */
router.on('/').render('pages/welcome').as('home')
router.on('/register').render('pages/register')
router.on('/amaryllidaceae').render('pages/amaryllidaceae')
router.on('/brassicaceae').render('pages/brassicaceae')
router.on('/apiaceae').render('pages/apiaceae')
router.on('/cucurbitaceae').render('pages/cucurbitaceae')
router.on('/solanaceae').render('pages/solanaceae')
router.on('/araceae').render('pages/araceae')
router.on('/community').render('pages/community')

router.on('/profile').render('pages/client/profile').as('profile')
router.on('/maintenance').render('pages/services/maintenance').as('maintenance')
router.on('/request').render('pages/services/request').as('request')
router.on('/care').render('pages/client/Plants/careo')

/* clients views */
/*router
  .group(() => {
    router.on('/homepage').render('pages/client/homepage')
    router.on('/nurseries').render('pages/client/nurseries')
  })
  .use([middleware.auth(), middleware.role(['client'])])*/
router.on('/homepage').render('pages/client/homepage')
router.on('/nurseries').render('pages/client/nurseries')
/* gardeners views */
router
  .group(() => {
    router.on('/gardener/dashboard').render('pages/gardener/dashboard')
  })
  .use([middleware.auth(), middleware.role(['gardener'])])

/* auth (login only)
router
  .group(() => {
    router.on('/profile').render('pages/client/profile').as('profile')
  })
  .use([middleware.auth()])*/

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

router.get('/signup/client', [NewAccountController, 'createClient']).as('signup.client')
router.get('/signup/gardener', [NewAccountController, 'createGardener']).as('signup.gardener')
router.post('/signup', [NewAccountController, 'store']).as('new_account.store')
