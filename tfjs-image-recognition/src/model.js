const tf = require('@tensorflow/tfjs-node');
const fs = require('fs').promises;
const path = require('path');

class ImageRecognitionModel {
    constructor() {
        this.model = null;
        this.labels = [];
        this.numClasses = 0;
        this.trainingData = {
            images: [],
            labels: []
        };
    }

    async createModel() {
        const model = tf.sequential();
        
        // Première couche de convolution
        model.add(tf.layers.conv2d({
            inputShape: [224, 224, 3],
            filters: 32,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        
        // Deuxième couche de convolution
        model.add(tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        
        // Troisième couche de convolution
        model.add(tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        
        // Aplatir les données
        model.add(tf.layers.flatten());
        
        // Couches denses
        model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        model.add(tf.layers.dropout({ rate: 0.5 }));
        model.add(tf.layers.dense({ units: this.numClasses, activation: 'softmax' }));

        // Compiler avec un optimiseur adapté
        const optimizer = tf.train.adam(0.001);
        model.compile({
            optimizer: optimizer,
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    async train(images, labels, modelId) {
        if (!Array.isArray(labels) || labels.length < 2) {
            throw new Error('Il faut au moins 2 catégories différentes pour l\'entraînement');
        }

        const uniqueLabels = [...new Set(labels)];
        if (uniqueLabels.length < 2) {
            throw new Error('Il faut au moins 2 catégories différentes pour l\'entraînement');
        }

        this.numClasses = uniqueLabels.length;
        console.log('Nombre de classes:', this.numClasses);
        console.log('Labels uniques:', uniqueLabels);

        // Créer le modèle s'il n'existe pas
        if (!this.model) {
            console.log('Création d\'un nouveau modèle');
            this.model = await this.createModel();
        }

        try {
            // Convertir les labels en indices numériques
            const labelIndices = labels.map(label => uniqueLabels.indexOf(label));
            
            // Convertir en tensors et normaliser
            const xs = tf.stack(images).div(255.0);
            const ys = tf.oneHot(labelIndices, this.numClasses);

            // Data augmentation
            console.log('Augmentation des données...');
            const augmentedData = await this.augmentData(xs, ys);

            // Paramètres d'entraînement
            const batchSize = Math.min(32, Math.floor(images.length / 2));
            console.log('Taille du batch:', batchSize);

            // Variables pour suivre les meilleures performances
            let bestValLoss = Infinity;
            let bestWeights = null;
            let noImprovementCount = 0;
            const patience = 10;

            console.log('Début de l\'entraînement...');
            // Entraînement avec monitoring
            await this.model.fit(augmentedData.xs, augmentedData.ys, {
                epochs: 50,
                batchSize: batchSize,
                validationSplit: 0.2,
                shuffle: true,
                callbacks: {
                    onEpochBegin: async (epoch) => {
                        console.log(`\nEpoch ${epoch + 1}/50`);
                    },
                    onBatchEnd: async (batch, logs) => {
                        if (batch % 5 === 0) {
                            process.stdout.write('.');
                        }
                    },
                    onEpochEnd: async (epoch, logs) => {
                        console.log(
                            `\nEpoch ${epoch + 1}: ` +
                            `loss = ${logs.loss.toFixed(4)}, ` +
                            `accuracy = ${(logs.acc * 100).toFixed(2)}%, ` +
                            `val_loss = ${logs.val_loss.toFixed(4)}, ` +
                            `val_accuracy = ${(logs.val_acc * 100).toFixed(2)}%`
                        );

                        // Vérifier si c'est la meilleure performance
                        if (logs.val_loss < bestValLoss) {
                            bestValLoss = logs.val_loss;
                            bestWeights = this.model.getWeights().map(w => w.clone());
                            noImprovementCount = 0;
                            console.log('Nouveau meilleur modèle ! Sauvegarde...');
                            await this.saveModel(modelId);
                        } else {
                            noImprovementCount++;
                            console.log(`Pas d'amélioration depuis ${noImprovementCount} epochs`);
                        }

                        // Early stopping
                        if (noImprovementCount >= patience) {
                            console.log('Early stopping: pas d\'amélioration depuis', patience, 'epochs');
                            this.model.stopTraining = true;
                            
                            if (bestWeights) {
                                console.log('Restauration des meilleurs poids...');
                                this.model.setWeights(bestWeights);
                                bestWeights.forEach(w => w.dispose());
                            }
                        }
                    }
                }
            });

            console.log('Entraînement terminé !');

            // Nettoyer les tensors
            xs.dispose();
            ys.dispose();
            augmentedData.xs.dispose();
            augmentedData.ys.dispose();

            // Sauvegarder le modèle final
            await this.saveModel(modelId);
            
            // Stocker les labels
            this.labels = uniqueLabels;
        } catch (error) {
            console.error('Erreur pendant l\'entraînement:', error);
            throw error;
        }
    }

    async predict(image) {
        if (!this.model) {
            throw new Error('Le modèle n\'est pas entraîné');
        }

        if (this.numClasses < 2) {
            throw new Error('Le modèle doit avoir au moins 2 catégories pour faire des prédictions');
        }

        try {
            // Normaliser l'image et ajouter la dimension du batch
            const tensor = image.div(255.0).expandDims(0);
            
            // Faire la prédiction
            const predictions = await this.model.predict(tensor).data();
            
            // Nettoyer
            tensor.dispose();

            // Convertir les prédictions en objet avec les labels
            const results = Array.from(predictions)
                .map((confidence, index) => ({
                    label: this.labels[index],
                    confidence: parseFloat((confidence * 100).toFixed(2))
                }))
                .sort((a, b) => b.confidence - a.confidence);

            return results;
        } catch (error) {
            console.error('Erreur lors de la prédiction:', error);
            throw error;
        }
    }

    async augmentData(xs, ys) {
        const augmentedImages = [];
        const augmentedLabels = [];

        // Nombre d'augmentations par image
        const augmentationsPerImage = 3;

        const numImages = xs.shape[0];
        
        // Pour chaque image
        for (let i = 0; i < numImages; i++) {
            const image = xs.slice([i], [1]);
            const label = ys.slice([i], [1]);

            // Ajouter l'image originale
            augmentedImages.push(image);
            augmentedLabels.push(label);

            // Créer des versions augmentées
            for (let j = 0; j < augmentationsPerImage; j++) {
                let augmented = image;

                // Flip horizontal aléatoire
                if (Math.random() > 0.5) {
                    augmented = tf.tidy(() => tf.reverse(augmented, 2));
                }

                // Ajustement de luminosité aléatoire
                if (Math.random() > 0.5) {
                    const delta = (Math.random() - 0.5) * 0.4; // -0.2 à +0.2
                    augmented = tf.tidy(() => tf.clipByValue(tf.add(augmented, delta), 0, 1));
                }

                // Ajout de bruit gaussien
                if (Math.random() > 0.5) {
                    const noise = tf.randomNormal(augmented.shape, 0, 0.05);
                    augmented = tf.tidy(() => tf.clipByValue(tf.add(augmented, noise), 0, 1));
                    noise.dispose();
                }

                augmentedImages.push(augmented);
                augmentedLabels.push(label);
            }
        }

        return {
            xs: tf.concat(augmentedImages),
            ys: tf.concat(augmentedLabels)
        };
    }

    async saveModel(modelId) {
        if (!this.model) return;

        const modelDir = path.join(__dirname, '../models', modelId.toString());
        await fs.mkdir(modelDir, { recursive: true });

        try {
            // Sauvegarder le modèle
            await this.model.save(`file://${modelDir}/model.json`);

            // Sauvegarder les labels et les données d'entraînement
            await fs.writeFile(
                path.join(modelDir, 'data.json'),
                JSON.stringify({
                    labels: this.labels,
                    trainingData: this.trainingData
                })
            );
            console.log('Modèle et données sauvegardés avec succès');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            throw error;
        }
    }

    async loadModel(modelId) {
        const modelDir = path.join(__dirname, '../models', modelId.toString());
        const dataPath = path.join(modelDir, 'data.json');

        try {
            // Charger les données
            const dataContent = await fs.readFile(dataPath, 'utf8');
            const data = JSON.parse(dataContent);
            this.labels = data.labels || [];
            this.trainingData = data.trainingData || { images: [], labels: [] };

            // Charger le modèle
            this.model = await tf.loadLayersModel(`file://${modelDir}/model.json`);
            this.model.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            console.log('Modèle chargé avec succès:', {
                labels: this.labels,
                dataCount: this.trainingData.images.length
            });
            return true;
        } catch (error) {
            console.log('Erreur lors du chargement:', error);
            throw error;
        }
    }

    async deleteModel(modelId) {
        const modelDir = path.join(__dirname, '../models', modelId.toString());
        try {
            await fs.rm(modelDir, { recursive: true, force: true });
            this.model = null;
            this.labels = [];
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du modèle:', error);
            return false;
        }
    }
}

module.exports = { ImageRecognitionModel };
