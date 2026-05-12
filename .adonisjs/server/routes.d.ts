import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'profile': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'profile': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'profile': { paramsTuple?: []; params?: {} }
    'maintenance': { paramsTuple?: []; params?: {} }
    'request': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'signup.client': { paramsTuple?: []; params?: {} }
    'signup.gardener': { paramsTuple?: []; params?: {} }
    'signup.nursery': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}