import horticulturalPlants from '#data/horticulturalPlants'
import ornamentalPlants from '#data/ornamentalPlants'
import succulentPlants from '#data/succulentPlants'
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const CommunityController = () => import('#controllers/community_controller')
const GardenDesignerController = () => import('#controllers/garden_designers_controller')
const GardenerDashboardController = () => import('#controllers/gardener_dashboard_controller')
const HomepagesController = () => import('#controllers/homepages_controller')
const NewAccountController = () => import('#controllers/new_account_controller')
const NurseriesController = () => import('#controllers/nurseries_controller')
const NurseryCatalogController = () => import('#controllers/nursery_catalog_controller')
const PhoneUploadsController = () => import('#controllers/phone_uploads_controller')
const PlansController = () => import('#controllers/plans_controller')
const PlantsController = () => import('#controllers/plants_controller')
const PlantsSearchController = () => import('#controllers/plants_search_controller')
const ProfilesController = () => import('#controllers/profiles_controller')
const ServicesController = () => import('#controllers/services_controller')
const SessionController = () => import('#controllers/session_controller')
const AdminController = () => import('#controllers/admin_controller')

router.on('/').render('pages/welcome').as('home')

router
  .group(() => {
    router.get('/login', [SessionController, 'create']).as('session.create')
    router.post('/login', [SessionController, 'store']).as('session.store')
    router.on('/register').render('pages/register').as('register')
    router.get('/signup/client', [NewAccountController, 'createClient']).as('signup.client')
    router.get('/signup/gardener', [NewAccountController, 'createGardener']).as('signup.gardener')
    router.get('/signup/nursery', [NewAccountController, 'createNursery']).as('signup.nursery')
    router.post('/signup', [NewAccountController, 'store']).as('new_account.store')
    router
      .post('/demo/guest', [NewAccountController, 'createDemoGuest'])
      .as('new_account.demo_guest')
  })
  .use(middleware.guest())

router
  .group(() => {
    router.on('/ornamental').render('pages/ornamental', { ornamentalPlants })
    router.on('/horticultural').render('pages/horticultural', { horticulturalPlants })
    router.on('/succulent').render('pages/succulent', { succulentPlants })
    router.get('/plants/search', [PlantsSearchController, 'search']).as('plants.search')
    router.on('/care1').render('pages/client/Plants/care1')
    router.on('/care2').render('pages/client/Plants/care2')
    router.on('/care3').render('pages/client/Plants/care3')

    router.post('/logout', [SessionController, 'destroy']).as('session.destroy')
    router.get('/homepage', [HomepagesController, 'index']).as('homepage')

    router.get('/plans', [PlansController, 'index']).as('plans.index')
    router.post('/plans/premium', [PlansController, 'buyPremium']).as('plans.buy')
    router.post('/plans/cancel', [PlansController, 'cancelPremium']).as('plans.cancel')

    router.get('/designer', [GardenDesignerController, 'index']).as('garden_designer.index')
    router
      .post('/designer/projects', [GardenDesignerController, 'store'])
      .as('garden_designer.projects.store')
    router
      .get('/designer/projects/:id', [GardenDesignerController, 'show'])
      .as('garden_designer.projects.show')
    router
      .patch('/designer/projects/:id', [GardenDesignerController, 'update'])
      .as('garden_designer.projects.update')
    router
      .post('/designer/projects/:id/image', [GardenDesignerController, 'storeImage'])
      .as('garden_designer.projects.image')
    router
      .post('/designer/projects/:id/duplicate', [GardenDesignerController, 'duplicate'])
      .as('garden_designer.projects.duplicate')
    router
      .post('/designer/projects/:id/delete', [GardenDesignerController, 'destroy'])
      .as('garden_designer.projects.destroy')
    router
      .get('/designer/projects/:id/media', [GardenDesignerController, 'media'])
      .as('garden_designer.projects.media')
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
    router
      .post('/notification/clear', [CommunityController, 'clearNotifications'])
      .as('community.notifications.clear')
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
    router
      .post('/profile/availability', [ProfilesController, 'updateAvailability'])
      .as('profile.availability')
      .use(middleware.role(['gardener']))

    router
      .group(() => {
        router
          .post('/profile/catalog/categories', [NurseryCatalogController, 'storeCategory'])
          .as('nursery_catalog.categories.store')
        router
          .post('/profile/catalog/categories/:id/delete', [
            NurseryCatalogController,
            'destroyCategory',
          ])
          .as('nursery_catalog.categories.destroy')
        router
          .post('/profile/catalog/products', [NurseryCatalogController, 'storeProduct'])
          .as('nursery_catalog.products.store')
        router
          .post('/profile/catalog/products/:id', [NurseryCatalogController, 'updateProduct'])
          .as('nursery_catalog.products.update')
        router
          .post('/profile/catalog/products/:id/delete', [
            NurseryCatalogController,
            'destroyProduct',
          ])
          .as('nursery_catalog.products.destroy')
      })
      .use(middleware.role(['nursery']))

    router.get('/requested', [ServicesController, 'requested']).as('services.requested')
    router
      .get('/gardener/dashboard', [GardenerDashboardController, 'index'])
      .as('gardener.dashboard')
      .use(middleware.role(['gardener']))
    router
      .post('/requested/:id/action', [ServicesController, 'updateRequest'])
      .as('services.requests.update')
    router
      .post('/requested/:id/delete', [ServicesController, 'dismissCompletedRequest'])
      .as('services.requests.dismiss')

    router.get('/maintenance', [ServicesController, 'index']).as('maintenance')
    router
      .get('/maintenance/suggestions', [ServicesController, 'suggestions'])
      .as('maintenance.suggestions')
    router.get('/request', ({ response }) => response.redirect('/maintenance')).as('request')
    router.get('/request/:id', [ServicesController, 'show']).as('request.show')

    router.get('/nurseries', [NurseriesController, 'index']).as('nurseries.index')
    router
      .get('/nurseries/suggestions', [NurseriesController, 'suggestions'])
      .as('nurseries.suggestions')

    router
      .get('/profile/media/:userId/:kind/:fileName', [ProfilesController, 'media'])
      .as('profile.media.public')
    router
      .get('/nursery-catalog/media/:userId/:fileName', [NurseryCatalogController, 'media'])
      .as('nursery_catalog.media')
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/admin', [AdminController, 'index']).as('admin.index')
    router.post('/admin/users', [AdminController, 'createUser']).as('admin.users.create')
    router
      .post('/admin/users/:id/access', [AdminController, 'updateAccess'])
      .as('admin.users.access')
    router.post('/admin/users/:id/delete', [AdminController, 'deleteUser']).as('admin.users.delete')
    router.post('/admin/posts/:id/delete', [AdminController, 'deletePost']).as('admin.posts.delete')
  })
  .use([middleware.auth(), middleware.admin()])

router
  .post('/request/:id', [ServicesController, 'store'])
  .as('request.store')
  .use([middleware.auth(), middleware.role(['client'])])

router.post('/phone-upload/sessions', [PhoneUploadsController, 'create']).as('phone_uploads.create')
router
  .get('/phone-upload/sessions/:token', [PhoneUploadsController, 'status'])
  .as('phone_uploads.status')
router
  .get('/phone-upload/sessions/:token/image', [PhoneUploadsController, 'image'])
  .as('phone_uploads.image')
router.get('/phone-upload/:token', [PhoneUploadsController, 'show']).as('phone_uploads.show')
router.post('/phone-upload/:token', [PhoneUploadsController, 'upload']).as('phone_uploads.upload')
