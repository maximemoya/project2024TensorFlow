const tf = require('@tensorflow/tfjs-node');

class ImageRecognitionModel {
    constructor() {
        this.model = null;
        this.labels = [];
    }

    async createModel() {
        // Créer un modèle séquentiel simple
        const model = tf.sequential();

        // Couche d'entrée et convolution
        model.add(tf.layers.conv2d({
            inputShape: [224, 224, 3],
            filters: 32,
            kernelSize: 3,
            activation: 'relu'
        }));

        // Réduction de dimension
        model.add(tf.layers.maxPooling2d({poolSize: 2}));

        // Aplatir pour la couche dense
        model.add(tf.layers.flatten());

        // Couche dense finale
        model.add(tf.layers.dense({
            units: this.labels.length,
            activation: 'softmax'
        }));

        // Compiler le modèle
        model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        this.model = model;
        return model;
    }

    async train(images, labels) {
        // S'assurer qu'on a au moins 2 catégories
        if (this.labels.length < 2) {
            throw new Error('Il faut au moins 2 catégories différentes pour l\'entraînement');
        }

        // Créer le modèle
        await this.createModel();

        // Préparer les données
        const xs = tf.stack(images);
        const ys = tf.oneHot(labels, this.labels.length);

        // Entraîner le modèle avec des callbacks
        const result = await this.model.fit(xs, ys, {
            epochs: 10,
            batchSize: 32,
            callbacks: {
                onEpochBegin: async (epoch) => {
                    console.log(`Début de l'époque ${epoch + 1}/10`);
                },
                onEpochEnd: async (epoch, logs) => {
                    console.log(`Époque ${epoch + 1}/10 terminée`);
                    console.log(`Précision: ${(logs.acc * 100).toFixed(2)}%, Perte: ${logs.loss.toFixed(4)}`);
                },
                onBatchEnd: async (batch, logs) => {
                    if (batch % 5 === 0) {
                        console.log(`  Batch ${batch}: perte = ${logs.loss.toFixed(4)}`);
                    }
                }
            }
        });

        // Nettoyer
        xs.dispose();
        ys.dispose();

        return result;
    }

    async predict(image) {
        try {
            if (!this.model) {
                console.log('Création du modèle pour la prédiction...');
                await this.createModel();
            }

            if (this.labels.length < 2) {
                throw new Error('Le modèle doit avoir au moins 2 catégories pour faire des prédictions');
            }

            console.log('Début de la prédiction...');
            console.log('Labels disponibles:', this.labels);

            // Prédire
            const imageTensor = tf.expandDims(image, 0);
            const predictionTensor = this.model.predict(imageTensor);
            const prediction = await predictionTensor.data();
            
            // Trouver la meilleure prédiction et les autres probabilités
            const predictions = Array.from(prediction).map((prob, idx) => ({
                label: this.labels[idx],
                confidence: (prob * 100).toFixed(2) + '%'
            })).sort((a, b) => parseFloat(b.confidence) - parseFloat(a.confidence));

            // Nettoyer
            imageTensor.dispose();
            predictionTensor.dispose();

            console.log('Prédiction terminée');
            console.log('Résultats:', predictions);

            return {
                bestMatch: predictions[0],
                allPredictions: predictions
            };
        } catch (error) {
            console.error('Erreur lors de la prédiction:', error);
            throw new Error(`Erreur lors de la prédiction: ${error.message}`);
        }
    }
}

module.exports = { ImageRecognitionModel };
