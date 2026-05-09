import vine from '@vinejs/vine'

export const signupValidator = vine.compile(
  vine.object({
    username: vine
      .string()
      .trim()
      .toLowerCase()
      .minLength(3)
      .maxLength(30)
      .regex(/^[a-z0-9_]+$/),

    first_name: vine.string().trim().minLength(2).maxLength(50),

    last_name: vine.string().trim().minLength(2).maxLength(50),

    email: vine.string().email(),

    phone: vine
      .string()
      .regex(/^[0-9]{4}-[0-9]{4}$/)
      .optional()
      .nullable(),

    dui: vine
      .string()
      .regex(/^\d{8}-\d$/)
      .optional()
      .nullable(),

    password: vine.string().minLength(8).maxLength(32).confirmed({
      confirmationField: 'passwordConfirmation',
    }),

    role: vine.enum(['client', 'gardener']),
  })
)