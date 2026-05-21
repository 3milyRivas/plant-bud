import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import ornamentalPlants from '#data/ornamental_plants'
import horticulturalPlants from '#data/horticulturalPlants'
import succulentPlants from '#data/succulentPlants'
import nurseries from '#data/nurseries'

const GardenDesignerController = () => import('#controllers/garden_designers_controller')
const CommunityController = () => import('#controllers/community_controller')
const HomepagesController = () => import('#controllers/homepages_controller')
const NewAccountController = () => import('#controllers/new_account_controller')
const PlantsController = () => import('#controllers/plants_controller')
const ProfilesController = () => import('#controllers/profiles_controller')

/* general views */
router.on('/').render('pages/welcome').as('home')
router.on('/register').render('pages/register')
router.on('/araceae').render('pages/araceae', { ornamentalPlants })
router.on('/amaryllidaceae').render('pages/amaryllidaceae', { horticulturalPlants })
router.on('/cactaceae').render('pages/cactaceae', { succulentPlants })

router.on('/requested').render('pages/requested')

router.on('/maintenance').render('pages/services/maintenance').as('maintenance')
router.on('/request').render('pages/services/request').as('request')
router.on('/care3').render('pages/client/Plants/care3')
router.on('/care1').render('pages/client/Plants/care1')
router.on('/care2').render('pages/client/Plants/care2')
router.on('/catalog').render('pages/client/Plants/nurcata')
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
router
  .group(() => {
    router.get('/homepage', [HomepagesController, 'index']).as('homepage')
    router.get('/community', [CommunityController, 'index']).as('community.index')
    router.post('/community/posts', [CommunityController, 'store']).as('community.posts.store')
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
      .post('/users/:username/reviews', [CommunityController, 'storeReview'])
      .as('community.users.reviews.store')
    router.get('/profile', [ProfilesController, 'show']).as('profile')
    router.get('/profile/settings', [ProfilesController, 'settings']).as('profile.settings')
    router
      .get('/profile/media/:userId/:kind/:fileName', [ProfilesController, 'media'])
      .as('profile.media.owner')
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
  })
  .use(middleware.guest())

/* logout */
router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy']).as('session.destroy')
  })
  .use(middleware.auth())
