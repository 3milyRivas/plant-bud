import { defineConfig } from '@adonisjs/auth'
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'

const authConfig = defineConfig({
  default: 'web',

  guards: {
    web: sessionGuard({
      provider: sessionUserProvider({
        model: () => import('#models/user'),

        uids: ['email'],
      }),
    }),
  },
})

export default authConfig