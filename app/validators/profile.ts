import vine from '@vinejs/vine'

const nullableText = (maxLength: number) =>
  vine.string().trim().maxLength(maxLength).optional().nullable()

export const profileValidator = vine.compile(
  vine.object({
    display_name: vine.string().trim().minLength(2).maxLength(100),
    bio: nullableText(500),
    location: nullableText(120),
    phone: nullableText(20),
    instagram_handle: nullableText(120),
    tiktok_handle: nullableText(120),
    facebook_handle: nullableText(120),
  })
)
