"""
The destination catalogue the seed script builds the marketplace from.

Roughly 500 real cities, each with real coordinates, so that anywhere a
reviewer types — Noida, Kochi, Reykjavik — resolves to somewhere with
inventory instead of an empty results page. India is deliberately
over-represented: this demo is browsed from India, and a marketplace that
returns nothing for "Indore" reads as broken.

The data is stored as pipe-delimited rows rather than Python tuples because
five hundred 6-tuples is unreadable, and parsed once at import.

Row format:  City|State/Region|Country|lat|lng|Neighbourhood,Neighbourhood,...

The neighbourhood list is optional. Major cities carry real neighbourhoods.
For the long tail we derive plausible ones (see `_derive_neighborhoods`) —
they are labelled here as derived rather than passed off as researched.
"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class City:
    name: str
    state: str
    country: str
    latitude: float
    longitude: float
    neighborhoods: List[str] = field(default_factory=list)
    #: True when the neighbourhoods are real, False when derived by pattern.
    real_neighborhoods: bool = True


# Locality names that genuinely recur across most cities in these countries,
# used only for cities without a hand-written list.
DERIVED_LOCALITIES = {
    "India": ["Civil Lines", "Model Town", "MG Road", "Gandhi Nagar", "Ashok Nagar", "Shastri Nagar"],
    "United States": ["Downtown", "Midtown", "Old Town", "Riverside", "University District", "The Heights"],
    "United Kingdom": ["City Centre", "Old Town", "Riverside", "Northgate", "The Quays", "Westside"],
    "Canada": ["Downtown", "Old Town", "Riverside", "The Annex", "West End", "Harbourfront"],
    "Australia": ["CBD", "Northside", "The Bay", "Riverside", "Southbank", "Harbour District"],
}
DERIVED_DEFAULT = ["City Centre", "Old Town", "Riverside", "Marina District", "Cathedral Quarter", "North Quarter"]


def _derive_neighborhoods(country: str) -> List[str]:
    return list(DERIVED_LOCALITIES.get(country, DERIVED_DEFAULT))


def parse(block: str) -> List[City]:
    """Turn one pipe-delimited block into City records."""
    out: List[City] = []
    for raw in block.strip().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) < 5:
            raise ValueError(f"malformed city row: {line!r}")
        name, state, country, lat, lng = parts[:5]
        hoods = [h.strip() for h in parts[5].split(",") if h.strip()] if len(parts) > 5 else []
        out.append(
            City(
                name=name.strip(),
                state=state.strip(),
                country=country.strip(),
                latitude=float(lat),
                longitude=float(lng),
                neighborhoods=hoods or _derive_neighborhoods(country.strip()),
                real_neighborhoods=bool(hoods),
            )
        )
    return out


# --- India: the metros and top tourist cities, with real neighbourhoods -----
INDIA_MAJOR = parse("""
Noida|Uttar Pradesh|India|28.5355|77.3910|Sector 18,Sector 62,Sector 15,Sector 137,Sector 50,Sector 76
Gurgaon|Haryana|India|28.4595|77.0266|DLF Cyber City,Golf Course Road,Sohna Road,Sushant Lok,MG Road,DLF Phase 3
New Delhi|Delhi|India|28.6139|77.2090|Hauz Khas,Saket,Connaught Place,Vasant Kunj,Defence Colony,Greater Kailash
Mumbai|Maharashtra|India|19.0760|72.8777|Bandra West,Andheri,Colaba,Juhu,Powai,Lower Parel
Bengaluru|Karnataka|India|12.9716|77.5946|Indiranagar,Koramangala,Whitefield,HSR Layout,Jayanagar,Church Street
Goa|Goa|India|15.2993|74.1240|Anjuna,Baga,Calangute,Candolim,Palolem,Vagator
Pune|Maharashtra|India|18.5204|73.8567|Koregaon Park,Kothrud,Viman Nagar,Baner,Hinjewadi,Camp
Hyderabad|Telangana|India|17.3850|78.4867|Banjara Hills,Jubilee Hills,Gachibowli,Hitec City,Madhapur,Secunderabad
Chennai|Tamil Nadu|India|13.0827|80.2707|Adyar,Mylapore,T Nagar,Besant Nagar,Nungambakkam,ECR
Kolkata|West Bengal|India|22.5726|88.3639|Park Street,Salt Lake,Ballygunge,New Town,Alipore,Howrah
Jaipur|Rajasthan|India|26.9124|75.7873|Amer,Bani Park,C-Scheme,Malviya Nagar,Vaishali Nagar,Jawahar Nagar
Udaipur|Rajasthan|India|24.5854|73.7125|Lake Pichola,Fateh Sagar,City Palace,Ambamata,Hiran Magri,Sukhadia Circle
Jodhpur|Rajasthan|India|26.2389|73.0243|Old City,Ratanada,Sardarpura,Shastri Nagar,Paota,Mandore
Jaisalmer|Rajasthan|India|26.9157|70.9083|Fort Area,Sam Dunes,Gadisar,Amar Sagar,Shiv Road,Hanuman Circle
Agra|Uttar Pradesh|India|27.1767|78.0081|Taj Ganj,Sadar Bazaar,Fatehabad Road,Dayal Bagh,Kamla Nagar,Civil Lines
Varanasi|Uttar Pradesh|India|25.3176|82.9739|Assi Ghat,Dashashwamedh,Sarnath,Lanka,Bhelupur,Godowlia
Lucknow|Uttar Pradesh|India|26.8467|80.9462|Hazratganj,Gomti Nagar,Aliganj,Indira Nagar,Chowk,Aminabad
Rishikesh|Uttarakhand|India|30.0869|78.2676|Tapovan,Laxman Jhula,Ram Jhula,Swarg Ashram,Shivpuri,Muni Ki Reti
Manali|Himachal Pradesh|India|32.2432|77.1892|Old Manali,Vashisht,Solang,Naggar,Aleo,Prini
Shimla|Himachal Pradesh|India|31.1048|77.1734|The Ridge,Mall Road,Chhota Shimla,Sanjauli,Kufri,Summer Hill
Dharamshala|Himachal Pradesh|India|32.2190|76.3234|McLeod Ganj,Bhagsu,Dharamkot,Naddi,Kotwali Bazaar,Sidhbari
Kochi|Kerala|India|9.9312|76.2673|Fort Kochi,Mattancherry,Marine Drive,Kakkanad,Vypin,Panampilly Nagar
Munnar|Kerala|India|10.0889|77.0595|Old Munnar,Chithirapuram,Devikulam,Pallivasal,Anachal,Mattupetty
Alleppey|Kerala|India|9.4981|76.3388|Punnapra,Mararikulam,Finishing Point,Thathampally,Kanjippadam,Beach Road
Thiruvananthapuram|Kerala|India|8.5241|76.9366|Kovalam,Kowdiar,Vellayambalam,Technopark,Varkala,Pattom
Ahmedabad|Gujarat|India|23.0225|72.5714|Satellite,Navrangpura,Bodakdev,Old City,Prahlad Nagar,Vastrapur
Surat|Gujarat|India|21.1702|72.8311|Vesu,Adajan,Piplod,Athwalines,City Light,Ghod Dod Road
Indore|Madhya Pradesh|India|22.7196|75.8577|Vijay Nagar,Palasia,Rau,Old Palasia,Scheme 54,Bhawarkuan
Bhopal|Madhya Pradesh|India|23.2599|77.4126|Arera Colony,New Market,Kolar Road,MP Nagar,Shahpura,Bairagarh
Chandigarh|Chandigarh|India|30.7333|76.7794|Sector 17,Sector 22,Sector 35,Sector 9,Panchkula,Mohali
Amritsar|Punjab|India|31.6340|74.8723|Golden Temple,Hall Bazaar,Ranjit Avenue,Lawrence Road,Green Avenue,Majitha Road
Nagpur|Maharashtra|India|21.1458|79.0882|Dharampeth,Civil Lines,Sadar,Ramdaspeth,Wardha Road,Manish Nagar
Coimbatore|Tamil Nadu|India|11.0168|76.9558|RS Puram,Peelamedu,Saibaba Colony,Race Course,Gandhipuram,Singanallur
Mysuru|Karnataka|India|12.2958|76.6394|Jayalakshmipuram,Gokulam,Vijayanagar,Kuvempunagar,Devaraja Mohalla,Hebbal
Visakhapatnam|Andhra Pradesh|India|17.6868|83.2185|RK Beach,MVP Colony,Rushikonda,Dwaraka Nagar,Madhurawada,Siripuram
Darjeeling|West Bengal|India|27.0360|88.2627|Chowrasta,Ghum,Lebong,Happy Valley,Batasia,Jorebunglow
Gangtok|Sikkim|India|27.3389|88.6065|MG Marg,Tadong,Deorali,Ranipool,Development Area,Tathangchen
Shillong|Meghalaya|India|25.5788|91.8933|Police Bazaar,Laitumkhrah,Nongthymmai,Mawlai,Upper Shillong,Laban
Guwahati|Assam|India|26.1445|91.7362|Paltan Bazaar,Zoo Road,Beltola,Six Mile,Chandmari,Uzan Bazar
Puducherry|Puducherry|India|11.9416|79.8083|White Town,Auroville,Serenity Beach,Muthialpet,Lawspet,Promenade
Hampi|Karnataka|India|15.3350|76.4600|Hampi Bazaar,Virupapur Gaddi,Anegundi,Kamalapur,Sanapur,Hosapete
Pushkar|Rajasthan|India|26.4899|74.5511|Brahma Ghat,Main Bazaar,Panch Kund,Ganahera,Choti Basti,Badi Basti
Mount Abu|Rajasthan|India|24.5926|72.7156|Nakki Lake,Sunset Point,Achalgarh,Delwara,Salgaon,Oriya
Ooty|Tamil Nadu|India|11.4102|76.6950|Charing Cross,Fernhill,Coonoor Road,Lovedale,Ettines Road,Botanical Garden
Kodaikanal|Tamil Nadu|India|10.2381|77.4892|Lake Road,Coakers Walk,Pambar,Vilpatti,Observatory Road,Seven Roads
""")


# --- India: the long tail. Real cities and coordinates; locality names derived.
INDIA_TAIL = parse("""
Ghaziabad|Uttar Pradesh|India|28.6692|77.4538
Faridabad|Haryana|India|28.4089|77.3178
Kanpur|Uttar Pradesh|India|26.4499|80.3319
Patna|Bihar|India|25.5941|85.1376
Ranchi|Jharkhand|India|23.3441|85.3096
Raipur|Chhattisgarh|India|21.2514|81.6296
Bhubaneswar|Odisha|India|20.2961|85.8245
Cuttack|Odisha|India|20.4625|85.8830
Puri|Odisha|India|19.8135|85.8312
Dehradun|Uttarakhand|India|30.3165|78.0322
Haridwar|Uttarakhand|India|29.9457|78.1642
Nainital|Uttarakhand|India|29.3919|79.4542
Mussoorie|Uttarakhand|India|30.4598|78.0644
Almora|Uttarakhand|India|29.5892|79.6467
Ludhiana|Punjab|India|30.9010|75.8573
Jalandhar|Punjab|India|31.3260|75.5762
Patiala|Punjab|India|30.3398|76.3869
Ambala|Haryana|India|30.3752|76.7821
Karnal|Haryana|India|29.6857|76.9905
Rohtak|Haryana|India|28.8955|76.6066
Hisar|Haryana|India|29.1492|75.7217
Meerut|Uttar Pradesh|India|28.9845|77.7064
Aligarh|Uttar Pradesh|India|27.8974|78.0880
Mathura|Uttar Pradesh|India|27.4924|77.6737
Vrindavan|Uttar Pradesh|India|27.5820|77.7000
Bareilly|Uttar Pradesh|India|28.3670|79.4304
Gorakhpur|Uttar Pradesh|India|26.7606|83.3732
Allahabad|Uttar Pradesh|India|25.4358|81.8463
Jhansi|Uttar Pradesh|India|25.4484|78.5685
Ayodhya|Uttar Pradesh|India|26.7922|82.1998
Gwalior|Madhya Pradesh|India|26.2183|78.1828
Jabalpur|Madhya Pradesh|India|23.1815|79.9864
Ujjain|Madhya Pradesh|India|23.1765|75.7885
Khajuraho|Madhya Pradesh|India|24.8318|79.9199
Pachmarhi|Madhya Pradesh|India|22.4675|78.4336
Nashik|Maharashtra|India|19.9975|73.7898
Aurangabad|Maharashtra|India|19.8762|75.3433
Kolhapur|Maharashtra|India|16.7050|74.2433
Lonavala|Maharashtra|India|18.7546|73.4062
Mahabaleshwar|Maharashtra|India|17.9307|73.6477
Alibaug|Maharashtra|India|18.6414|72.8722
Ratnagiri|Maharashtra|India|16.9902|73.3120
Thane|Maharashtra|India|19.2183|72.9781
Navi Mumbai|Maharashtra|India|19.0330|73.0297
Vadodara|Gujarat|India|22.3072|73.1812
Rajkot|Gujarat|India|22.3039|70.8022
Bhuj|Gujarat|India|23.2419|69.6669
Dwarka|Gujarat|India|22.2394|68.9678
Diu|Daman and Diu|India|20.7144|70.9874
Jamnagar|Gujarat|India|22.4707|70.0577
Ajmer|Rajasthan|India|26.4499|74.6399
Bikaner|Rajasthan|India|28.0229|73.3119
Kota|Rajasthan|India|25.2138|75.8648
Bharatpur|Rajasthan|India|27.2152|77.5030
Ranthambore|Rajasthan|India|26.0173|76.5026
Alwar|Rajasthan|India|27.5530|76.6346
Chittorgarh|Rajasthan|India|24.8887|74.6269
Madurai|Tamil Nadu|India|9.9252|78.1198
Tiruchirappalli|Tamil Nadu|India|10.7905|78.7047
Thanjavur|Tamil Nadu|India|10.7870|79.1378
Rameswaram|Tamil Nadu|India|9.2876|79.3129
Kanyakumari|Tamil Nadu|India|8.0883|77.5385
Mahabalipuram|Tamil Nadu|India|12.6208|80.1945
Yercaud|Tamil Nadu|India|11.7750|78.2095
Salem|Tamil Nadu|India|11.6643|78.1460
Vellore|Tamil Nadu|India|12.9165|79.1325
Mangaluru|Karnataka|India|12.9141|74.8560
Udupi|Karnataka|India|13.3409|74.7421
Gokarna|Karnataka|India|14.5479|74.3188
Chikmagalur|Karnataka|India|13.3161|75.7720
Coorg|Karnataka|India|12.3375|75.8069
Hubli|Karnataka|India|15.3647|75.1240
Belgaum|Karnataka|India|15.8497|74.4977
Vijayawada|Andhra Pradesh|India|16.5062|80.6480
Tirupati|Andhra Pradesh|India|13.6288|79.4192
Guntur|Andhra Pradesh|India|16.3067|80.4365
Warangal|Telangana|India|17.9689|79.5941
Wayanad|Kerala|India|11.6854|76.1320
Kozhikode|Kerala|India|11.2588|75.7804
Thrissur|Kerala|India|10.5276|76.2144
Kollam|Kerala|India|8.8932|76.6141
Kumarakom|Kerala|India|9.6178|76.4300
Thekkady|Kerala|India|9.5936|77.1600
Bekal|Kerala|India|12.3906|75.0330
Siliguri|West Bengal|India|26.7271|88.3953
Kalimpong|West Bengal|India|27.0600|88.4700
Digha|West Bengal|India|21.6270|87.5090
Shantiniketan|West Bengal|India|23.6800|87.6830
Gaya|Bihar|India|24.7955|85.0002
Bodh Gaya|Bihar|India|24.6959|84.9866
Jamshedpur|Jharkhand|India|22.8046|86.2029
Dhanbad|Jharkhand|India|23.7957|86.4304
Imphal|Manipur|India|24.8170|93.9368
Aizawl|Mizoram|India|23.7271|92.7176
Kohima|Nagaland|India|25.6751|94.1086
Itanagar|Arunachal Pradesh|India|27.0844|93.6053
Agartala|Tripura|India|23.8315|91.2868
Dibrugarh|Assam|India|27.4728|94.9120
Jorhat|Assam|India|26.7509|94.2037
Kaziranga|Assam|India|26.5775|93.1711
Srinagar|Jammu and Kashmir|India|34.0837|74.7973
Gulmarg|Jammu and Kashmir|India|34.0484|74.3805
Pahalgam|Jammu and Kashmir|India|34.0161|75.3150
Leh|Ladakh|India|34.1526|77.5771
Jammu|Jammu and Kashmir|India|32.7266|74.8570
Katra|Jammu and Kashmir|India|32.9917|74.9319
Kasol|Himachal Pradesh|India|32.0100|77.3152
Spiti|Himachal Pradesh|India|32.2464|78.0349
Dalhousie|Himachal Pradesh|India|32.5387|75.9707
Kasauli|Himachal Pradesh|India|30.8977|76.9653
Bir|Himachal Pradesh|India|32.0420|76.7180
Port Blair|Andaman and Nicobar|India|11.6234|92.7265
Havelock|Andaman and Nicobar|India|11.9800|92.9800
""")


# --- Worldwide headliners, with real neighbourhoods -------------------------
WORLD_MAJOR = parse("""
New York|NY|United States|40.7128|-74.0060|Williamsburg,SoHo,Harlem,Upper West Side,Astoria,Brooklyn Heights
Los Angeles|CA|United States|34.0522|-118.2437|Venice,Silver Lake,Santa Monica,Echo Park,Hollywood Hills,Los Feliz
San Francisco|CA|United States|37.7749|-122.4194|Mission District,North Beach,Haight-Ashbury,SoMa,Nob Hill,Castro
Chicago|IL|United States|41.8781|-87.6298|Wicker Park,Lincoln Park,River North,Logan Square,Hyde Park,Old Town
Miami|FL|United States|25.7617|-80.1918|South Beach,Wynwood,Brickell,Little Havana,Coconut Grove,Design District
New Orleans|LA|United States|29.9511|-90.0715|French Quarter,Garden District,Marigny,Bywater,Treme,Uptown
Austin|TX|United States|30.2672|-97.7431|South Congress,East Austin,Zilker,Rainey Street,Hyde Park,Clarksville
Seattle|WA|United States|47.6062|-122.3321|Capitol Hill,Ballard,Fremont,Queen Anne,Belltown,Pike Place
Boston|MA|United States|42.3601|-71.0589|Back Bay,North End,Beacon Hill,Cambridge,Seaport,Jamaica Plain
Toronto|ON|Canada|43.6532|-79.3832|Kensington Market,Queen West,Distillery District,Yorkville,Leslieville,The Beaches
Vancouver|BC|Canada|49.2827|-123.1207|Gastown,Yaletown,Kitsilano,Mount Pleasant,West End,Commercial Drive
Montreal|QC|Canada|45.5017|-73.5673|Le Plateau,Old Montreal,Mile End,Griffintown,Verdun,Outremont
Mexico City||Mexico|19.4326|-99.1332|Roma Norte,Condesa,Coyoacan,Polanco,Juarez,San Angel
London||United Kingdom|51.5074|-0.1278|Shoreditch,Notting Hill,Camden,Brixton,Kensington,Hackney
Edinburgh||United Kingdom|55.9533|-3.1883|Old Town,New Town,Leith,Stockbridge,Bruntsfield,Grassmarket
Manchester||United Kingdom|53.4808|-2.2426|Northern Quarter,Ancoats,Deansgate,Chorlton,Salford Quays,Didsbury
Dublin||Ireland|53.3498|-6.2603|Temple Bar,Portobello,Rathmines,Docklands,Stoneybatter,Ranelagh
Paris||France|48.8566|2.3522|Le Marais,Montmartre,Saint-Germain,Belleville,Latin Quarter,Canal Saint-Martin
Nice||France|43.7102|7.2620|Vieux Nice,Promenade des Anglais,Cimiez,Le Port,Liberation,Musiciens
Barcelona||Spain|41.3874|2.1686|El Born,Gracia,Eixample,Barceloneta,Poblenou,Gothic Quarter
Madrid||Spain|40.4168|-3.7038|Malasana,La Latina,Chueca,Salamanca,Lavapies,Chamberi
Seville||Spain|37.3891|-5.9845|Santa Cruz,Triana,Alameda,Macarena,Arenal,Nervion
Lisbon||Portugal|38.7223|-9.1393|Alfama,Bairro Alto,Chiado,Belem,Principe Real,Cais do Sodre
Porto||Portugal|41.1579|-8.6291|Ribeira,Cedofeita,Foz do Douro,Bonfim,Boavista,Vila Nova de Gaia
Rome||Italy|41.9028|12.4964|Trastevere,Monti,Prati,Testaccio,Centro Storico,San Lorenzo
Florence||Italy|43.7696|11.2558|Oltrarno,Santa Croce,San Lorenzo,Santo Spirito,Duomo,Campo di Marte
Milan||Italy|45.4642|9.1900|Navigli,Brera,Isola,Porta Romana,Citta Studi,Porta Nuova
Venice||Italy|45.4408|12.3155|San Marco,Cannaregio,Dorsoduro,Castello,Giudecca,Santa Croce
Amsterdam||Netherlands|52.3676|4.9041|Jordaan,De Pijp,Oud-West,Noord,Oost,Canal Belt
Berlin||Germany|52.5200|13.4050|Kreuzberg,Prenzlauer Berg,Neukolln,Mitte,Friedrichshain,Charlottenburg
Munich||Germany|48.1351|11.5820|Schwabing,Glockenbachviertel,Haidhausen,Maxvorstadt,Au,Lehel
Vienna||Austria|48.2082|16.3738|Innere Stadt,Neubau,Leopoldstadt,Mariahilf,Josefstadt,Wieden
Prague||Czechia|50.0755|14.4378|Old Town,Vinohrady,Zizkov,Mala Strana,Karlin,Holesovice
Budapest||Hungary|47.4979|19.0402|District VII,Buda Castle,Ujlipotvaros,Palace District,Ferencvaros,Obuda
Copenhagen||Denmark|55.6761|12.5683|Vesterbro,Nørrebro,Christianshavn,Indre By,Østerbro,Frederiksberg
Stockholm||Sweden|59.3293|18.0686|Sodermalm,Gamla Stan,Ostermalm,Vasastan,Kungsholmen,Norrmalm
Reykjavik||Iceland|64.1466|-21.9426|Laugavegur,Vesturbaer,Hlidar,Old Harbour,Grandi,Seltjarnarnes
Istanbul||Turkey|41.0082|28.9784|Sultanahmet,Beyoglu,Kadikoy,Besiktas,Karakoy,Galata
Athens||Greece|37.9838|23.7275|Plaka,Koukaki,Exarchia,Monastiraki,Kolonaki,Psyrri
Dubai||United Arab Emirates|25.2048|55.2708|Downtown Dubai,Dubai Marina,Jumeirah,Deira,Palm Jumeirah,Business Bay
Tokyo||Japan|35.6762|139.6503|Shibuya,Shinjuku,Asakusa,Nakameguro,Koenji,Ginza
Kyoto||Japan|35.0116|135.7681|Gion,Arashiyama,Higashiyama,Pontocho,Fushimi,Kawaramachi
Osaka||Japan|34.6937|135.5023|Namba,Umeda,Shinsekai,Tennoji,Nakazakicho,Amerikamura
Seoul||South Korea|37.5665|126.9780|Hongdae,Gangnam,Itaewon,Insadong,Seongsu,Bukchon
Bangkok||Thailand|13.7563|100.5018|Sukhumvit,Silom,Old City,Ari,Thonglor,Chinatown
Singapore||Singapore|1.3521|103.8198|Tiong Bahru,Chinatown,Kampong Glam,Katong,Orchard,Sentosa
Bali||Indonesia|-8.3405|115.0920|Canggu,Ubud,Seminyak,Uluwatu,Sanur,Nusa Dua
Sydney|NSW|Australia|-33.8688|151.2093|Bondi,Surry Hills,Newtown,Manly,Paddington,The Rocks
Melbourne|VIC|Australia|-37.8136|144.9631|Fitzroy,St Kilda,Carlton,Brunswick,South Yarra,Collingwood
Auckland||New Zealand|-36.8485|174.7633|Ponsonby,Britomart,Devonport,Parnell,Grey Lynn,Mount Eden
Cape Town||South Africa|-33.9249|18.4241|Sea Point,Bo-Kaap,Camps Bay,Woodstock,Gardens,Green Point
Marrakech||Morocco|31.6295|-7.9811|Medina,Gueliz,Hivernage,Palmeraie,Kasbah,Mellah
Cairo||Egypt|30.0444|31.2357|Zamalek,Maadi,Downtown,Garden City,Heliopolis,Giza
Rio de Janeiro||Brazil|-22.9068|-43.1729|Copacabana,Ipanema,Santa Teresa,Leblon,Botafogo,Lapa
Buenos Aires||Argentina|-34.6037|-58.3816|Palermo,San Telmo,Recoleta,La Boca,Belgrano,Villa Crespo
""")


# --- Worldwide long tail (part 1): Americas, Africa, Middle East ------------
WORLD_TAIL_A = parse("""
San Diego|CA|United States|32.7157|-117.1611
Portland|OR|United States|45.5152|-122.6784
Denver|CO|United States|39.7392|-104.9903
Nashville|TN|United States|36.1627|-86.7816
Savannah|GA|United States|32.0809|-81.0912
Charleston|SC|United States|32.7765|-79.9311
Asheville|NC|United States|35.5951|-82.5515
Philadelphia|PA|United States|39.9526|-75.1652
Washington|DC|United States|38.9072|-77.0369
Atlanta|GA|United States|33.7490|-84.3880
Houston|TX|United States|29.7604|-95.3698
Dallas|TX|United States|32.7767|-96.7970
San Antonio|TX|United States|29.4241|-98.4936
Phoenix|AZ|United States|33.4484|-112.0740
Sedona|AZ|United States|34.8697|-111.7610
Las Vegas|NV|United States|36.1699|-115.1398
Salt Lake City|UT|United States|40.7608|-111.8910
Aspen|CO|United States|39.1911|-106.8175
Boulder|CO|United States|40.0150|-105.2705
Santa Fe|NM|United States|35.6870|-105.9378
Minneapolis|MN|United States|44.9778|-93.2650
Detroit|MI|United States|42.3314|-83.0458
Pittsburgh|PA|United States|40.4406|-79.9959
Cleveland|OH|United States|41.4993|-81.6944
St Louis|MO|United States|38.6270|-90.1994
Kansas City|MO|United States|39.0997|-94.5786
Memphis|TN|United States|35.1495|-90.0490
Louisville|KY|United States|38.2527|-85.7585
Orlando|FL|United States|28.5383|-81.3792
Tampa|FL|United States|27.9506|-82.4572
Key West|FL|United States|24.5551|-81.7800
Honolulu|HI|United States|21.3069|-157.8583
Maui|HI|United States|20.7984|-156.3319
Anchorage|AK|United States|61.2181|-149.9003
Palm Springs|CA|United States|33.8303|-116.5453
Napa|CA|United States|38.2975|-122.2869
Big Sur|CA|United States|36.2704|-121.8081
Lake Tahoe|CA|United States|39.0968|-120.0324
Jackson|WY|United States|43.4799|-110.7624
Bozeman|MT|United States|45.6770|-111.0429
Calgary|AB|Canada|51.0447|-114.0719
Ottawa|ON|Canada|45.4215|-75.6972
Quebec City|QC|Canada|46.8139|-71.2080
Banff|AB|Canada|51.1784|-115.5708
Whistler|BC|Canada|50.1163|-122.9574
Victoria|BC|Canada|48.4284|-123.3656
Halifax|NS|Canada|44.6488|-63.5752
Cancun||Mexico|21.1619|-86.8515
Tulum||Mexico|20.2114|-87.4654
Oaxaca||Mexico|17.0732|-96.7266
Guadalajara||Mexico|20.6597|-103.3496
San Miguel de Allende||Mexico|20.9153|-100.7436
Puerto Vallarta||Mexico|20.6534|-105.2253
Merida||Mexico|20.9674|-89.5926
Playa del Carmen||Mexico|20.6296|-87.0739
Havana||Cuba|23.1136|-82.3666
San Juan||Puerto Rico|18.4655|-66.1057
Kingston||Jamaica|17.9714|-76.7920
Nassau||Bahamas|25.0443|-77.3504
Bridgetown||Barbados|13.1132|-59.5988
Panama City||Panama|8.9824|-79.5199
San Jose||Costa Rica|9.9281|-84.0907
Tamarindo||Costa Rica|10.2993|-85.8371
Antigua||Guatemala|14.5586|-90.7295
Bogota||Colombia|4.7110|-74.0721
Cartagena||Colombia|10.3910|-75.4794
Medellin||Colombia|6.2442|-75.5812
Quito||Ecuador|-0.1807|-78.4678
Lima||Peru|-12.0464|-77.0428
Cusco||Peru|-13.5319|-71.9675
La Paz||Bolivia|-16.4897|-68.1193
Santiago||Chile|-33.4489|-70.6693
Valparaiso||Chile|-33.0472|-71.6127
Mendoza||Argentina|-32.8895|-68.8458
Bariloche||Argentina|-41.1335|-71.3103
Montevideo||Uruguay|-34.9011|-56.1645
Sao Paulo||Brazil|-23.5505|-46.6333
Florianopolis||Brazil|-27.5954|-48.5480
Salvador||Brazil|-12.9777|-38.5016
Paraty||Brazil|-23.2178|-44.7131
Nairobi||Kenya|-1.2921|36.8219
Mombasa||Kenya|-4.0435|39.6682
Zanzibar||Tanzania|-6.1659|39.2026
Arusha||Tanzania|-3.3869|36.6830
Kampala||Uganda|0.3476|32.5825
Kigali||Rwanda|-1.9441|30.0619
Addis Ababa||Ethiopia|9.0320|38.7469
Accra||Ghana|5.6037|-0.1870
Lagos||Nigeria|6.5244|3.3792
Dakar||Senegal|14.7167|-17.4677
Johannesburg||South Africa|-26.2041|28.0473
Durban||South Africa|-29.8587|31.0218
Stellenbosch||South Africa|-33.9321|18.8602
Windhoek||Namibia|-22.5609|17.0658
Victoria Falls||Zimbabwe|-17.9243|25.8572
Port Louis||Mauritius|-20.1609|57.5012
Casablanca||Morocco|33.5731|-7.5898
Fez||Morocco|34.0181|-5.0078
Chefchaouen||Morocco|35.1688|-5.2636
Essaouira||Morocco|31.5085|-9.7595
Tunis||Tunisia|36.8065|10.1815
Alexandria||Egypt|31.2001|29.9187
Luxor||Egypt|25.6872|32.6396
Sharm El Sheikh||Egypt|27.9158|34.3300
Amman||Jordan|31.9454|35.9284
Petra||Jordan|30.3285|35.4444
Beirut||Lebanon|33.8938|35.5018
Tel Aviv||Israel|32.0853|34.7818
Jerusalem||Israel|31.7683|35.2137
Doha||Qatar|25.2854|51.5310
Abu Dhabi||United Arab Emirates|24.4539|54.3773
Muscat||Oman|23.5880|58.3829
Salalah||Oman|17.0151|54.0924
Manama||Bahrain|26.2285|50.5860
Riyadh||Saudi Arabia|24.7136|46.6753
Jeddah||Saudi Arabia|21.4858|39.1925
Baku||Azerbaijan|40.4093|49.8671
Tbilisi||Georgia|41.7151|44.8271
Yerevan||Armenia|40.1792|44.4991
Almaty||Kazakhstan|43.2220|76.8512
Tashkent||Uzbekistan|41.2995|69.2401
Samarkand||Uzbekistan|39.6270|66.9750
""")


# --- Worldwide long tail (part 2): Europe, Asia-Pacific ---------------------
WORLD_TAIL_B = parse("""
Glasgow||United Kingdom|55.8642|-4.2518
Liverpool||United Kingdom|53.4084|-2.9916
Bristol||United Kingdom|51.4545|-2.5879
Bath||United Kingdom|51.3811|-2.3590
Oxford||United Kingdom|51.7520|-1.2577
Cambridge||United Kingdom|52.2053|0.1218
York||United Kingdom|53.9600|-1.0873
Brighton||United Kingdom|50.8225|-0.1372
Cardiff||United Kingdom|51.4816|-3.1791
Belfast||United Kingdom|54.5973|-5.9301
Galway||Ireland|53.2707|-9.0568
Cork||Ireland|51.8985|-8.4756
Lyon||France|45.7640|4.8357
Marseille||France|43.2965|5.3698
Bordeaux||France|44.8378|-0.5792
Toulouse||France|43.6047|1.4442
Strasbourg||France|48.5734|7.7521
Cannes||France|43.5528|7.0174
Annecy||France|45.8992|6.1294
Chamonix||France|45.9237|6.8694
Biarritz||France|43.4832|-1.5586
Valencia||Spain|39.4699|-0.3763
Granada||Spain|37.1773|-3.5986
Malaga||Spain|36.7213|-4.4214
Bilbao||Spain|43.2630|-2.9350
San Sebastian||Spain|43.3183|-1.9812
Palma||Spain|39.5696|2.6502
Ibiza||Spain|38.9067|1.4206
Tenerife||Spain|28.2916|-16.6291
Las Palmas||Spain|28.1235|-15.4363
Lagos||Portugal|37.1028|-8.6733
Faro||Portugal|37.0194|-7.9304
Funchal||Portugal|32.6669|-16.9241
Coimbra||Portugal|40.2033|-8.4103
Naples||Italy|40.8518|14.2681
Turin||Italy|45.0703|7.6869
Bologna||Italy|44.4949|11.3426
Verona||Italy|45.4384|10.9916
Palermo||Italy|38.1157|13.3615
Positano||Italy|40.6281|14.4850
Sorrento||Italy|40.6263|14.3757
Como||Italy|45.8081|9.0852
Siena||Italy|43.3188|11.3308
Cinque Terre||Italy|44.1461|9.6439
Zurich||Switzerland|47.3769|8.5417
Geneva||Switzerland|46.2044|6.1432
Lucerne||Switzerland|47.0502|8.3093
Interlaken||Switzerland|46.6863|7.8632
Zermatt||Switzerland|46.0207|7.7491
Salzburg||Austria|47.8095|13.0550
Innsbruck||Austria|47.2692|11.4041
Hallstatt||Austria|47.5622|13.6493
Hamburg||Germany|53.5511|9.9937
Cologne||Germany|50.9375|6.9603
Frankfurt||Germany|50.1109|8.6821
Dresden||Germany|51.0504|13.7373
Heidelberg||Germany|49.3988|8.6724
Rotterdam||Netherlands|51.9244|4.4777
Utrecht||Netherlands|52.0907|5.1214
Brussels||Belgium|50.8503|4.3517
Bruges||Belgium|51.2093|3.2247
Ghent||Belgium|51.0543|3.7174
Luxembourg||Luxembourg|49.6116|6.1319
Oslo||Norway|59.9139|10.7522
Bergen||Norway|60.3913|5.3221
Tromso||Norway|69.6492|18.9553
Gothenburg||Sweden|57.7089|11.9746
Helsinki||Finland|60.1699|24.9384
Rovaniemi||Finland|66.5039|25.7294
Aarhus||Denmark|56.1629|10.2039
Tallinn||Estonia|59.4370|24.7536
Riga||Latvia|56.9496|24.1052
Vilnius||Lithuania|54.6872|25.2797
Warsaw||Poland|52.2297|21.0122
Krakow||Poland|50.0647|19.9450
Gdansk||Poland|54.3520|18.6466
Wroclaw||Poland|51.1079|17.0385
Brno||Czechia|49.1951|16.6068
Bratislava||Slovakia|48.1486|17.1077
Ljubljana||Slovenia|46.0569|14.5058
Zagreb||Croatia|45.8150|15.9819
Split||Croatia|43.5081|16.4402
Dubrovnik||Croatia|42.6507|18.0944
Hvar||Croatia|43.1729|16.4413
Sarajevo||Bosnia and Herzegovina|43.8563|18.4131
Belgrade||Serbia|44.7866|20.4489
Kotor||Montenegro|42.4247|18.7712
Tirana||Albania|41.3275|19.8187
Skopje||North Macedonia|41.9981|21.4254
Sofia||Bulgaria|42.6977|23.3219
Bucharest||Romania|44.4268|26.1025
Brasov||Romania|45.6427|25.5887
Thessaloniki||Greece|40.6401|22.9444
Santorini||Greece|36.3932|25.4615
Mykonos||Greece|37.4467|25.3289
Crete||Greece|35.2401|24.8093
Rhodes||Greece|36.4349|28.2176
Valletta||Malta|35.8989|14.5146
Nicosia||Cyprus|35.1856|33.3823
Antalya||Turkey|36.8969|30.7133
Cappadocia||Turkey|38.6431|34.8289
Izmir||Turkey|38.4237|27.1428
Bodrum||Turkey|37.0344|27.4305
Kathmandu||Nepal|27.7172|85.3240
Pokhara||Nepal|28.2096|83.9856
Thimphu||Bhutan|27.4728|89.6390
Colombo||Sri Lanka|6.9271|79.8612
Kandy||Sri Lanka|7.2906|80.6337
Galle||Sri Lanka|6.0535|80.2210
Ella||Sri Lanka|6.8667|81.0466
Male||Maldives|4.1755|73.5093
Dhaka||Bangladesh|23.8103|90.4125
Karachi||Pakistan|24.8607|67.0011
Lahore||Pakistan|31.5204|74.3587
Islamabad||Pakistan|33.6844|73.0479
Beijing||China|39.9042|116.4074
Shanghai||China|31.2304|121.4737
Chengdu||China|30.5728|104.0668
Guangzhou||China|23.1291|113.2644
Xian||China|34.3416|108.9398
Hangzhou||China|30.2741|120.1551
Guilin||China|25.2342|110.1800
Hong Kong||Hong Kong|22.3193|114.1694
Macau||Macau|22.1987|113.5439
Taipei||Taiwan|25.0330|121.5654
Busan||South Korea|35.1796|129.0756
Jeju||South Korea|33.4996|126.5312
Sapporo||Japan|43.0618|141.3545
Fukuoka||Japan|33.5904|130.4017
Hiroshima||Japan|34.3853|132.4553
Nara||Japan|34.6851|135.8048
Hakone||Japan|35.2324|139.1069
Okinawa||Japan|26.5013|127.9454
Chiang Mai||Thailand|18.7883|98.9853
Phuket||Thailand|7.8804|98.3923
Krabi||Thailand|8.0863|98.9063
Koh Samui||Thailand|9.5120|100.0136
Pai||Thailand|19.3583|98.4406
Hanoi||Vietnam|21.0285|105.8542
Ho Chi Minh City||Vietnam|10.8231|106.6297
Hoi An||Vietnam|15.8801|108.3380
Da Nang||Vietnam|16.0544|108.2022
Sapa||Vietnam|22.3364|103.8438
Phnom Penh||Cambodia|11.5564|104.9282
Siem Reap||Cambodia|13.3671|103.8448
Luang Prabang||Laos|19.8867|102.1350
Vientiane||Laos|17.9757|102.6331
Yangon||Myanmar|16.8661|96.1951
Kuala Lumpur||Malaysia|3.1390|101.6869
Penang||Malaysia|5.4141|100.3288
Langkawi||Malaysia|6.3500|99.8000
Kota Kinabalu||Malaysia|5.9804|116.0735
Jakarta||Indonesia|-6.2088|106.8456
Yogyakarta||Indonesia|-7.7956|110.3695
Lombok||Indonesia|-8.6500|116.3249
Manila||Philippines|14.5995|120.9842
Cebu||Philippines|10.3157|123.8854
Palawan||Philippines|9.8349|118.7384
Boracay||Philippines|11.9674|121.9248
Brisbane|QLD|Australia|-27.4698|153.0251
Perth|WA|Australia|-31.9505|115.8605
Adelaide|SA|Australia|-34.9285|138.6007
Gold Coast|QLD|Australia|-28.0167|153.4000
Cairns|QLD|Australia|-16.9186|145.7781
Hobart|TAS|Australia|-42.8821|147.3272
Byron Bay|NSW|Australia|-28.6474|153.6020
Canberra|ACT|Australia|-35.2809|149.1300
Wellington||New Zealand|-41.2866|174.7756
Queenstown||New Zealand|-45.0312|168.6626
Christchurch||New Zealand|-43.5321|172.6362
Rotorua||New Zealand|-38.1368|176.2497
Suva||Fiji|-18.1416|178.4419
Nadi||Fiji|-17.7765|177.4356
Papeete||French Polynesia|-17.5516|-149.5585
""")



# --- Additions, third pass: more of the Indian long tail and world cities ----
EXTRA_TAIL = parse("""
Greater Noida|Uttar Pradesh|India|28.4744|77.5040
Sonipat|Haryana|India|28.9931|77.0151
Panipat|Haryana|India|29.3909|76.9635
Saharanpur|Uttar Pradesh|India|29.9680|77.5510
Moradabad|Uttar Pradesh|India|28.8386|78.7733
Rampur|Uttar Pradesh|India|28.8103|79.0250
Firozabad|Uttar Pradesh|India|27.1591|78.3958
Etawah|Uttar Pradesh|India|26.7855|79.0150
Faizabad|Uttar Pradesh|India|26.7730|82.1460
Mirzapur|Uttar Pradesh|India|25.1460|82.5690
Chitrakoot|Uttar Pradesh|India|25.2000|80.9000
Orchha|Madhya Pradesh|India|25.3519|78.6400
Mandu|Madhya Pradesh|India|22.3500|75.4000
Bandhavgarh|Madhya Pradesh|India|23.7000|81.0300
Kanha|Madhya Pradesh|India|22.3350|80.6300
Chikhaldara|Maharashtra|India|21.4000|77.3300
Shirdi|Maharashtra|India|19.7645|74.4762
Igatpuri|Maharashtra|India|19.6960|73.5620
Matheran|Maharashtra|India|18.9873|73.2687
Panchgani|Maharashtra|India|17.9244|73.8007
Tarkarli|Maharashtra|India|16.0300|73.4800
Gir|Gujarat|India|21.1240|70.8240
Somnath|Gujarat|India|20.8880|70.4010
Saputara|Gujarat|India|20.5750|73.7500
Kutch|Gujarat|India|23.7337|69.8597
Bundi|Rajasthan|India|25.4305|75.6499
Sawai Madhopur|Rajasthan|India|26.0173|76.3500
Nathdwara|Rajasthan|India|24.9300|73.8200
Kumbhalgarh|Rajasthan|India|25.1528|73.5870
Mandawa|Rajasthan|India|28.0550|75.1490
Bir Billing|Himachal Pradesh|India|32.0400|76.7300
Tirthan Valley|Himachal Pradesh|India|31.6400|77.3500
Chail|Himachal Pradesh|India|30.9700|77.2000
Palampur|Himachal Pradesh|India|32.1109|76.5363
Auli|Uttarakhand|India|30.5260|79.5660
Lansdowne|Uttarakhand|India|29.8400|78.6800
Ranikhet|Uttarakhand|India|29.6400|79.4300
Kausani|Uttarakhand|India|29.8400|79.6000
Chopta|Uttarakhand|India|30.4700|79.1800
Binsar|Uttarakhand|India|29.7000|79.7500
Pelling|Sikkim|India|27.3000|88.2300
Lachung|Sikkim|India|27.6900|88.7400
Tawang|Arunachal Pradesh|India|27.5860|91.8590
Ziro|Arunachal Pradesh|India|27.5800|93.8300
Cherrapunji|Meghalaya|India|25.2700|91.7300
Majuli|Assam|India|26.9500|94.1700
Tezpur|Assam|India|26.6300|92.8000
Mangan|Sikkim|India|27.5100|88.5300
Yelagiri|Tamil Nadu|India|12.5800|78.6400
Coonoor|Tamil Nadu|India|11.3530|76.7960
Kotagiri|Tamil Nadu|India|11.4200|76.8700
Chidambaram|Tamil Nadu|India|11.3990|79.6910
Kumbakonam|Tamil Nadu|India|10.9600|79.3800
Varkala|Kerala|India|8.7379|76.7163
Vagamon|Kerala|India|9.6860|76.9060
Poovar|Kerala|India|8.3200|77.0700
Kannur|Kerala|India|11.8745|75.3704
Nelliyampathy|Kerala|India|10.5300|76.6900
Araku Valley|Andhra Pradesh|India|18.3273|82.8757
Lepakshi|Andhra Pradesh|India|13.8000|77.6100
Nagarjuna Sagar|Telangana|India|16.5700|79.3100
Badami|Karnataka|India|15.9200|75.6800
Sakleshpur|Karnataka|India|12.9400|75.7900
Kabini|Karnataka|India|11.9800|76.3700
Bagan||Myanmar|21.1717|94.8585
Nuwara Eliya||Sri Lanka|6.9497|80.7891
Trincomalee||Sri Lanka|8.5874|81.2152
Mirissa||Sri Lanka|5.9483|80.4716
Paro||Bhutan|27.4287|89.4164
Punakha||Bhutan|27.5900|89.8600
Chitwan||Nepal|27.5291|84.3542
Nagarkot||Nepal|27.7150|85.5200
Hue||Vietnam|16.4637|107.5909
Phu Quoc||Vietnam|10.2899|103.9840
Ninh Binh||Vietnam|20.2506|105.9745
Battambang||Cambodia|13.0957|103.2022
Kampot||Cambodia|10.5940|104.1640
Vang Vieng||Laos|18.9236|102.4485
Ipoh||Malaysia|4.5975|101.0901
Malacca||Malaysia|2.1896|102.2501
Bandung||Indonesia|-6.9175|107.6191
Flores||Indonesia|-8.6574|121.0794
Gili Islands||Indonesia|-8.3500|116.0500
Bohol||Philippines|9.8500|124.1435
Siargao||Philippines|9.8600|126.0500
Baguio||Philippines|16.4023|120.5960
Hualien||Taiwan|23.9910|121.6110
Kaohsiung||Taiwan|22.6273|120.3014
Kanazawa||Japan|36.5613|136.6562
Takayama||Japan|36.1408|137.2520
Nikko||Japan|36.7199|139.6982
Kobe||Japan|34.6901|135.1955
Nagoya||Japan|35.1815|136.9066
Gyeongju||South Korea|35.8562|129.2247
Sokcho||South Korea|38.2070|128.5918
Ulaanbaatar||Mongolia|47.8864|106.9057
Lhasa||China|29.6520|91.1721
Kunming||China|25.0389|102.7183
Lijiang||China|26.8721|100.2330
Zhangjiajie||China|29.1170|110.4790
Suzhou||China|31.2989|120.5853
""")

#: Every destination in the catalogue, headliners first so the seed can give
#: them more inventory than the long tail.
ALL_CITIES = INDIA_MAJOR + WORLD_MAJOR + INDIA_TAIL + WORLD_TAIL_A + WORLD_TAIL_B + EXTRA_TAIL

#: The cities that get the deepest inventory, experiences and services.
MAJOR_CITIES = INDIA_MAJOR + WORLD_MAJOR
