export interface PlantMetadata {
  image: string
  alt: string
  name: string
  scientificName: string
}

export interface PlantFamilies {
  amaryllidaceae: PlantMetadata[]
  brassicaceae: PlantMetadata[]
  apiaceae: PlantMetadata[]
  cucurbitaceae: PlantMetadata[]
  solanaceae: PlantMetadata[]
}

const horticulturalPlants: PlantFamilies = {
  amaryllidaceae: [
    {
      image: 'plants/amaryllidaceae/garlic.png',
      alt: 'Garlic plant',
      name: 'Garlic',
      scientificName: 'Allium sativum',
    },
    {
      image: 'plants/amaryllidaceae/canadian.png',
      alt: 'Canadian onion plant',
      name: 'Canadian onion',
      scientificName: 'Allium canadense',
    },
    {
      image: 'plants/amaryllidaceae/flowering.png',
      alt: 'Flowering onion plant',
      name: 'Flowering onion',
      scientificName: 'Allium Moly',
    },
    {
      image: 'plants/amaryllidaceae/onion.png',
      alt: 'Onion plant',
      name: 'Onion',
      scientificName: 'Allium cepa',
    },
    {
      image: 'plants/amaryllidaceae/rocamboloe.png',
      alt: 'Rocambole garlic plant',
      name: 'Rocambole garlic',
      scientificName: 'Allium scorodoprasum',
    },
    {
      image: 'plants/amaryllidaceae/blue-flower-onion.png',
      alt: 'Blue flower onion plant',
      name: 'Blue flower onion',
      scientificName: 'Allium caeruleum',
    },
    {
      image: 'plants/amaryllidaceae/chives.png',
      alt: 'Chives plant',
      name: 'Chives',
      scientificName: 'Allium schoenoprasum',
    },
    {
      image: 'plants/amaryllidaceae/bulb-onion.png',
      alt: 'Bulb onion plant',
      name: 'Bulb onion',
      scientificName: 'Allium cepa',
    },
    {
      image: 'plants/amaryllidaceae/field-garlic.png',
      alt: 'Field garlic plant',
      name: 'Field garlic',
      scientificName: 'Allium vineale',
    },
    {
      image: 'plants/amaryllidaceae/spring-onion.png',
      alt: 'Spring onion plant',
      name: 'Spring onion',
      scientificName: 'Allium fistulosum',
    },
    {
      image: 'plants/amaryllidaceae/white-flower-onion.png',
      alt: 'White flower onion plant',
      name: 'White flower onion',
      scientificName: 'Allium neapolitanum',
    },
    {
      image: 'plants/amaryllidaceae/welsh.png',
      alt: 'Welsh onion plant',
      name: 'Welsh onion',
      scientificName: 'Allium fistulosum',
    },
    {
      image: 'plants/amaryllidaceae/pink-flower-onion.png',
      alt: 'Pink flower onion plant',
      name: 'Pink flower onion',
      scientificName: 'Allium roseum',
    },
    {
      image: 'plants/amaryllidaceae/lily.png',
      alt: 'Lily plant',
      name: 'Lily',
      scientificName: 'Lilium spp.',
    },
    {
      image: 'plants/amaryllidaceae/tulip.png',
      alt: 'Tulips plant',
      name: 'Tulips',
      scientificName: 'Tulipa Spring Green',
    },
    {
      image: 'plants/amaryllidaceae/madona-lily.png',
      alt: 'Madonna Lily plant',
      name: 'Madonna Lily',
      scientificName: 'Lilium candidum',
    },
    {
      image: 'plants/amaryllidaceae/asparagus.png',
      alt: 'Asparagus plant',
      name: 'Asparagus',
      scientificName: 'Asparagus officinalis',
    },
    {
      image: 'plants/amaryllidaceae/aloe-vera.png',
      alt: 'Aloe Vera plant',
      name: 'Aloe Vera',
      scientificName: 'Aloe vera',
    },
  ],

  brassicaceae: [
    {
      image: 'plants/brassicaceae/cabbage.png',
      alt: 'Cabbage plant',
      name: 'Cabbage',
      scientificName: 'Brassica oleracea var. capitata',
    },
    {
      image: 'plants/brassicaceae/bok-choy.png',
      alt: 'Bok Choy plant',
      name: 'Bok choy',
      scientificName: 'Brassica rapa var. chinensis',
    },
    {
      image: 'plants/brassicaceae/chinese-cabbage.png',
      alt: 'Chinese cabbage plant',
      name: 'Chinese cabbage',
      scientificName: 'Brassica rapa var. pekinensis',
    },
    {
      image: 'plants/brassicaceae/brussels-sprouts.png',
      alt: 'Brussels sprouts plant',
      name: 'Brussels sprouts',
      scientificName: 'Brassica oleracea var. gemmifera',
    },
    {
      image: 'plants/brassicaceae/radish.png',
      alt: 'Radish plant',
      name: 'Radish',
      scientificName: 'Raphanus sativus',
    },
    {
      image: 'plants/brassicaceae/broccoli.png',
      alt: 'Broccoli plant',
      name: 'Broccoli',
      scientificName: 'Brassica oleracea var. italica',
    },
    {
      image: 'plants/brassicaceae/turnip.png',
      alt: 'Turnip plant',
      name: 'Turnip',
      scientificName: 'Brassica rapa var. rapa',
    },
    {
      image: 'plants/brassicaceae/cauliflower.png',
      alt: 'Cauliflower plant',
      name: 'Cauliflower',
      scientificName: 'Brassica oleracea var. botrytis',
    },
    {
      image: 'plants/brassicaceae/kohlrabi.png',
      alt: 'Kohlrabi plant',
      name: 'Kohlrabi',
      scientificName: 'Brassica oleracea var. gongylodes',
    },
    {
      image: 'plants/brassicaceae/white-mustard.png',
      alt: 'White mustard plant',
      name: 'White mustard',
      scientificName: 'Sinapis alba',
    },
    {
      image: 'plants/brassicaceae/arugula.png',
      alt: 'Arugula plant',
      name: 'Arugula',
      scientificName: 'Eruca vesicaria',
    },
    {
      image: 'plants/brassicaceae/watercrees.png',
      alt: 'Watercress plant',
      name: 'Watercress',
      scientificName: 'Nasturtium officinale',
    },
    {
      image: 'plants/brassicaceae/bittercress.png',
      alt: 'Bittercress plant',
      name: 'Bittercress',
      scientificName: 'Cardamine hirsuta',
    },
    {
      image: 'plants/brassicaceae/black-mustard.png',
      alt: 'Black mustard plant',
      name: 'Black mustard',
      scientificName: 'Brassica nigra',
    },
    {
      image: 'plants/brassicaceae/stock-flower.png',
      alt: 'Stock flower plant',
      name: 'Stock flower',
      scientificName: 'Matthiola incana',
    },
    {
      image: 'plants/brassicaceae/mustard-greens.png',
      alt: 'Mustard greens plant',
      name: 'Mustard greens',
      scientificName: 'Brassica juncea',
    },
    {
      image: 'plants/brassicaceae/sea-kale.png',
      alt: 'Sea kale plant',
      name: 'Sea kale',
      scientificName: 'Crambe maritima',
    },
    {
      image: 'plants/brassicaceae/candytuft.png',
      alt: 'Candytuft plant',
      name: 'Candytuft',
      scientificName: 'Iberis sempervirens',
    },
  ],

  apiaceae: [
    {
      image: 'plants/apiaceae/carrot.png',
      alt: 'Carrot plant',
      name: 'Carrot',
      scientificName: 'Daucus carota',
    },
    {
      image: 'plants/apiaceae/caraway.png',
      alt: 'Caraway plant',
      name: 'Caraway',
      scientificName: 'Carum carvi',
    },
    {
      image: 'plants/apiaceae/mexican-coriander.png',
      alt: 'Mexican coriander plant',
      name: 'Mexican coriander',
      scientificName: 'Eryngium foetidum',
    },
    {
      image: 'plants/apiaceae/parsnip.png',
      alt: 'Parsnip plant',
      name: 'Parsnip',
      scientificName: 'Pastinaca sativa',
    },
    {
      image: 'plants/apiaceae/cumin.png',
      alt: 'Cumin plant',
      name: 'Cumin',
      scientificName: 'Cuminum cyminum',
    },
    {
      image: 'plants/apiaceae/dill.png',
      alt: 'Dill plant',
      name: 'Dill',
      scientificName: 'Anethum graveolens',
    },
    {
      image: 'plants/apiaceae/anise.png',
      alt: 'Anise plant',
      name: 'Anise',
      scientificName: 'Pimpinella anisum',
    },
    {
      image: 'plants/apiaceae/sea-parsley.png',
      alt: 'Sea parsley plant',
      name: 'Sea parsley',
      scientificName: 'Ligusticum mutellina',
    },
    {
      image: 'plants/apiaceae/celery.png',
      alt: 'Celery plant',
      name: 'Celery',
      scientificName: 'Apium graveolens',
    },
    {
      image: 'plants/apiaceae/parsley.png',
      alt: 'Parsley plant',
      name: 'Parsley',
      scientificName: 'Petroselinum crispum',
    },
    {
      image: 'plants/apiaceae/fennel.png',
      alt: 'Fennel plant',
      name: 'Fennel',
      scientificName: 'Foeniculum vulgare',
    },
    {
      image: 'plants/apiaceae/wild-parsley.png',
      alt: 'Wild parsley plant',
      name: 'Wild parsley',
      scientificName: 'Petroselinum neapolitanum',
    },
    {
      image: 'plants/apiaceae/sea-fennel.png',
      alt: 'Sea fennel plant',
      name: 'Sea fennel',
      scientificName: 'Crithmum maritimum',
    },
    {
      image: 'plants/apiaceae/curly-parsley.png',
      alt: 'Curly parsley plant',
      name: 'Curly parsley',
      scientificName: 'Petroselinum crispum var. crispum',
    },
    {
      image: 'plants/apiaceae/celeriac.png',
      alt: 'Celeriac plant',
      name: 'Celeriac',
      scientificName: 'Apium graveolens var. rapaceum',
    },
    {
      image: 'plants/apiaceae/fools-parsley.png',
      alt: "Fool's parsley plant",
      name: "Fool's parsley",
      scientificName: 'Aethusa cynapium',
    },
    {
      image: 'plants/apiaceae/mitsuba.png',
      alt: 'Mitsuba plant',
      name: 'Mitsuba',
      scientificName: 'Cryptotaenia japonica',
    },
    {
      image: 'plants/apiaceae/coriander.png',
      alt: 'Coriander plant',
      name: 'Coriander',
      scientificName: 'Coriandrum sativum',
    },

  ],

  cucurbitaceae: [
    {
      image: 'plants/cucurbitaceae/cucumber.png',
      alt: 'Cucumber plant',
      name: 'Cucumber',
      scientificName: 'Cucumis sativus',
    },
    {
      image: 'plants/cucurbitaceae/chayote.png',
      alt: 'Chayote plant',
      name: 'Chayote',
      scientificName: 'Sechium edule',
    },
    {
      image: 'plants/cucurbitaceae/watermelon.png',
      alt: 'Watermelon plant',
      name: 'Watermelon',
      scientificName: 'Citrullus lanatus',
    },
    {
      image: 'plants/cucurbitaceae/pumpkin.png',
      alt: 'Pumpkin plant',
      name: 'Pumpkin',
      scientificName: 'Cucurbita pepo',
    },
    {
      image: 'plants/cucurbitaceae/squash.png',
      alt: 'Squash plant',
      name: 'Squash',
      scientificName: 'Cucurbita moschata',
    },
    {
      image: 'plants/cucurbitaceae/melon.png',
      alt: 'Melon plant',
      name: 'Melon',
      scientificName: 'Cucumis melo',
    },
    {
      image: 'plants/cucurbitaceae/figleaf.png',
      alt: 'Figleaf gourd plant',
      name: 'Figleaf gourd',
      scientificName: 'Cucurbita ficifolia',
    },
    {
      image: 'plants/cucurbitaceae/butternut-squash.png',
      alt: 'Butternut squash plant',
      name: 'Butternut squash',
      scientificName: 'Cucurbita moschata var.butternut',
    },
    {
      image: 'plants/cucurbitaceae/sweet-cucumber.png',
      alt: 'Sweet cucumber plant',
      name: 'Sweet cucumber',
      scientificName: 'Cucumis melo var.saccharinus',
    },
    {
      image: 'plants/cucurbitaceae/zucchini.png',
      alt: 'Zucchini plant',
      name: 'Zucchini',
      scientificName: 'Cucurbita pepo var.cylindrica',
    },
    {
      image: 'plants/cucurbitaceae/pipian.png',
      alt: 'Pipian squash plant',
      name: 'Pipian squash',
      scientificName: 'Cucurbita argyrosperma',
    },
    {
      image: 'plants/cucurbitaceae/melon.png',
      alt: 'Honeydew melon plant',
      name: 'Honeydew melon',
      scientificName: 'Cucumis melo var. inodorus',
    },
    {
      image: 'plants/cucurbitaceae/sponge-gourd.png',
      alt: 'Sponge gourd plant',
      name: 'Sponge gourd',
      scientificName: 'Luffa aegyptiaca',
    },
    {
      image: 'plants/cucurbitaceae/bitter-melon.png',
      alt: 'Bitter melon plant',
      name: 'Bitter melon',
      scientificName: 'Momordica charantia',
    },
    {
      image: 'plants/cucurbitaceae/lemon-cucumber.png',
      alt: 'Lemon cucumber plant',
      name: 'Lemon cucumber',
      scientificName: 'Cucumis melo var.chito',
    },
    {
      image: 'plants/cucurbitaceae/winter-squash.png',
      alt: 'Winter squash plant',
      name: 'Winter squash',
      scientificName: 'Cucurbita maxima',
    },
    {
      image: 'plants/cucurbitaceae/cucumber.png',
      alt: 'Hedgehog cucumber plant',
      name: 'Hedgehog cucumber',
      scientificName: 'Cucumis dipsaceus',
    },
    {
      image: 'plants/cucurbitaceae/wild-sponge-gourd.png',
      alt: 'Wild sponge gourd plant',
      name: 'Wild sponge gourd',
      scientificName: 'Luffa operculata',
    },
  ],

  solanaceae: [
    {
      image: 'plants/solanaceae/tomato.png',
      alt: 'Tomato plant',
      name: 'Tomato',
      scientificName: 'Solanum lycopersicum',
    },
    {
      image: 'plants/solanaceae/potato.png',
      alt: 'Potato plant',
      name: 'Potato',
      scientificName: 'Solanum tuberosum',
    },
    {
      image: 'plants/solanaceae/eggplant.png',
      alt: 'Eggplant plant',
      name: 'Eggplant',
      scientificName: 'Solanum melongena',
    },
    {
      image: 'plants/solanaceae/hot-chili.png',
      alt: 'Hot chili pepper plant',
      name: 'Hot chili pepper',
      scientificName: 'Capsicum frutescens',
    },
    {
      image: 'plants/solanaceae/bell.png',
      alt: 'Bell pepper plant',
      name: 'Bell pepper',
      scientificName: 'Capsicum annuum',
    },
    {
      image: 'plants/solanaceae/husk.png',
      alt: 'Husk tomato plant',
      name: 'Husk tomato',
      scientificName: 'Physalis philadelphica',
    },
    {
      image: 'plants/solanaceae/tobacco.png',
      alt: 'Tobacco plant',
      name: 'Tobacco',
      scientificName: 'Nicotiana tabacum',
    },
    {
      image: 'plants/solanaceae/ground.png',
      alt: 'Ground cherry plant',
      name: 'Ground cherry',
      scientificName: 'Physalis peruviana',
    },
    {
      image: 'plants/solanaceae/petunia.png',
      alt: 'Petunia plant',
      name: 'Petunia',
      scientificName: 'Petunia integrifolia',
    },
    {
      image: 'plants/solanaceae/deadly.png',
      alt: 'Deadly nightshade plant',
      name: 'Deadly nightshade',
      scientificName: 'Atropa belladonna',
    },
    {
      image: 'plants/solanaceae/thorn.png',
      alt: 'Thorn apple plant',
      name: 'Thorn apple',
      scientificName: 'Datura ferox',
    },
    {
      image: 'plants/solanaceae/jimsonweed.png',
      alt: 'Jimsonweed plant',
      name: 'Jimsonweed',
      scientificName: 'Datura stramonium',
    },
    {
      image: 'plants/solanaceae/goji.png',
      alt: 'Goji berry plant',
      name: 'Goji berry',
      scientificName: 'Lycium barbarum',
    },
    {
      image: 'plants/solanaceae/tobacco.png',
      alt: 'Tree tobacco plant',
      name: 'Tree tobacco',
      scientificName: 'Nicotiana glauca',
    },
    {
      image: 'plants/solanaceae/mandrake.png',
      alt: 'Mandrake plant',
      name: 'Mandrake',
      scientificName: 'Mandragora officinarum',
    },
    {
      image: 'plants/solanaceae/cherry.png',
      alt: 'Christmas cherry plant',
      name: 'Christmas cherry',
      scientificName: 'Solanum pseudocapsicum',
    },
    {
      image: 'plants/solanaceae/nipp.png',
      alt: 'Nipplefruit plant',
      name: 'Nipplefruit',
      scientificName: 'Solanum mammosum',
    },
    {
      image: 'plants/solanaceae/brazilian.png',
      alt: 'Brazilian nightshade plant',
      name: 'Brazilian nightshade',
      scientificName: 'Solanum seaforthianum',
    },
  ],
}


export default horticulturalPlants