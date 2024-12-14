import { PrismaClient } from '@prisma/client';
import { User, UserRepository } from '../../core/domain/user';

export class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.prisma.user.create({
      data: user,
    });
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: user,
    });
  }
}
