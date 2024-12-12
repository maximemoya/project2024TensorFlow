const sharp = require('sharp');
const tf = require('@tensorflow/tfjs-node');

class ImageProcessor {
    static async preprocessImage(imagePath) {
        // Resize image to 224x224 (standard input size for many models)
        const processedBuffer = await sharp(imagePath)
            .resize(224, 224, {
                fit: 'cover',
                position: 'center'
            })
            .toColorspace('srgb')
            .toBuffer();

        // Convert to tensor
        const tensor = tf.node.decodeImage(processedBuffer, 3);
        
        // Normalize pixel values
        return tensor.div(255.0);
    }

    static async preprocessImages(imagePaths) {
        const tensors = [];
        for (const path of imagePaths) {
            const tensor = await this.preprocessImage(path);
            tensors.push(tensor);
        }
        return tensors;
    }
}

module.exports = ImageProcessor;
