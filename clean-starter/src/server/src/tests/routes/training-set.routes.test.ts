import request from 'supertest';
import { createServer } from '../../infrastructure/web/server';
import { PrismaUserRepository } from '../../infrastructure/repositories/prisma-user.repository';
import { AuthService } from '../../core/application/auth.service';
import { TrainingSetService } from '../../core/application/training-set.service';
import path from 'path';
import fs from 'fs';
import { prisma } from '../setup';

describe('Training Set Routes', () => {
  let userRepository: PrismaUserRepository;
  let authService: AuthService;
  let trainingSetService: TrainingSetService;
  let app: any;

  let authToken: string;
  let userId: string;
  let trainingSetId: string;

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

    // Create test files directory
    const uploadsDir = path.join(__dirname, '../../../data/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'training@example.com',
        password: 'password123',
        name: 'Training Test'
      }
    });

    userId = user.id;
    authToken = authService.generateToken(user);

    // Verify user exists
    const verifyUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    expect(verifyUser).toBeTruthy();
    expect(verifyUser?.id).toBe(userId);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/training-sets', () => {
    it('should create a new training set', async () => {
      const response = await request(app)
        .post('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Training Set'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Training Set');
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.images)).toBe(true);

      trainingSetId = response.body.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/training-sets')
        .send({
          name: 'Test Training Set'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/training-sets/:id/images', () => {
    const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

    beforeEach(async () => {
      // Create a training set for testing
      const response = await request(app)
        .post('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Training Set'
        });

      expect(response.status).toBe(201);
      trainingSetId = response.body.id;
    });

    it('should upload images to a training set', async () => {
      const response = await request(app)
        .post(`/api/training-sets/${trainingSetId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', testImagePath);

      expect(response.status).toBe(201);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('filename');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/training-sets/${trainingSetId}/images`)
        .attach('images', testImagePath);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent training set', async () => {
      const response = await request(app)
        .post('/api/training-sets/non-existent-id/images')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', testImagePath);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/training-sets/:id/images', () => {
    beforeEach(async () => {
      // Create a training set and upload an image
      const createResponse = await request(app)
        .post('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Training Set'
        });

      expect(createResponse.status).toBe(201);
      trainingSetId = createResponse.body.id;

      const uploadResponse = await request(app)
        .post(`/api/training-sets/${trainingSetId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', path.join(__dirname, '../fixtures/test-image.jpg'));

      expect(uploadResponse.status).toBe(201);
    });

    it('should get images from a training set', async () => {
      const response = await request(app)
        .get(`/api/training-sets/${trainingSetId}/images`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('filename');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/training-sets/${trainingSetId}/images`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent training set', async () => {
      const response = await request(app)
        .get('/api/training-sets/non-existent-id/images')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/training-sets', () => {
    beforeEach(async () => {
      // Create a training set and upload an image
      const createResponse = await request(app)
        .post('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Training Set'
        });

      expect(createResponse.status).toBe(201);
      trainingSetId = createResponse.body.id;

      const uploadResponse = await request(app)
        .post(`/api/training-sets/${trainingSetId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', path.join(__dirname, '../fixtures/test-image.jpg'));

      expect(uploadResponse.status).toBe(201);
    });

    it('should get all training sets for the user with their images', async () => {
      const response = await request(app)
        .get('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('images');
      expect(Array.isArray(response.body[0].images)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/training-sets');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/training-sets/:id/select', () => {
    beforeEach(async () => {
      // Create a training set and upload an image
      const createResponse = await request(app)
        .post('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Training Set'
        });

      expect(createResponse.status).toBe(201);
      trainingSetId = createResponse.body.id;

      const uploadResponse = await request(app)
        .post(`/api/training-sets/${trainingSetId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', path.join(__dirname, '../fixtures/test-image.jpg'));

      expect(uploadResponse.status).toBe(201);
    });

    it('should select a training set', async () => {
      const response = await request(app)
        .post(`/api/training-sets/${trainingSetId}/select`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', trainingSetId);
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.images)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/training-sets/${trainingSetId}/select`)
        .send();

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent training set', async () => {
      const response = await request(app)
        .post('/api/training-sets/non-existent-id/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/training-sets/:id', () => {
    beforeEach(async () => {
      // Create a training set and upload an image
      const createResponse = await request(app)
        .post('/api/training-sets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Training Set'
        });

      expect(createResponse.status).toBe(201);
      trainingSetId = createResponse.body.id;

      const uploadResponse = await request(app)
        .post(`/api/training-sets/${trainingSetId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', path.join(__dirname, '../fixtures/test-image.jpg'));

      expect(uploadResponse.status).toBe(201);
    });

    it('should delete a training set and its images', async () => {
      const response = await request(app)
        .delete(`/api/training-sets/${trainingSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify that the training set and its images have been deleted
      const getResponse = await request(app)
        .get(`/api/training-sets/${trainingSetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/training-sets/${trainingSetId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent training set', async () => {
      const response = await request(app)
        .delete('/api/training-sets/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
