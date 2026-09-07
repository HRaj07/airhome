"""
Curated stock photography for the demo data.

Every seeded listing, experience and service gets photos that actually depict
what it is: a private room shows a bedroom, a hostel bed shows a dorm, and a
"night market food crawl" shows a night market. The seed used to point at
`picsum.photos`, which hands back an arbitrary photo per url — which is how a
private room in Hauz Khas ended up illustrated with mountains and bicycles.

The ids below are Pexels photo ids; each one was fetched once and checked to
resolve before being added here, and the description in the trailing comment is
what that photo actually shows. `photo_url()` turns an id into a CDN url
cropped to the 4:3 the gallery expects.
"""
from typing import Dict, List, Optional, Sequence

import random
import re

from .enums import PropertyType


#: Pexels ids are handed out in upload order, so a photographer's batch from
#: one session lands within a few dozen ids of each other. Two frames of the
#: same person in the same clothes are, to a guest, the same photo — treating
#: them as one is what stops a row showing one man four times.
SHOOT_SPAN = 100


def same_shoot(a: int, b: int) -> bool:
    return abs(a - b) < SHOOT_SPAN


def photo_id_of(url: str) -> Optional[int]:
    """The Pexels id inside one of our CDN urls, or None for any other url."""
    m = re.search(r"/photos/(\d+)/", url or "")
    return int(m.group(1)) if m else None


def fresh_choices(pool: Sequence[int], used: Sequence[int]) -> List[int]:
    """Members of `pool` not in `used` and not from the same shoot as anything
    in it. Falls back to the whole pool rather than returning nothing."""
    out = [p for p in pool if not any(same_shoot(p, u) for u in used)]
    return out or list(pool)


def photo_url(photo_id: int, width: int = 1024, height: int = 768) -> str:
    """A Pexels CDN url, compressed and cropped to the gallery's aspect ratio."""
    return (
        f"https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg"
        f"?auto=compress&cs=tinysrgb&w={width}&h={height}&fit=crop"
    )


# --------------------------------------------------------------- stays

HOME_EXTERIOR = [
    30580640,  # modern twin houses with symmetrical design
    7031581,   # yard of a contemporary house behind a fence
    32666364,  # urban house with unusual massing
    7031406,   # country house facade in winter
    1974596,   # white and brown two-storey house
    7031604,   # courtyard of a modern villa with glass walls
    6342356,   # modern desert house
    30211366,  # white house with palm trees and a patio
]

HOME_INTERIOR = [
    8146330,   # bright empty modern room
    2030037,   # living room furniture set
    19239905,  # living room with a TV
    7511693,   # apartment with open living room and kitchen
    11296142,  # living and dining area
    6297086,   # spacious apartment living space
    7046002,   # light dining room in a house
    8135496,   # clean open-plan interior
]

PRIVATE_ROOM = [
    34574606,  # bedroom with blue accents and natural light
    30070551,  # wooden cabin bedroom with a view
    8089268,   # styled bed in a decorated bedroom
    30767888,  # cosy modern bedroom
    33693815,  # sunlit bedroom with lace curtains
    30089083,  # cabin bedroom at sunrise
    11036444,  # made bed, soft light
    9102822,   # bed with a lamp on the side table
]

BEDROOM = [
    14580423,  # guest bedroom
    12119235,  # wooden bedframe
    34622756,  # modern bedroom with elegant decor
    37460682,  # minimalist bedroom with twin beds
    35103156,  # cosy hotel-style bedroom
    14011080,  # white bed in a bedroom
    37864824,  # elegant room with modern decor
    37098141,  # minimalist bedroom, soft lighting
]

HOTEL_ROOM = [
    34496701,  # boutique hotel room
    36916378,  # hotel room with modern decor
    34496715,  # luxury hotel room
    14750394,  # bedroom with lamp and wall art
    7745929,   # styled hotel bed
    7722164,   # king bed beside a floor-to-ceiling window
    28962539,  # hotel room with a city view
    27638174,  # twin hotel beds
]

DORM = [
    35165103,  # rustic dorm room with bunk beds
    5137980,   # hostel room
    5137981,   # hostel bunk bed close-up
    5147364,   # university hostel dormitory
    6157285,   # wooden bunk bed
    4221409,   # bunk bed in a shared bedroom
    4221413,   # brown wooden bunk bed
    7031873,   # modern bedroom with a bunk bed
]

KITCHEN = [
    8186477,   # apartment kitchen
    18033166,  # modern kitchen countertop
    6835116,   # kitchen cabinetry
    13009887,  # house kitchen interior
    4221389,   # kitchen interior
    7168051,   # clean kitchen
    10847178,  # brown wooden kitchen cabinets
    4832505,   # kitchen counter and furniture
]

BATHROOM = [
    10258628,  # house bathroom
    12870169,  # minimal bathroom
    5825561,   # bathroom with a shower cabin
    35493890,  # marble tiled bathroom vanity
    7031719,   # bathroom with ceramic sink
    6890406,   # light modern bathroom
    34574604,  # minimalist bathroom with a shower
    6903210,   # tiled bathroom
]

LIVING_ROOM = [
    276746,    # beige three-seat sofa
    6980724,   # living room with a television
    8584020,   # brown couch
    1484981,   # living room
    280239,    # fabric sofa in an empty room
    2343469,   # living room interior
]

DINING = [
    12119318,  # wooden dining table with white chairs
    8583537,   # table and chairs
    5998031,   # classic dining room
    1327369,   # dining area off the living room
    12700442,  # dining room of a house
    5900807,   # contemporary dining room
]

BALCONY = [
    18220823,  # chairs and table on a balcony
    14286287,  # balcony lounge above the city
    12870090,  # empty chairs on a balcony
    7546778,   # terrace seating behind a glass railing
    8510376,   # terrace table with a forest view
    2752917,   # bistro set beside a house
]

WORKSPACE = [
    9903246,   # home office desk
    15062127,  # modern home office
    373904,    # desk, chair and computer
    31213677,  # home office with plants
    5584136,   # cosy workspace in a room
    28461033,  # home office with greenery
]

# ------------------------------------------------------- regional character
#
# A home in Hauz Khas should not look like a house in Ohio. These pools give
# listings in the regions where the generic (Western-looking) set reads most
# wrongly a cover shot and interiors that belong to the place. Europe, North
# America, Latin America and Oceania deliberately have no pool: the generic
# set above already reads as Western, so adding one would buy nothing.

INDIA_EXTERIOR = [
    33075377,  # Kerala house with a red tiled roof
    31499206,  # Goan house framed by palms
    29120121,  # Kerala house with carved wooden windows
    32520267,  # traditional architecture, Ernakulam
    33425724,  # traditional Kerala architecture
    36470491,  # Kerala house surrounded by greenery
    36994927,  # Ladakhi house in a mountain valley
    34467465,  # house with a garden, Ooty
    37916112,  # Himachal mountain home in mist
    37266549,  # colonial house with a red scooter, Puducherry
    39308720,  # colourful traditional facade, Puducherry
    32474275,  # traditional house with a garden, Hyderabad
]

INDIA_LIVING = [
    6920439,   # corner sofa, warm neutral tones
    9494898,   # sofa in a bright living room
    5417293,   # contemporary room with an area carpet
    2030037,   # living room set with a coffee table
    16056400,  # tidy furnished apartment living room
    5998120,   # stylish living room in a light-filled flat
    6580396,   # modern flat interior, seating area
    8135496,   # clean open-plan living space
    11295838,  # living room beside the dining area
    19239905,  # bright living room with a TV
    6585598,   # sofa, table and chairs
    5825419,   # sofa with cushions
    8583841,   # grey sofa on a wooden floor
    6782369,   # large sofa, modern lounge
    19899076,  # modern living room
    6487969,   # stylish living room interior
    7533848,   # light flat, sofa with the kitchen behind
    7340583,   # Indian flat living room
    34946066,  # living room with a brick accent wall, Kerala
    34946215,  # dining area in a Kerala home
    33559373,  # living room with sheesham wood accents
    37415406,  # room with antique Indian decor
    39049240,  # stained-glass doors
    31564207,  # indoor courtyard with a jhoola swing
    34127591,  # archway with traditional Indian art
    36881138,  # warm-lit Indian kitchen
]

INDIA_BEDROOM = [
    13722872,  # double bed, modern design
    7168109,   # made-up bed with styled pillows
    18285942,  # headboard and bedside lamps
    20653886,  # ceiling fan over the bed
    6782479,   # bedroom with a side table and chair
    6934170,   # upholstered bed, spacious room
    8135505,   # modern bedroom, clean linen
    20653852,  # neat bedding, modern bedroom
    10964703,  # tidy, well-lit bedroom
    4682136,   # bed in a luxury bedroom
    13043955,  # headboard and bedside lighting
    8082562,   # styled bed
    17125481,  # illuminated modern bedroom
    6301179,   # pillows and a bedside lamp
    6438756,   # soft made bed
    6588581,   # bed beside curtained windows
    7005275,   # bedroom with a vanity table
    6585606,   # bed and a wooden wardrobe
    31944373,  # striped bedspread, bay windows, Ahmedabad
    31944411,  # bedroom with red curtains, Ahmedabad
    31925629,  # bedroom with a jaali-style window
    31925619,  # bedroom with Indian textiles
    33169554,  # warm-lit bedroom, Hyderabad
    33596159,  # bedroom with a forest view, Madikeri
    31654660,  # bedroom in Vagamon, Kerala
    36195703,  # sunlit bedroom, Pune
    37415546,  # bedroom with wooden accents, Pondicherry
    36195702,  # bedroom with a patterned feature wall
]

#: Indian texture for the rest of a gallery — kitchens, courtyards, details.
#: Deliberately never a cover: characterful up close, but a rustic kitchen
#: makes a poor first impression on a card.
INDIA_DETAIL = [
    32048482,  # kitchen with brass and earthenware
    31944364,  # kitchen with red cabinets
    31925627,  # red-and-black kitchen
    31944361,  # stove against a tiled wall
    38361341,  # courtyard house, Tamil Nadu
    33485959,  # courtyard with an arched entrance
    31426712,  # courtyard through an arch, Rajasthan
    37415403,  # haveli courtyard
    37245202,  # spiral staircase from above, Chennai
    18003581,  # sunlit room full of potted plants
    31352325,  # potted plants and shadows indoors
    5779553,   # lamps beside a wooden chair
    8819255,   # flowers in a bowl beside a table
    8819212,   # home puja corner
]

AFRICA_EXTERIOR = [
    38040969,  # modern house at sunset, Abuja
    38040972,  # modern residential house, Abuja
    38223543,  # house among greenery, Cape Town
    38852843,  # hillside homes, Knysna
    34598588,  # colourful Bo-Kaap houses, Cape Town
    33702533,  # cottage with a pool, South Africa
    37727310,  # cliffside homes on a misty coast
    33494213,  # suburban house with a garden, Kenya
]

AFRICA_LIVING = [
    34631660,  # reading corner in a Nigerian home
    6775662,   # living room wall hung with African masks
    6434606,   # console table below African portrait art
    6434608,   # room with African paintings on the wall
    6434616,   # styled room with African artwork and lamp
    35187492,  # carved wooden crafts and a mask display
    32736387,  # woven decor on a bamboo shelf
    37790193,  # lodge patio lounge
]

AFRICA_BEDROOM = [
    33613747,  # twin beds with African print quilts, Kampala
    33613748,  # bedroom with African decor, Kampala
    33613739,  # twin beds under mosquito nets, Kampala
    33613728,  # wooden beds and mosquito net, Kampala
    33613737,  # bedroom with mosquito net and bright decor
    33613729,  # twin bedroom, Kampala
]

EAST_ASIA_EXTERIOR = [
    38101094,  # machiya townhouse, Kyoto
    38738811,  # machiya with a stone path entrance
    37182032,  # wooden Japanese house facade
    31268103,  # minka farmhouse in a garden
    37252620,  # Japanese house in a lush garden
    37436293,  # hanok facade, South Korea
    28874208,  # hanok village houses, Jeonju
    37718101,  # Chinese house with red lanterns
]

EAST_ASIA_LIVING = [
    35680935,  # tatami room
    35680939,  # interior with shoji screens
    34985823,  # tatami and shoji room
    31153872,  # tatami room with a floor lamp
    20025763,  # inside a traditional Japanese house
    32416091,  # room looking onto a garden, Tokyo
    31240275,  # tatami room interior
    38944471,  # room with sliding doors
]

EAST_ASIA_BEDROOM = [
    34429081,  # bedroom with tatami mats
    30989539,  # minimalist Japanese-style bedroom
    34619706,  # tatami sleeping room
    8073161,   # ryokan-style room beside a sliding glass door
    7303431,   # paper lantern above the bed
    6580407,   # bed under a hanging bamboo light
]

SEA_EXTERIOR = [
    34053607,  # villa among palms, Bali
    35043038,  # cliffside villa with an infinity pool, Bali
    34054904,  # Balinese villas with pools from above
    29989224,  # Balinese house among rice fields
    36107525,  # tropical villa in timber and greenery
    33399672,  # Thai stilt house by the river
    36978488,  # rural Thai stilt house
    37838631,  # bamboo houses, Banten
]

SEA_LIVING = [
    33709937,  # living room in a Bali villa
    30821350,  # interior under a vaulted timber ceiling
    38666997,  # minimalist Bali living room
    32512229,  # Balinese dining and living space
    30766942,  # open-air lounge, Bali
    4572632,   # bamboo house interior with a timber window
    4572633,   # timber and bamboo house interior
    4572639,   # bamboo interior with woven detail
]

SEA_BEDROOM = [
    30821349,  # Balinese bedroom
    32902660,  # canopy bed in a Bali villa
    14025910,  # mosquito-net bed in a wooden room
    14025911,  # wooden bedroom with a white bed
    16436959,  # bedroom looking onto tropical planting
    16436925,  # bed with a hanging lamp and greenery outside
]

MENA_EXTERIOR = [
    36586473,  # riad exterior with palms, Marrakesh
    25254990,  # white and blue facade, Asilah
    18671243,  # blue-washed house, Chefchaouen
    37700634,  # earthen kasbah architecture, Ouarzazate
    8925105,   # whitewashed Moroccan houses
    13829640,  # cave houses in the rock, Cappadocia
    16254718,  # cave-house lodgings, Urgup
    5435195,   # Majorelle-blue villa, Marrakech
]

MENA_LIVING = [
    24839180,  # riad arches around a planted courtyard
    36966423,  # riad interior in green zellige, Marrakesh
    29125650,  # tilework and carved wood inside a riad
    18320914,  # riad courtyard, Marrakesh
    30257102,  # courtyard with a central fountain
    15531324,  # Moroccan courtyard seating, Marrakech
    4915838,   # cushioned seating and lanterns
    27945050,  # sunlit hallway onto a courtyard
]

MENA_BEDROOM = [
    15531322,  # bedroom with Moroccan textiles, Marrakech
    4946761,   # draped bed and mirror, Moroccan style
    15531319,  # riad bedroom with carved woodwork
    34940612,  # red canopy bed, warm lighting
    4946766,   # Moroccan bedroom with a striped rug
    30374221,  # riad bedroom, Ouarzazate
]

#: Region key -> the three pools that give a listing its local character.
REGIONS = {
    "india": {"exterior": INDIA_EXTERIOR, "living": INDIA_LIVING,
              "bedroom": INDIA_BEDROOM, "detail": INDIA_DETAIL},
    "africa": {"exterior": AFRICA_EXTERIOR, "living": AFRICA_LIVING, "bedroom": AFRICA_BEDROOM},
    "east_asia": {"exterior": EAST_ASIA_EXTERIOR, "living": EAST_ASIA_LIVING, "bedroom": EAST_ASIA_BEDROOM},
    "southeast_asia": {"exterior": SEA_EXTERIOR, "living": SEA_LIVING, "bedroom": SEA_BEDROOM},
    "mena": {"exterior": MENA_EXTERIOR, "living": MENA_LIVING, "bedroom": MENA_BEDROOM},
}

#: Country -> region. Countries left out fall through to the generic pools,
#: which already look Western — that covers Europe, the Americas and Oceania.
COUNTRY_REGIONS = {
    # South Asia reads as the Indian set: shared building vernacular.
    "India": "india",
    "Sri Lanka": "india",
    "Nepal": "india",
    "Bangladesh": "india",
    "Pakistan": "india",
    "Bhutan": "india",
    "Maldives": "southeast_asia",
    # Sub-Saharan Africa
    "Nigeria": "africa",
    "Kenya": "africa",
    "South Africa": "africa",
    "Ghana": "africa",
    "Tanzania": "africa",
    "Uganda": "africa",
    "Rwanda": "africa",
    "Ethiopia": "africa",
    "Senegal": "africa",
    "Namibia": "africa",
    "Zimbabwe": "africa",
    "Mauritius": "africa",
    # East Asia
    "Japan": "east_asia",
    "China": "east_asia",
    "South Korea": "east_asia",
    "Taiwan": "east_asia",
    "Hong Kong": "east_asia",
    "Macau": "east_asia",
    "Mongolia": "east_asia",
    # Southeast Asia
    "Indonesia": "southeast_asia",
    "Thailand": "southeast_asia",
    "Vietnam": "southeast_asia",
    "Philippines": "southeast_asia",
    "Malaysia": "southeast_asia",
    "Cambodia": "southeast_asia",
    "Laos": "southeast_asia",
    "Myanmar": "southeast_asia",
    "Singapore": "southeast_asia",
    # Middle East & North Africa
    "Morocco": "mena",
    "Tunisia": "mena",
    "Egypt": "mena",
    "Turkey": "mena",
    "Jordan": "mena",
    "Lebanon": "mena",
    "Israel": "mena",
    "United Arab Emirates": "mena",
    "Qatar": "mena",
    "Oman": "mena",
    "Bahrain": "mena",
    "Saudi Arabia": "mena",
    "Uzbekistan": "mena",
    "Azerbaijan": "mena",
}


def region_for(country: Optional[str]) -> Optional[str]:
    return COUNTRY_REGIONS.get((country or "").strip())

#: Per property type: where the cover photo comes from, then the rooms a guest
#: would expect to see next. A private room shows the room itself and the
#: shared bathroom — not a villa exterior it has no claim to.
LISTING_GALLERY = {
    PropertyType.entire_home: (
        HOME_EXTERIOR + HOME_INTERIOR,
        [LIVING_ROOM, KITCHEN, BEDROOM, BATHROOM, DINING, BALCONY, WORKSPACE],
    ),
    PropertyType.private_room: (
        PRIVATE_ROOM,
        [BEDROOM, BATHROOM, LIVING_ROOM, WORKSPACE, KITCHEN],
    ),
    PropertyType.shared_room: (
        DORM,
        [DORM, BATHROOM, LIVING_ROOM, KITCHEN],
    ),
    PropertyType.hotel_room: (
        HOTEL_ROOM,
        [HOTEL_ROOM, BATHROOM, BEDROOM, BALCONY],
    ),
}


def _pools_for(property_type, country: Optional[str]):
    """The cover-photo pool and the supporting pools for one listing.

    Where we have photography for the region, an entire home leads with a house
    that looks like it belongs in that country and a private room leads with a
    local bedroom. Hotel rooms and hostel dorms keep the generic pools: those
    look much the same everywhere, and a riad courtyard would misrepresent a
    bunk bed."""
    generic_hero, generic_support = LISTING_GALLERY.get(
        property_type, LISTING_GALLERY[PropertyType.entire_home]
    )
    region = REGIONS.get(region_for(country) or "")
    if region is None or property_type in (PropertyType.hotel_room, PropertyType.shared_room):
        return generic_hero, generic_support
    detail = region.get("detail") or []
    if property_type == PropertyType.private_room:
        return (
            region["bedroom"],
            [region["living"], region["bedroom"], detail, BATHROOM, LIVING_ROOM],
        )
    # Interiors lead: a real listing card for a city flat opens on the living
    # room, not on the front of the building.
    return (
        region["living"] + region["exterior"],
        [region["living"], region["bedroom"], detail, KITCHEN, BATHROOM, BALCONY],
    )


def listing_photo_ids(property_type, count: int, country: Optional[str] = None,
                      avoid_covers: Optional[set] = None) -> List[int]:
    """`count` distinct photo ids for one stay: a cover shot of the right kind
    of place — in the right part of the world where we have the photography —
    then one room at a time from the pools that suit it.

    `avoid_covers` holds the covers already used by neighbouring listings (in
    practice, the rest of the same city). A carousel row shows a dozen cards
    side by side, so two of them opening with the same photograph reads as a
    bug even though the listings are different."""
    hero_pool, support_pools = _pools_for(property_type, country)
    hero = random.choice(fresh_choices(hero_pool, list(avoid_covers or ())))
    chosen, used = [hero], {hero}
    pools = [p for p in support_pools if p]
    while len(chosen) < count and pools:
        for pool in list(pools):
            if len(chosen) >= count:
                break
            options = [p for p in pool if p not in used]
            if not options:
                pools.remove(pool)
                continue
            pick = random.choice(options)
            chosen.append(pick)
            used.add(pick)
    return chosen


def listing_photo_urls(property_type, count: int, country: Optional[str] = None,
                       avoid_covers: Optional[set] = None) -> List[str]:
    return [photo_url(pid)
            for pid in listing_photo_ids(property_type, count, country, avoid_covers)]


# ------------------------------------------------- experiences & services

TOPIC_PHOTOS: Dict[str, List[int]] = {
    "street_food": [
        15565035,  # steam over a street food stall at night
        32223212,  # night market food stalls
        16602911,  # vendor at a street food stall
        6147642,   # vendors in front of their stall
    ],
    "cocktail_bar": [
        34575937,  # bartender mixing cocktails
        4485344,   # drinks being mixed behind the bar
        15750727,  # cocktails on a bar counter
        16807989,  # bartender at work
    ],
    "cooking_class": [
        6223140,   # cooking together in a kitchen
        5643191,   # a cooking class in progress
        8511799,   # students in aprons slicing vegetables
        6895452,   # chef teaching someone to cook
    ],
    "architecture_walk": [
        17251323,  # cobblestone street in a historic town
        18555952,  # old town street
        20247888,  # narrow lane in an old town
        19341897,  # townhouses along a cobbled street
    ],
    "photo_walk": [
        17837927,  # photographing the city
        14446843,  # photographer on a city street
        14651157,  # taking a photo in the city
        8113747,   # street photographer at work
    ],
    "museum": [
        4588842,  # gold-framed paintings on a museum wall
        18250524,  # man looking at framed paintings in a museum
        13432768,  # framed pictures in an art museum exhibition
        9221307,  # framed paintings on a gallery wall
        1671016,  # gallery interior
    ],
    "sunrise_hike": [
        733162,    # group on a summit at golden hour
        30271173,  # hikers silhouetted climbing at sunrise
        15742150,  # hikers on a trail
        13802557,  # figures on a misty mountain top
    ],
    "city_cycling": [
        3752928,  # woman on a red vintage bicycle, city street
        4390718,  # orange dress, vintage bike on a tree-lined path
        11534789,  # red bike on a wet street, colourful reflections
        19178868,  # cycling a brick-lined Amsterdam street
        8095801,  # cyclists passing a leafy street cafe
        9180330,  # cycling across a bridge at sunset
        17697876,  # cyclist downtown at golden hour
        13613391,  # lone cyclist silhouetted at sunset
    ],
    "rooftop_yoga": [
        4332235,  # men practising yoga on a city rooftop
        6201863,  # yoga on a building roof under open sky
        6454112,  # parsvakonasana on a wooden rooftop terrace, skyline behind
        18886642,  # yoga on an elevated terrace, Dubai skyline
        14033748,  # yoga on a modern urban terrace
        7593016,  # king pigeon pose on a sunlit building terrace
    ],
    "sound_bath": [
        3544322,   # singing bowls session
        6013471,   # playing a singing bowl
        7484848,   # Tibetan singing bowl
        6013499,   # meditation during sound healing
    ],
    "night_market": [
        704379,    # night market arch, crowds and lit signs
        14678804,  # illuminated market stall at night
        27852299,  # outdoor market after dark
        32223212,  # night market food stalls
    ],
    "jazz_club": [
        9419224,   # band performing live
        9419374,   # singer with musicians in a club
        9419380,   # band at a nightclub
        9418654,   # saxophone player on stage
    ],
    "photo_session": [
        6186351,   # photographer shooting a model
        1845421,   # photographing someone with a camera
        7205283,   # photographer during a shoot
        5176853,   # photographing on location
    ],
    "couple_portraits": [
        29243958,  # engagement photoshoot
        29187300,  # engagement portrait at a venue
        29187425,  # couple's shoot in a sunflower field
        15213984,  # couple posing for portraits
    ],
    "travel_portraits": [
        5225493,   # traveller on a sunny street
        17991283,  # tourist in an old town
        3783080,   # portrait on a city street
        28536987,  # traveller in a city square
    ],
    "studio_portraits": [
        30332804,  # photography studio lighting setup
        53265,     # studio lights in an empty studio
        29877910,  # studio equipment
        6989087,   # studio ready for a shoot
    ],
    "personal_training": [
        6455906,   # trainer coaching a dumbbell exercise
        4853672,   # spotting a bench press
        6551439,   # personal trainer at the gym
        5646004,   # exercising with an instructor
    ],
    "private_yoga": [
        4534645,   # indoor yoga practice
        8436441,   # bending on a yoga mat
        4327164,   # holding a yoga pose
        3822222,   # yoga practice indoors
    ],
    "boxing": [
        7991687,  # boxer in gloves and wraps at a heavy bag
        9944899,  # gloves on, punching a heavy bag
        7187966,  # young boxer practising on a heavy bag
        5750823,  # boxer at a punching bag
        4804262,  # boxing training with gloves
        6551186,  # woman in boxing gloves, winding up a punch
        6456145,  # putting on boxing gloves before training
        6999124,  # female fighter in gloves at a bag
        1608099,  # boxing gloves in the ring
    ],
    "pilates": [
        5473896,  # pilates reformer machine
        8769176,  # reformer in a modern studio
        6111615,  # pilates on studio reformer equipment
        25596680,  # pilates reformer
        33360042,  # reformer pilates session
    ],
    "private_chef": [
        36430080,  # chef finishing a plate
        36430150,  # chef plating a dish
        30729160,  # plating in a restaurant kitchen
        9958627,   # chef preparing a meal
    ],
    "tasting_menu": [
        28705621,  # fine-dining plate with sauce and herbs
        35546716,  # plated dish with an edible flower
        33033817,  # elegant culinary presentation
        5491046,   # plated steak
    ],
    "brunch": [
        19328868,  # eggs and bacon breakfast
        38523790,  # Mediterranean breakfast spread
        9491135,   # Turkish breakfast spread
        36630851,  # breakfast table outdoors
    ],
    "deep_tissue_massage": [
        3998007,  # therapist giving a treatment in a spa room
        5888130,  # back massage on a massage table
        8313244,  # therapist massaging a client on a table
        6187640,  # massage therapy session
        7233264,  # massage treatment in a spa room
        5793799,  # back massage on a table
    ],
    "couples_massage": [
        7365442,   # couple's massage side by side
        7365414,   # couple's hot stone massage
        7365434,   # couple in a spa treatment room
        18120174,  # two clients being massaged
    ],
    "recovery_massage": [
        20860597,  # physiotherapy on the leg and hip
        20860607,  # knee massage
        29807420,  # sports massage session
        10893352,  # hands working on a leg
    ],
    "event_makeup": [
        8031803,   # make-up artist at work
        5368633,   # make-up being done in a salon
        7984906,   # artist working on a client
        6954005,   # applying eyeshadow
    ],
    "bridal_makeup": [
        37710473,  # bride getting ready with an artist
        32427370,  # bridal make-up
        20885663,  # bride having hair and make-up done
        11813855,  # make-up application before the wedding
    ],
    "hair_styling": [
        3738339,   # straightening a client's hair
        7440126,   # curling hair
        10318055,  # styling with a curling iron
        23349912,  # combing a client's hair
    ],
    "hair_colour": [
        8468125,   # colouring a client's hair
        4981476,   # hair colour being applied
        3993323,   # hair being coloured in a salon
        8468038,   # hair dye application
    ],
}

#: India-specific photography for the experience and service topics.
#:
#: A street food tour in Agra hosted by an Indian guide should not be
#: illustrated with a European market, and a sound bath in Jaipur should not
#: show a Dutch man with a singing bowl. When an experience is in India and its
#: topic appears here, these win over the global pools above. Topics with no
#: entry (and every other country) fall back to TOPIC_PHOTOS.
INDIA_TOPIC_PHOTOS = {
    "street_food": [
        984534,    # man at a food stall
        4570082,   # street food stall
        984533,    # food vendors at the market
        12436185,  # open street-restaurant kitchen
        16297823,  # elderly man selling traditional food
        16005658,  # merchant at his food cart
    ],
    "night_market": [
        7795237,   # food stalls after dark
        984508,    # stalls lit at night
        29389859,  # market scene, Delhi
        30164160,  # vendor cooking at a night market
        30183073,  # street food market
        11706869,  # crowded public market
    ],
    "cooking_class": [
        11011089,  # woman in a sari frying paratha
        10962517,  # cooking flatbread
        9346161,   # flatbread on a tawa
        3715768,   # grinding spices in a stone bowl
        14502938,  # cooking at home
        8380203,   # cooking on a mud stove
    ],
    "architecture_walk": [
        27583894,  # two men in a narrow alleyway
        27583892,  # walking an old-city lane
        18887175,  # rickshaws and pedestrians, Varanasi
        18089560,  # narrow street, black and white
        19160093,  # blue-walled alley, Jodhpur
        17870016,  # women walking in traditional dress
    ],
    "photo_walk": [
        15891673,  # photographer with a DSLR
        15594934,  # photographer holding his camera
        16591972,  # shooting on the street
        16597255,  # freelance photographer at work
        16597257,  # photographer, second frame
        14672475,  # man with a camera in an alley
    ],
    "private_yoga": [
        9271213,   # floor stretch
        9271212,   # forward fold
        9271177,   # holding a pose
        16618689,  # yoga practice
        7721929,   # yoga on the floor
        9271157,   # seated stretch
    ],
    "sound_bath": [
        14989514,  # group meditating together
        11387428,  # man meditating
        11387439,  # meditation on a mat
        8819409,   # devotional session
        13875093,  # holding a japa mala
        11590827,  # seated meditation
    ],
    "jazz_club": [
        2094135,   # four musicians playing together
        15937062,  # musician in traditional dress
        15693829,  # playing the ravanhatta
        11712667,  # playing the pungi
        14632026,  # street sarangi player
        5909956,   # playing traditional drums
    ],
    "private_chef": [
        16479364,  # cook in a turban
        14798273,  # preparing ingredients at a stall
        5680152,   # cooking on the street
        18072764,  # street cook at work
        16052041,  # cooking at a night food market
        15963714,  # chef in a kitchen
    ],
    "tasting_menu": [
        7804406,   # dish served on newspaper
        8312083,   # assorted dishes from above
        8818732,   # plates laid out on a table
        8818723,   # serving onto a thali
        8818667,   # a spread before the meal
        5775684,   # thali tray
    ],
    "brunch": [
        14831540,  # traditional breakfast dish
        4331488,   # idli plate
        4331491,   # idli with chutney
        4331489,   # idli with vegetables
        20422121,  # cone dosa
        20422126,  # South Indian breakfast plate
    ],
    "photo_session": [
        15598213,  # photographer showing shots to his model
        15670485,  # photographer and model reviewing photos
        18110122,  # shooting on the streets of Kolkata
        17398266,  # freelance photographer with a DSLR
        15891673,  # photographer at work
        16591972,  # street photography
    ],
    "couple_portraits": [
        13078094,  # couple in wedding clothes
        18357547,  # couple on the river by the Taj Mahal
        8181834,   # couple posing under a tree
        12498189,  # pre-wedding shoot in silhouette
        13984926,  # couple portrait
        4071584,   # newly married couple
    ],
    "travel_portraits": [
        27139259,  # woman in a sari on a city street
        27139274,  # sari portrait, street
        27139264,  # street portrait
        18565402,  # traditional dress on the street
        19800593,  # walking a city street
        11905784,  # street portrait, elderly man
    ],
    "personal_training": [
        23158705,  # working out at the gym
        4384679,   # squat
        6514823,   # battle ropes
        10795063,  # push-ups
        13534122,  # lifting a barbell
        11800270,  # mid-workout
    ],
    "event_makeup": [
        19679199,  # make-up on a bride in traditional dress
        14484717,  # bride being prepared by artists
        17499712,  # wedding make-up
        10048895,  # make-up being applied
        17548721,  # bride in a salon
        25311222,  # lipstick before the ceremony
    ],
    "bridal_makeup": [
        14484717,  # bridal preparation
        17499712,  # wedding-day make-up
        19679199,  # bride in traditional dress
        17548721,  # smiling bride at the salon
        25311222,  # finishing touches
        10048895,  # make-up application
    ],
    "hair_styling": [
        17475174,  # cutting a client's hair
        19664876,  # barber at work
        15868761,  # hair being styled in a salon
        9090418,   # grooming at the barber
        6623694,   # barber shaving a client's head
        6623697,   # head shave at the barber
    ],
}

# ------------------------------------------------------------ who's shown
#
# Service titles name their host — "Personal training session with Elena" —
# and the photo was picked independently of the name, so a listing named after
# a woman could open on a photo of a man. These pools let the seeder match the
# two. Only topics where one person is plainly the subject are listed; for
# everything else (food, streets, interiors) the ungendered pool still wins.

PEOPLE_PHOTOS = {
    "personal_training": {
        "male": [5221029, 13278075, 6514823, 10795063, 4384679],
        "female": [13534122, 6550860, 7444369, 13993020],
    },
    "private_yoga": {
        "male": [9271217, 9271206, 9271147, 7721929, 11540047],
        "female": [11387453, 7351823, 14316237, 8436405, 20035472],
    },
    "rooftop_yoga": {
        "male": [9271217, 9271206, 9271147, 11540047, 7721929],
        "female": [11387453, 14316237, 20035472, 7351823, 8436405],
    },
    "private_chef": {
        "male": [16479364, 5680152, 8629082, 8629112, 8629080],
        "female": [9346161, 10962517, 11011089, 8590707, 16816198],
    },
    "hair_styling": {
        "male": [6918057, 2061820, 28975096, 6623694, 31317772],
        "female": [3993304, 7755226, 5368629, 5368632, 6599036],
    },
    "hair_colour": {
        "male": [6918057, 2061820, 31317772, 28975096, 6623694],
        "female": [5368629, 5368632, 3993304, 7755226, 6599036],
    },
    # Massage is split by the therapist — the host the listing names.
    "deep_tissue_massage": {
        "male": [3998007, 5888130],
        "female": [8313244, 6187640, 4599436, 7233264, 5793799],
    },
    "recovery_massage": {
        "male": [5888130, 3998007],
        "female": [7233264, 5793799, 8313244, 6187640, 4599436],
    },
    "boxing": {
        "male": [7991687, 9944899, 7187966, 5750823, 4804262],
        "female": [6551186, 6456145, 6999124, 1608099],
    },
}

#: The host names the seed hands out (PRO_NAMES in seed_data.py).
NAME_GENDERS = {
    "anaya": "female", "léa": "female", "lea": "female", "marta": "female",
    "noor": "female", "elena": "female", "priya": "female", "meera": "female",
    "kavya": "female", "neha": "female", "sofia": "female",
    "rishab": "male", "anurag": "male", "ashish": "male", "kenji": "male",
    "tomás": "male", "tomas": "male", "aditya": "male", "vikram": "male",
    "rohan": "male", "arjun": "male", "lucas": "male",
}


def gender_in_title(title: str) -> Optional[str]:
    """The gender implied by the host named in a title, if one is named."""
    lowered = (title or "").lower()
    for name, gender in NAME_GENDERS.items():
        if name in lowered:
            return gender
    return None

#: Matched against the lowercased title, first hit wins — so the specific
#: phrases come first ("brunch cooked ..." must not fall into "cook", and a
#: bridal trial must not be read as a generic make-up booking).
TITLE_TOPICS: Sequence[tuple] = (
    ("night market", "night_market"),
    ("street food", "street_food"),
    ("cocktail", "cocktail_bar"),
    ("brunch", "brunch"),
    ("tasting menu", "tasting_menu"),
    ("chef", "private_chef"),
    ("cook", "cooking_class"),
    ("architecture", "architecture_walk"),
    ("photography walk", "photo_walk"),
    ("museum", "museum"),
    ("hike", "sunrise_hike"),
    ("bike", "city_cycling"),
    ("rooftop yoga", "rooftop_yoga"),
    ("sound bath", "sound_bath"),
    ("jazz", "jazz_club"),
    ("photo session", "photo_session"),
    ("love-story", "couple_portraits"),
    ("travel portraits", "travel_portraits"),
    ("studio", "studio_portraits"),
    ("personal training", "personal_training"),
    ("boxing", "boxing"),
    ("pilates", "pilates"),
    ("yoga", "private_yoga"),
    ("deep tissue", "deep_tissue_massage"),
    ("couples relaxation", "couples_massage"),
    ("recovery massage", "recovery_massage"),
    ("bridal", "bridal_makeup"),
    ("make-up", "event_makeup"),
    ("blowout", "hair_styling"),
    ("colour", "hair_colour"),
)

#: If a title ever stops matching, the category still narrows it to something
#: honest rather than a random photo.
CATEGORY_TOPICS = {
    "Food & drink": "street_food",
    "Art & culture": "architecture_walk",
    "Outdoors": "sunrise_hike",
    "Wellness": "rooftop_yoga",
    "Nightlife": "night_market",
    "Photography": "photo_session",
    "Training": "personal_training",
    "Chefs": "private_chef",
    "Massage": "deep_tissue_massage",
    "Make-up": "event_makeup",
    "Hair": "hair_styling",
}


def topic_for(title: str, category: Optional[str] = None) -> str:
    """The photo topic an experience or service should be illustrated with."""
    lowered = (title or "").lower()
    for phrase, topic in TITLE_TOPICS:
        if phrase in lowered:
            return topic
    return CATEGORY_TOPICS.get(category or "", "street_food")


def experience_pool(title: str, category: Optional[str], country: Optional[str] = None) -> List[int]:
    """The photos an experience or service should draw on.

    In India we have photography of the real thing — Indian hosts, Indian
    kitchens, Indian streets — so it wins over the global pool. A cooking class
    in Agra showing a European kitchen was the complaint that put this here."""
    topic = topic_for(title, category)

    # When the title names a host, the person in the photo has to be that
    # person. This outranks the regional pool: a listing named after a woman
    # showing a man is a worse error than a gym that isn't visibly Indian.
    gender = gender_in_title(title)
    if gender and topic in PEOPLE_PHOTOS:
        return PEOPLE_PHOTOS[topic][gender]

    if region_for(country) == "india" and topic in INDIA_TOPIC_PHOTOS:
        return INDIA_TOPIC_PHOTOS[topic]
    return TOPIC_PHOTOS[topic]


def experience_photo_ids(title: str, category: Optional[str], count: int,
                         country: Optional[str] = None) -> List[int]:
    pool = experience_pool(title, category, country)
    return random.sample(pool, min(count, len(pool)))


def experience_photo_urls(title: str, category: Optional[str], count: int,
                          country: Optional[str] = None) -> List[str]:
    return [photo_url(pid) for pid in experience_photo_ids(title, category, count, country)]
