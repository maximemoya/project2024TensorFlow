import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Clean the database before each test
  await prisma.user.deleteMany();
});

afterAll(async () => {
  // Disconnect Prisma after all tests
  await prisma.$disconnect();
});
