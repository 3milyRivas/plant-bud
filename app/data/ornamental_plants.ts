export interface PlantMetadata {
  image: string
  alt: string
  name: string
  scientificName: string
}

export interface PlantFamilies {
  araceae: PlantMetadata[]
  apocynaceae: PlantMetadata[]
  rutaceae: PlantMetadata[]
  rubiaceae: PlantMetadata[]
  zamiaceae: PlantMetadata[]
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

  rutaceae: [
  {
    image: 'plants/rutaceae/curry.png',
    alt: 'Curry Leaf Tree plant',
    name: 'Curry Leaf Tree',
    scientificName: 'Murraya koenigii',
  },
  {
    image: 'plants/rutaceae/rue.png',
    alt: 'Rue plant',
    name: 'Rue',
    scientificName: 'Ruta graveolens',
  },
  {
    image: 'plants/rutaceae/gas.png',
    alt: "Gas plant 'Albiflorus' plant",
    name: "Gas plant 'Albiflorus'",
    scientificName: "Dictamnus albus 'Albiflorus'",
  },
  {
    image: 'plants/rutaceae/gass.png',
    alt: 'Gas plant',
    name: 'Gas Plant',
    scientificName: 'Dictamnus albus',
  },
  {
    image: 'plants/rutaceae/kum.png',
    alt: 'Kumquat plant',
    name: 'Kumquat',
    scientificName: 'Citrus japonica',
  },
  {
    image: 'plants/rutaceae/white.png',
    alt: 'White Sapote plant',
    name: 'White Sapote',
    scientificName: 'Casimiroa edulis',
  },
  {
    image: 'plants/rutaceae/sich.png',
    alt: 'Sichuan Pepper plant',
    name: 'Sichuan Pepper',
    scientificName: 'Zanthoxylum piperitum',
  },
  {
    image: 'plants/rutaceae/cas.png',
    alt: 'Murraya paniculata plant',
    name: 'Murraya paniculata',
    scientificName: 'Murraya paniculata',
  },
  {
    image: 'plants/rutaceae/bal.png',
    alt: 'Balsam Torchwood plant',
    name: 'Balsam Torchwood',
    scientificName: 'Amyris balsamifera',
  },
  {
    image: 'plants/rutaceae/mex.png',
    alt: 'Mexican Orange plant',
    name: 'Mexican Orange',
    scientificName: 'Choisya ternata',
  },
  {
    image: 'plants/rutaceae/com.png',
    alt: 'Common Rue plant',
    name: 'Common Rue',
    scientificName: "Ruta graveolens 'Jackman's Blue'",
  },
  {
    image: 'plants/rutaceae/lime.png',
    alt: 'Lime Prickly Ash plant',
    name: 'Lime Prickly Ash',
    scientificName: 'Zanthoxylum fagara',
  },
  {
    image: 'plants/rutaceae/ash.png',
    alt: 'Common Prickly Ash plant',
    name: 'Common Prickly Ash',
    scientificName: 'Zanthoxylum americanum',
  },
  {
    image: 'plants/rutaceae/frin.png',
    alt: 'Fringed Rue plant',
    name: 'Fringed Rue',
    scientificName: 'Ruta chalepensis',
  },
  {
    image: 'plants/rutaceae/jap.png',
    alt: 'Japanese Skimmia plant',
    name: 'Japanese Skimmia',
    scientificName: 'Skimmia japonica',
  },
  {
    image: 'plants/rutaceae/argentine.png',
    alt: 'Argentine Prickly Ash plant',
    name: 'Argentine Prickly Ash',
    scientificName: 'Zanthoxylum coco',
  },
  {
    image: 'plants/rutaceae/w.png',
    alt: 'Wharangi plant',
    name: 'Wharangi',
    scientificName: 'Melicope ternata',
  },
  {
    image: 'plants/rutaceae/bo.png',
    alt: 'Boenninghausenia Albiflora plant',
    name: 'Boenninghausenia Albiflora',
    scientificName: 'Boenninghausenia albiflora',
  },
],

  rubiaceae: [
    {
      image: 'plants/rubiaceae/great.png',
      alt: 'Great Morinda plant',
      name: 'Great Morinda',
      scientificName: 'Morinda citrifolia',
    },
    {
      image: 'plants/rubiaceae/fire.png',
      alt: 'Rue plant',
      name: 'Firebush',
      scientificName: 'Hamelia patens',
    },
    {
      image: 'plants/rubiaceae/robu.png',
      alt: 'Robusta Coffee Plant',
      name: 'Robusta Coffee',
      scientificName: 'Coffea canephora',
    },
    {
      image: 'plants/rubiaceae/pan.png',
      alt: 'Panama Rose plant',
      name: 'Panama Rose',
      scientificName: 'Rondeletia odorata',
    },
    {
      image: 'plants/rubiaceae/coff.png',
      alt: 'Arabian Coffee plant',
      name: 'Arabian Coffee',
      scientificName: 'Coffea arabica',
    },
    {
      image: 'plants/rubiaceae/indigo.png',
      alt: 'White Indigo Berry plant',
      name: 'White Indigo Berry',
      scientificName: 'Randia aculeata',
    },
    {
      image: 'plants/rubiaceae/wild.png',
      alt: 'Wild Coffee plant',
      name: 'Wild Coffee',
      scientificName: 'Psychotria nervosa',
    },
    {
      image: 'plants/rubiaceae/co.png',
      alt: 'Common Buttonbush plant',
      name: 'Common Buttonbush',
      scientificName: 'Murraya paniculata',
    },
    {
      image: 'plants/rubiaceae/west.png',
      alt: 'West Indian Milkberry plant',
      name: 'West Indian Milkberry',
      scientificName: 'Chiococca alba',
    },
    {
      image: 'plants/rubiaceae/sea.png',
      alt: 'Sea randa plant',
      name: 'Sea randa',
      scientificName: 'Guettarda speciosa',
    },
    {
      image: 'plants/rubiaceae/gal.png',
      alt: 'Redgal plant',
      name: 'Redgal',
      scientificName: 'Morinda royoc',
    },
    {
      image: 'plants/rubiaceae/vine.png',
      alt: 'Firecracker Vine Ash plant',
      name: 'Firecracker Vine',
      scientificName: 'Manettia cordifolia',
    },
    {
      image: 'plants/rutaceae/ash.png',
      alt: 'Ashy Sabicea plant',
      name: 'Ashy Sabicea',
      scientificName: 'Zanthoxylum americanum',
    },
    {
      image: 'plants/rutaceae/frin.png',
      alt: 'Fringed rue plant',
      name: 'Fringed Rue',
      scientificName: 'Ruta chalepensis',
    },
    {
      image: 'plants/rutaceae/jap.png',
      alt: 'Japanese Skimmia plant',
      name: 'Japanese Skimmia',
      scientificName: 'Skimmia japonica',
    },
    {
      image: 'plants/rutaceae/argentine.png',
      alt: 'Argentine Prickly Ash plant',
      name: 'Argentine Prickly Ash',
      scientificName: 'Zanthoxylum coco',
    },
    {
      image: 'plants/rutaceae/w.png',
      alt: 'Wharangi plant',
      name: 'Wharangi',
      scientificName: 'Melicope ternata',
    },
    {
      image: 'plants/rutaceae/bo.png',
      alt: 'Boenninghausenia Albiflora plant',
      name: 'Boenninghausenia Albiflora',
      scientificName: 'Boenninghausenia albiflora',
    },
  ],

  zamiaceae: [
  {
    image: 'plants/zamiaceae/dioon.png',
    alt: 'Chestnut Dioon plant',
    name: 'Chestnut Dioon',
    scientificName: 'Dioon mejiae',
  },
  {
    image: 'plants/zamiaceae/pp.png',
    alt: 'Macrozamia Palm plant',
    name: 'Macrozamia Palm',
    scientificName: 'Macrozamia communis',
  },
  {
    image: 'plants/zamiaceae/cera.png',
    alt: 'Ceratozamia Mexicana plant',
    name: 'Ceratozamia Mexicana',
    scientificName: 'Ceratozamia mexicana',
  },
  {
    image: 'plants/zamiaceae/leafr.png',
    alt: 'Picta Leaf Zamia plant',
    name: 'Picta Leaf Zamia',
    scientificName: 'Zamia picta',
  },
  {
    image: 'plants/zamiaceae/cy.png',
    alt: 'Cardboard Cycad plant',
    name: 'Cardboard Cycad',
    scientificName: 'Zamia furfuracea',
  },
  {
    image: 'plants/zamiaceae/zami.png',
    alt: 'Zamia Loddigesii plant',
    name: 'Zamia Loddigesii',
    scientificName: 'Zamia loddigesii',
  },
  {
    image: 'plants/zamiaceae/lebo.png',
    alt: 'Lebombo Cycad plant',
    name: 'Lebombo Cycad',
    scientificName: 'Encephalartos lebomboensis',
  },
  {
    image: 'plants/zamiaceae/za.png',
    alt: 'Dressler Zamia plant',
    name: 'Dressler Zamia',
    scientificName: 'Zamia dressleri',
  },
  {
    image: 'plants/zamiaceae/head.png',
    alt: "Hottentot's Head plant",
    name: "Hottentot's Head",
    scientificName: 'Stangeria eriopus',
  },
  {
    image: 'plants/zamiaceae/flo.png',
    alt: 'Florida Arrowroot plant',
    name: 'Florida Arrowroot',
    scientificName: 'Zamia integrifolia',
  },
  {
    image: 'plants/zamiaceae/fri.png',
    alt: 'Encephalartos Friderici-Guilielmi plant',
    name: 'Encephalartos Friderici-Guilielmi',
    scientificName: 'Encephalartos friderici-guilielmi',
  },
  {
    image: 'plants/zamiaceae/burr.png',
    alt: 'Burrawang plant',
    name: 'Burrawang',
    scientificName: 'Macrozamia spiralis',
  },
  {
    image: 'plants/zamiaceae/salva.png',
    alt: 'Salvadoran Zamia plant',
    name: 'Salvadoran Zamia',
    scientificName: 'Zamia acuminata',
  },
  {
    image: 'plants/zamiaceae/car.png',
    alt: 'Cardboard Cycad plant',
    name: 'Cardboard Cycad',
    scientificName: 'Zamia furfuracea',
  },
  {
    image: 'plants/zamiaceae/vir.png',
    alt: "Virgin's Palm plant",
    name: "Virgin's Palm",
    scientificName: 'Dioon edule',
  },
  {
    image: 'plants/zamiaceae/ku.png',
    alt: 'Ceratozamia Kuesteriana plant',
    name: 'Ceratozamia Kuesteriana',
    scientificName: 'Ceratozamia kuesteriana',
  },
  {
    image: 'plants/zamiaceae/q.png',
    alt: 'Queensland Cycad plant',
    name: 'Queensland Cycad',
    scientificName: 'Lepidozamia hopei',
  },
  {
    image: 'plants/zamiaceae/fer.png',
    alt: 'Byfield Fern plant',
    name: 'Byfield Fern',
    scientificName: 'Bowenia serrulata',
  },
],

 }


export default ornamentalPlants
