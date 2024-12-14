import request from 'supertest';
import { createServer } from '../../infrastructure/web/server';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { AuthService } from '../../core/application/auth.service';
import { TrainingSetService } from '../../core/application/training-set.service';
import { prisma } from '../setup';

describe('Auth Routes', () => {
  let userRepository: PrismaUserRepository;
  let authService: AuthService;
  let trainingSetService: TrainingSetService;
  let app: any;

  beforeAll(async () => {
    userRepository = new PrismaUserRepository(prisma);
    authService = new AuthService(userRepository);
    trainingSetService = new TrainingSetService(prisma);
    app = createServer({ 
      prisma,
      userRepository,
      authService,
      trainingSetService
    });
  });

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.trainingImage.deleteMany();
    await prisma.trainingSet.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body).toHaveProperty('token');
    });

    it('should return error for existing email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Duplicate User'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'Duplicate User'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login Test'
        });
    });

    it('should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body).toHaveProperty('token');
    });

    it('should return error for wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });
});
