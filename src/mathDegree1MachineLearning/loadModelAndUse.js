import * as tf from '@tensorflow/tfjs-node';

// Load the model
tf.loadLayersModel('file://./my-model/model.json').then(model => {
    // Compile the model (optional, if you want to change optimizer or loss)
    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
    model.predict(tf.tensor2d([20], [1, 1])).print();
});
