import { User, UserRepository } from '../domain/user';
import { AppError } from '../../infrastructure/error/app-error';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async register(email: string, password: string, name: string): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    return this.userRepository.create({
      email,
      password: hashedPassword,
      name,
    });
  }

  async login(email: string, password: string): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = this.generateToken(user);

    return { token };
  }

  generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }
}
