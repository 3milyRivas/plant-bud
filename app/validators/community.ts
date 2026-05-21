import vine from '@vinejs/vine'

const nullableText = (maxLength: number) =>
  vine.string().trim().maxLength(maxLength).optional().nullable()

export const communityPostValidator = vine.compile(
  vine.object({
    body: nullableText(2000),
    hashtags: nullableText(240),
    poll_question: nullableText(160),
    poll_options: nullableText(600),
    visibility: vine.enum(['public', 'followers', 'private']).optional(),
  })
)

export const communityCommentValidator = vine.compile(
  vine.object({
    body: vine.string().trim().minLength(1).maxLength(500),
  })
)
