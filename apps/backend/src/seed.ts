import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cards = [
  {
    name: "Dragon Warrior",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 95
  },
  {
    name: "Fire Phoenix",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 88
  },
  {
    name: "Ice Queen",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 82
  },
  {
    name: "Thunder God",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 90
  },
  {
    name: "Shadow Assassin",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 85
  },
  {
    name: "Light Mage",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 78
  },
  {
    name: "Earth Guardian",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 92
  },
  {
    name: "Wind Spirit",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 75
  },
  {
    name: "Dark Knight",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 87
  },
  {
    name: "Crystal Sorcerer",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 80
  },
  {
    name: "Storm Titan",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 94
  },
  {
    name: "Forest Ranger",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 76
  },
  {
    name: "Void Warlock",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 89
  },
  {
    name: "Golden Paladin",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 91
  },
  {
    name: "Frost Giant",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=600&fit=crop",
    points: 86
  },
  {
    name: "Flame Archer",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 79
  },
  {
    name: "Mystic Oracle",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 83
  },
  {
    name: "Steel Berserker",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 88
  },
  {
    name: "Moon Priestess",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 81
  },
  {
    name: "Cosmic Dragon",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=600&fit=crop",
    points: 96
  }
]

// Test users to create
const testUsers = [
  {
    privyId: "test_user_1",
    cardIds: [],
    wins: 10,
    losses: 3,
    streak: 2,
    elo: 1350
  },
  {
    privyId: "test_user_2",
    cardIds: [],
    wins: 5,
    losses: 8,
    streak: 0,
    elo: 1150
  },
  {
    privyId: "test_user_3",
    cardIds: [],
    wins: 20,
    losses: 2,
    streak: 5,
    elo: 1600
  }
]

async function main() {
  console.log('Starting to seed database...')
  
  // Clear existing data
  await prisma.user.deleteMany({})
  console.log('Cleared existing users')
  
  await prisma.card.deleteMany({})
  console.log('Cleared existing cards')
  
  // Insert cards
  console.log('Seeding cards...')
  for (const card of cards) {
    await prisma.card.create({
      data: card
    })
  }
  console.log(`Successfully seeded ${cards.length} cards!`)
  
  // Insert test users
  console.log('Seeding users...')
  for (const user of testUsers) {
    await prisma.user.create({
      data: user
    })
  }
  console.log(`Successfully seeded ${testUsers.length} users!`)
  
  // Assign some cards to users
  console.log('Assigning cards to users...')
  const allCards = await prisma.card.findMany()
  
  for (const user of testUsers) {
    // Give each user 3-5 random cards
    const randomCards = allCards
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 3) // 3-5 cards
    
    const cardIds = randomCards.map(card => card.id)
    
    await prisma.user.update({
      where: { privyId: user.privyId },
      data: { cardIds }
    })
  }
  
  console.log('Database seeding completed!')
  console.log(`- ${cards.length} cards created`)
  console.log(`- ${testUsers.length} users created with random cards`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })