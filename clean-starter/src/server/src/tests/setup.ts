import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Clean the database before each test
  await prisma.trainingImage.deleteMany();
  await prisma.trainingSet.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Disconnect Prisma after all tests
  await prisma.$disconnect();
});

// Export prisma instance for use in tests
export { prisma };
