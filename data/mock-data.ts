import type { Chapter, CoinPackage, Genre, Novel, UpdateItem } from "@/types/novel";

export const genres: Genre[] = [
  { slug: "action", name: "Action", thaiName: "แอ็กชัน", description: "ฉากปะทะเร็ว เข้มข้น และเดิมพันสูง", count: 1283 },
  { slug: "fantasy", name: "Fantasy", thaiName: "แฟนตาซี", description: "โลกเวทมนตร์ อาณาจักรลับ และพลังเหนือจินตนาการ", count: 1116 },
  { slug: "system", name: "System", thaiName: "ระบบ", description: "ภารกิจ ค่าสถานะ และการเติบโตแบบเห็นผลทันที", count: 920 },
  { slug: "apocalypse", name: "Apocalypse", thaiName: "วันสิ้นโลก", description: "เอาชีวิตรอดในโลกที่กฎเดิมพังทลาย", count: 604 },
  { slug: "romance", name: "Romance", thaiName: "โรแมนซ์", description: "ความสัมพันธ์ที่ค่อย ๆ เติบโตท่ามกลางเรื่องราวใหญ่", count: 872 },
  { slug: "xianxia", name: "Xianxia", thaiName: "เซียน", description: "ฝึกตน สำนัก กระบี่ และการไต่ระดับสู่สวรรค์", count: 731 },
  { slug: "wuxia", name: "Wuxia", thaiName: "ยุทธภพ", description: "จอมยุทธ์ สำนักลับ และศักดิ์ศรีในยุทธภพ", count: 515 },
  { slug: "adventure", name: "Adventure", thaiName: "ผจญภัย", description: "ออกเดินทาง ค้นพบโลกใหม่ และเพื่อนร่วมทาง", count: 784 },
  { slug: "comedy", name: "Comedy", thaiName: "คอมเมดี้", description: "อ่านสบาย จังหวะสนุก และตัวละครมีเสน่ห์", count: 402 },
  { slug: "mystery", name: "Mystery", thaiName: "สืบสวน", description: "ปริศนา เบาะแส และความจริงที่ค่อย ๆ เผย", count: 356 },
  { slug: "horror", name: "Horror", thaiName: "สยองขวัญ", description: "บรรยากาศกดดัน ความลับ และภัยที่มองไม่เห็น", count: 248 },
  { slug: "sci-fi", name: "Sci-Fi", thaiName: "ไซไฟ", description: "เทคโนโลยี อวกาศ และอนาคตที่ไม่แน่นอน", count: 489 },
  { slug: "school-life", name: "School Life", thaiName: "ชีวิตโรงเรียน", description: "ชีวิตวัยเรียน ความลับ และมิตรภาพ", count: 333 },
  { slug: "martial-arts", name: "Martial Arts", thaiName: "กำลังภายใน", description: "วิชาต่อสู้ การฝึกฝน และศึกแห่งศักดิ์ศรี", count: 644 }
];

export const popularTags = [
  "Overpowered",
  "Reincarnation",
  "Weak to Strong",
  "Male Protagonist",
  "Academy",
  "System",
  "Apocalypse",
  "Cultivation",
  "Dungeon",
  "Magic",
  "Time Loop",
  "Villain",
  "Regression",
  "System Administrator"
];

const rawNovels: Novel[] = [
  {
    slug: "shadow-king",
    title: "I Became the King in the World of Shadows",
    thaiTitle: "ฉันกลายเป็นราชาในโลกแห่งเงา",
    author: "Moon Archive",
    genres: ["fantasy", "system", "action"],
    tags: ["Overpowered", "System", "Magic"],
    status: "ongoing",
    rating: 4.9,
    views: 2184000,
    chapters: 184,
    synopsis: "เมื่อเด็กหนุ่มตื่นขึ้นในเมืองที่พระอาทิตย์ไม่เคยส่อง เขาต้องใช้ระบบเงาที่ไม่มีใครเข้าใจเพื่อสร้างอาณาจักรของตัวเอง",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "1 ชั่วโมงที่แล้ว",
    featured: true
  },
  {
    slug: "bloodthirsty-police",
    title: "Return of the Bloodthirsty Police",
    thaiTitle: "ตำรวจคลั่งเลือดหวนคืน",
    author: "Red Siren",
    genres: ["action", "mystery"],
    tags: ["Regression", "Male Protagonist"],
    status: "ongoing",
    rating: 4.7,
    views: 1642000,
    chapters: 184,
    synopsis: "นายตำรวจผู้ถูกหักหลังย้อนกลับมาในวันแรกของคดีใหญ่ พร้อมความทรงจำที่ทำให้เขาไม่ยอมแพ้อีกครั้ง",
    cover: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "1 ชั่วโมงที่แล้ว",
    featured: true
  },
  {
    slug: "immortal-king",
    title: "Rise of the Immortal King",
    thaiTitle: "ราชันอมตะผงาดฟ้า",
    author: "Nine Clouds",
    genres: ["xianxia", "martial-arts", "fantasy"],
    tags: ["Cultivation", "Weak to Strong"],
    status: "ongoing",
    rating: 4.8,
    views: 1923000,
    chapters: 312,
    synopsis: "ศิษย์นอกสำนักที่ถูกลืมค้นพบคัมภีร์ไร้ชื่อ และเริ่มเดินเส้นทางที่แม้แต่เทพยังต้องหลีกทาง",
    cover: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "3 ชั่วโมงที่แล้ว",
    featured: true
  },
  {
    slug: "max-level-newbie",
    title: "The Max Level Newbie",
    thaiTitle: "มือใหม่เลเวลตัน",
    author: "Level Zero",
    genres: ["system", "adventure", "comedy"],
    tags: ["System", "Dungeon", "Overpowered"],
    status: "ongoing",
    rating: 4.6,
    views: 1503000,
    chapters: 128,
    synopsis: "เกมที่เขาเล่นอยู่คนเดียวมาสิบปีกลายเป็นความจริง และเขาคือคนเดียวที่รู้ทุกทางลัดของโลกใหม่นี้",
    cover: "https://images.unsplash.com/photo-1526505262320-81542978f63b?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "วันนี้",
    featured: true
  },
  {
    slug: "release-that-witch",
    title: "Release That Witch",
    thaiTitle: "ปล่อยแม่มดคนนั้น",
    author: "Forge Tale",
    genres: ["fantasy", "romance", "sci-fi"],
    tags: ["Magic", "Kingdom Building"],
    status: "completed",
    rating: 4.9,
    views: 2864000,
    chapters: 420,
    synopsis: "วิศวกรยุคใหม่เกิดใหม่เป็นเจ้าชายชายแดน และค้นพบว่าแม่มดคือกุญแจของการเปลี่ยนโลกทั้งใบ",
    cover: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "จบแล้ว",
    completed: true
  },
  {
    slug: "omniscient-reader",
    title: "Omniscient Reader's Viewpoint",
    thaiTitle: "มุมมองนักอ่านพระเจ้า",
    author: "Archive Star",
    genres: ["apocalypse", "fantasy", "system"],
    tags: ["Apocalypse", "System", "Time Loop"],
    status: "ongoing",
    rating: 4.9,
    views: 3105000,
    chapters: 256,
    synopsis: "นิยายที่เขาอ่านคนเดียวมาหลายปีสิ้นสุดลงในคืนเดียวกับที่โลกเริ่มเดินตามเนื้อเรื่องทุกบรรทัด",
    cover: "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "30 นาทีที่แล้ว",
    featured: true
  },
  {
    slug: "supreme-magus",
    title: "Supreme Magus",
    thaiTitle: "จอมเวทสูงสุด",
    author: "Crystal Ink",
    genres: ["fantasy", "adventure"],
    tags: ["Magic", "Reincarnation", "Academy"],
    status: "ongoing",
    rating: 4.5,
    views: 842000,
    chapters: 301,
    synopsis: "ชีวิตใหม่ในโลกเวทมนตร์มาพร้อมพรสวรรค์ที่งดงามเกินกว่าจะเป็นเรื่องบังเอิญ",
    cover: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "วันนี้"
  },
  {
    slug: "versatile-mage",
    title: "Versatile Mage",
    thaiTitle: "จอมเวทสารพัดธาตุ",
    author: "Spark Verse",
    genres: ["fantasy", "school-life", "action"],
    tags: ["Academy", "Magic", "Weak to Strong"],
    status: "hiatus",
    rating: 4.3,
    views: 730000,
    chapters: 96,
    synopsis: "เมื่อตื่นมาในโลกที่วิทยาศาสตร์ถูกแทนที่ด้วยเวทมนตร์ เขากลับมีพรสวรรค์มากกว่าหนึ่งธาตุ",
    cover: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "5 วันที่แล้ว"
  },
  {
    slug: "night-watch-academy",
    title: "Night Watch Academy",
    thaiTitle: "สถาบันเวรยามราตรี",
    author: "Hollow Lantern",
    genres: ["school-life", "horror", "mystery"],
    tags: ["Academy", "Villain"],
    status: "ongoing",
    rating: 4.6,
    views: 612000,
    chapters: 88,
    synopsis: "โรงเรียนที่เปิดสอนเฉพาะตอนกลางคืน รับเฉพาะเด็กที่เคยเห็นสิ่งที่ไม่ควรเห็น และไม่เคยมีใครเรียนจบครบรุ่น",
    cover: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "2 ชั่วโมงที่แล้ว",
    isNew: true
  },
  {
    slug: "iron-chef-of-the-empire",
    title: "Iron Chef of the Empire",
    thaiTitle: "พ่อครัวเหล็กแห่งจักรวรรดิ",
    author: "Salt & Ember",
    genres: ["comedy", "adventure", "romance"],
    tags: ["Reincarnation", "Kingdom Building"],
    status: "ongoing",
    rating: 4.4,
    views: 388000,
    chapters: 142,
    synopsis: "เชฟดาวมิชลินตายคาเตาแล้วตื่นในครัวของราชสำนักที่กำลังจะถูกยุบ เขามีเวลาสามเดือนกอบกู้มันด้วยเมนูเดียว",
    cover: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "6 ชั่วโมงที่แล้ว"
  },
  {
    slug: "the-last-transmission",
    title: "The Last Transmission",
    thaiTitle: "สัญญาณสุดท้ายจากดาวเหนือ",
    author: "Vega Signal",
    genres: ["sci-fi", "mystery", "apocalypse"],
    tags: ["Time Loop", "Male Protagonist"],
    status: "ongoing",
    rating: 4.8,
    views: 941000,
    chapters: 167,
    synopsis: "สถานีอวกาศส่งข้อความเดิมซ้ำมา 40 ปี จนวันที่นักฟิสิกส์สาวถอดรหัสได้ว่ามันคือชื่อของเธอเอง",
    cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "45 นาทีที่แล้ว",
    featured: true
  },
  {
    slug: "sword-of-nine-rivers",
    title: "Sword of Nine Rivers",
    thaiTitle: "กระบี่เก้าสายน้ำ",
    author: "Jade Current",
    genres: ["wuxia", "martial-arts", "adventure"],
    tags: ["Cultivation", "Weak to Strong"],
    status: "ongoing",
    rating: 4.7,
    views: 1128000,
    chapters: 289,
    synopsis: "เด็กเรือจ้างที่จำกระบวนท่าจากเงาสะท้อนบนผิวน้ำ ออกเดินทางตามหาคนที่ฆ่าอาจารย์ซึ่งเขาไม่เคยพบหน้า",
    cover: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "4 ชั่วโมงที่แล้ว"
  },
  {
    slug: "contract-with-the-frost-duke",
    title: "Contract with the Frost Duke",
    thaiTitle: "สัญญารักกับดยุกน้ำแข็ง",
    author: "Winterbloom",
    genres: ["romance", "fantasy"],
    tags: ["Villain", "Reincarnation"],
    status: "ongoing",
    rating: 4.9,
    views: 1755000,
    chapters: 203,
    synopsis: "เธอเกิดใหม่เป็นตัวร้ายที่ตายในบทที่สาม คราวนี้เธอเลือกเซ็นสัญญากับชายที่นิยายบอกว่าจะเป็นคนฆ่าเธอ",
    cover: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "1 ชั่วโมงที่แล้ว",
    featured: true
  },
  {
    slug: "dungeon-delivery-service",
    title: "Dungeon Delivery Service",
    thaiTitle: "บริการส่งของในดันเจียน",
    author: "Copper Route",
    genres: ["comedy", "system", "adventure"],
    tags: ["Dungeon", "System"],
    status: "ongoing",
    rating: 4.5,
    views: 496000,
    chapters: 115,
    synopsis: "อาชีพที่ไม่มีใครเลือกคือ 'คนส่งของ' จนกระทั่งเขาพบว่าเส้นทางลัดในดันเจียนมีค่ามากกว่าดาบใด ๆ",
    cover: "https://images.unsplash.com/photo-1533709752211-c8fd6f5c1e2c?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "วันนี้",
    isNew: true
  },
  {
    slug: "the-regressor-diary",
    title: "The Regressor's Diary",
    thaiTitle: "บันทึกของผู้ย้อนเวลา",
    author: "Inkbound",
    genres: ["system", "action", "mystery"],
    tags: ["Regression", "Time Loop", "Overpowered"],
    status: "ongoing",
    rating: 4.8,
    views: 2015000,
    chapters: 341,
    synopsis: "เขาย้อนเวลามาแล้ว 27 ครั้ง และทุกครั้งเขาจดบันทึกไว้ รอบที่ 28 บันทึกนั้นมีลายมือที่ไม่ใช่ของเขา",
    cover: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "20 นาทีที่แล้ว",
    featured: true
  },
  {
    slug: "greenhouse-at-worlds-end",
    title: "Greenhouse at World's End",
    thaiTitle: "เรือนกระจกที่ปลายโลก",
    author: "Quiet Fern",
    genres: ["apocalypse", "romance", "sci-fi"],
    tags: ["Apocalypse", "Kingdom Building"],
    status: "completed",
    rating: 4.7,
    views: 823000,
    chapters: 96,
    synopsis: "หลังโลกหยุดหมุน เหลือเรือนกระจกหลังเดียวที่ยังมีแสง และสองคนที่ตกลงกันว่าจะไม่ถามชื่อกันและกัน",
    cover: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "จบแล้ว",
    completed: true
  },
  {
    slug: "the-villainess-guidebook",
    title: "The Villainess Guidebook",
    thaiTitle: "คู่มือเอาตัวรอดฉบับนางร้าย",
    author: "Rosewell",
    genres: ["romance", "comedy", "fantasy"],
    tags: ["Villain", "Reincarnation", "Academy"],
    status: "ongoing",
    rating: 4.6,
    views: 1342000,
    chapters: 178,
    synopsis: "ตำราเล่มนี้บอกทุกวิธีที่นางร้ายจะตาย เธอจึงทำตรงข้ามทุกข้อ แล้วพบว่าพระเอกเริ่มเดินตามเธอแทน",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "3 ชั่วโมงที่แล้ว"
  },
  {
    slug: "abyss-diver",
    title: "Abyss Diver",
    thaiTitle: "นักดำดิ่งสู่เหวลึก",
    author: "Deepline",
    genres: ["adventure", "horror", "fantasy"],
    tags: ["Dungeon", "Weak to Strong"],
    status: "ongoing",
    rating: 4.7,
    views: 707000,
    chapters: 156,
    synopsis: "ยิ่งลงลึกยิ่งได้ของดี แต่ทุกชั้นที่ผ่านไปจะพรากความทรงจำหนึ่งอย่าง เขาจึงเขียนชื่อน้องสาวไว้บนฝ่ามือ",
    cover: "https://images.unsplash.com/photo-1439405326854-014607f694d7?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "8 ชั่วโมงที่แล้ว"
  },
  {
    slug: "steel-monastery",
    title: "Steel Monastery",
    thaiTitle: "อารามเหล็ก",
    author: "Anvil Sect",
    genres: ["martial-arts", "xianxia", "action"],
    tags: ["Cultivation", "Male Protagonist"],
    status: "hiatus",
    rating: 4.3,
    views: 421000,
    chapters: 74,
    synopsis: "สำนักที่ไม่สอนวิชา สอนแต่การตีเหล็ก จนวันที่ศิษย์คนหนึ่งตีดาบที่ตัดกฎของยุทธภพได้",
    cover: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "2 สัปดาห์ที่แล้ว"
  },
  {
    slug: "signal-lost-in-bangkok",
    title: "Signal Lost in Bangkok",
    thaiTitle: "สัญญาณหายกลางกรุง",
    author: "Neon Monsoon",
    genres: ["mystery", "sci-fi", "horror"],
    tags: ["Time Loop", "Male Protagonist"],
    status: "ongoing",
    rating: 4.5,
    views: 264000,
    chapters: 62,
    synopsis: "ทุกคืนวันอังคาร เวลา 03:14 สัญญาณโทรศัพท์ทั้งเมืองดับพร้อมกัน 7 วินาที และมีคนหายไปหนึ่งคนเสมอ",
    cover: "https://images.unsplash.com/photo-1470004914212-05527e49370b?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "วันนี้",
    isNew: true
  },
  {
    slug: "beast-tamer-of-the-north",
    title: "Beast Tamer of the North",
    thaiTitle: "ผู้เลี้ยงอสูรแห่งแดนเหนือ",
    author: "Frostmane",
    genres: ["fantasy", "adventure", "action"],
    tags: ["Weak to Strong", "Magic"],
    status: "ongoing",
    rating: 4.4,
    views: 553000,
    chapters: 198,
    synopsis: "อาชีพผู้เลี้ยงอสูรถูกดูแคลนมานาน จนเขาจับสัตว์ตัวแรกได้เป็นมังกรที่ตำราบอกว่าสูญพันธุ์ไปแล้ว",
    cover: "https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "12 ชั่วโมงที่แล้ว"
  },
  {
    slug: "the-quiet-apocalypse",
    title: "The Quiet Apocalypse",
    thaiTitle: "วันสิ้นโลกที่เงียบที่สุด",
    author: "Ashfall",
    genres: ["apocalypse", "horror", "mystery"],
    tags: ["Apocalypse", "Male Protagonist"],
    status: "completed",
    rating: 4.8,
    views: 1488000,
    chapters: 240,
    synopsis: "โลกไม่ได้จบด้วยไฟหรือน้ำ แต่จบด้วยความเงียบ ใครส่งเสียงดังเกินไปจะไม่ได้กลับบ้าน",
    cover: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "จบแล้ว",
    completed: true
  },
  {
    slug: "archive-of-forgotten-spells",
    title: "Archive of Forgotten Spells",
    thaiTitle: "หอสมุดเวทที่ถูกลืม",
    author: "Marginalia",
    genres: ["fantasy", "mystery", "school-life"],
    tags: ["Magic", "Academy", "Reincarnation"],
    status: "ongoing",
    rating: 4.6,
    views: 679000,
    chapters: 134,
    synopsis: "บรรณารักษ์ฝึกหัดค้นพบว่าหนังสือที่ไม่มีใครยืมเลยร้อยปี จะเขียนชื่อคนอ่านคนต่อไปไว้ล่วงหน้า",
    cover: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "5 ชั่วโมงที่แล้ว"
  },
  {
    slug: "second-life-of-a-guild-master",
    title: "Second Life of a Guild Master",
    thaiTitle: "ชีวิตที่สองของหัวหน้ากิลด์",
    author: "Longtable",
    genres: ["system", "adventure", "comedy"],
    tags: ["Regression", "Kingdom Building", "System"],
    status: "ongoing",
    rating: 4.5,
    views: 862000,
    chapters: 221,
    synopsis: "กิลด์ของเขาล่มสลายเพราะบัญชีติดลบ ไม่ใช่เพราะมอนสเตอร์ รอบนี้เขาจะจ้างนักบัญชีก่อนจ้างนักรบ",
    cover: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=600&q=80",
    backdrop: "https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=1600&q=80",
    updatedAt: "7 ชั่วโมงที่แล้ว"
  }
];

const translators = [
  "ทีมแปลจันทร์เสี้ยว",
  "NiyaiNow Translation",
  "ห้องแปลดาวเหนือ",
  "กลุ่มอักษรม่วง",
  "ทีมแปลสายฟ้า",
  "Studio Inkwell"
];

const latestChapterTitles = [
  "การเผชิญหน้าครั้งใหม่",
  "แสงแรกหลังประตูดำ",
  "เงื่อนไขของระบบ",
  "คนที่รออยู่ปลายทาง",
  "ราคาที่ต้องจ่าย",
  "บทสนทนาใต้ต้นไม้เก่า"
];

/**
 * แปลงข้อความเวลาแบบไทย → จำนวนชั่วโมง เพื่อให้ตัวกรอง "อัปเดตล่าสุด" (ส่วนที่ 6.4)
 * กรองได้จริง — ข้อความอย่าง "3 ชั่วโมงที่แล้ว" เอาไปเทียบวันไม่ได้
 */
function parseUpdatedHours(text: string): number {
  const number = Number(text.match(/\d+/)?.[0] ?? 0);
  if (text.includes("นาที")) return number / 60;
  if (text.includes("ชั่วโมง")) return number;
  if (text.includes("สัปดาห์")) return number ? number * 168 : 72;
  if (text.includes("วันที่แล้ว")) return number * 24;
  if (text.includes("วันนี้")) return 12;
  if (text.includes("เมื่อวาน")) return 30;
  return 24 * 365; // "จบแล้ว" หรือรูปแบบที่ไม่รู้จัก
}

/**
 * เติมฟิลด์ที่การ์ดหน้าแรกต้องใช้ (ส่วนที่ 6.3)
 * ใช้สูตรจาก index ล้วน ๆ — ต้อง deterministic ไม่งั้น server กับ client
 * จะเรนเดอร์คนละค่าแล้วเกิด hydration mismatch
 */
export const novels: Novel[] = rawNovels.map((novel, index) => ({
  ...novel,
  translator: novel.translator ?? translators[index % translators.length],
  bookmarkCount: novel.bookmarkCount ?? Math.round(novel.views * 0.021),
  latestChapterTitle: novel.latestChapterTitle ?? latestChapterTitles[index % latestChapterTitles.length],
  hasPaidChapters: novel.hasPaidChapters ?? novel.chapters > 100,
  updatedHoursAgo: novel.updatedHoursAgo ?? parseUpdatedHours(novel.updatedAt)
}));

export const updates: UpdateItem[] = novels.flatMap((novel, index) => [
  { novelSlug: novel.slug, chapter: Math.max(1, novel.chapters), chapterTitle: index % 2 === 0 ? "การเผชิญหน้าครั้งใหม่" : "แสงแรกหลังประตูดำ", time: index < 3 ? "วันนี้" : index < 6 ? "เมื่อวาน" : "สัปดาห์นี้" },
  { novelSlug: novel.slug, chapter: Math.max(1, novel.chapters - 1), chapterTitle: "เงื่อนไขของระบบ", time: index < 2 ? "วันนี้" : "สัปดาห์นี้" }
]);

const paragraphSeed = [
  "เสียงแจ้งเตือนดังขึ้นกลางความเงียบ ตัวอักษรสีม่วงลอยอยู่เหนือฝ่ามือราวกับมันรอเขามาตลอดชีวิต",
  "ถนนด้านนอกเต็มไปด้วยผู้คนที่ยังไม่รู้ว่าโลกใบเดิมกำลังเปลี่ยนไป ทุกก้าวจึงต้องระวังมากกว่าที่เคย",
  "เขาสูดลมหายใจลึกและเปิดหน้าต่างค่าสถานะ ภารกิจแรกไม่ได้ยาก แต่รางวัลของมันมากพอจะเปลี่ยนทิศทางทั้งหมด",
  "ความทรงจำจากชาติที่แล้วไม่ใช่คำตอบของทุกอย่าง มันเป็นเพียงแผนที่คร่าว ๆ ในเขาวงกตที่กำลังเขียนตัวเองใหม่",
  "ก่อนรุ่งสาง เขาตัดสินใจเลือกเส้นทางที่ไม่มีใครกล้าเลือก เพราะมีเพียงเส้นทางนั้นที่พาเขาไปถึงตอนจบที่ต้องการ"
];

/** ราคาเหรียญมาตรฐานต่อตอน (mock) */
export const CHAPTER_COIN_PRICE = 15;

/** ตอนแรก ๆ อ่านฟรีเสมอ — สเปกห้าม paywall ก่อนอ่านจบตอนแรก (ส่วนที่ 0 ข้อ 4) */
const FREE_CHAPTER_COUNT = 5;

export const chapters: Chapter[] = novels.flatMap((novel) =>
  Array.from({ length: Math.min(novel.chapters, 8) }, (_, index) => {
    const number = index + 1;
    const locked = number > FREE_CHAPTER_COUNT;

    return {
      novelSlug: novel.slug,
      number,
      title: index === 0 ? "จุดเริ่มต้นของค่ำคืน" : `ตอนที่ ${number}: เส้นทางใหม่`,
      updatedAt: index < 2 ? "วันนี้" : "สัปดาห์นี้",
      locked,
      coinPrice: locked ? CHAPTER_COIN_PRICE : 0,
      body: Array.from({ length: 18 }, (__, paragraphIndex) => paragraphSeed[(paragraphIndex + index) % paragraphSeed.length])
    };
  })
);

/** แพ็กเกจเติมเหรียญ (ส่วนที่ 6.11) — mock */
export const coinPackages: CoinPackage[] = [
  { id: "starter", coins: 50, bonus: 0, priceTHB: 50 },
  { id: "regular", coins: 120, bonus: 10, priceTHB: 120 },
  { id: "plus", coins: 250, bonus: 30, priceTHB: 250 },
  { id: "pro", coins: 500, bonus: 80, priceTHB: 500, bestValue: true },
  { id: "mega", coins: 1000, bonus: 200, priceTHB: 1000 },
  { id: "ultra", coins: 2000, bonus: 500, priceTHB: 2000 }
];
