export interface PlantMetadata {
  image: string
  alt: string
  name: string
  scientificName: string
}

export interface PlantFamilies {
  cactaceae: PlantMetadata[]
  euphorbiaceae: PlantMetadata[]
  asparagaceae: PlantMetadata[]
  crassulaceae: PlantMetadata[]
  asphodelaceae: PlantMetadata[]
}

const succulentPlants: PlantFamilies = {
  cactaceae: [
    {
      image: 'plants/cactaceae/queen.png',
      alt: 'Queen of the night plant',
      name: 'Queen of the night',
      scientificName: 'Epiphyllum oxypetalum',
    },
    {
      image: 'plants/cactaceae/dragon-fruit.png',
      alt: 'Dragon fruit plant',
      name: 'Dragon fruit',
      scientificName: 'Hylocereus undatus',
    },
    {
      image: 'plants/cactaceae/rhipsalis.png',
      alt: 'Rhipsalis mistletoe cactus plant',
      name: 'Rhipsalis mistletoe cactus',
      scientificName: 'Rhipsalis baccifera',
    },
    {
      image: 'plants/cactaceae/hedgehog.png',
      alt: 'Hedgehog cactus plant',
      name: 'Hedgehog cactus',
      scientificName: 'Echinocereus pentalophus',
    },
    {
      image: 'plants/cactaceae/zigzag.png',
      alt: 'Zigzag cactus plant',
      name: 'Zigzag cactus',
      scientificName: 'Selenicereus anthonyanus',
    },
    {
      image: 'plants/cactaceae/barrel.png',
      alt: 'Golden barrel cactus plant',
      name: 'Golden barrel cactus',
      scientificName: 'Echinocactus grusonii',
    },
    {
      image: 'plants/cactaceae/creeping.png',
      alt: 'Creeping cactus plant',
      name: 'Creeping cactus',
      scientificName: 'Rhipsalis pilocarpa',
    },
    {
      image: 'plants/cactaceae/yellow-pitaya.png',
      alt: 'Yellow pitaya plant',
      name: 'Yellow pitaya',
      scientificName: 'Selenicereus megalanthus',
    },
    {
      image: 'plants/cactaceae/orchidd.png',
      alt: 'Orchid cactus plant',
      name: 'Orchid cactus',
      scientificName: 'Disocactus ackermannii',
    },
    {
      image: 'plants/cactaceae/cap.png',
      alt: "Turk's cap cactus plant",
      name: "Turk's cap cactus",
      scientificName: 'Melocactus curvispinus',
    },
    {
      image: 'plants/cactaceae/old-man.png',
      alt: 'Old man cactus plant',
      name: 'Old man cactus',
      scientificName: 'Cephalocereus senilis',
    },
    {
      image: 'plants/cactaceae/giant.png',
      alt: 'Mexican giant cactus plant',
      name: 'Mexican giant cactus',
      scientificName: 'Pachycereus pringlei',
    },
    {
      image: 'plants/cactaceae/blue.png',
      alt: 'Blue myrtle cactus plant',
      name: 'Blue myrtle cactus',
      scientificName: 'Myrtillocactus geometrizans',
    },
    {
      image: 'plants/cactaceae/rainbow.png',
      alt: 'Rainbow cactus plant',
      name: 'Rainbow cactus',
      scientificName: 'Echinocereus rigidissimus',
    },
    {
      image: 'plants/cactaceae/strawberry.png',
      alt: 'Strawberry cactus plant',
      name: 'Strawberry cactus',
      scientificName: 'Echinocereus enneacanthus',
    },
    {
      image: 'plants/cactaceae/bishops.png',
      alt: "Bishop's cap cactus plant",
      name: "Bishop's cap cactus",
      scientificName: 'Astrophytum myriostigma',
    },
    {
      image: 'plants/cactaceae/easter-lily.png',
      alt: 'Easter lily cactus plant',
      name: 'Easter lily cactus',
      scientificName: 'Echinopsis subdenudata',
    },
    {
      image: 'plants/cactaceae/pincushion.png',
      alt: 'Pincushion cactus plant',
      name: 'Pincushion cactus',
      scientificName: 'Mammillaria compressa',
    },
  ],

  euphorbiaceae: [
    {
      image: 'plants/euphorbiaceae/crown.png',
      alt: 'Crown of thorns plant',
      name: 'Crown of thorns',
      scientificName: 'Euphorbia milii',
    },
    {
      image: 'plants/euphorbiaceae/snow.png',
      alt: 'Snow on the mountain plant',
      name: 'Snow on the mountain',
      scientificName: 'Euphorbia marginata',
    },
    {
      image: 'plants/euphorbiaceae/castor.png',
      alt: 'Castor oil plant',
      name: 'Castor oil plant',
      scientificName: 'Ricinus communis',
    },
    {
      image: 'plants/euphorbiaceae/backbone.png',
      alt: "Devil's backbone plant",
      name: "Devil's backbone",
      scientificName: 'Euphorbia tithymaloides',
    },
    {
      image: 'plants/euphorbiaceae/poinsettia.png',
      alt: 'Poinsettia plant',
      name: 'Poinsettia',
      scientificName: 'Euphorbia pulcherrima',
    },
    {
      image: 'plants/euphorbiaceae/african.png',
      alt: 'African milk tree plant',
      name: 'African milk tree',
      scientificName: 'Euphorbia trigona',
    },
    {
      image: 'plants/euphorbiaceae/pencil.png',
      alt: 'Pencil cactus plant',
      name: 'Pencil cactus',
      scientificName: 'Euphorbia tirucalli',
    },
    {
      image: 'plants/euphorbiaceae/red-hot.png',
      alt: "Red hot cat's tail plant",
      name: "Red hot cat's tail",
      scientificName: 'Acalypha hispida',
    },
    {
      image: 'plants/euphorbiaceae/garden-croton.png',
      alt: 'Garden croton plant',
      name: 'Garden croton',
      scientificName: 'Codiaeum variegatum',
    },
    {
      image: 'plants/euphorbiaceae/rubber.png',
      alt: 'Rubber tree plant',
      name: 'Rubber tree',
      scientificName: 'Hevea brasiliensis',
    },
    {
      image: 'plants/euphorbiaceae/copperleaf.png',
      alt: 'Copperleaf plant',
      name: 'Copperleaf',
      scientificName: 'Acalypha wilkesiana',
    },
    {
      image: 'plants/euphorbiaceae/manchineel.png',
      alt: 'Manchineel tree plant',
      name: 'Manchineel tree',
      scientificName: 'Hippomane mancinella',
    },
    {
      image: 'plants/euphorbiaceae/chameleon.png',
      alt: 'Chameleon plant',
      name: 'Chameleon plant',
      scientificName: 'Myrtillocactus geometrizans',
    },
    {
      image: 'plants/euphorbiaceae/jatropha.png',
      alt: 'Jatropha plant',
      name: 'Jatropha',
      scientificName: 'Jatropha curcas',
    },
    {
      image: 'plants/euphorbiaceae/phyllanthus.png',
      alt: 'Phyllanthus niruri plant',
      name: 'Phyllanthus niruri',
      scientificName: 'Echinocereus enneacanthus',
    },
    {
      image: 'plants/euphorbiaceae/bellyache-bush.png',
      alt: 'Bellyache bush plant',
      name: 'Bellyache bush',
      scientificName: 'Jatropha gossypiifolia',
    },
    {
      image: 'plants/euphorbiaceae/sandbox.png',
      alt: 'Sandbox tree plant',
      name: 'Sandbox tree',
      scientificName: 'Hura crepitans',
    },
    {
      image: 'plants/euphorbiaceae/purging-croton.png',
      alt: 'Purging croton plant',
      name: 'Purging croton',
      scientificName: 'Croton tiglium',
    },
  ],

  asparagaceae: [
    {
      image: 'plants/asparagaceae/century.png',
      alt: 'Century plant',
      name: 'Century Plant',
      scientificName: 'Agave americana',
    },
    {
      image: 'plants/asparagaceae/izote.png',
      alt: 'Izote plant',
      name: 'Izote',
      scientificName: 'Yucca guatemalensis',
    },
    {
      image: 'plants/asparagaceae/agave-geminiflora.png',
      alt: 'Agave geminiflora plant',
      name: 'Agave geminiflora',
      scientificName: 'Agave geminiflora',
    },
    {
      image: 'plants/asparagaceae/squill.png',
      alt: 'Squill plant',
      name: 'Squill',
      scientificName: 'Scilla siberica',
    },
    {
      image: 'plants/asparagaceae/mescal-agave.png',
      alt: 'Mescal agave plant',
      name: 'Mescal Agave',
      scientificName: 'Agave marmorata',
    },
    {
      image: 'plants/asparagaceae/asparaguss.png',
      alt: 'Asparagus plant',
      name: 'Asparagus',
      scientificName: 'Asparagus officinalis',
    },
    {
      image: 'plants/asparagaceae/foxtail-agave.png',
      alt: 'Foxtail agave plant',
      name: 'Foxtail agave',
      scientificName: 'Agave attenuata',
    },
    {
      image: 'plants/asparagaceae/false.png',
      alt: 'Giant false agave plant',
      name: 'Giant false agave',
      scientificName: 'Furcraea gigantea',
    },
    {
      image: 'plants/asparagaceae/dracaena.png',
      alt: 'Red dracaena plant',
      name: 'Red Dracaena',
      scientificName: 'Dracaena marginata',
    },
    {
      image: 'plants/asparagaceae/caribbean.png',
      alt: 'Caribbean agave plant',
      name: 'Caribbean Agave',
      scientificName: 'Agave angustifolia',
    },
    {
      image: 'plants/asparagaceae/ti-plant.png',
      alt: 'Ti plant',
      name: 'Ti Plant',
      scientificName: 'Cordyline fruticosa',
    },
    {
      image: 'plants/asparagaceae/corn-plant.png',
      alt: 'Corn plant',
      name: 'Corn Plant',
      scientificName: 'Dracaena fragrans',
    },
    {
      image: 'plants/asparagaceae/hyacinth.png',
      alt: 'Hyacinth plant',
      name: 'Hyacinth',
      scientificName: 'Hyacinthus orientalis',
    },
    {
      image: 'plants/asparagaceae/jatrophaa.png',
      alt: 'Jatropha plant',
      name: 'Jatropha',
      scientificName: 'Agave victoriae reginae',
    },
    {
      image: 'plants/asparagaceae/snake-plant.png',
      alt: 'Snake plant',
      name: 'Snake plant',
      scientificName: 'Dracaena trifasciata',
    },
    {
      image: 'plants/asparagaceae/false-agave.png',
      alt: 'False agave plant',
      name: 'False agave',
      scientificName: 'Furcraea foetida',
    },
    {
      image: 'plants/asparagaceae/hyacinth.png',
      alt: 'Grape hyacinth plant',
      name: 'Grape Hyacinth',
      scientificName: 'Muscari armeniacum',
    },
    {
      image: 'plants/asparagaceae/offf.png',
      alt: 'Star of Bethlehem plant',
      name: 'Star of Bethlehem',
      scientificName: 'Ornithogalum umbellatum',
    },
  ],

  crassulaceae: [
  {
    image: 'plants/crassulaceae/jade-plant.png',
    alt: 'Jade plant',
    name: 'Jade plant',
    scientificName: 'Crassula ovata',
  },
  {
    image: 'plants/crassulaceae/miniature.png',
    alt: 'Miniature pine tree plant',
    name: 'Miniature pine tree',
    scientificName: 'Crassula tetragona',
  },
  {
    image: 'plants/crassulaceae/moonstones.png',
    alt: 'Moonstones plant',
    name: 'Moonstones',
    scientificName: 'Pachyphytum compactum',
  },
  {
    image: 'plants/crassulaceae/watch.png',
    alt: 'Watch chain plant',
    name: 'Watch chain plant',
    scientificName: 'Crassula muscosa',
  },
  {
    image: 'plants/crassulaceae/propeller.png',
    alt: 'Propeller plant',
    name: 'Propeller plant',
    scientificName: 'Crassula perfoliata var.falcata',
  },
  {
    image: 'plants/crassulaceae/leaf-plant.png',
    alt: 'Crinkle leaf plant',
    name: 'Crinkle leaf plant',
    scientificName: 'Adromischus cristatus',
  },
  {
    image: 'plants/crassulaceae/rose-aeonium.png',
    alt: 'Black rose aeonium plant',
    name: 'Black rose aeonium',
    scientificName: 'Aeonium Zwartkop',
  },
  {
    image: 'plants/crassulaceae/topsy-turvy.png',
    alt: 'Topsy turvy plant',
    name: 'Topsy Turvy',
    scientificName: 'Echeveria runyonii',
  },
  {
    image: 'plants/crassulaceae/aeonium.png',
    alt: 'Kiwi aeonium plant',
    name: 'Kiwi aeonium',
    scientificName: 'Aeonium Kiwi',
  },
  {
    image: 'plants/crassulaceae/baby-jade.png',
    alt: 'Baby jade plant',
    name: 'Baby jade',
    scientificName: 'Crassula arborescens',
  },
  {
    image: 'plants/crassulaceae/red-pagoda.png',
    alt: 'Red pagoda plant',
    name: 'Red pagoda',
    scientificName: 'Crassula capitella',
  },
  {
    image: 'plants/crassulaceae/silver-jade.png',
    alt: 'Silver jade plant',
    name: 'Silver jade',
    scientificName: 'Crassula arborescens ssp.undulatifolia',
  },
  {
    image: 'plants/crassulaceae/edge-echeveria.png',
    alt: 'Red echeveria plant',
    name: 'Red Echeveria',
    scientificName: 'Echeveria agavoides',
  },
  {
    image: 'plants/crassulaceae/aeoniumm.png',
    alt: 'Tree aeonium plant',
    name: 'Tree aeonium',
    scientificName: 'Aeonium arboreum',
  },
  {
    image: 'plants/crassulaceae/mother-of-thousands.png',
    alt: 'Mother of thousands plant',
    name: 'Mother of Thousands',
    scientificName: 'Kalanchoe daigremontiana',
  },
  {
    image: 'plants/crassulaceae/jelly-bean.png',
    alt: 'Jelly bean plant',
    name: 'Jelly Bean Plant',
    scientificName: 'Sedum rubrotinctum',
  },
  {
    image: 'plants/crassulaceae/ice.png',
    alt: 'Ice plant',
    name: 'Ice Plant',
    scientificName: 'Delosperma cooperi',
  },
  {
    image: 'plants/crassulaceae/pigs.png',
    alt: "Pig's ear plant",
    name: "Pig's Ear",
    scientificName: 'Cotyledon orbiculata',
  },
],

asphodelaceae: [
  {
    image: 'plants/asphodelaceae/aloe-vera.png',
    alt: 'Aloe vera plant',
    name: 'Aloe vera',
    scientificName: 'Aloe vera',
  },
  {
    image: 'plants/asphodelaceae/sunset-aloe.png',
    alt: 'Sunset aloe plant',
    name: 'Sunset Aloe',
    scientificName: 'Aloe dorotheae',
  },
  {
    image: 'plants/asphodelaceae/cape.png',
    alt: 'Cape aloe plant',
    name: 'Cape Aloe',
    scientificName: 'Aloe ferox',
  },
  {
    image: 'plants/asphodelaceae/bulbine.png',
    alt: 'Bulbine lily plant',
    name: 'Bulbine Lily',
    scientificName: 'Bulbine frutescens',
  },
  {
    image: 'plants/asphodelaceae/coral.png',
    alt: 'Coral aloe plant',
    name: 'Coral Aloe',
    scientificName: 'Aloe striata',
  },
  {
    image: 'plants/asphodelaceae/daylily.png',
    alt: 'Lemon daylily plant',
    name: 'Lemon Daylily',
    scientificName: 'Hemerocallis lilioasphodelus',
  },
  {
    image: 'plants/asphodelaceae/blue-aloe.png',
    alt: 'Blue aloe plant',
    name: 'Blue Aloe',
    scientificName: 'Aloe glauca',
  },
  {
    image: 'plants/asphodelaceae/spiral-aloe.png',
    alt: 'Spiral aloe plant',
    name: 'Spiral Aloe',
    scientificName: 'Aloe polyphylla',
  },
  {
    image: 'plants/asphodelaceae/hot-poker.png',
    alt: 'Red hot poker plant',
    name: 'Red Hot Poker',
    scientificName: 'Kniphofia uvaria',
  },
  {
    image: 'plants/asphodelaceae/soap.png',
    alt: 'Soap aloe plant',
    name: 'Soap Aloe',
    scientificName: 'Aloe maculata',
  },
  {
    image: 'plants/asphodelaceae/bulbine.png',
    alt: 'Yellow bulbine plant',
    name: 'Yellow Bulbine',
    scientificName: 'Bulbine abyssinica',
  },
  {
    image: 'plants/asphodelaceae/golden-tooth.png',
    alt: 'Golden tooth aloe plant',
    name: 'Golden Tooth Aloe',
    scientificName: 'Aloe nobilis',
  },
  {
    image: 'plants/asphodelaceae/daylilyy.png',
    alt: 'Daylily plant',
    name: 'Daylily',
    scientificName: 'Hemerocallis fulva',
  },
  {
    image: 'plants/asphodelaceae/medicinal-aloe.png',
    alt: 'Medicinal aloe plant',
    name: 'Medicinal Aloe',
    scientificName: 'Aloe barbadensis',
  },
  {
    image: 'plants/asphodelaceae/mounttain.png',
    alt: 'Mountain aloe plant',
    name: 'Mountain Aloe',
    scientificName: 'Aloe marlothii',
  },
  {
    image: 'plants/asphodelaceae/lace.png',
    alt: 'Lace aloe plant',
    name: 'Lace Aloe',
    scientificName: 'Aloe aristata',
  },
  {
    image: 'plants/asphodelaceae/climbing.png',
    alt: 'Climbing aloe plant',
    name: 'Climbing Aloe',
    scientificName: 'Aloe tenuior',
  },
  {
    image: 'plants/asphodelaceae/sinkatana.png',
    alt: 'Aloe sinkatana plant',
    name: 'Aloe Sinkatana',
    scientificName: 'Aloe sinkatana',
  },
],
}

export default succulentPlants