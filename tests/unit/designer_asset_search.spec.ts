import { test } from '@japa/runner'
import {
  buildDesignerAssetSearchProfile,
  rankDesignerAssetPhotos,
  type DesignerAssetPhoto,
} from '#services/designer_asset_search'

function photo(id: number, alt: string): DesignerAssetPhoto {
  return {
    id,
    alt,
    url: `https://images.pexels.com/photos/${id}/asset.jpg`,
    thumbnail: `https://images.pexels.com/photos/${id}/preview.jpg`,
    photographer: 'Plant Bud',
    photographerUrl: 'https://www.pexels.com',
    width: 1200,
    height: 1200,
  }
}

test.group('Designer asset search', () => {
  test('translates Spanish object names and rejects unrelated results', ({ assert }) => {
    const profile = buildDesignerAssetSearchProfile('Elefante')
    const results = rankDesignerAssetPhotos(
      [
        photo(1, 'Coca Cola bottle isolated on a white background'),
        photo(2, 'Elephant standing in a field'),
        photo(3, 'Full body elephant isolated on white background'),
      ],
      profile
    )

    assert.include(profile.apiQuery, 'elephant')
    assert.deepEqual(
      results.map((result) => result.id),
      [3, 2]
    )
  })

  test('keeps specific plant names instead of replacing them with garden plant', ({ assert }) => {
    const profile = buildDesignerAssetSearchProfile('Monstera plant')
    const results = rankDesignerAssetPhotos(
      [
        photo(1, 'Generic garden plant isolated on white background'),
        photo(2, 'Whole monstera plant isolated on a solid background'),
      ],
      profile
    )

    assert.include(profile.apiQuery, 'monstera plant')
    assert.deepEqual(
      results.map((result) => result.id),
      [2]
    )
  })

  test('treats named plant types as specific searches', ({ assert }) => {
    const profile = buildDesignerAssetSearchProfile('Palmera')
    const results = rankDesignerAssetPhotos(
      [
        photo(1, 'Generic garden plant isolated on a white background'),
        photo(2, 'Full palm plant isolated on a solid background'),
      ],
      profile
    )

    assert.include(profile.apiQuery, 'palm')
    assert.deepEqual(
      results.map((result) => result.id),
      [2]
    )
  })

  test('returns at most twenty coherent assets', ({ assert }) => {
    const profile = buildDesignerAssetSearchProfile('table')
    const results = rankDesignerAssetPhotos(
      Array.from({ length: 30 }, (_, index) =>
        photo(index + 1, `Complete table isolated on white background ${index}`)
      ),
      profile
    )

    assert.lengthOf(results, 20)
  })
})
