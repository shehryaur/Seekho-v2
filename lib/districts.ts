/**
 * lib/districts.ts — Static district context fallback.
 *
 * Used when Supabase is unreachable, or for previewing the app locally.
 * Mirrors `_local_districts()` from the legacy `database.py`.
 */

import type { District } from "./supabase";

export const LOCAL_DISTRICTS: District[] = [
  {
    name: "Fateh Jang / Attock",
    province: "Punjab",
    economy:
      "Sugarcane farming, brick kiln labour, wheat, Attock Oil Refinery",
    landmarks: "GT Road Attock, Attock Fort, Indus River, Haro River",
    transport: "Tractor-trolleys, Suzuki pickups, motorbikes, donkey carts",
    food: "Makki ki roti with saag, gur, lassi, daal chawal",
    occupations:
      "Sugarcane farmers, bhatta mazdoor, military families, dukandaar",
    nature:
      "Mustard fields, Indus floods, keekar trees, canal irrigation, winter fog",
    local_names: "Akbar, Bashir, Zainab, Nazia, Farhan, Gulnaz",
    school_type: "Government Urdu-medium, 40-50 students per class",
    connectivity: "3G mostly, load-shedding 8-12 hours",
    board: "BISE Rawalpindi",
  },
  {
    name: "Lahore",
    province: "Punjab",
    economy: "Garment factories, IT sector, trade, services",
    landmarks: "Lahore Fort, Badshahi Mosque, Mall Road, Anarkali Bazaar",
    transport: "Orange Line Metro, rickshaws, motorcycles, Careem",
    food: "Halwa puri, nihari, Lahori chargha, lassi",
    occupations: "Factory workers, traders, IT professionals, teachers",
    nature: "Canal walks, mango season June, smog November",
    local_names: "Hamza, Ayesha, Bilal, Sana, Usman, Nimra",
    school_type:
      "Mix of private chains (Beaconhouse, LGS) and government",
    connectivity: "4G widely available",
    board: "BISE Lahore",
  },
  {
    name: "Multan",
    province: "Punjab",
    economy: "Cotton farming, mango orchards, blue pottery, carpet weaving",
    landmarks:
      "Shah Rukn-e-Alam shrine, Multan Fort, Hussain Agahi Bazaar",
    transport:
      "Qingqi rickshaws, motorcycles, wagons, tractor-trolleys",
    food: "Sohan halwa, Multani lassi, mangoes, daal mash",
    occupations:
      "Cotton farmers, mango growers, handicraft artisans, traders",
    nature: "Extreme heat 50°C, cotton fields, Chenab river",
    local_names: "Pervaiz, Rukhsana, Sajid, Rabia, Shafiq, Bushra",
    school_type: "Government dominant, shrine madrassas prominent",
    connectivity: "Moderate 4G in city",
    board: "BISE Multan",
  },
  {
    name: "Peshawar",
    province: "Khyber Pakhtunkhwa",
    economy:
      "Afghan transit trade, Karkhano Market, dry fruit trade, handicrafts",
    landmarks: "Qissa Khwani Bazaar, Bala Hisar Fort, Khyber Pass",
    transport: "Datsun pickups, rickshaws, horse-drawn tongas",
    food: "Chapli kebab, Peshawari ice cream, Kabuli pulao, dry fruits",
    occupations:
      "Dry fruit traders, Karkhano shop owners, government employees",
    nature: "Khyber hills, River Kabul, walnut trees, cold winters",
    local_names: "Noor, Palwasha, Junaid, Hina, Rashid, Gul Meena",
    school_type:
      "Government, KP Education Foundation schools, Pashto-Urdu bilingual",
    connectivity: "Variable, improving",
    board: "BISE Peshawar",
  },
  {
    name: "Karachi",
    province: "Sindh",
    economy:
      "Textile mills, port logistics, finance, fisheries, IT",
    landmarks:
      "Clifton Beach, Empress Market, Burns Road, Port Qasim",
    transport:
      "K-Electric buses, rickshaws, motorcycles, InDrive, heavy traffic",
    food: "Biryani, bun kebab, nihari, sea fish (pomfret, jhinga)",
    occupations:
      "Factory workers, fishermen, traders, corporate workers",
    nature:
      "Arabian Sea, mangroves, hot humid summers, cyclone risk",
    local_names: "Zubair, Nida, Asif, Shirin, Kamran, Fahmida",
    school_type:
      "Large variation: elite private to community schools",
    connectivity: "Good 4G in urban areas, poor in Lyari, Orangi, Baldia",
    board: "BISE Karachi",
  },
  {
    name: "Rawalpindi / Islamabad",
    province: "Punjab / Federal",
    economy:
      "Government services, military, Murree tourism, construction",
    landmarks: "Murree Hills, Rawal Lake, Faisal Mosque, Raja Bazaar",
    transport:
      "Metro Bus, Suzuki vans, motorcycles, government cars",
    food: "Potohari daal, sajji on Murree Road, kulfi, Pothohari bread",
    occupations:
      "Government servants, military, teachers, IT professionals",
    nature: "Margalla Hills, Rawal Lake, pine forests, cold winters",
    local_names: "Shahid, Mehwish, Tariq, Rubab, Waqar, Aisha",
    school_type: "FBISE schools, mix of private and government",
    connectivity:
      "Good 4G and fiber in Islamabad, variable in Potohar villages",
    board: "FBISE / BISE Rawalpindi",
  },
  {
    name: "Faisalabad",
    province: "Punjab",
    economy:
      "Textile capital: weaving, dyeing, garments, grain trade",
    landmarks: "Clock Tower (Ghanta Ghar) 8 bazaars, Lyallpur Museum",
    transport:
      "Qingqi rickshaws, motorcycles, Suzuki wagons, textile trucks",
    food: "Dhodha, fresh milk products, saag roti, bhutta, jalebi",
    occupations:
      "Textile mill workers, grain merchants, machinery mechanics",
    nature: "Flat plains, Chenab River proximity, winter fog",
    local_names: "Asghar, Razia, Imran, Shaheena, Khalid, Nasima",
    school_type: "Government dominant, growing private sector",
    connectivity: "Moderate 4G, load-shedding common",
    board: "BISE Faisalabad",
  },
  {
    name: "Gujranwala",
    province: "Punjab",
    economy:
      "Steel industry, basmati rice export, ceramics, food processing",
    landmarks:
      "Ranjit Singh haveli, grain market, Gujranwala Sports Complex",
    transport:
      "Motorcycles, wagons, steel and rice trucks, rickshaws",
    food: "Basmati rice, white chickpea curry, lassi, fried fish",
    occupations:
      "Steel workers, rice millers, ceramic factory workers, traders",
    nature: "Flat Punjab plains, rice paddies, winter fog",
    local_names: "Usman, Kiran, Imtiaz, Shabana, Rasheed, Ghazala",
    school_type:
      "Mix of government and private, relatively better infrastructure",
    connectivity: "Moderate to good 4G",
    board: "BISE Gujranwala",
  },
  {
    name: "Quetta",
    province: "Balochistan",
    economy:
      "Fruit growing, coal mining, Afghan transit trade, livestock",
    landmarks: "Quetta Fruit Market, Hanna Lake, Ziarat juniper forest",
    transport:
      "Motorcycles, pickup trucks, inter-city coaches, donkeys in villages",
    food: "Sajji, bolani, Afghan naan, pomegranate, dried fruits",
    occupations:
      "Fruit farmers, coal miners, Afghan traders, government servants",
    nature:
      "Dry mountainous terrain, juniper forests, snow in winters",
    local_names: "Nasrullah, Zarghona, Daud, Gul Bibi, Waheed, Malika",
    school_type:
      "Government schools, Balochi-Brahui-Pashto-Urdu multilingual",
    connectivity: "3G variable, severe load-shedding",
    board: "BISE Quetta",
  },
  {
    name: "Sialkot",
    province: "Punjab",
    economy:
      "Sports goods (footballs, cricket bats), surgical instruments, leather export",
    landmarks:
      "Allama Iqbal birthplace museum, Sialkot Fort, export factories",
    transport:
      "Motorcycles, rickshaws, factory worker vans, export trucks",
    food: "Sialkoti paye, white chickpeas, lassi, puri channay",
    occupations:
      "Sports goods workers, surgical instrument makers, leather tanners, exporters",
    nature:
      "Flat plains, Chenab river proximity, winter fog, muggy summers",
    local_names: "Shahbaz, Amina, Zahid, Saima, Inam, Robina",
    school_type:
      "Good private sector education, government schools present",
    connectivity: "Good 4G due to export industry",
    board: "BISE Gujranwala",
  },
];

/** Generic fallback used for custom user-typed districts. */
export function fallbackDistrict(name: string): District {
  return {
    name,
    province: "Pakistan",
    economy: "agriculture, small trade, government services",
    landmarks: `${name} city centre, local bazaar`,
    transport: "motorcycles, rickshaws, wagons",
    food: "roti, daal, sabzi, rice, chai",
    occupations:
      "farmers, shopkeepers, teachers, government workers",
    nature: "agricultural plains, seasonal weather patterns",
    local_names: "Muhammad, Ali, Fatima, Ayesha, Ahmed, Sara",
    school_type: "government schools dominant",
    connectivity: "variable mobile data, load-shedding common",
    board: "local BISE",
  };
}
