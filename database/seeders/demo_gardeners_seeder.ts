import AccountProfile from '#models/account_profile'
import GardenerProfile from '#models/gardener_profile'
import GardenerService from '#models/gardener_service'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

const demoGardeners = [
  {
    firstName: 'Ana Isabel',
    lastName: 'Perez Vasquez',
    username: 'ana.isabel',
    email: 'ana.isabel@gmail.com',
    phone: '+503 7678-7645',
    photo: '/resources/images/services/Ana-Isabel.png',
    headline: 'Lawn care',
    bio: 'Lawn care specialist focused on clean, healthy outdoor spaces with organic maintenance options.',
    serviceArea: 'Santa Tecla',
    experienceYears: 6,
    ratingAverage: 4.8,
    ratingCount: 36,
    availabilitySchedule: 'Available Monday to Friday',
    paymentMethods: '8:00 AM - 6:00 PM',
    services: ['Lawn mowing', 'Organic fertilization', 'Pest control'],
  },
  {
    firstName: 'Laura Valentina',
    lastName: 'Diaz Morales',
    username: 'laura.morales',
    email: 'laura.morales@gmail.com',
    phone: '+503 7099-7876',
    photo: '/resources/images/services/profile2.png',
    headline: 'Garden restoration',
    bio: 'Restores patios and small gardens with pruning, cleanup, soil care, and practical plant recommendations.',
    serviceArea: 'Santa Tecla',
    experienceYears: 5,
    ratingAverage: 4.1,
    ratingCount: 32,
    availabilitySchedule: 'Available Monday to Friday',
    paymentMethods: '6:00 AM - 5:00 PM',
    services: ['Bush trimming', 'Leaf removal', 'Pest control'],
  },
  {
    firstName: 'Daniela Alejandra',
    lastName: 'Perez Romero',
    username: 'daniela.perez',
    email: 'daniela.perez@gmail.com',
    phone: '+503 9754-2806',
    photo: '/resources/images/services/profile3.png',
    headline: 'Irrigation systems',
    bio: 'Helps gardens stay watered with simple irrigation planning, planting support, and vertical garden setup.',
    serviceArea: 'Santa Tecla',
    experienceYears: 3,
    ratingAverage: 4.2,
    ratingCount: 23,
    availabilitySchedule: 'Available Monday to Friday',
    paymentMethods: '9:00 AM - 8:00 PM',
    services: ['Tree planting', 'Leaf removal', 'Vertical garden setup'],
  },
  {
    firstName: 'Valeria Beatriz',
    lastName: 'Campos Herrera',
    username: 'beatriz.campos',
    email: 'beatriz.campos@gmail.com',
    phone: '+503 7544-0876',
    photo: '/resources/images/services/profile4.png',
    headline: 'Lawn care',
    bio: 'Experienced gardener for soil improvement, planting, and organic fertilization plans.',
    serviceArea: 'Santa Tecla',
    experienceYears: 7,
    ratingAverage: 5.0,
    ratingCount: 40,
    availabilitySchedule: 'Available Monday to Friday',
    paymentMethods: '6:00 AM - 5:00 PM',
    services: ['Soil amendment', 'Tree planting', 'Organic fertilization'],
  },
]

export default class DemoGardenersSeeder extends BaseSeeder {
  async run() {
    for (const gardener of demoGardeners) {
      const user = await User.updateOrCreate(
        { email: gardener.email },
        {
          first_name: gardener.firstName,
          last_name: gardener.lastName,
          username: gardener.username,
          email: gardener.email,
          phone: gardener.phone,
          profilePicture: gardener.photo,
          password: 'PlantBud123!',
          role: 'gardener',
        }
      )

      await AccountProfile.updateOrCreate(
        { userId: user.id },
        {
          userId: user.id,
          displayName: `${gardener.firstName} ${gardener.lastName}`,
          avatarUrl: gardener.photo,
          location: gardener.serviceArea,
          bio: gardener.bio,
          subscriptionPlan: 'free',
          rewardPoints: 0,
          scannerMonthlyLimit: 5,
        }
      )

      const profile = await GardenerProfile.updateOrCreate(
        { userId: user.id },
        {
          userId: user.id,
          availabilitySchedule: gardener.availabilitySchedule,
          servicesOffered: gardener.services.join(', '),
          headline: gardener.headline,
          bio: gardener.bio,
          serviceArea: gardener.serviceArea,
          experienceYears: gardener.experienceYears,
          hourlyRate: null,
          isAvailable: true,
          publicPhone: gardener.phone,
          portfolioUrl: null,
          paymentMethods: gardener.paymentMethods,
          ratingAverage: gardener.ratingAverage,
          ratingCount: gardener.ratingCount,
        }
      )

      for (const service of gardener.services) {
        await GardenerService.updateOrCreate(
          {
            gardenerProfileId: profile.id,
            name: service,
          },
          {
            gardenerProfileId: profile.id,
            name: service,
            description: `${service} by ${gardener.firstName}`,
            basePrice: null,
            durationMinutes: null,
            isActive: true,
          }
        )
      }
    }
  }
}
