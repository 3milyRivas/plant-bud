export type DesignerAssetPhoto = {
  id: number
  alt: string
  url: string
  thumbnail: string
  photographer: string
  photographerUrl: string
  width: number
  height: number
}

type SearchGroup = {
  terms: string[]
  conflicts: string[]
}

export type DesignerAssetSearchProfile = {
  displayQuery: string
  apiQuery: string
  translatedQuery: string
  group: SearchGroup | null
  requiredTerms: string[]
  specificTerms: string[]
}

const translations: Record<string, string> = {
  arbol: 'tree',
  arbusto: 'shrub',
  banca: 'bench',
  banco: 'bench',
  cactus: 'cactus',
  elefante: 'elephant',
  elefantes: 'elephant',
  flor: 'flower',
  helecho: 'fern',
  jardin: 'garden',
  lampara: 'lamp',
  maceta: 'planter',
  mesa: 'table',
  orquidea: 'orchid',
  palmera: 'palm',
  planta: 'plant',
  rosa: 'rose',
  silla: 'chair',
  sofa: 'sofa',
  sombrilla: 'umbrella',
  suculenta: 'succulent',
}

const groups: SearchGroup[] = [
  {
    terms: [
      'plant',
      'tree',
      'palm',
      'flower',
      'rose',
      'orchid',
      'fern',
      'bush',
      'shrub',
      'succulent',
      'cactus',
    ],
    conflicts: ['drink', 'bottle', 'can', 'logo', 'food', 'person', 'building'],
  },
  {
    terms: ['table', 'desk'],
    conflicts: ['tablet', 'spreadsheet', 'food', 'chart'],
  },
  {
    terms: ['chair', 'seat', 'stool', 'armchair'],
    conflicts: ['wheelchair', 'person', 'meeting'],
  },
  {
    terms: ['bench'],
    conflicts: ['workbench', 'laboratory', 'press'],
  },
  {
    terms: ['planter', 'pot', 'flowerpot'],
    conflicts: ['cooking pot', 'pottery class', 'person'],
  },
  {
    terms: ['lamp', 'lantern', 'light'],
    conflicts: ['traffic light', 'headlight', 'person'],
  },
  {
    terms: ['umbrella', 'parasol'],
    conflicts: ['rainy street', 'crowd', 'person'],
  },
  {
    terms: ['sofa', 'couch'],
    conflicts: ['person', 'living room scene'],
  },
]

const contextTerms = new Set([
  'a',
  'an',
  'and',
  'con',
  'de',
  'decorative',
  'del',
  'el',
  'for',
  'garden',
  'indoor',
  'la',
  'outdoor',
  'para',
  'patio',
  'the',
  'y',
])

const specificAssetTerms = new Set(['cactus', 'fern', 'orchid', 'palm', 'rose', 'succulent'])

const cleanBackgroundTerms = [
  'isolated',
  'white background',
  'solid background',
  'plain background',
  'studio background',
  'cutout',
]

const completeObjectTerms = [
  'full body',
  'full length',
  'full view',
  'whole',
  'standing',
  'single',
  'isolated',
  'side view',
  'front view',
]

const partialObjectTerms = [
  'close up',
  'close-up',
  'cropped',
  'detail',
  'partial',
  'group of',
  'herd',
  'crowd',
]

const sceneTerms = [
  'room',
  'street',
  'restaurant',
  'people',
  'person',
  'landscape',
  'interior',
  'building',
]

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function phraseMatches(haystack: string, needle: string) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const plural = /^[a-z]+$/.test(needle) ? 's?' : ''
  return new RegExp(`(^|\\s)${escaped}${plural}(?=\\s|$)`).test(haystack)
}

export function buildDesignerAssetSearchProfile(query: string): DesignerAssetSearchProfile {
  const displayQuery = query.trim()
  const normalizedQuery = normalize(query)
  const translatedTokens = normalizedQuery.split(' ').map((term) => translations[term] || term)
  const translatedQuery = translatedTokens.join(' ').trim()
  const group =
    groups.find((candidate) => translatedTokens.some((term) => candidate.terms.includes(term))) ||
    null
  const specificTerms = translatedTokens.filter(
    (term) =>
      !contextTerms.has(term) && (!group?.terms.includes(term) || specificAssetTerms.has(term))
  )
  const requiredTerms = unique(
    specificTerms.length
      ? specificTerms
      : group
        ? group.terms
        : translatedTokens.filter((term) => !contextTerms.has(term))
  )
  const objectType = group?.terms.some((term) =>
    ['plant', 'tree', 'palm', 'flower', 'shrub'].includes(term)
  )
    ? 'plant'
    : 'object'

  return {
    displayQuery,
    translatedQuery,
    group,
    requiredTerms,
    specificTerms,
    apiQuery: `${translatedQuery} complete ${objectType} isolated single object white solid background studio`,
  }
}

export function rankDesignerAssetPhotos(
  photos: DesignerAssetPhoto[],
  profile: DesignerAssetSearchProfile,
  limit = 20
) {
  return photos
    .map((photo) => {
      const alt = normalize(photo.alt || '')
      if (!alt) return null

      const groupMatches = profile.group
        ? profile.group.terms.filter((term) => phraseMatches(alt, term)).length
        : 0
      const requiredMatches = profile.requiredTerms.filter((term) =>
        phraseMatches(alt, term)
      ).length
      const specificMatches = profile.specificTerms.filter((term) =>
        phraseMatches(alt, term)
      ).length
      const conflicts = profile.group?.conflicts.filter((term) => alt.includes(term)).length || 0

      const isRelevant = profile.specificTerms.length
        ? specificMatches === profile.specificTerms.length && (!profile.group || groupMatches > 0)
        : profile.group
          ? groupMatches > 0
          : requiredMatches === profile.requiredTerms.length

      if (!isRelevant || conflicts > 0) return null

      const cleanMatches = cleanBackgroundTerms.filter((term) => alt.includes(term)).length
      const completeMatches = completeObjectTerms.filter((term) => alt.includes(term)).length
      const partialMatches = partialObjectTerms.filter((term) => alt.includes(term)).length
      const sceneMatches = sceneTerms.filter((term) => alt.includes(term)).length
      const exactPhrase = profile.translatedQuery && alt.includes(profile.translatedQuery) ? 1 : 0
      const score =
        exactPhrase * 30 +
        specificMatches * 18 +
        requiredMatches * 12 +
        groupMatches * 7 +
        cleanMatches * 10 +
        completeMatches * 6 -
        partialMatches * 10 -
        sceneMatches * 8

      return {
        ...photo,
        cleanBackground: cleanMatches > 0,
        score,
      }
    })
    .filter((photo): photo is DesignerAssetPhoto & { cleanBackground: boolean; score: number } =>
      Boolean(photo)
    )
    .sort((a, b) => b.score - a.score || b.width * b.height - a.width * a.height)
    .slice(0, Math.min(20, limit))
}
