import type AccountProfile from '#models/account_profile'
import type CommunityPost from '#models/community_post'
import type GardenerProfile from '#models/gardener_profile'
import type NurseryProfile from '#models/nursery_profile'
import type PostPollOption from '#models/post_poll_option'
import type User from '#models/user'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import axios from 'axios'
import https from 'node:https'
import { DateTime } from 'luxon'

type BotRole = 'client' | 'gardener' | 'nursery'
type SocialLinks = Partial<Record<'instagram' | 'tiktok' | 'facebook', string>>
type DemoPost = {
  body: string
  hashtags: string[]
  imageQuery?: string
  poll?: {
    question: string
    options: string[]
  }
}
type GardenerDetails = {
  headline: string
  serviceArea: string
  availabilitySchedule: string
  servicesOffered: string
  paymentMethods: string
  experienceYears: number
  hourlyRate: number
  services: Array<{
    name: string
    description: string
    basePrice: number
    durationMinutes: number
  }>
}
type NurseryDetails = {
  nurseryName: string
  nurserySlug: string
  ownerName: string
  description: string
  address: string
  city: string
  latitude: number
  longitude: number
  openingHours: string
  servicesOffered: string
  paymentMethods: string
  categories: string[]
  products: Array<{
    name: string
    category: string
    description: string
    price: number
    stock: number
    imageQuery: string
  }>
}
type BotPersona = {
  key: string
  role: BotRole
  displayName: string
  username: string
  email: string
  phone: string | null
  dui: string | null
  location: string
  bio: string
  avatarQuery: string
  bannerQuery: string
  social: SocialLinks
  posts: DemoPost[]
  gardener?: GardenerDetails
  nursery?: NurseryDetails
}
type SeededPersona = BotPersona & {
  avatarUrl: string
  bannerUrl: string
  postImages: Array<string | null>
  productImages: string[]
}
type SeededUser = {
  persona: SeededPersona
  user: User
  accountProfile: AccountProfile
  gardenerProfile?: GardenerProfile
  nurseryProfile?: NurseryProfile
}
type LoadedModels = Awaited<ReturnType<typeof loadModels>>

const botEmailDomain = 'bot.plantbud.test'
const defaultBotPassword = 'PlantBudDemo123!'
const fallbackAvatars: Record<BotRole, string[]> = {
  client: [
    '/resources/images/services/profile2.png',
    '/resources/images/services/profile3.png',
    '/resources/images/services/profile4.png',
    '/resources/images/services/profile5.png',
    '/resources/images/services/profile6.png',
  ],
  gardener: [
    '/resources/images/services/Ana-Isabel.png',
    '/resources/images/services/profile7.png',
    '/resources/images/services/profile8.png',
    '/resources/images/services/profile4.png',
  ],
  nursery: [
    '/resources/images/homepage/nurseries/nursery1.png',
    '/resources/images/homepage/nurseries/nursery2.png',
    '/resources/images/homepage/nurseries/nursery3.png',
    '/resources/images/homepage/nurseries/nursery4.png',
  ],
}
const fallbackBanners: Record<BotRole, string[]> = {
  client: [
    '/resources/images/care/swisss.jpg',
    '/resources/images/care/pothoss.jpg',
    '/resources/images/care/jade.jpg',
    '/resources/images/homepagee/plant-6.png',
  ],
  gardener: [
    '/resources/images/homepagee/gardener-header.jpg',
    '/resources/images/homepagee/jardines.jpg',
    '/resources/images/services/gardener-card.jpg',
  ],
  nursery: [
    '/resources/images/homepagee/nursery-header.jpg',
    '/resources/images/homepagee/nursery-photo.jpg',
    '/resources/images/homepage/nurseries/vivero1.jpg',
  ],
}
const fallbackPostImages = [
  '/resources/images/care/pothoss.jpg',
  '/resources/images/care/aloe.jpg',
  '/resources/images/care/succ-1.jpg',
  '/resources/images/care/swisss.jpg',
  '/resources/images/care/snake.jpg',
  '/resources/images/homepagee/nursery-photo.jpg',
  '/resources/images/homepagee/jardines.jpg',
  '/resources/images/care/or4.jpg',
]
const fallbackProductImages = [
  '/resources/images/homepagee/plant-1.png',
  '/resources/images/homepagee/plant-2.png',
  '/resources/images/homepagee/plant-3.png',
  '/resources/images/homepagee/plant-4.png',
  '/resources/images/homepagee/succulents.png',
  '/resources/images/homepagee/tulip.png',
]
const commentBank = [
  'This looks really healthy. Saving it for later.',
  'Nice update. The setup feels easy to replicate.',
  'I would love to see the next progress photo.',
  'That tip helped me with a similar plant last week.',
  'Great timing. I was looking for ideas like this.',
  'The soil mix detail is super useful.',
]
const reviewBank = [
  'Clear communication and very careful plant advice.',
  'Reliable, friendly, and the result felt professional.',
  'The recommendations were practical and easy to follow.',
  'Great service quality. I would book again.',
]

const botPersonas: BotPersona[] = [
  {
    key: 'sofia',
    role: 'client',
    displayName: 'Sofia Martinez',
    username: 'pb.sofia',
    email: `pb.sofia@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'San Salvador',
    bio: 'Apartment plant parent testing low-light corners, balcony herbs, and simple care routines.',
    avatarQuery: 'woman portrait houseplants',
    bannerQuery: 'indoor plants shelf',
    social: { instagram: 'sofiaplantdiary', tiktok: 'sofiagrows' },
    posts: [
      {
        body: 'Moved my pothos closer to indirect light and the new leaves finally opened. Small setup, big difference.',
        hashtags: ['pothos', 'plantcare', 'indoorplants'],
        imageQuery: 'pothos plant shelf',
      },
      {
        body: 'Trying to pick the next balcony project for the weekend.',
        hashtags: ['balconygarden', 'weekendplants'],
        poll: {
          question: 'What should I grow next?',
          options: ['Herbs', 'Succulents', 'Flowers'],
        },
      },
    ],
  },
  {
    key: 'diego',
    role: 'client',
    displayName: 'Diego Flores',
    username: 'pb.diego',
    email: `pb.diego@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Santa Tecla',
    bio: 'Learning plant care one rescue plant at a time.',
    avatarQuery: 'man portrait plants',
    bannerQuery: 'balcony plants',
    social: { instagram: 'diegogrows' },
    posts: [
      {
        body: 'Rescued a snake plant with soft leaves. Letting the soil dry fully before I even think about watering.',
        hashtags: ['snakeplant', 'rescueplant'],
        imageQuery: 'snake plant pot',
      },
      {
        body: 'My balcony gets hot afternoon sun. I am testing shade cloth before adding more plants.',
        hashtags: ['balcony', 'plantsafety', 'sunlight'],
      },
    ],
  },
  {
    key: 'camila',
    role: 'client',
    displayName: 'Camila Rivas',
    username: 'pb.camila',
    email: `pb.camila@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Antiguo Cuscatlan',
    bio: 'Collector of small succulents, pretty pots, and useful care notes.',
    avatarQuery: 'woman succulent portrait',
    bannerQuery: 'succulent collection',
    social: { instagram: 'camila.suculentas', facebook: 'camila.rivas.plants' },
    posts: [
      {
        body: 'Repotted the echeverias into a gritty mix. They already look more stable.',
        hashtags: ['succulents', 'repotting', 'soil'],
        imageQuery: 'echeveria succulents',
      },
      {
        body: 'Question for the community: do you prefer terracotta or glazed pots for succulents?',
        hashtags: ['succulentcare', 'pots'],
        poll: {
          question: 'Best pot for succulents?',
          options: ['Terracotta', 'Glazed', 'Plastic nursery pot'],
        },
      },
    ],
  },
  {
    key: 'mateo',
    role: 'client',
    displayName: 'Mateo Aguilar',
    username: 'pb.mateo',
    email: `pb.mateo@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Escalon',
    bio: 'New to gardening and obsessed with turning tiny corners into green spaces.',
    avatarQuery: 'man portrait garden plants',
    bannerQuery: 'small urban garden',
    social: { tiktok: 'mateo.plants' },
    posts: [
      {
        body: 'Built a tiny herb corner today. Basil is already the main character.',
        hashtags: ['herbs', 'urbangarden', 'basil'],
        imageQuery: 'herb garden balcony',
      },
      {
        body: 'Looking for a beginner-friendly flowering plant that can handle warm days.',
        hashtags: ['beginnerplants', 'flowers'],
      },
    ],
  },
  {
    key: 'valeria',
    role: 'client',
    displayName: 'Valeria Monge',
    username: 'pb.valeria',
    email: `pb.valeria@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Soyapango',
    bio: 'Keeping notes on watering, pests, and what actually survives my windowsill.',
    avatarQuery: 'woman portrait indoor garden',
    bannerQuery: 'windowsill plants',
    social: { instagram: 'valeria.verde' },
    posts: [
      {
        body: 'Fungus gnats are finally under control after bottom watering and sticky traps.',
        hashtags: ['pestcontrol', 'watering', 'planttips'],
        imageQuery: 'houseplant watering',
      },
      {
        body: 'Trying a no-buy month, so propagation station is officially open.',
        hashtags: ['propagation', 'plantbudget'],
      },
    ],
  },
  {
    key: 'andres',
    role: 'client',
    displayName: 'Andres Pineda',
    username: 'pb.andres',
    email: `pb.andres@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Mejicanos',
    bio: 'Balcony gardener, compost beginner, and fan of practical plant experiments.',
    avatarQuery: 'man portrait balcony garden',
    bannerQuery: 'vegetable balcony garden',
    social: { instagram: 'andres.garden' },
    posts: [
      {
        body: 'First tomato flowers showed up. I am pretending to be calm about it.',
        hashtags: ['tomatoes', 'balconygarden', 'vegetables'],
        imageQuery: 'tomato plant flowers',
      },
      {
        body: 'Compost tea experiment starts this week. I will report back if the basil approves.',
        hashtags: ['compost', 'basil', 'gardenexperiment'],
      },
    ],
  },
  {
    key: 'lucia',
    role: 'client',
    displayName: 'Lucia Herrera',
    username: 'pb.lucia',
    email: `pb.lucia@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Nuevo Cuscatlan',
    bio: 'Growing culinary herbs and pollinator-friendly flowers in a sunny family patio.',
    avatarQuery: 'young woman portrait garden natural light',
    bannerQuery: 'sunny patio herb garden',
    social: { instagram: 'lucia.cultiva' },
    posts: [
      {
        body: 'The mint is staying in its own pot this time. I finally learned that lesson.',
        hashtags: ['herbs', 'mint', 'patiogarden'],
        imageQuery: 'fresh mint plant terracotta pot',
      },
      {
        body: 'Added zinnias near the herbs and the patio has been full of pollinators all week.',
        hashtags: ['pollinators', 'flowers', 'urbangarden'],
        imageQuery: 'zinnia flowers garden bees',
      },
    ],
  },
  {
    key: 'rene',
    role: 'client',
    displayName: 'Rene Portillo',
    username: 'pb.rene',
    email: `pb.rene@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'Santa Ana',
    bio: 'Weekend gardener learning fruit trees, composting, and patient plant care.',
    avatarQuery: 'latin man portrait backyard garden',
    bannerQuery: 'backyard fruit trees garden',
    social: { facebook: 'rene.portillo.garden' },
    posts: [
      {
        body: 'My young lemon tree has its first new flush after a light compost top dressing.',
        hashtags: ['fruittrees', 'lemon', 'compost'],
        imageQuery: 'young lemon tree new leaves',
      },
      {
        body: 'What is your favorite way to use dry leaves in the garden?',
        hashtags: ['compost', 'soilhealth'],
        poll: {
          question: 'Where should the dry leaves go?',
          options: ['Compost pile', 'Mulch layer', 'Leaf mold'],
        },
      },
    ],
  },
  {
    key: 'alejandra',
    role: 'client',
    displayName: 'Alejandra Cruz',
    username: 'pb.alejandra',
    email: `pb.alejandra@${botEmailDomain}`,
    phone: null,
    dui: null,
    location: 'La Libertad',
    bio: 'Building a breezy coastal garden with tough foliage and plenty of color.',
    avatarQuery: 'latin woman portrait tropical garden',
    bannerQuery: 'colorful coastal patio plants',
    social: { instagram: 'alejandra.patioverde' },
    posts: [
      {
        body: 'The sea breeze was drying every new leaf, so I moved the youngest plants behind a living windbreak.',
        hashtags: ['coastalgarden', 'plantcare', 'wind'],
        imageQuery: 'coastal patio tropical plants',
      },
      {
        body: 'My hibiscus finally opened after settling into its sunnier spot.',
        hashtags: ['hibiscus', 'flowers', 'patiogarden'],
        imageQuery: 'red hibiscus flower patio plant',
      },
    ],
  },
  {
    key: 'marco',
    role: 'gardener',
    displayName: 'Marco Solorzano',
    username: 'pb.marco',
    email: `pb.marco@${botEmailDomain}`,
    phone: '7001-0101',
    dui: '01010101-1',
    location: 'San Salvador and Santa Tecla',
    bio: 'Maintenance gardener focused on pruning, pest prevention, and balcony transformations.',
    avatarQuery: 'gardener portrait plants',
    bannerQuery: 'professional gardener pruning',
    social: { instagram: 'marco.gardens' },
    gardener: {
      headline: 'Balcony and patio plant maintenance',
      serviceArea: 'San Salvador, Santa Tecla',
      availabilitySchedule: 'Mon-Sat, 8:00 AM - 4:00 PM',
      servicesOffered: 'Pruning, repotting, pest checks, balcony setup',
      paymentMethods: 'Cash, transfer, card',
      experienceYears: 6,
      hourlyRate: 18,
      services: [
        {
          name: 'Balcony tune-up',
          description: 'Pruning, cleanup, soil check, and basic pest prevention.',
          basePrice: 35,
          durationMinutes: 90,
        },
        {
          name: 'Repotting visit',
          description: 'Container upgrade, root check, and soil refresh.',
          basePrice: 22,
          durationMinutes: 60,
        },
      ],
    },
    posts: [
      {
        body: 'Quick reminder: pruning is cleaner when you remove weak growth before shaping the plant.',
        hashtags: ['gardener', 'pruning', 'plantcare'],
        imageQuery: 'gardener pruning plants',
      },
      {
        body: 'I have two open maintenance slots this Friday for balcony gardens.',
        hashtags: ['services', 'gardener', 'maintenance'],
      },
    ],
  },
  {
    key: 'isabel',
    role: 'gardener',
    displayName: 'Isabel Torres',
    username: 'pb.isabel',
    email: `pb.isabel@${botEmailDomain}`,
    phone: '7002-0202',
    dui: '02020202-2',
    location: 'Antiguo Cuscatlan',
    bio: 'Garden designer and plant doctor for homes, small offices, and terraces.',
    avatarQuery: 'female gardener portrait',
    bannerQuery: 'garden designer terrace',
    social: { instagram: 'isabel.terraces', facebook: 'isabel.torres.gardens' },
    gardener: {
      headline: 'Terrace styling and plant recovery',
      serviceArea: 'Antiguo Cuscatlan, Escalon',
      availabilitySchedule: 'Tue-Sun, 9:00 AM - 5:00 PM',
      servicesOffered: 'Terrace design, plant recovery, irrigation checks',
      paymentMethods: 'Cash, transfer',
      experienceYears: 8,
      hourlyRate: 24,
      services: [
        {
          name: 'Terrace consultation',
          description: 'Light, wind, plant placement, and layout suggestions.',
          basePrice: 45,
          durationMinutes: 75,
        },
        {
          name: 'Plant recovery plan',
          description: 'Diagnosis and step-by-step recovery notes.',
          basePrice: 28,
          durationMinutes: 60,
        },
      ],
    },
    posts: [
      {
        body: 'Office plants usually fail from routine, not from lack of love. Build care around light and traffic.',
        hashtags: ['offices', 'plantcare', 'gardendesign'],
        imageQuery: 'office plants design',
      },
      {
        body: 'Which service would help your home garden the most right now?',
        hashtags: ['gardener', 'services'],
        poll: {
          question: 'What should I offer more often?',
          options: ['Repotting day', 'Pest check', 'Terrace layout'],
        },
      },
    ],
  },
  {
    key: 'emilio',
    role: 'gardener',
    displayName: 'Emilio Vasquez',
    username: 'pb.emilio',
    email: `pb.emilio@${botEmailDomain}`,
    phone: '7003-0303',
    dui: '03030303-3',
    location: 'Santa Ana',
    bio: 'Outdoor maintenance, soil refresh, and seasonal garden cleanup.',
    avatarQuery: 'male gardener portrait outdoor',
    bannerQuery: 'garden maintenance tools',
    social: { instagram: 'emilio.maintenance' },
    gardener: {
      headline: 'Outdoor maintenance and soil refresh',
      serviceArea: 'Santa Ana',
      availabilitySchedule: 'Mon-Fri, 7:00 AM - 3:00 PM',
      servicesOffered: 'Soil refresh, seasonal cleanup, trimming',
      paymentMethods: 'Cash, transfer',
      experienceYears: 10,
      hourlyRate: 20,
      services: [
        {
          name: 'Seasonal cleanup',
          description: 'Trimming, leaf cleanup, and health check.',
          basePrice: 55,
          durationMinutes: 120,
        },
        {
          name: 'Soil refresh',
          description: 'Soil amendment and drainage check for beds or pots.',
          basePrice: 32,
          durationMinutes: 90,
        },
      ],
    },
    posts: [
      {
        body: 'After heavy rain, check drainage before adding more water. Roots need air too.',
        hashtags: ['drainage', 'soil', 'gardener'],
        imageQuery: 'garden soil drainage',
      },
      {
        body: 'A clean edge can make a small garden look twice as intentional.',
        hashtags: ['maintenance', 'gardenstyle'],
        imageQuery: 'garden maintenance edging',
      },
    ],
  },
  {
    key: 'natalia',
    role: 'gardener',
    displayName: 'Natalia Calderon',
    username: 'pb.natalia',
    email: `pb.natalia@${botEmailDomain}`,
    phone: '7004-0404',
    dui: '04040404-4',
    location: 'La Libertad',
    bio: 'Native plant advocate helping homes use resilient plants and smarter watering.',
    avatarQuery: 'woman gardener native plants',
    bannerQuery: 'native plant garden',
    social: { instagram: 'natalia.nativeplants', tiktok: 'natnativeplants' },
    gardener: {
      headline: 'Native plant guidance and low-water gardens',
      serviceArea: 'La Libertad, Zaragoza',
      availabilitySchedule: 'Wed-Sat, 8:30 AM - 4:30 PM',
      servicesOffered: 'Native plant planning, watering routines, soil health',
      paymentMethods: 'Cash, transfer, card',
      experienceYears: 5,
      hourlyRate: 21,
      services: [
        {
          name: 'Low-water garden plan',
          description: 'Plant choices and irrigation routine for hot areas.',
          basePrice: 48,
          durationMinutes: 90,
        },
        {
          name: 'Native plant consult',
          description: 'Species suggestions for resilient local gardens.',
          basePrice: 30,
          durationMinutes: 60,
        },
      ],
    },
    posts: [
      {
        body: 'Native and adapted plants are the easiest way to make a garden feel natural and low-stress.',
        hashtags: ['nativeplants', 'lowwater', 'gardener'],
        imageQuery: 'native plant garden',
      },
      {
        body: 'Mulch is not decoration. It is temperature control, moisture support, and soil protection.',
        hashtags: ['mulch', 'soilhealth'],
      },
    ],
  },
  {
    key: 'gabriela',
    role: 'gardener',
    displayName: 'Gabriela Quintanilla',
    username: 'pb.gabriela',
    email: `pb.gabriela@${botEmailDomain}`,
    phone: '7005-0505',
    dui: '05050505-5',
    location: 'San Salvador',
    bio: 'Indoor plant specialist creating practical care systems for homes and small businesses.',
    avatarQuery: 'female indoor plant specialist portrait',
    bannerQuery: 'indoor plant styling bright apartment',
    social: { instagram: 'gabriela.indoorverde' },
    gardener: {
      headline: 'Indoor plant styling and care routines',
      serviceArea: 'San Salvador, Escalon, San Benito',
      availabilitySchedule: 'Mon-Fri, 9:00 AM - 5:00 PM',
      servicesOffered: 'Indoor plant styling, light assessment, care plans, repotting',
      paymentMethods: 'Cash, transfer, card',
      experienceYears: 7,
      hourlyRate: 23,
      services: [
        {
          name: 'Indoor light assessment',
          description: 'Room-by-room light review with resilient plant recommendations.',
          basePrice: 38,
          durationMinutes: 75,
        },
        {
          name: 'Office plant care',
          description: 'Routine watering, pruning, cleaning, and health checks.',
          basePrice: 50,
          durationMinutes: 120,
        },
      ],
    },
    posts: [
      {
        body: 'A beautiful plant corner starts with honest light measurements, not a shopping list.',
        hashtags: ['indoorplants', 'plantstyling', 'gardener'],
        imageQuery: 'bright room indoor plants professional styling',
      },
      {
        body: 'Today we rotated and cleaned an office collection so every plant can use the available light.',
        hashtags: ['officeplants', 'plantmaintenance'],
        imageQuery: 'modern office indoor plants',
      },
    ],
  },
  {
    key: 'oscar',
    role: 'gardener',
    displayName: 'Oscar Lemus',
    username: 'pb.oscar',
    email: `pb.oscar@${botEmailDomain}`,
    phone: '7006-0606',
    dui: '06060606-6',
    location: 'Santa Tecla',
    bio: 'Irrigation technician and gardener focused on efficient watering and healthy lawns.',
    avatarQuery: 'male landscape gardener portrait irrigation',
    bannerQuery: 'garden drip irrigation system',
    social: { instagram: 'oscar.riegoverde' },
    gardener: {
      headline: 'Efficient irrigation and lawn recovery',
      serviceArea: 'Santa Tecla, Zaragoza, Nuevo Cuscatlan',
      availabilitySchedule: 'Mon-Sat, 7:00 AM - 4:00 PM',
      servicesOffered: 'Drip irrigation, sprinkler checks, lawn recovery, drainage',
      paymentMethods: 'Cash, transfer',
      experienceYears: 9,
      hourlyRate: 26,
      services: [
        {
          name: 'Irrigation inspection',
          description: 'Leak, pressure, coverage, and watering schedule review.',
          basePrice: 42,
          durationMinutes: 90,
        },
        {
          name: 'Lawn recovery visit',
          description: 'Compaction, drainage, mowing, and nutrition assessment.',
          basePrice: 58,
          durationMinutes: 120,
        },
      ],
    },
    posts: [
      {
        body: 'Two short watering cycles can absorb better than one long cycle on compacted soil.',
        hashtags: ['irrigation', 'waterwise', 'gardentips'],
        imageQuery: 'garden drip irrigation close up',
      },
      {
        body: 'Before replacing a lawn, check compaction and drainage. The grass may not be the real problem.',
        hashtags: ['lawncare', 'drainage', 'soil'],
        imageQuery: 'gardener checking green lawn soil',
      },
    ],
  },
  {
    key: 'karla',
    role: 'gardener',
    displayName: 'Karla Bonilla',
    username: 'pb.karla',
    email: `pb.karla@${botEmailDomain}`,
    phone: '7007-0707',
    dui: '07070707-7',
    location: 'San Miguel',
    bio: 'Tropical garden maintenance for hot climates, colorful patios, and resilient landscapes.',
    avatarQuery: 'female tropical gardener portrait outdoors',
    bannerQuery: 'colorful tropical garden landscape',
    social: { instagram: 'karla.tropicalgarden', tiktok: 'karlajardines' },
    gardener: {
      headline: 'Tropical patios and heat-ready gardens',
      serviceArea: 'San Miguel and nearby areas',
      availabilitySchedule: 'Tue-Sun, 7:00 AM - 3:00 PM',
      servicesOffered: 'Tropical garden design, pruning, heat care, patio maintenance',
      paymentMethods: 'Cash, transfer',
      experienceYears: 6,
      hourlyRate: 19,
      services: [
        {
          name: 'Tropical patio refresh',
          description: 'Plant editing, pruning, color planning, and soil check.',
          basePrice: 44,
          durationMinutes: 120,
        },
        {
          name: 'Heat stress assessment',
          description: 'Shade, watering, mulch, and plant placement recommendations.',
          basePrice: 25,
          durationMinutes: 60,
        },
      ],
    },
    posts: [
      {
        body: 'In hot gardens, afternoon shade can matter more than adding another watering day.',
        hashtags: ['tropicalgarden', 'heatcare', 'gardener'],
        imageQuery: 'lush tropical patio garden shade',
      },
      {
        body: 'Crotons and ixoras brought the color back to this entrance without fighting the climate.',
        hashtags: ['croton', 'ixora', 'landscaping'],
        imageQuery: 'croton ixora tropical landscaping',
      },
    ],
  },
  {
    key: 'tomas',
    role: 'gardener',
    displayName: 'Tomas Iraheta',
    username: 'pb.tomas',
    email: `pb.tomas@${botEmailDomain}`,
    phone: '7008-0808',
    dui: '08080808-8',
    location: 'Sonsonate',
    bio: 'Fruit tree pruning, productive patios, and seasonal care for home orchards.',
    avatarQuery: 'male orchard gardener portrait fruit trees',
    bannerQuery: 'gardener pruning citrus orchard',
    social: { facebook: 'tomas.iraheta.huertos', instagram: 'tomas.frutales' },
    gardener: {
      headline: 'Fruit trees and productive home gardens',
      serviceArea: 'Sonsonate, Acajutla, Armenia',
      availabilitySchedule: 'Mon-Sat, 6:30 AM - 3:30 PM',
      servicesOffered: 'Fruit tree pruning, nutrition plans, orchard cleanup, planting',
      paymentMethods: 'Cash, transfer',
      experienceYears: 12,
      hourlyRate: 22,
      services: [
        {
          name: 'Fruit tree pruning',
          description: 'Structural and productive pruning with sanitation cleanup.',
          basePrice: 36,
          durationMinutes: 90,
        },
        {
          name: 'Home orchard assessment',
          description: 'Health, spacing, nutrition, pests, and seasonal action plan.',
          basePrice: 47,
          durationMinutes: 120,
        },
      ],
    },
    posts: [
      {
        body: 'Fruit tree pruning should improve light and airflow without removing the whole canopy at once.',
        hashtags: ['fruittrees', 'pruning', 'gardener'],
        imageQuery: 'gardener pruning citrus fruit tree',
      },
      {
        body: 'A productive patio can mix citrus, herbs, and pollinator flowers without feeling crowded.',
        hashtags: ['homeorchard', 'ediblegarden'],
        imageQuery: 'small home orchard citrus herb garden',
      },
    ],
  },
  {
    key: 'loma-verde',
    role: 'nursery',
    displayName: 'Loma Verde Nursery',
    username: 'nursery_loma_verde',
    email: `loma.verde@${botEmailDomain}`,
    phone: '7011-1111',
    dui: '11111111-1',
    location: 'Santa Tecla',
    bio: 'A local nursery focused on indoor plants, easy-care picks, and friendly plant advice.',
    avatarQuery: 'plant nursery logo plants',
    bannerQuery: 'plant nursery greenhouse',
    social: { instagram: 'lomaverdenursery', facebook: 'lomaverdenursery' },
    nursery: {
      nurseryName: 'Loma Verde Nursery',
      nurserySlug: 'loma-verde-nursery',
      ownerName: 'Elena Guardado',
      description: 'Indoor plants, substrate mixes, and starter-friendly care kits.',
      address: 'Calle El Cedro #14',
      city: 'Santa Tecla',
      latitude: 13.6731,
      longitude: -89.2898,
      openingHours: 'Mon-Sat, 8:00 AM - 6:00 PM',
      servicesOffered: 'Plant sales, repotting station, care kits',
      paymentMethods: 'Cash, transfer, card',
      categories: ['Indoor plants', 'Soil'],
      products: [
        {
          name: 'Golden pothos',
          category: 'Indoor plants',
          description: 'Easy-care trailing plant for bright indirect light.',
          price: 8.5,
          stock: 18,
          imageQuery: 'golden pothos plant',
        },
        {
          name: 'Gritty succulent mix',
          category: 'Soil',
          description: 'Fast-draining soil mix for succulents and cacti.',
          price: 6,
          stock: 24,
          imageQuery: 'succulent soil mix',
        },
      ],
    },
    posts: [
      {
        body: 'Fresh pothos, snake plants, and calatheas arrived this morning. We kept the beginner-friendly picks together.',
        hashtags: ['nursery', 'indoorplants', 'restock'],
        imageQuery: 'plant nursery indoor plants',
      },
      {
        body: 'Weekend restock question: what should we bring in more often?',
        hashtags: ['restock', 'community'],
        poll: {
          question: 'Next restock focus?',
          options: ['Aroids', 'Succulents', 'Herbs'],
        },
      },
    ],
  },
  {
    key: 'jardines-aurora',
    role: 'nursery',
    displayName: 'Jardines Aurora',
    username: 'nursery_jardines_aurora',
    email: `jardines.aurora@${botEmailDomain}`,
    phone: '7012-1212',
    dui: '12121212-2',
    location: 'Antiguo Cuscatlan',
    bio: 'Outdoor plants, flowers, and terrace-friendly arrangements.',
    avatarQuery: 'flower nursery logo',
    bannerQuery: 'flower nursery garden center',
    social: { instagram: 'jardinesaurora' },
    nursery: {
      nurseryName: 'Jardines Aurora',
      nurserySlug: 'jardines-aurora',
      ownerName: 'Roberto Caceres',
      description: 'Outdoor ornamentals, flowering plants, and terrace styling support.',
      address: 'Avenida Las Gardenias #7',
      city: 'Antiguo Cuscatlan',
      latitude: 13.6648,
      longitude: -89.2532,
      openingHours: 'Tue-Sun, 9:00 AM - 5:30 PM',
      servicesOffered: 'Flowering plants, terrace arrangements, delivery',
      paymentMethods: 'Cash, transfer',
      categories: ['Flowers', 'Planters'],
      products: [
        {
          name: 'Ixora compacta',
          category: 'Flowers',
          description: 'Warm-weather flowering shrub for patios and entrances.',
          price: 7.75,
          stock: 16,
          imageQuery: 'ixora flowers plant',
        },
        {
          name: 'Terrace planter kit',
          category: 'Planters',
          description: 'Planter, soil, and starter plants for sunny terraces.',
          price: 22,
          stock: 9,
          imageQuery: 'terrace planter flowers',
        },
      ],
    },
    posts: [
      {
        body: 'Flowering arrivals are looking bright today. Great picks for patios with morning sun.',
        hashtags: ['flowers', 'nursery', 'patio'],
        imageQuery: 'flowering plants nursery',
      },
      {
        body: 'Terrace kits are back in limited stock with fresh soil and sun-tolerant plants.',
        hashtags: ['terrace', 'plantkits'],
        imageQuery: 'terrace planter plants',
      },
    ],
  },
  {
    key: 'raiz-viva',
    role: 'nursery',
    displayName: 'Raiz Viva Nursery',
    username: 'nursery_raiz_viva',
    email: `raiz.viva@${botEmailDomain}`,
    phone: '7013-1313',
    dui: '13131313-3',
    location: 'San Miguel',
    bio: 'Cacti, succulents, and low-water plant supplies for hot spaces.',
    avatarQuery: 'cactus nursery logo',
    bannerQuery: 'cactus nursery greenhouse',
    social: { instagram: 'raizvivanursery', tiktok: 'raizviva' },
    nursery: {
      nurseryName: 'Raiz Viva Nursery',
      nurserySlug: 'raiz-viva-nursery',
      ownerName: 'Paola Menjivar',
      description: 'Succulents, cacti, mineral mixes, and warm-climate plant advice.',
      address: 'Boulevard Las Palmeras #21',
      city: 'San Miguel',
      latitude: 13.4833,
      longitude: -88.1833,
      openingHours: 'Mon-Sat, 8:30 AM - 5:30 PM',
      servicesOffered: 'Cacti, succulents, substrate, repotting support',
      paymentMethods: 'Cash, transfer, card',
      categories: ['Cacti', 'Succulents'],
      products: [
        {
          name: 'Mini cactus tray',
          category: 'Cacti',
          description: 'Assorted mini cacti for bright windows.',
          price: 12,
          stock: 20,
          imageQuery: 'mini cactus tray',
        },
        {
          name: 'Echeveria rosette',
          category: 'Succulents',
          description: 'Compact rosette succulent for sunny spots.',
          price: 5.5,
          stock: 30,
          imageQuery: 'echeveria succulent',
        },
      ],
    },
    posts: [
      {
        body: 'Succulent trays are ready. We grouped them by light needs so choosing is easier.',
        hashtags: ['succulents', 'cactus', 'nursery'],
        imageQuery: 'succulent nursery tray',
      },
      {
        body: 'Hot weather tip: for cacti, wait for dry soil and firm tissue before watering again.',
        hashtags: ['cactuscare', 'watering'],
      },
    ],
  },
  {
    key: 'casa-monstera',
    role: 'nursery',
    displayName: 'Casa Monstera',
    username: 'nursery_casa_monstera',
    email: `casa.monstera@${botEmailDomain}`,
    phone: '7014-1414',
    dui: '14141414-4',
    location: 'San Salvador',
    bio: 'Aroid-focused shop with moss poles, soil blends, and collector-friendly advice.',
    avatarQuery: 'monstera nursery logo',
    bannerQuery: 'monstera plant shop',
    social: { instagram: 'casamonstera', facebook: 'casamonstera.sv' },
    nursery: {
      nurseryName: 'Casa Monstera',
      nurserySlug: 'casa-monstera',
      ownerName: 'Mariana Arce',
      description: 'Aroids, moss poles, chunky substrate, and indoor plant guidance.',
      address: 'Colonia San Benito #33',
      city: 'San Salvador',
      latitude: 13.6929,
      longitude: -89.2182,
      openingHours: 'Mon-Fri, 10:00 AM - 7:00 PM',
      servicesOffered: 'Aroids, moss poles, soil blends, styling support',
      paymentMethods: 'Cash, transfer, card',
      categories: ['Aroids', 'Soil'],
      products: [
        {
          name: 'Monstera deliciosa',
          category: 'Aroids',
          description: 'Classic statement plant for bright indirect light.',
          price: 18,
          stock: 12,
          imageQuery: 'monstera deliciosa plant',
        },
        {
          name: 'Chunky aroid mix',
          category: 'Soil',
          description: 'Airy substrate for monstera, philodendron, and pothos.',
          price: 9,
          stock: 22,
          imageQuery: 'aroid soil mix',
        },
      ],
    },
    posts: [
      {
        body: 'Chunky aroid mix is back. Roots need oxygen as much as they need moisture.',
        hashtags: ['aroids', 'soil', 'monstera'],
        imageQuery: 'monstera plant soil',
      },
      {
        body: 'Moss pole day: we are restocking poles and clips for climbing plants.',
        hashtags: ['mosspole', 'climbingplants'],
        imageQuery: 'monstera moss pole',
      },
    ],
  },
  {
    key: 'semilla-nativa',
    role: 'nursery',
    displayName: 'Semilla Nativa',
    username: 'nursery_semilla_nativa',
    email: `semilla.nativa@${botEmailDomain}`,
    phone: '7015-1515',
    dui: '15151515-5',
    location: 'Zaragoza',
    bio: 'Native trees, pollinator plants, and practical choices for resilient local gardens.',
    avatarQuery: 'native plant nursery storefront',
    bannerQuery: 'native plants nursery outdoor rows',
    social: { instagram: 'semillanativa.sv', facebook: 'semillanativasv' },
    nursery: {
      nurseryName: 'Semilla Nativa',
      nurserySlug: 'semilla-nativa',
      ownerName: 'Daniela Alfaro',
      description: 'Native trees, flowering shrubs, pollinator plants, and restoration guidance.',
      address: 'Carretera al Puerto, km 22',
      city: 'Zaragoza',
      latitude: 13.5899,
      longitude: -89.2881,
      openingHours: 'Mon-Sat, 7:30 AM - 5:00 PM',
      servicesOffered: 'Native plants, shade trees, pollinator kits, delivery',
      paymentMethods: 'Cash, transfer, card',
      categories: ['Native plants', 'Trees', 'Garden kits'],
      products: [
        {
          name: 'Cortez blanco sapling',
          category: 'Trees',
          description: 'Young native flowering tree for sunny open spaces.',
          price: 14,
          stock: 15,
          imageQuery: 'young flowering tree sapling nursery',
        },
        {
          name: 'Pollinator garden kit',
          category: 'Garden kits',
          description: 'A colorful selection of nectar plants for sunny gardens.',
          price: 19.5,
          stock: 11,
          imageQuery: 'pollinator flower plants nursery pots',
        },
        {
          name: 'Native flowering shrub',
          category: 'Native plants',
          description: 'Locally adapted shrub selected for warm, seasonal conditions.',
          price: 9,
          stock: 18,
          imageQuery: 'native flowering shrub nursery',
        },
      ],
    },
    posts: [
      {
        body: 'This week we prepared native flowering shrubs and young shade trees for the rainy season.',
        hashtags: ['nativeplants', 'trees', 'nursery'],
        imageQuery: 'native tree seedlings plant nursery',
      },
      {
        body: 'Pollinator kits are ready with plants selected for staggered flowering.',
        hashtags: ['pollinators', 'flowers', 'gardenkit'],
        imageQuery: 'pollinator plants pots nursery',
      },
    ],
  },
  {
    key: 'huerto-central',
    role: 'nursery',
    displayName: 'Huerto Central',
    username: 'nursery_huerto_central',
    email: `huerto.central@${botEmailDomain}`,
    phone: '7016-1616',
    dui: '16161616-6',
    location: 'San Salvador',
    bio: 'Edible seedlings, herbs, seeds, and compact growing supplies for urban homes.',
    avatarQuery: 'urban garden nursery herb seedlings',
    bannerQuery: 'vegetable seedlings garden center',
    social: { instagram: 'huertocentral.sv', tiktok: 'huertocentralsv' },
    nursery: {
      nurseryName: 'Huerto Central',
      nurserySlug: 'huerto-central',
      ownerName: 'Mauricio Funes',
      description: 'Herbs, vegetable seedlings, seeds, compost, and supplies for small urban harvests.',
      address: 'Boulevard Los Heroes #118',
      city: 'San Salvador',
      latitude: 13.7084,
      longitude: -89.2094,
      openingHours: 'Mon-Sat, 8:00 AM - 6:30 PM',
      servicesOffered: 'Edible seedlings, seeds, compost, balcony garden kits',
      paymentMethods: 'Cash, transfer, card',
      categories: ['Herbs', 'Vegetables', 'Supplies'],
      products: [
        {
          name: 'Kitchen herb pack',
          category: 'Herbs',
          description: 'Basil, rosemary, mint, and oregano seedlings.',
          price: 11,
          stock: 21,
          imageQuery: 'culinary herb seedlings pots',
        },
        {
          name: 'Tomato seedling set',
          category: 'Vegetables',
          description: 'Four healthy tomato seedlings ready for larger containers.',
          price: 7.5,
          stock: 17,
          imageQuery: 'tomato seedlings nursery pots',
        },
        {
          name: 'Screened compost bag',
          category: 'Supplies',
          description: 'Mature screened compost for beds and containers.',
          price: 6.5,
          stock: 34,
          imageQuery: 'organic compost gardening bag soil',
        },
      ],
    },
    posts: [
      {
        body: 'Fresh basil, tomato, sweet pepper, and rosemary seedlings are on the tables today.',
        hashtags: ['urbangarden', 'seedlings', 'nursery'],
        imageQuery: 'herb vegetable seedlings nursery',
      },
      {
        body: 'Balcony harvest poll: which edible plant always earns a spot?',
        hashtags: ['ediblegarden', 'balcony'],
        poll: {
          question: 'Your essential edible plant?',
          options: ['Basil', 'Tomato', 'Sweet pepper'],
        },
      },
    ],
  },
  {
    key: 'orquideas-del-volcan',
    role: 'nursery',
    displayName: 'Orquideas del Volcan',
    username: 'nursery_orquideas_volcan',
    email: `orquideas.volcan@${botEmailDomain}`,
    phone: '7017-1717',
    dui: '17171717-7',
    location: 'Santa Ana',
    bio: 'Orchids, bromeliads, mounting supplies, and patient guidance for collectors.',
    avatarQuery: 'orchid nursery owner greenhouse',
    bannerQuery: 'orchid greenhouse nursery rows',
    social: { instagram: 'orquideasdelvolcan' },
    nursery: {
      nurseryName: 'Orquideas del Volcan',
      nurserySlug: 'orquideas-del-volcan',
      ownerName: 'Claudia Moran',
      description: 'Healthy orchids, bromeliads, bark mixes, and mounting accessories.',
      address: 'Avenida Independencia Sur #45',
      city: 'Santa Ana',
      latitude: 13.9862,
      longitude: -89.5597,
      openingHours: 'Wed-Sun, 9:00 AM - 5:00 PM',
      servicesOffered: 'Orchids, bromeliads, mounting, bloom care advice',
      paymentMethods: 'Cash, transfer',
      categories: ['Orchids', 'Bromeliads', 'Supplies'],
      products: [
        {
          name: 'Phalaenopsis orchid',
          category: 'Orchids',
          description: 'Blooming moth orchid with a healthy established root system.',
          price: 24,
          stock: 10,
          imageQuery: 'phalaenopsis orchid pot nursery',
        },
        {
          name: 'Color bromeliad',
          category: 'Bromeliads',
          description: 'Bright tropical bromeliad for filtered light.',
          price: 13,
          stock: 14,
          imageQuery: 'colorful bromeliad plant pot',
        },
        {
          name: 'Orchid bark mix',
          category: 'Supplies',
          description: 'Airy bark blend for common epiphytic orchids.',
          price: 8,
          stock: 26,
          imageQuery: 'orchid bark potting mix',
        },
      ],
    },
    posts: [
      {
        body: 'Phalaenopsis blooms are open and every plant was checked for healthy roots before display.',
        hashtags: ['orchids', 'flowers', 'nursery'],
        imageQuery: 'phalaenopsis orchids greenhouse',
      },
      {
        body: 'Clear pots make orchid root checks much easier. Green roots are your watering clue.',
        hashtags: ['orchidcare', 'planttips'],
        imageQuery: 'orchid roots clear pot',
      },
    ],
  },
  {
    key: 'palmas-del-pacifico',
    role: 'nursery',
    displayName: 'Palmas del Pacifico',
    username: 'nursery_palmas_pacifico',
    email: `palmas.pacifico@${botEmailDomain}`,
    phone: '7018-1818',
    dui: '18181818-8',
    location: 'La Libertad',
    bio: 'Coastal nursery with palms, tropical foliage, and salt-tolerant landscape plants.',
    avatarQuery: 'tropical palm nursery outdoor',
    bannerQuery: 'palm tree nursery tropical plants',
    social: { instagram: 'palmasdelpacifico.sv', facebook: 'palmasdelpacificosv' },
    nursery: {
      nurseryName: 'Palmas del Pacifico',
      nurserySlug: 'palmas-del-pacifico',
      ownerName: 'Jorge Villalta',
      description: 'Palms, tropical foliage, and hardy landscape plants for warm coastal properties.',
      address: 'Carretera Litoral, km 34',
      city: 'La Libertad',
      latitude: 13.4886,
      longitude: -89.3196,
      openingHours: 'Mon-Sat, 7:00 AM - 5:00 PM',
      servicesOffered: 'Palms, tropical foliage, bulk orders, coastal plant advice',
      paymentMethods: 'Cash, transfer, card',
      categories: ['Palms', 'Tropical plants', 'Landscape plants'],
      products: [
        {
          name: 'Areca palm',
          category: 'Palms',
          description: 'Clumping palm for bright patios and protected outdoor spaces.',
          price: 28,
          stock: 13,
          imageQuery: 'areca palm nursery pot',
        },
        {
          name: 'Bird of paradise',
          category: 'Tropical plants',
          description: 'Bold tropical foliage for bright warm locations.',
          price: 21,
          stock: 16,
          imageQuery: 'bird of paradise plant nursery',
        },
        {
          name: 'Coastal hedge pack',
          category: 'Landscape plants',
          description: 'Six hardy shrubs selected for sunny coastal gardens.',
          price: 42,
          stock: 8,
          imageQuery: 'tropical hedge shrubs nursery',
        },
      ],
    },
    posts: [
      {
        body: 'Areca palms and bird of paradise are ready for bright patios and warm entrances.',
        hashtags: ['palms', 'tropicalplants', 'nursery'],
        imageQuery: 'tropical palms plant nursery',
      },
      {
        body: 'Coastal gardens need wind and salt tolerance built into the plant list from day one.',
        hashtags: ['coastalgarden', 'landscaping'],
        imageQuery: 'lush coastal tropical garden',
      },
    ],
  },
]

export default class DemoBots extends BaseCommand {
  static commandName = 'demo:bots'
  static description =
    'Seed or remove demo bot users, posts, follows, reactions, reviews, and role data.'
  static options: CommandOptions = {
    startApp: true,
  }

  private models!: LoadedModels

  @flags.boolean({
    description: 'Remove all demo bot users and their related data.',
  })
  declare cleanup: boolean

  @flags.boolean({
    description: 'Cleanup existing demo bots before creating a fresh dataset.',
  })
  declare refresh: boolean

  @flags.boolean({
    description: 'Use Pexels for remote demo images when PEXELS_API_KEY is available.',
  })
  declare withPexels: boolean

  @flags.string({
    description: 'Password assigned to every demo account.',
  })
  declare password?: string

  async run() {
    this.models = await loadModels()

    if (this.cleanup) {
      const removed = await this.cleanupDemoBots()
      this.logger.success(`Removed ${removed} demo bot account${removed === 1 ? '' : 's'}.`)
      return
    }

    const existingBots = await this.getExistingDemoBots()

    if (existingBots.length && !this.refresh) {
      this.logger.warning(
        `Found ${existingBots.length} demo bot account${existingBots.length === 1 ? '' : 's'}.`
      )
      this.logger.info('Run "node ace demo:bots --refresh" to rebuild the demo dataset.')
      this.logger.info('Run "node ace demo:bots --cleanup" to remove the demo dataset.')
      return
    }

    if (this.refresh) {
      const removed = await this.cleanupDemoBots()
      this.logger.info(`Cleaned ${removed} previous demo bot account${removed === 1 ? '' : 's'}.`)
    }

    const password = this.password || defaultBotPassword
    const imageProvider = new DemoImageProvider(
      Boolean(this.withPexels || process.env.PEXELS_API_KEY),
      this.logger
    )
    const seededPersonas = await this.preparePersonaAssets(imageProvider)

    await this.models.db.transaction(async (trx) => {
      const seededUsers = new Map<string, SeededUser>()

      for (const persona of seededPersonas) {
        const seededUser = await this.createPersona(persona, password, trx)
        seededUsers.set(persona.key, seededUser)
      }

      await this.createFollows(seededUsers, trx)
      const posts = await this.createPosts(seededUsers, trx)
      await this.createPostInteractions(seededUsers, posts, trx)
      await this.createReviews(seededUsers, trx)
    })

    this.logger.success(`Seeded ${seededPersonas.length} demo bot accounts.`)
    this.logger.info(`Default password: ${password}`)
    this.logger.info(
      'Use "node ace demo:bots --cleanup" when the demo dataset is no longer needed.'
    )
  }

  private async getExistingDemoBots() {
    return this.models.User.query().where('email', 'like', `%@${botEmailDomain}`).select('id')
  }

  private async cleanupDemoBots() {
    const bots = await this.getExistingDemoBots()
    const botIds = bots.map((bot) => bot.id)

    if (!botIds.length) return 0

    await this.models.User.query().whereIn('id', botIds).delete()
    return botIds.length
  }

  private async preparePersonaAssets(imageProvider: DemoImageProvider): Promise<SeededPersona[]> {
    const seededPersonas: SeededPersona[] = []

    for (let index = 0; index < botPersonas.length; index += 1) {
      const persona = botPersonas[index]
      const avatarUrl = await imageProvider.getProfileImage(persona, 'avatar', index)
      const bannerUrl = await imageProvider.getProfileImage(persona, 'banner', index)
      const postImages: Array<string | null> = []
      const productImages: string[] = []

      for (let postIndex = 0; postIndex < persona.posts.length; postIndex += 1) {
        const post = persona.posts[postIndex]
        const seed = index + postIndex
        const imageUrl = post.imageQuery
          ? await imageProvider.getContentImage(post.imageQuery, seed)
          : null

        postImages.push(imageUrl)
      }

      if (persona.nursery) {
        for (
          let productIndex = 0;
          productIndex < persona.nursery.products.length;
          productIndex += 1
        ) {
          const product = persona.nursery.products[productIndex]
          productImages.push(
            await imageProvider.getProductImage(product.imageQuery, index + productIndex)
          )
        }
      }

      seededPersonas.push({
        ...persona,
        avatarUrl,
        bannerUrl,
        postImages,
        productImages,
      })
    }

    return seededPersonas
  }

  private async createPersona(persona: SeededPersona, password: string, trx: any) {
    const name = persona.nursery?.ownerName || persona.displayName
    const { firstName, lastName } = splitName(name)
    const user = await this.models.User.create(
      {
        first_name: firstName,
        last_name: lastName,
        username: normalizeUsername(persona.username),
        email: persona.email,
        phone: persona.phone,
        dui: persona.dui,
        role: persona.role,
        profilePicture: persona.avatarUrl,
        password,
      },
      { client: trx }
    )
    const accountProfile = await this.models.AccountProfile.create(
      {
        userId: user.id,
        displayName: persona.displayName,
        avatarUrl: persona.avatarUrl,
        bannerUrl: persona.bannerUrl,
        bio: persona.bio,
        location: persona.location,
      },
      { client: trx }
    )

    await this.createAccountLinks(user, persona.social, trx)

    let gardenerProfile: GardenerProfile | undefined
    let nurseryProfile: NurseryProfile | undefined

    if (persona.gardener) {
      gardenerProfile = await this.createGardenerProfile(user, persona, trx)
    }

    if (persona.nursery) {
      nurseryProfile = await this.createNurseryProfile(user, persona, trx)
    }

    return {
      persona,
      user,
      accountProfile,
      gardenerProfile,
      nurseryProfile,
    }
  }

  private async createAccountLinks(user: User, social: SocialLinks, trx: any) {
    const links = [
      social.instagram
        ? {
            userId: user.id,
            label: 'Instagram',
            url: `https://instagram.com/${social.instagram}`,
            sortOrder: 1,
          }
        : null,
      social.tiktok
        ? {
            userId: user.id,
            label: 'TikTok',
            url: `https://tiktok.com/@${social.tiktok}`,
            sortOrder: 2,
          }
        : null,
      social.facebook
        ? {
            userId: user.id,
            label: 'Facebook',
            url: `https://facebook.com/${social.facebook}`,
            sortOrder: 3,
          }
        : null,
    ].filter((link): link is { userId: number; label: string; url: string; sortOrder: number } =>
      Boolean(link)
    )

    if (links.length) {
      await this.models.AccountLink.createMany(links, { client: trx })
    }
  }

  private async createGardenerProfile(user: User, persona: SeededPersona, trx: any) {
    const details = persona.gardener!
    const profile = await this.models.GardenerProfile.create(
      {
        userId: user.id,
        availabilitySchedule: details.availabilitySchedule,
        servicesOffered: details.servicesOffered,
        headline: details.headline,
        bio: persona.bio,
        serviceArea: details.serviceArea,
        experienceYears: details.experienceYears,
        hourlyRate: details.hourlyRate,
        isAvailable: true,
        publicPhone: user.phone,
        paymentMethods: details.paymentMethods,
        ratingAverage: 0,
        ratingCount: 0,
      },
      { client: trx }
    )

    await this.models.GardenerService.createMany(
      details.services.map((service) => ({
        gardenerProfileId: profile.id,
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        durationMinutes: service.durationMinutes,
        isActive: true,
      })),
      { client: trx }
    )

    return profile
  }

  private async createNurseryProfile(user: User, persona: SeededPersona, trx: any) {
    const details = persona.nursery!
    const profile = await this.models.NurseryProfile.create(
      {
        userId: user.id,
        nurseryName: details.nurseryName,
        nurserySlug: details.nurserySlug,
        ownerName: details.ownerName,
        description: details.description,
        address: details.address,
        city: details.city,
        latitude: details.latitude,
        longitude: details.longitude,
        publicPhone: user.phone,
        publicEmail: user.email,
        logoUrl: persona.avatarUrl,
        bannerUrl: persona.bannerUrl,
        openingHours: details.openingHours,
        servicesOffered: details.servicesOffered,
        paymentMethods: details.paymentMethods,
        isActive: true,
        ratingAverage: 0,
        ratingCount: 0,
      },
      { client: trx }
    )

    await this.models.NurseryProduct.createMany(
      details.products.map((product, index) => ({
        nurseryProfileId: profile.id,
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl:
          persona.productImages[index] ||
          fallbackProductImages[index % fallbackProductImages.length],
        isActive: true,
      })),
      { client: trx }
    )

    if (details.categories.length) {
      await this.models.NurseryCatalogCategory.createMany(
        [...new Set(details.categories)].slice(0, 5).map((name, index) => ({
          nurseryProfileId: profile.id,
          name,
          sortOrder: index + 1,
        })),
        { client: trx }
      )
    }

    return profile
  }

  private async createFollows(seededUsers: Map<string, SeededUser>, trx: any) {
    const users = [...seededUsers.values()]
    const follows = new Map<string, { followerId: number; followingId: number }>()

    users.forEach((seededUser, index) => {
      const targets = rotate(users, index + 1).slice(0, 5)
      const roleTargets = users
        .filter((target) => target.persona.role !== seededUser.persona.role)
        .slice(0, 3)

      for (const target of [...targets, ...roleTargets]) {
        if (target.user.id === seededUser.user.id) continue

        const key = `${seededUser.user.id}:${target.user.id}`
        follows.set(key, {
          followerId: seededUser.user.id,
          followingId: target.user.id,
        })
      }
    })

    await this.models.Follow.createMany([...follows.values()], { client: trx })
  }

  private async createPosts(seededUsers: Map<string, SeededUser>, trx: any) {
    const createdPosts: Array<{
      post: CommunityPost
      author: SeededUser
      pollOptions: PostPollOption[]
    }> = []
    const users = [...seededUsers.values()]
    const draftPosts = users.flatMap((author) =>
      author.persona.posts.map((postData, postIndex) => ({
        author,
        postData,
        postIndex,
      }))
    )
    const roleQueues: Record<BotRole, typeof draftPosts> = {
      client: draftPosts.filter((draft) => draft.author.persona.role === 'client'),
      gardener: draftPosts.filter((draft) => draft.author.persona.role === 'gardener'),
      nursery: draftPosts.filter((draft) => draft.author.persona.role === 'nursery'),
    }
    const roleOrder: BotRole[] = ['nursery', 'gardener', 'client', 'client', 'gardener', 'nursery']
    const orderedDraftPosts: typeof draftPosts = []

    while (Object.values(roleQueues).some((queue) => queue.length)) {
      for (const role of roleOrder) {
        const draft = roleQueues[role].shift()

        if (draft) {
          orderedDraftPosts.push(draft)
        }
      }
    }

    let postSeed = 0

    for (const { author, postData, postIndex } of orderedDraftPosts) {
      const createdAt = DateTime.now().minus({ minutes: 45 + postSeed * 55 })
      const post = await this.models.CommunityPost.create(
        {
          userId: author.user.id,
          body: postData.body,
          mediaUrl: author.persona.postImages[postIndex],
          mediaType: author.persona.postImages[postIndex] ? 'image' : 'none',
          visibility: 'public',
          createdAt,
          updatedAt: createdAt,
        },
        { client: trx }
      )

      await this.createHashtags(post, postData.hashtags, trx)

      const pollOptions = postData.poll
        ? await this.createPoll(post, postData.poll.question, postData.poll.options, trx)
        : []

      createdPosts.push({ post, author, pollOptions })
      postSeed += 1
    }

    return createdPosts
  }

  private async createHashtags(post: CommunityPost, hashtags: string[], trx: any) {
    const normalized = [...new Set(hashtags.map(normalizeHashtag).filter(Boolean))]

    if (!normalized.length) return

    await this.models.PostHashtag.createMany(
      normalized.map((tag) => ({
        communityPostId: post.id,
        tag,
      })),
      { client: trx }
    )
  }

  private async createPoll(
    post: CommunityPost,
    question: string,
    options: string[],
    trx: any
  ): Promise<PostPollOption[]> {
    const poll = await this.models.PostPoll.create(
      {
        communityPostId: post.id,
        question,
      },
      { client: trx }
    )

    return this.models.PostPollOption.createMany(
      options.map((label, index) => ({
        postPollId: poll.id,
        label,
        sortOrder: index + 1,
      })),
      { client: trx }
    )
  }

  private async createPostInteractions(
    seededUsers: Map<string, SeededUser>,
    posts: Array<{ post: CommunityPost; author: SeededUser; pollOptions: PostPollOption[] }>,
    trx: any
  ) {
    const users = [...seededUsers.values()]
    const reactions = new Map<
      string,
      { communityPostId: number; userId: number; type: 'like' | 'favorite' }
    >()
    const comments: Array<{ communityPostId: number; userId: number; body: string }> = []
    const votes = new Map<
      string,
      { postPollId: number; postPollOptionId: number; userId: number }
    >()

    posts.forEach((entry, index) => {
      const reactors = rotate(users, index + 2)
        .filter((user) => user.user.id !== entry.author.user.id)
        .slice(0, 7)
      const commenters = rotate(users, index + 4)
        .filter((user) => user.user.id !== entry.author.user.id)
        .slice(0, 2)

      for (const reactor of reactors) {
        reactions.set(`${entry.post.id}:${reactor.user.id}:like`, {
          communityPostId: entry.post.id,
          userId: reactor.user.id,
          type: 'like',
        })

        if ((entry.post.id + reactor.user.id) % 4 === 0) {
          reactions.set(`${entry.post.id}:${reactor.user.id}:favorite`, {
            communityPostId: entry.post.id,
            userId: reactor.user.id,
            type: 'favorite',
          })
        }
      }

      commenters.forEach((commenter, commentIndex) => {
        comments.push({
          communityPostId: entry.post.id,
          userId: commenter.user.id,
          body: commentBank[(index + commentIndex) % commentBank.length],
        })
      })

      if (entry.pollOptions.length) {
        const pollId = entry.pollOptions[0].postPollId
        const voters = rotate(users, index + 1)
          .filter((user) => user.user.id !== entry.author.user.id)
          .slice(0, 8)

        voters.forEach((voter, voteIndex) => {
          const option = entry.pollOptions[voteIndex % entry.pollOptions.length]

          votes.set(`${pollId}:${voter.user.id}`, {
            postPollId: pollId,
            postPollOptionId: option.id,
            userId: voter.user.id,
          })
        })
      }
    })

    await this.models.PostReaction.createMany([...reactions.values()], { client: trx })
    await this.models.PostComment.createMany(comments, { client: trx })

    if (votes.size) {
      await this.models.PostPollVote.createMany([...votes.values()], { client: trx })
    }
  }

  private async createReviews(seededUsers: Map<string, SeededUser>, trx: any) {
    const users = [...seededUsers.values()]
    const clients = users.filter((user) => user.persona.role === 'client')
    const gardeners = users.filter((user) => user.gardenerProfile)
    const nurseries = users.filter((user) => user.nurseryProfile)

    for (const target of [...gardeners, ...nurseries]) {
      const reviews = rotate(clients, target.user.id)
        .slice(0, 3)
        .map((client, index) => ({
          reviewerUserId: client.user.id,
          reviewerName: client.persona.displayName,
          gardenerProfileId: target.gardenerProfile?.id || null,
          nurseryProfileId: target.nurseryProfile?.id || null,
          rating: 4 + ((target.user.id + index) % 2),
          comment: reviewBank[(target.user.id + index) % reviewBank.length],
        }))

      await this.models.ProfileReview.createMany(reviews, { client: trx })

      const ratingAverage =
        Math.round(
          (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 10
        ) / 10

      if (target.gardenerProfile) {
        target.gardenerProfile.useTransaction(trx)
        target.gardenerProfile.merge({
          ratingAverage,
          ratingCount: reviews.length,
        })
        await target.gardenerProfile.save()
      }

      if (target.nurseryProfile) {
        target.nurseryProfile.useTransaction(trx)
        target.nurseryProfile.merge({
          ratingAverage,
          ratingCount: reviews.length,
        })
        await target.nurseryProfile.save()
      }
    }
  }
}

async function loadModels() {
  const [
    accountLink,
    accountProfile,
    communityPost,
    follow,
    gardenerProfile,
    gardenerService,
    nurseryProduct,
    nurseryCatalogCategory,
    nurseryProfile,
    postComment,
    postHashtag,
    postPoll,
    postPollOption,
    postPollVote,
    postReaction,
    profileReview,
    user,
    dbService,
  ] = await Promise.all([
    import('#models/account_link'),
    import('#models/account_profile'),
    import('#models/community_post'),
    import('#models/follow'),
    import('#models/gardener_profile'),
    import('#models/gardener_service'),
    import('#models/nursery_product'),
    import('#models/nursery_catalog_category'),
    import('#models/nursery_profile'),
    import('#models/post_comment'),
    import('#models/post_hashtag'),
    import('#models/post_poll'),
    import('#models/post_poll_option'),
    import('#models/post_poll_vote'),
    import('#models/post_reaction'),
    import('#models/profile_review'),
    import('#models/user'),
    import('@adonisjs/lucid/services/db'),
  ])

  return {
    AccountLink: accountLink.default,
    AccountProfile: accountProfile.default,
    CommunityPost: communityPost.default,
    Follow: follow.default,
    GardenerProfile: gardenerProfile.default,
    GardenerService: gardenerService.default,
    NurseryProduct: nurseryProduct.default,
    NurseryCatalogCategory: nurseryCatalogCategory.default,
    NurseryProfile: nurseryProfile.default,
    PostComment: postComment.default,
    PostHashtag: postHashtag.default,
    PostPoll: postPoll.default,
    PostPollOption: postPollOption.default,
    PostPollVote: postPollVote.default,
    PostReaction: postReaction.default,
    ProfileReview: profileReview.default,
    User: user.default,
    db: dbService.default,
  }
}

class DemoImageProvider {
  private pexelsEnabled: boolean
  private pexelsKey?: string
  private pexelsCache = new Map<string, string[]>()
  private usedPexelsUrls = new Set<string>()
  private warnedAboutPexels = false
  private warnedAboutLocalTls = false
  private localTlsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true })

  constructor(
    enabled: boolean,
    private logger: Pick<BaseCommand['logger'], 'warning' | 'info'>
  ) {
    this.pexelsEnabled = enabled
    this.pexelsKey = process.env.PEXELS_API_KEY

    if (enabled && !this.pexelsKey) {
      this.logger.warning('PEXELS_API_KEY is not available. Falling back to local demo images.')
      this.pexelsEnabled = false
    } else if (this.pexelsEnabled) {
      this.logger.info('Pexels images enabled for demo profiles, posts, and nursery catalogs.')
    }
  }

  async getProfileImage(persona: BotPersona, kind: 'avatar' | 'banner', index: number) {
    const roleQueries: Record<BotRole, Record<'avatar' | 'banner', string>> = {
      client: {
        avatar: 'person portrait with houseplants natural light',
        banner: 'beautiful home garden plants',
      },
      gardener: {
        avatar: 'professional gardener portrait outdoors',
        banner: 'professional gardener working in garden',
      },
      nursery: {
        avatar: 'plant nursery owner greenhouse portrait',
        banner: 'lush plant nursery greenhouse',
      },
    }
    const query = roleQueries[persona.role][kind]
    const orientation = kind === 'avatar' ? 'portrait' : 'landscape'
    const pexelsImage = await this.getPexelsImage(query, orientation, kind)

    if (pexelsImage) return pexelsImage

    const fallbackPool =
      kind === 'avatar' ? fallbackAvatars[persona.role] : fallbackBanners[persona.role]
    return fallbackPool[index % fallbackPool.length]
  }

  async getContentImage(query: string, index: number) {
    return (
      (await this.getPexelsImage(this.contentCollectionQuery(query), 'landscape', 'content')) ||
      fallbackPostImages[index % fallbackPostImages.length]
    )
  }

  async getProductImage(query: string, index: number) {
    return (
      (await this.getPexelsImage(this.productCollectionQuery(query), 'square', 'content')) ||
      fallbackProductImages[index % fallbackProductImages.length]
    )
  }

  private contentCollectionQuery(query: string) {
    const value = query.toLowerCase()
    if (/(orchid|flower|hibiscus|ixora|zinnia|pollinator)/.test(value)) {
      return 'colorful flowering plants garden nursery'
    }
    if (/(cactus|succulent|echeveria)/.test(value)) return 'cactus succulent collection'
    if (/(herb|vegetable|tomato|compost|edible|orchard|fruit|lemon)/.test(value)) {
      return 'edible herb vegetable home garden'
    }
    if (/(nursery|greenhouse|seedling|restock)/.test(value)) {
      return 'lush plant nursery greenhouse plants'
    }
    if (/(gardener|pruning|maintenance|irrigation|lawn|soil|drainage)/.test(value)) {
      return 'professional gardener working plants'
    }
    if (/(tropical|palm|coastal|croton)/.test(value)) return 'lush tropical patio garden'
    if (/(office|indoor|monstera|pothos|aroid|moss)/.test(value)) {
      return 'beautiful indoor houseplants room'
    }
    return 'beautiful home garden plants'
  }

  private productCollectionQuery(query: string) {
    const value = query.toLowerCase()
    if (/(soil|compost|bark|mix)/.test(value)) return 'organic potting soil gardening'
    if (/(cactus|succulent|echeveria)/.test(value)) return 'cactus succulent plant pot'
    if (/(orchid|bromeliad|flower|ixora)/.test(value)) return 'flowering plant nursery pot'
    if (/(herb|tomato|vegetable|seedling)/.test(value)) return 'herb vegetable seedlings pots'
    if (/(palm|tropical|bird of paradise|hedge)/.test(value)) return 'tropical plant nursery pot'
    if (/(tree|sapling|native|shrub)/.test(value)) return 'tree sapling nursery plant'
    return 'indoor houseplant nursery pot'
  }

  private async getPexelsImage(
    query: string,
    orientation: 'portrait' | 'landscape' | 'square',
    kind: 'avatar' | 'banner' | 'content'
  ) {
    if (!this.pexelsEnabled || !this.pexelsKey) return null

    const cacheKey = `${query}:${orientation}:${kind}`
    const cached = this.pexelsCache.get(cacheKey)
    const pool = cached || (await this.fetchPexelsPool(query, orientation, kind, cacheKey))

    while (pool.length) {
      const url = pool.shift()!

      if (!this.usedPexelsUrls.has(url)) {
        this.usedPexelsUrls.add(url)
        return url
      }
    }

    return null
  }

  private async fetchPexelsPool(
    query: string,
    orientation: 'portrait' | 'landscape' | 'square',
    kind: 'avatar' | 'banner' | 'content',
    cacheKey: string
  ) {
    try {
      const request = (allowLocalCertificateFallback = false) =>
        axios.get('https://api.pexels.com/v1/search', {
          headers: {
            Authorization: this.pexelsKey!,
          },
          params: {
            query,
            per_page: 12,
            orientation,
          },
          timeout: 20000,
          httpsAgent: allowLocalCertificateFallback ? this.localTlsAgent : undefined,
        })
      let response

      try {
        response = await request()
      } catch (error: any) {
        const certificateCodes = new Set([
          'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          'SELF_SIGNED_CERT_IN_CHAIN',
          'DEPTH_ZERO_SELF_SIGNED_CERT',
          'CERT_HAS_EXPIRED',
        ])

        if (
          process.env.NODE_ENV === 'production' ||
          !certificateCodes.has(String(error?.code || ''))
        ) {
          throw error
        }

        if (!this.warnedAboutLocalTls) {
          this.logger.warning(
            'Pexels TLS certificate was rejected locally. Retrying with the development fallback.'
          )
          this.warnedAboutLocalTls = true
        }
        response = await request(true)
      }

      const payload = response.data as {
        photos?: Array<{
          src?: Partial<Record<'medium' | 'large' | 'large2x' | 'landscape' | 'portrait', string>>
        }>
      }
      const preferredSource =
        kind === 'avatar' ? 'portrait' : kind === 'banner' ? 'landscape' : 'large'
      const pool =
        payload.photos
          ?.map((photo) => {
            const raw =
              photo.src?.[preferredSource] ||
              photo.src?.large ||
              photo.src?.medium ||
              photo.src?.landscape ||
              photo.src?.portrait

            return safeUrl(raw)
          })
          .filter((url): url is string => Boolean(url)) || []

      this.pexelsCache.set(cacheKey, pool)
      return pool
    } catch (error) {
      if (!this.warnedAboutPexels) {
        this.logger.warning(
          `Could not fetch Pexels demo images. Falling back to local assets. ${String(error)}`
        )
        this.warnedAboutPexels = true
      }

      this.pexelsCache.set(cacheKey, [])
      return []
    }
  }
}

function splitName(fullName: string) {
  const parts = fullName.split(/\s+/).filter(Boolean)

  return {
    firstName: (parts.shift() || 'Plant').slice(0, 50),
    lastName: (parts.join(' ') || 'Bud').slice(0, 50),
  }
}

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^\./g, '')
    .replace(/\.$/g, '')
    .slice(0, 30)
}

function normalizeHashtag(value: string) {
  return value
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 60)
}

function rotate<T>(values: T[], offset: number) {
  if (!values.length) return []

  const normalizedOffset = offset % values.length
  return [...values.slice(normalizedOffset), ...values.slice(0, normalizedOffset)]
}

function safeUrl(value?: string) {
  if (!value) return null
  if (value.length <= 255) return value

  const withoutQuery = value.split('?')[0]
  return withoutQuery.length <= 255 ? withoutQuery : null
}
