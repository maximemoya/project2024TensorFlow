import * as tf from '@tensorflow/tfjs-node';

// Load the model
tf.loadLayersModel('file://./my-model/model.json').then(model => {
    // Compile the model (optional, if you want to change optimizer or loss)
    model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

    const xs = tf.tensor2d([-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], [30, 1]);
    const ys = tf.tensor2d([-21, -19, -17, -15, -13, -11, -9, -7, -5, -3, -1, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37], [30, 1]);

    // Continue training the model
    model.fit(xs, ys, { epochs: 10 }).then(() => {
        // Use the model to make a prediction
        model.predict(tf.tensor2d([20], [1, 1])).print();
        // Save the model with the optimizer's state
        model.save('file://./my-model').then(() => {
            console.log('Model saved.');
        });
    });
});
