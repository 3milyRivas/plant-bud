import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import ornamentalPlants from '#data/ornamentalPlants'
const GardenDesignerController = () => import('#controllers/garden_designers_controller')
const NewAccountController = () => import('#controllers/new_account_controller')
const PlantsController = () => import('#controllers/plants_controller')

/* general views */
router.on('/').render('pages/welcome').as('home')
router.on('/register').render('pages/register')
router.on('/araceae').render('pages/araceae', { ornamentalPlants })
router.on('/amaryllidaceae').render('pages/amaryllidaceae')

router.on('/homepage2').render('pages/client/homepage2')

router.on('/community').render('pages/community')
router.on('/favorites').render('pages/favorites')
router.on('/notification').render('pages/notification')
router.on('/requested').render('pages/requested')

router.on('/profile').render('pages/client/profile').as('profile')
router.on('/maintenance').render('pages/services/maintenance').as('maintenance')
router.on('/request').render('pages/services/request').as('request')
router.on('/care3').render('pages/client/Plants/care3')
router.on('/care1').render('pages/client/Plants/care1')
router.on('/care2').render('pages/client/Plants/care2')
router.on('/designer').render('pages/garden/designer')
router
  .get('/designer/search-assets', [GardenDesignerController, 'searchAssets'])
  .as('garden_designer.search_assets')
router
  .post('/designer/remove-background', [GardenDesignerController, 'removeBackground'])
  .as('garden_designer.remove_background')
router.on('/scanner').render('pages/scanner/scanner')
router.post('/plants/scan', [PlantsController, 'scan']).as('plants.scan')
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
    router.get('login', [controllers.Session, 'create']).as('session.create')
    router.post('login', [controllers.Session, 'store']).as('session.store')
  })
  .use(middleware.guest())

/* logout */
router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy']).as('session.destroy')
  })
  .use(middleware.auth())

router.get('/signup/client', [NewAccountController, 'createClient']).as('signup.client')
router.get('/signup/gardener', [NewAccountController, 'createGardener']).as('signup.gardener')
router.get('/signup/nursery', [NewAccountController, 'createNursery']).as('signup.nursery')
router.post('/signup', [NewAccountController, 'store']).as('new_account.store')


