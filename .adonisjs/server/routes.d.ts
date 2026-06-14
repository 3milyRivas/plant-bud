import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'new_account.demo_guest': { paramsTuple?: []; params?: {} }
    'register': { paramsTuple?: []; params?: {} }
    'plants.search': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'homepage': { paramsTuple?: []; params?: {} }
    'plans.index': { paramsTuple?: []; params?: {} }
    'plans.buy': { paramsTuple?: []; params?: {} }
    'plans.cancel': { paramsTuple?: []; params?: {} }
    'garden_designer.show': { paramsTuple?: []; params?: {} }
    'garden_designer.search_assets': { paramsTuple?: []; params?: {} }
    'garden_designer.remove_background': { paramsTuple?: []; params?: {} }
    'scanner.show': { paramsTuple?: []; params?: {} }
    'plants.scan': { paramsTuple?: []; params?: {} }
    'scanner.scans.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'community.index': { paramsTuple?: []; params?: {} }
    'community.posts.store': { paramsTuple?: []; params?: {} }
    'community.posts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'community.posts.reactions.toggle': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'type': ParamValue} }
    'community.posts.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'community.polls.vote': { paramsTuple: [ParamValue,ParamValue]; params: {'pollId': ParamValue,'optionId': ParamValue} }
    'community.search.suggestions': { paramsTuple?: []; params?: {} }
    'community.search': { paramsTuple?: []; params?: {} }
    'community.hashtags.show': { paramsTuple: [ParamValue]; params: {'tag': ParamValue} }
    'community.media': { paramsTuple: [ParamValue,ParamValue]; params: {'userId': ParamValue,'fileName': ParamValue} }
    'community.favorites': { paramsTuple?: []; params?: {} }
    'community.notifications': { paramsTuple?: []; params?: {} }
    'community.notifications.clear': { paramsTuple?: []; params?: {} }
    'community.users.show': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'community.users.follow': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'community.users.favorite': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'community.users.reviews.store': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile': { paramsTuple?: []; params?: {} }
    'profile.settings': { paramsTuple?: []; params?: {} }
    'profile.media': { paramsTuple: [ParamValue,ParamValue]; params: {'kind': ParamValue,'fileName': ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.availability': { paramsTuple?: []; params?: {} }
    'nursery_catalog.categories.store': { paramsTuple?: []; params?: {} }
    'nursery_catalog.categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nursery_catalog.products.store': { paramsTuple?: []; params?: {} }
    'nursery_catalog.products.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nursery_catalog.products.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'services.requested': { paramsTuple?: []; params?: {} }
    'gardener.dashboard': { paramsTuple?: []; params?: {} }
    'services.requests.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'services.requests.dismiss': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'maintenance.suggestions': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'request.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nurseries.index': { paramsTuple?: []; params?: {} }
    'nurseries.suggestions': { paramsTuple?: []; params?: {} }
    'profile.media.public': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'userId': ParamValue,'kind': ParamValue,'fileName': ParamValue} }
    'nursery_catalog.media': { paramsTuple: [ParamValue,ParamValue]; params: {'userId': ParamValue,'fileName': ParamValue} }
    'admin.index': { paramsTuple?: []; params?: {} }
    'admin.users.create': { paramsTuple?: []; params?: {} }
    'admin.users.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.posts.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'request.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'phone_uploads.create': { paramsTuple?: []; params?: {} }
    'phone_uploads.status': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.image': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.upload': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
    'register': { paramsTuple?: []; params?: {} }
    'plants.search': { paramsTuple?: []; params?: {} }
    'homepage': { paramsTuple?: []; params?: {} }
    'plans.index': { paramsTuple?: []; params?: {} }
    'garden_designer.show': { paramsTuple?: []; params?: {} }
    'garden_designer.search_assets': { paramsTuple?: []; params?: {} }
    'scanner.show': { paramsTuple?: []; params?: {} }
    'community.index': { paramsTuple?: []; params?: {} }
    'community.search.suggestions': { paramsTuple?: []; params?: {} }
    'community.search': { paramsTuple?: []; params?: {} }
    'community.hashtags.show': { paramsTuple: [ParamValue]; params: {'tag': ParamValue} }
    'community.media': { paramsTuple: [ParamValue,ParamValue]; params: {'userId': ParamValue,'fileName': ParamValue} }
    'community.favorites': { paramsTuple?: []; params?: {} }
    'community.notifications': { paramsTuple?: []; params?: {} }
    'community.users.show': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile': { paramsTuple?: []; params?: {} }
    'profile.settings': { paramsTuple?: []; params?: {} }
    'profile.media': { paramsTuple: [ParamValue,ParamValue]; params: {'kind': ParamValue,'fileName': ParamValue} }
    'services.requested': { paramsTuple?: []; params?: {} }
    'gardener.dashboard': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'maintenance.suggestions': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'request.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nurseries.index': { paramsTuple?: []; params?: {} }
    'nurseries.suggestions': { paramsTuple?: []; params?: {} }
    'profile.media.public': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'userId': ParamValue,'kind': ParamValue,'fileName': ParamValue} }
    'nursery_catalog.media': { paramsTuple: [ParamValue,ParamValue]; params: {'userId': ParamValue,'fileName': ParamValue} }
    'admin.index': { paramsTuple?: []; params?: {} }
    'phone_uploads.status': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.image': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
    'register': { paramsTuple?: []; params?: {} }
    'plants.search': { paramsTuple?: []; params?: {} }
    'homepage': { paramsTuple?: []; params?: {} }
    'plans.index': { paramsTuple?: []; params?: {} }
    'garden_designer.show': { paramsTuple?: []; params?: {} }
    'garden_designer.search_assets': { paramsTuple?: []; params?: {} }
    'scanner.show': { paramsTuple?: []; params?: {} }
    'community.index': { paramsTuple?: []; params?: {} }
    'community.search.suggestions': { paramsTuple?: []; params?: {} }
    'community.search': { paramsTuple?: []; params?: {} }
    'community.hashtags.show': { paramsTuple: [ParamValue]; params: {'tag': ParamValue} }
    'community.media': { paramsTuple: [ParamValue,ParamValue]; params: {'userId': ParamValue,'fileName': ParamValue} }
    'community.favorites': { paramsTuple?: []; params?: {} }
    'community.notifications': { paramsTuple?: []; params?: {} }
    'community.users.show': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile': { paramsTuple?: []; params?: {} }
    'profile.settings': { paramsTuple?: []; params?: {} }
    'profile.media': { paramsTuple: [ParamValue,ParamValue]; params: {'kind': ParamValue,'fileName': ParamValue} }
    'services.requested': { paramsTuple?: []; params?: {} }
    'gardener.dashboard': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'maintenance.suggestions': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'request.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nurseries.index': { paramsTuple?: []; params?: {} }
    'nurseries.suggestions': { paramsTuple?: []; params?: {} }
    'profile.media.public': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'userId': ParamValue,'kind': ParamValue,'fileName': ParamValue} }
    'nursery_catalog.media': { paramsTuple: [ParamValue,ParamValue]; params: {'userId': ParamValue,'fileName': ParamValue} }
    'admin.index': { paramsTuple?: []; params?: {} }
    'phone_uploads.status': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.image': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'phone_uploads.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
  POST: {
    'session.store': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'new_account.demo_guest': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'plans.buy': { paramsTuple?: []; params?: {} }
    'plans.cancel': { paramsTuple?: []; params?: {} }
    'garden_designer.remove_background': { paramsTuple?: []; params?: {} }
    'plants.scan': { paramsTuple?: []; params?: {} }
    'scanner.scans.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'community.posts.store': { paramsTuple?: []; params?: {} }
    'community.posts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'community.posts.reactions.toggle': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'type': ParamValue} }
    'community.posts.comments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'community.polls.vote': { paramsTuple: [ParamValue,ParamValue]; params: {'pollId': ParamValue,'optionId': ParamValue} }
    'community.notifications.clear': { paramsTuple?: []; params?: {} }
    'community.users.follow': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'community.users.favorite': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'community.users.reviews.store': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.availability': { paramsTuple?: []; params?: {} }
    'nursery_catalog.categories.store': { paramsTuple?: []; params?: {} }
    'nursery_catalog.categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nursery_catalog.products.store': { paramsTuple?: []; params?: {} }
    'nursery_catalog.products.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'nursery_catalog.products.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'services.requests.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'services.requests.dismiss': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.create': { paramsTuple?: []; params?: {} }
    'admin.users.access': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.posts.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'request.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'phone_uploads.create': { paramsTuple?: []; params?: {} }
    'phone_uploads.upload': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}