import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';

export class MathLearning {

    /**
     * @param {string} path 
     * @returns {{x_vales: number[], y_values: number[]}}
     */
    static async loadDataset(path = 'src/my-dataset/data.json') {
        const data = fs.readFileSync(path, 'utf8');
        /**
         * @type {{xValues: number[], yValues: number[]}}
         */
        const jsonData = JSON.parse(data);
        return { x_vales: jsonData.xValues, y_values: jsonData.yValues };
    }

    /**
     * @param {number[]} x_values 
     * @param {number[]} y_values
     * @param {number} x_test
     * @param {string} path
     * @returns 
     */
    static async createAsyncModel(x_values, y_values, x_test, path = 'file://src/mathLearning/my-model/') {

        // Create a simple model
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ optimizer: tf.train.sgd(0.0001), loss: 'meanSquaredError' });

        // Normalize x_values and y_values
        const x_mean = tf.mean(x_values);
        const x_std = tf.sqrt(tf.mean(tf.square(tf.sub(x_values, x_mean))));
        const y_mean = tf.mean(y_values);
        const y_std = tf.sqrt(tf.mean(tf.square(tf.sub(y_values, y_mean))));

        const x_normalized = tf.div(tf.sub(x_values, x_mean), x_std)
        const y_normalized = tf.div(tf.sub(y_values, y_mean), y_std)

        // Convert x_values and y_values to tensors
        const xTensor = x_normalized.reshape([x_normalized.shape[0], 1]);
        const yTensor = y_normalized.reshape([y_normalized.shape[0], 1]);

        // Train the model
        await model.fit(xTensor, yTensor, { epochs: 20 });

        // Predict using the model

        // Normalize x_test
        let x_test_normalized = tf.div(tf.sub(x_test, x_mean), x_std);
        // Make prediction
        if (x_test_normalized.shape.length === 0) {
            x_test_normalized = x_test_normalized.reshape([1]);
        }
        const y_pred_normalized = model.predict(x_test_normalized);
        // Denormalize prediction
        const y_pred = tf.add(tf.mul(y_pred_normalized, y_std), y_mean);

        // const xTestTensor = tf.tensor2d([x_test], [1, 1]);
        // const result = model.predict(xTestTensor);

        // Save the model with the optimizer's state
        await model.save(path);
        console.log('Model saved.');
        return y_pred;
    }

    /**
     * @param {number[]} x_values
     * @param {number[]} y_values
     * @param {number} x_test
     * @param {string} path 
     * @returns 
     */
    static async loadAsyncModel(x_values, y_values, x_test, path = 'file://src/mathLearning/my-model/') {

        // Load the model
        const model = await tf.loadLayersModel(path + 'model.json')
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        // Normalize x_values and y_values
        const x_mean = tf.mean(x_values);
        const x_std = tf.sqrt(tf.mean(tf.square(tf.sub(x_values, x_mean))));
        const y_mean = tf.mean(y_values);
        const y_std = tf.sqrt(tf.mean(tf.square(tf.sub(y_values, y_mean))));

        const x_normalized = tf.div(tf.sub(x_values, x_mean), x_std)
        const y_normalized = tf.div(tf.sub(y_values, y_mean), y_std)

        // Convert x_values and y_values to tensors
        const xTensor = x_normalized.reshape([x_normalized.shape[0], 1]);
        const yTensor = y_normalized.reshape([y_normalized.shape[0], 1]);

        // Train the model
        await model.fit(xTensor, yTensor, { epochs: 20 });

        // Predict using the model

        // Normalize x_test
        let x_test_normalized = tf.div(tf.sub(x_test, x_mean), x_std);
        // Make prediction
        if (x_test_normalized.shape.length === 0) {
            x_test_normalized = x_test_normalized.reshape([1]);
        }
        const y_pred_normalized = model.predict(x_test_normalized);
        // Denormalize prediction
        const y_pred = tf.add(tf.mul(y_pred_normalized, y_std), y_mean);

        // const xTestTensor = tf.tensor2d([x_test], [1, 1]);
        // const result = model.predict(xTestTensor);

        // Save the model with the optimizer's state
        await model.save(path);
        console.log('Model saved.');
        return y_pred;
    }

    /**
     * @param {number} x_test
     * @param {string} path
     * @returns {{x_vales: number[], y_values: number[]}}
     */
    static async useAsyncModel(x_test, path = 'file://src/mathLearning/my-model/') {
        const model = await tf.loadLayersModel(path + 'model.json')
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
        model.predict(tf.tensor2d([x_test], [1, 1])).print();
        console.log('Model used.');
    }

}
