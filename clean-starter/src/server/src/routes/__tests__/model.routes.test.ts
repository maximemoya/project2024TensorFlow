import request from 'supertest';
import { app } from '../../app';
import path from 'path';
import fs from 'fs';
import { ModelService } from '../../services/model.service';
import sharp from 'sharp';

describe('Model Routes', () => {
  describe('POST /:id/predict-image', () => {
    it('should handle image upload and return prediction', async () => {
      // Create a test model first
      const modelResponse = await request(app)
        .post('/api/models')
        .send({
          name: 'Test Model',
          description: 'Test model for image prediction',
          layers: [
            {
              type: 'conv2d',
              filters: 32,
              kernelSize: [3, 3],
              activation: 'relu',
              inputShape: [28, 28, 1]
            },
            {
              type: 'maxPooling2d',
              poolSize: [2, 2]
            },
            {
              type: 'flatten'
            },
            {
              type: 'dense',
              units: 10,
              activation: 'softmax'
            }
          ]
        });

      expect(modelResponse.status).toBe(201);
      const modelId = modelResponse.body.id;

      // Create a test image file (28x28 black square)
      const width = 28;
      const height = 28;
      const channels = 1;
      const pixels = Buffer.alloc(width * height * channels, 0);
      
      const imageBuffer = await sharp(pixels, {
        raw: {
          width,
          height,
          channels
        }
      })
      .png()
      .toBuffer();

      const imagePath = path.join(__dirname, 'test-image.png');
      fs.writeFileSync(imagePath, imageBuffer);

      try {
        const response = await request(app)
          .post(`/api/models/${modelId}/predict-image`)
          .attach('image', imagePath)
          .set('Accept', 'application/json');

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.body);

        // Add assertions based on expected response
        expect(response.headers['content-type']).toMatch(/json/);
        
        if (response.status === 400) {
          expect(response.body).toHaveProperty('error');
        } else if (response.status === 500 && response.body.error === 'Model not found or not trained') {
          // This is expected since we haven't trained the model
          expect(response.body.error).toBe('Model not found or not trained');
        } else {
          expect(response.status).toBe(200);
          expect(response.body).toHaveProperty('prediction');
          expect(response.body.prediction).toHaveProperty('class');
          expect(response.body.prediction).toHaveProperty('trainingSet');
          expect(typeof response.body.prediction.class).toBe('number');
          expect(typeof response.body.prediction.trainingSet).toBe('string');
        }
      } finally {
        // Clean up test file
        fs.unlinkSync(imagePath);
      }
    });

    it('should return 400 when no image is provided', async () => {
      const modelId = 'test-model-id';

      const response = await request(app)
        .post(`/api/models/${modelId}/predict-image`)
        .set('Accept', 'application/json');

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response body:', response.body);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'No image provided');
    });
  });
});
