export interface Nursery {
  id: number
  name: string
  image: string
  rating: number
  description: string
  location: string
  hours: string
  social: string
  phone: string
}

const sponsoredNurseries: Nursery[] = [
  {
    id: 1,
    name: "El Bambú Nursery",
    image: 'nurseries/viver1.jpg',
    rating: 4,
    description: "Fruit trees and large palms in a family-owned space.",
    location: "Santa Tecla",
    hours: "6:00 AM - 4:00 PM",
    social: "@ElBambuNursery",
    phone: "7777-3456",
  },
  {
    id: 2,
    name: "Jardín Botánico La Laguna",
    image: "nurseries/viver2.webp",
    rating: 5,
    description: "Native plants, ornamental shrubs, and gardening advice.",
    location: "Antiguo Cuscatlán (La Laguna Botanical Garden)",
    hours: "9:00 AM - 4:00 PM",
    social: "@JardinBotanicoLaLaguna",
    phone: "2243-1524"
  },
  {
    id: 3,
    name: "Vivero La Esmeralda",
    image: "nurseries/viver3.jpg",
    rating: 4,
    description: "Urban oasis with vertical gardens and indoor plants.",
    location: "Santa Tecla",
    hours: "9:00 AM - 3:00 PM",
    social: "@ViveroLaEsmeralda",
    phone: "7777-2244"
  },
  {
    id: 4,
    name: "Green Heaven Nursery",
    image: "nurseries/viver4.jpg",
    rating: 2,
    description: "Tropical and native plants in a calm environment.",
    location: "Santa Tecla",
    hours: "7:30 AM - 1:00 PM",
    social: "@GreenHavenSV",
    phone: "7777-1234"
  },
  {
    id: 5,
    name: "Terra Flora Garden",
    image: "nurseries/viver5.jpg",
    rating: 5,
    description: "Exotic flowers and beautiful succulents.",
    location: "Santa Tecla",
    hours: "8:00 AM - 4:00 PM",
    social: "@TerraFloraGarden",
    phone: "7333-2164"
  },
  {
    id: 6,
    name: "Verde Vivo Botánica",
    image: "nurseries/viver6.jpg",
    rating: 1,
    description: "Interior plants, hurban gardens and advice",
    location: "Santa Tecla",
    hours: "8:00 AM - 4:00 PM",
    social: "@TerraFloraGarden",
    phone: "7333-2164"
  },
]

export const nurseries: Nursery[] = [
  {
    id: 7,
    name: "Vivero El Bosquecito",
    image: "nurseries/viver7.jpg",
    rating: 5,
    description: "Variety of plants breed in a natural environment.",
    location: "Zaragoza, La Libertad",
    hours: "6:00 AM - 5:00 PM",
    social: "@RaicesVerdesSV",
    phone: "7689-4521"
  },
  {
    id: 8,
    name: "Jardines el Volcán",
    image: "nurseries/viver8.jpg",
    rating: 5,
    description: "Native plants, ornamental shrubs, and gardening advice.",
    location: "Santa Ana, capital",
    hours: "9:00 AM - 4:00 PM",
    social: "@JardinBotanicoLaLaguna",
    phone: "2243-1524"
  },
  {
    id: 9,
    name: "Green Roots Nursery",
    image: "nurseries/viver9.jpg",
    rating: 3,
    description: "Focused on restoring green spaces with hardy plants adapted to local climates.",
    location: "Zaragoza, La Libertad",
    hours: "6:00 AM - 5:00 PM",
    social: "@GreenRootsSV",
    phone: "7689-4521"
  },
  {
    id: 10,
    name: "Bloom Paradise Garden",
    image: "nurseries/viver11.jpg",
    rating: 4,
    description: "Bringing color and life to every space with vibrant seasonal flowers.",
    location: "Antiguo Cuscatlán, La Libertad",
    hours: "8:00 AM - 5:00 PM",
    social: "@BloomParadiseSV",
    phone: "7012-8899"
  },
  {
    id: 11,
    name: "EcoLife Nursery",
    image: "nurseries/viver10.jpg",
    rating: 5,
    description: "Dedicated to sustainable planting and eco-friendly gardening solutions.",
    location: "Colón, La Libertad",
    hours: "6:30 AM - 4:30 PM",
    social: "@EcoLifeSV",
    phone: "7654-1122"
  },
  {
    id: 12,
    name: "Mountain View Gardens",
    image: "nurseries/viver12.jpg",
    rating: 5,
    description: "Ideal spot for collectors of unique succulents and low-maintenance plants.",
    location: "El Boquerón, Santa Tecla",
    hours: "8:00 AM - 4:00 PM",
    social: "@TerraFloraGarden",
    phone: "7333-2164"
  },
]

export default { sponsoredNurseries, nurseries }
