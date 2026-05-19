export interface PlantMetadata {
  image: string
  alt: string
  name: string
  scientificName: string
}

export interface PlantFamilies {
  araceae: PlantMetadata[]
  apocynaceae: PlantMetadata[]
}

const ornamentalPlants: PlantFamilies = {
  araceae: [
    {
      image: 'plants/araceae/adventure.png',
      alt: 'Adventure plant',
      name: 'Adventure',
      scientificName: 'Anthurium andraeanum',
    },
    {
      image: 'plants/araceae/dieff.png',
      alt: 'Dieffenbachia seguine plant',
      name: 'Dieffenbachia seguine',
      scientificName: "Dieffenbachia seguine 'Sparkle'",
    },
    {
      image: 'plants/araceae/filo.png',
      alt: 'Philodendron bipinnatifidum plant',
      name: 'Filodendro Paraguayo',
      scientificName: 'Philodendron bipinnatifidum',
    },
    {
      image: 'plants/araceae/variegated.png',
      alt: 'Variegated Snake plant',
      name: 'Variegated Snake',
      scientificName: 'Sansevieria trifasciata var.laurentii',
    },
    {
      image: 'plants/araceae/zebra.png',
      alt: 'Zebra plant',
      name: 'Zebra Plant',
      scientificName: 'Goeppertia zebrina',
    },
    {
      image: 'plants/araceae/swiss.png',
      alt: 'Swiss Cheese plant',
      name: 'Swiss Cheese',
      scientificName: 'Monstera deliciosa',
    },
    {
      image: 'plants/araceae/heartleaf.png',
      alt: 'Heartleaf Philodendron plant',
      name: 'Heartleaf Philodendron',
      scientificName: 'Philodendron hederaceum',
    },
    {
      image: 'plants/araceae/peace.png',
      alt: 'Peace Lily plant',
      name: 'Peace Lily',
      scientificName: 'Spathiphyllum wallisii',
    },
    {
      image: 'plants/araceae/calla.png',
      alt: 'Calla Lily plant',
      name: 'Calla Lily',
      scientificName: 'Zantedeschia aethiopica',
    },
    {
      image: 'plants/araceae/red.png',
      alt: 'Red Aglaonema plant',
      name: 'Red Aglaonema',
      scientificName: "Aglaonema 'Siam Aurora'",
    },
    {
      image: 'plants/araceae/dumb.png',
      alt: 'Dumb Cane Camille plant',
      name: 'Dumb Cane Camille',
      scientificName: "Dieffenbachia seguine 'Camille'",
    },
    {
      image: 'plants/araceae/evergreen.png',
      alt: 'Chinese Evergreen plant',
      name: 'Chinese Evergreen',
      scientificName: 'Aglaonema commutatum',
    },
    {
      image: 'plants/araceae/photos.png',
      alt: "Pothos 'Njoy' plant",
      name: "Pothos 'Njoy'",
      scientificName: "Epipremnum aureum 'Njoy'",
    },
    {
      image: 'plants/araceae/golden.png',
      alt: 'Golden pothos plant',
      name: 'Golden pothos',
      scientificName: 'Epipremnum aureum',
    },
    {
      image: 'plants/araceae/alocasia.png',
      alt: 'Alocasia Macrorrhizos plant',
      name: 'Alocasia Macrorrhizos',
      scientificName: "Alocasia macrorrhizos 'Stingray'",
    },
    {
      image: 'plants/araceae/taro.png',
      alt: 'Taro plant',
      name: 'Taro',
      scientificName: 'Colocasia esculenta',
    },
    {
      image: 'plants/araceae/zanzibar.png',
      alt: 'Zanzibar Gem plant',
      name: 'Zanzibar Gem',
      scientificName: 'Zamioculcas zamiifolia',
    },
    {
      image: 'plants/araceae/flamingo.png',
      alt: 'Flamingo Lily plant',
      name: 'Flamingo Lily',
      scientificName: 'Anthurium andraeanum',
    },
  ],

  apocynaceae: [
    {
      image: 'plants/apocynaceae/olander.png',
      alt: 'Olander plant',
      name: 'Olander',
      scientificName: 'Nerium oleander',
    },
    {
      image: 'plants/apocynaceae/provence.png',
      alt: 'Oleander “Provence” plant',
      name: 'Oleander “Provence”',
      scientificName: "Nerium oleander 'Provence'",
    },
    {
      image: 'plants/apocynaceae/common.png',
      alt: 'Common Periwinkle plant',
      name: 'Common Periwinkle',
      scientificName: 'Tulipa gesneriana',
    },
    {
      image: 'plants/apocynaceae/nosegay.png',
      alt: 'Nosegay Tree plant',
      name: 'Nosegay Tree',
      scientificName: 'Plumeria alba',
    },
    {
      image: 'plants/apocynaceae/trumpet.png',
      alt: 'Golden Trumpet plant',
      name: 'Golden Trumpet',
      scientificName: 'Allamanda cathartica',
    },
    {
      image: 'plants/apocynaceae/madagascar.png',
      alt: 'Swiss Cheese plant',
      name: 'Madagascar Periwinkle',
      scientificName: 'Catharanthus roseus',
    },
    {
      image: 'plants/apocynaceae/purple.png',
      alt: 'Purple Allamanda plant',
      name: 'Purple Allamanda',
      scientificName: 'Allamanda blanchetii',
    },
    {
      image: 'plants/apocynaceae/cascabela.png',
      alt: 'Cascabela Ovata plant',
      name: 'Cascabela Ovata',
      scientificName: 'Cascabela ovata',
    },
    {
      image: 'plants/apocynaceae/redd.png',
      alt: 'Red Frangipani plant',
      name: 'Red Frangipani',
      scientificName: 'Plumeria rubra',
    },
    {
      image: 'plants/apocynaceae/loroco.png',
      alt: 'loroco Vine plant',
      name: 'loroco Vine',
      scientificName: 'Fernaldia pandurata',
    },
    {
      image: 'plants/apocynaceae/wood.png',
      alt: 'Serpentine Wood plant',
      name: 'Serpentine Wood',
      scientificName: 'Rauvolfia serpentina',
    },
    {
      image: 'plants/apocynaceae/star.png',
      alt: 'Star Jasmineplant',
      name: 'Star Jasmine',
      scientificName: 'Trachelospermum jasminoides',
    },
    {
      image: 'plants/apocynaceae/vall.png',
      alt: 'Smooth Vallesia plant',
      name: 'Smooth Vallesia',
      scientificName: 'Vallesia glabra',
    },
    {
      image: 'plants/apocynaceae/xxx.png',
      alt: 'Waxflower plant',
      name: 'Waxflower',
      scientificName: 'Chamelaucium',
    },
    {
      image: 'plants/apocynaceae/natal.png',
      alt: 'Natal Plum plant',
      name: 'Natal Plum',
      scientificName: 'Carissa macrocarpa',
    },
    {
      image: 'plants/apocynaceae/blue-star.png',
      alt: 'Eastern Bluestar plant',
      name: 'Eastern Bluestar',
      scientificName: 'Amsonia tabernaemontana',
    },
    {
      image: 'plants/apocynaceae/rock.png',
      alt: 'Rocktrumpet plant',
      name: 'Rocktrumpet',
      scientificName: "Mandevilla × amabilis 'Alice du Pont'",
    },
    {
      image: 'plants/apocynaceae/frangipani.png',
      alt: 'Red Frangipani plant',
      name: 'Red Frangipani',
      scientificName: "Plumeria rubra 'Hawaiian Opal Pink'",
    },
  ],
}

export default ornamentalPlants