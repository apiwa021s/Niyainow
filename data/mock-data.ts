import type { Chapter, Genre, Novel, UpdateItem } from "@/types/novel";

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

export const novels: Novel[] = [
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
  }
];

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

export const chapters: Chapter[] = novels.flatMap((novel) =>
  Array.from({ length: Math.min(novel.chapters, 8) }, (_, index) => ({
    novelSlug: novel.slug,
    number: index + 1,
    title: index === 0 ? "จุดเริ่มต้นของค่ำคืน" : `ตอนที่ ${index + 1}: เส้นทางใหม่`,
    updatedAt: index < 2 ? "วันนี้" : "สัปดาห์นี้",
    body: Array.from({ length: 18 }, (__, paragraphIndex) => paragraphSeed[(paragraphIndex + index) % paragraphSeed.length])
  }))
);
