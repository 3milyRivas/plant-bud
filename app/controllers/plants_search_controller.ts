import type { HttpContext } from '@adonisjs/core/http'
import ornamentalPlants from '#data/ornamentalPlants'
import horticulturalPlants from '#data/horticulturalPlants'
import succulentPlants from '#data/succulentPlants'

type SearchablePlant = {
  image: string
  alt?: string
  name: string
  scientificName: string
}

type PlantFamilyMap = Record<string, SearchablePlant[]>

type CatalogConfig = {
  path: string
  label: string
  families: PlantFamilyMap
}

const catalogs: CatalogConfig[] = [
  {
    path: '/araceae',
    label: 'Araceae catalog',
    families: ornamentalPlants as unknown as PlantFamilyMap,
  },
  {
    path: '/amaryllidaceae',
    label: 'Amaryllidaceae catalog',
    families: horticulturalPlants as unknown as PlantFamilyMap,
  },
  {
    path: '/cactaceae',
    label: 'Cactaceae catalog',
    families: succulentPlants as unknown as PlantFamilyMap,
  },
]

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function titleCaseFamily(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getScore(plant: SearchablePlant, family: string, query: string) {
  const name = normalizeSearchText(plant.name)
  const scientificName = normalizeSearchText(plant.scientificName)
  const normalizedFamily = normalizeSearchText(family)

  if (name === query) return 0
  if (name.startsWith(query)) return 1
  if (scientificName.startsWith(query)) return 2
  if (name.includes(query)) return 3
  if (scientificName.includes(query)) return 4
  if (normalizedFamily.includes(query)) return 5

  return null
}

export default class PlantsSearchController {
  public search({ request, response }: HttpContext) {
    const rawQuery =
      request.input('q') ||
      request.input('search') ||
      request.input('query') ||
      request.input('term') ||
      ''
    const query = normalizeSearchText(String(rawQuery).trim())

    if (query.length < 2) {
      return response.ok({ results: [] })
    }

    const results = catalogs
      .flatMap((catalog) =>
        Object.entries(catalog.families).flatMap(([family, plants]) =>
          plants
            .map((plant, plantIndex) => {
              const score = getScore(plant, family, query)
              const targetId = `plant-${family}-${plantIndex}`

              return score === null
                ? null
                : {
                    id: targetId,
                    name: plant.name,
                    scientificName: plant.scientificName,
                    family: titleCaseFamily(family),
                    catalog: catalog.label,
                    image: plant.image,
                    imageUrl: `/${plant.image}`,
                    href: `${catalog.path}#${targetId}`,
                    score,
                  }
            })
            .filter(Boolean)
        )
      )
      .sort((a, b) => {
        if (!a || !b) return 0
        return a.score - b.score || a.name.localeCompare(b.name)
      })
      .slice(0, 8)
      .map((result) => {
        const { score, ...safeResult } = result!

        return safeResult
      })

    return response.ok({ results })
  }
}
