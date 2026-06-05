import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import ornamentalPlants from '#data/ornamentalPlants'
import horticulturalPlants from '#data/horticulturalPlants'
import succulentPlants from '#data/succulentPlants'
import nurseries from '#data/nurseries'

const GardenDesignerController = () => import('#controllers/garden_designers_controller')
const PhoneUploadsController = () => import('#controllers/phone_uploads_controller')
const CommunityController = () => import('#controllers/community_controller')
const HomepagesController = () => import('#controllers/homepages_controller')
const NewAccountController = () => import('#controllers/new_account_controller')
const PlantsController = () => import('#controllers/plants_controller')
const PlantsSearchController = () => import('#controllers/plants_search_controller')
const PlansController = () => import('#controllers/plans_controller')
const ProfilesController = () => import('#controllers/profiles_controller')
const ServicesController = () => import('#controllers/services_controller')

/* general views */
router.on('/').render('pages/welcome').as('home')
router.on('/register').render('pages/register')
router.on('/ornamental').render('pages/ornamental', { ornamentalPlants })
router.on('/horticultural').render('pages/horticultural', { horticulturalPlants })
router.on('/succulent').render('pages/succulent', { succulentPlants })
router.get('/plants/search', [PlantsSearchController, 'search']).as('plants.search')

router
  .get('/requested', [ServicesController, 'requested'])
  .as('services.requested')
  .use(middleware.auth())

router.get('/maintenance', [ServicesController, 'index']).as('maintenance')
router.get('/request/:id', [ServicesController, 'show']).as('request.show')
router
  .post('/request/:id', [ServicesController, 'store'])
  .as('request.store')
  .use(middleware.auth())
router.get('/request', ({ response }) => response.redirect('/maintenance')).as('request')
router.on('/care3').render('pages/client/Plants/care3')
router.on('/care1').render('pages/client/Plants/care1')
router.on('/care2').render('pages/client/Plants/care2')
router.on('/catalog').render('pages/client/Plants/nurcata')
router
  .group(() => {
    router.get('/plans', [PlansController, 'index']).as('plans.index')
    router.post('/plans/premium', [PlansController, 'buyPremium']).as('plans.buy')
    router.post('/plans/cancel', [PlansController, 'cancelPremium']).as('plans.cancel')
    router.get('/designer', [GardenDesignerController, 'show']).as('garden_designer.show')
    router
      .get('/designer/search-assets', [GardenDesignerController, 'searchAssets'])
      .as('garden_designer.search_assets')
    router
      .post('/designer/remove-background', [GardenDesignerController, 'removeBackground'])
      .as('garden_designer.remove_background')
    router.get('/scanner', [PlantsController, 'showScanner']).as('scanner.show')
    router.post('/plants/scan', [PlantsController, 'scan']).as('plants.scan')
    router
      .post('/scanner/scans/:id/delete', [PlantsController, 'deleteScan'])
      .as('scanner.scans.delete')
  })
  .use(middleware.auth())
router.post('/phone-upload/sessions', [PhoneUploadsController, 'create']).as('phone_uploads.create')
router
  .get('/phone-upload/sessions/:token', [PhoneUploadsController, 'status'])
  .as('phone_uploads.status')
router
  .get('/phone-upload/sessions/:token/image', [PhoneUploadsController, 'image'])
  .as('phone_uploads.image')
router.get('/phone-upload/:token', [PhoneUploadsController, 'show']).as('phone_uploads.show')
router.post('/phone-upload/:token', [PhoneUploadsController, 'upload']).as('phone_uploads.upload')
router
  .get('/profile/media/:userId/:kind/:fileName', [ProfilesController, 'media'])
  .as('profile.media.public')
/* clients views */
/*router
  .group(() => {
    router.on('/homepage').render('pages/client/homepage')
    router.on('/nurseries').render('pages/client/nurseries')
  })
  .use([middleware.auth(), middleware.role(['client'])])*/
router
  .group(() => {
    router.get('/homepage', [HomepagesController, 'index']).as('homepage')
    router.get('/community', [CommunityController, 'index']).as('community.index')
    router.post('/community/posts', [CommunityController, 'store']).as('community.posts.store')
    router
      .post('/community/posts/:id/delete', [CommunityController, 'destroy'])
      .as('community.posts.destroy')
    router
      .post('/community/posts/:id/reactions/:type', [CommunityController, 'toggleReaction'])
      .as('community.posts.reactions.toggle')
    router
      .post('/community/posts/:id/comments', [CommunityController, 'comment'])
      .as('community.posts.comments.store')
    router
      .post('/community/polls/:pollId/options/:optionId/vote', [CommunityController, 'votePoll'])
      .as('community.polls.vote')
    router
      .get('/community/search/suggestions', [CommunityController, 'searchSuggestions'])
      .as('community.search.suggestions')
    router.get('/community/search', [CommunityController, 'search']).as('community.search')
    router
      .get('/community/hashtags/:tag', [CommunityController, 'hashtag'])
      .as('community.hashtags.show')
    router
      .get('/community/media/:userId/:fileName', [CommunityController, 'media'])
      .as('community.media')
    router.get('/favorites', [CommunityController, 'favorites']).as('community.favorites')
    router
      .get('/notification', [CommunityController, 'notifications'])
      .as('community.notifications')
    router.get('/users/:username', [CommunityController, 'showUser']).as('community.users.show')
    router
      .post('/users/:username/follow', [CommunityController, 'toggleFollow'])
      .as('community.users.follow')
    router
      .post('/users/:username/favorite', [CommunityController, 'toggleFavoriteAccount'])
      .as('community.users.favorite')
    router
      .post('/users/:username/reviews', [CommunityController, 'storeReview'])
      .as('community.users.reviews.store')
    router.get('/profile', [ProfilesController, 'show']).as('profile')
    router.get('/profile/settings', [ProfilesController, 'settings']).as('profile.settings')
    router.get('/profile/media/:kind/:fileName', [ProfilesController, 'media']).as('profile.media')
    router.post('/profile', [ProfilesController, 'update']).as('profile.update')
  })
  .use(middleware.auth())

router.on('/nurseries').render('pages/client/nurseries', { nurseries })
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
    router.get('/signup/client', [NewAccountController, 'createClient']).as('signup.client')
    router.get('/signup/gardener', [NewAccountController, 'createGardener']).as('signup.gardener')
    router.get('/signup/nursery', [NewAccountController, 'createNursery']).as('signup.nursery')
    router.post('/signup', [NewAccountController, 'store']).as('new_account.store')
    router
      .post('/demo/guest', [NewAccountController, 'createDemoGuest'])
      .as('new_account.demo_guest')
  })
  .use(middleware.guest())

/* logout */
router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy']).as('session.destroy')
  })
  .use(middleware.auth())
