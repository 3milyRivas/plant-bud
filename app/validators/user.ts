import vine from '@vinejs/vine'

const usernamePattern = /^(?!.*\.\.)(?!.*\.$)[a-z0-9][a-z0-9._]{2,29}$/

export const signupValidator = vine.compile(
  vine.object({
    username: vine
      .string()
      .trim()
      .toLowerCase()
      .minLength(3)
      .maxLength(30)
      .regex(usernamePattern)
      .optional(),

    display_name: vine.string().trim().minLength(2).maxLength(100).optional(),

    first_name: vine.string().trim().minLength(2).maxLength(50).optional(),

    last_name: vine.string().trim().minLength(2).maxLength(50).optional(),

    nursery_name: vine.string().trim().minLength(3).maxLength(30).optional(),

    owner_name: vine.string().trim().minLength(2).maxLength(100).optional(),

    email: vine.string().trim().email(),

    phone: vine.string().trim().maxLength(20).optional().nullable(),

    dui: vine.string().trim().maxLength(20).optional().nullable(),

    owner_dui: vine.string().trim().maxLength(20).optional().nullable(),

    password: vine.string().minLength(8).maxLength(32).confirmed({
      confirmationField: 'passwordConfirmation',
    }),

    role: vine.enum(['client', 'gardener', 'nursery']),
  })
)
