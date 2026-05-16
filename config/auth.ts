import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'
import type { InferAuthenticators } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  default: 'web',

  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
  },
})

declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}

export default authConfig
