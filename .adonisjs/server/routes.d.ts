import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'garden_designer.search_assets': { paramsTuple?: []; params?: {} }
    'garden_designer.remove_background': { paramsTuple?: []; params?: {} }
    'plants.scan': { paramsTuple?: []; params?: {} }
    'homepage': { paramsTuple?: []; params?: {} }
    'profile': { paramsTuple?: []; params?: {} }
    'profile.settings': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'garden_designer.search_assets': { paramsTuple?: []; params?: {} }
    'homepage': { paramsTuple?: []; params?: {} }
    'profile': { paramsTuple?: []; params?: {} }
    'profile.settings': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'garden_designer.search_assets': { paramsTuple?: []; params?: {} }
    'homepage': { paramsTuple?: []; params?: {} }
    'profile': { paramsTuple?: []; params?: {} }
    'profile.settings': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'garden_designer.remove_background': { paramsTuple?: []; params?: {} }
    'plants.scan': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}