export interface PlantMetadata {
  image: string
  alt: string
  name: string
  scientificName: string
}

export interface PlantFamilies {
  cactaceae: PlantMetadata[]

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
]

}


export default succulentPlants