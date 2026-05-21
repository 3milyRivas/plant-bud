import type { HttpContext } from '@adonisjs/core/http'
import ornamentalPlants from '#data/ornamentalPlants'
import horticulturalPlants from '#data/horticulturalPlants'
import succulentPlants from '#data/succulentPlants'

// ✅ función para convertir objeto → array
function flattenPlants(plantsObject: any) {
  return Object.values(plantsObject).flat()
}

// ✅ convertir todo a arrays
const allPlants = [
  ...flattenPlants(ornamentalPlants),
  ...flattenPlants(horticulturalPlants),
  ...flattenPlants(succulentPlants),
]

export default class PlantsSearchController {
  public search({ request, response }: HttpContext) {
    const query = request.input('search')?.toLowerCase() || ''

    const results = allPlants.filter((plant: any) =>
      plant.name.toLowerCase().includes(query) ||
      plant.scientificName.toLowerCase().includes(query)
    )

    return response.ok(results)
  }
}
``