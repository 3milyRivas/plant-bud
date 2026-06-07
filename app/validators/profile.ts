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
    headline: nullableText(100),
    service_area: nullableText(120),
    availability_schedule: nullableText(500),
    services_offered: nullableText(1200),
    payment_methods: nullableText(600),
    payout_paypal_email: vine.string().trim().email().maxLength(254).optional().nullable(),
    payout_cardholder_name: nullableText(100),
    payout_card_number: nullableText(23),
    payout_card_configured: nullableText(5),
    public_phone: nullableText(20),
    public_email: vine.string().trim().email().maxLength(254).optional().nullable(),
    address: nullableText(255),
    city: nullableText(120),
    latitude: vine.number().min(-90).max(90).optional().nullable(),
    longitude: vine.number().min(-180).max(180).optional().nullable(),
    opening_hours: nullableText(255),
    is_available: nullableText(5),
    is_active: nullableText(5),
  })
)
