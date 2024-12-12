const express = require('express');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const tf = require('@tensorflow/tfjs-node');
const sharp = require('sharp');
const fs = require('fs').promises;
const crypto = require('crypto');

const db = require('./db/db');
const { ImageRecognitionModel } = require('./model');
const { isAuthenticated, isNotAuthenticated } = require('./middleware/auth');

const app = express();
const port = 3000;

// Configuration de la session
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './src/db'
    }),
    secret: 'votre_secret_ici',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static('public'));
app.use('/assets', express.static('assets'));

// Fonction pour créer un hash du fichier
async function calculateFileHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
}

// Fonction pour vérifier si un fichier existe déjà
async function fileExists(modelId, label, hash) {
    try {
        const assetsDir = path.join(__dirname, '../assets', modelId.toString(), label);
        const files = await fs.readdir(assetsDir).catch(() => []);
        return files.some(f => f.startsWith(hash));
    } catch {
        return false;
    }
}

// Configuration de multer pour le stockage des images d'entraînement
const trainStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const modelId = req.params.modelId;
        const label = req.body.label;
        const assetsDir = path.join(__dirname, '../assets', modelId.toString(), label);
        
        try {
            await fs.mkdir(assetsDir, { recursive: true });
            cb(null, assetsDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // On utilisera le hash plus tard
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Configuration de multer pour les images de prédiction
const predictStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/predict');
        fs.mkdir(uploadDir, { recursive: true })
            .then(() => cb(null, uploadDir))
            .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const uploadTrain = multer({
    storage: trainStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).array('images');

const uploadPredict = multer({
    storage: predictStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('image');

// Middleware personnalisé pour gérer l'upload et les doublons
const handleUpload = async (req, res, next) => {
    const modelId = req.params.modelId;
    const label = req.body.label;

    if (!label) {
        return res.status(400).json({
            error: 'Label manquant',
            details: 'Veuillez spécifier un label pour les images'
        });
    }

    try {
        // Utiliser multer pour l'upload initial
        uploadTrain(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    error: 'Erreur d\'upload',
                    details: err.message
                });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    error: 'Aucune image fournie',
                    details: 'Veuillez fournir au moins une image pour l\'entraînement'
                });
            }

            // Traiter chaque fichier
            const processedFiles = [];
            for (const file of req.files) {
                try {
                    // Lire le contenu du fichier
                    const buffer = await fs.readFile(file.path);
                    const hash = await calculateFileHash(buffer);
                    const exists = await fileExists(modelId, label, hash);

                    if (!exists) {
                        // Renommer le fichier avec son hash
                        const ext = path.extname(file.originalname);
                        const newPath = path.join(path.dirname(file.path), `${hash}${ext}`);
                        await fs.rename(file.path, newPath);
                        file.path = newPath;
                        processedFiles.push(file);
                    } else {
                        // Supprimer le fichier en doublon
                        await fs.unlink(file.path);
                    }
                } catch (error) {
                    console.error('Erreur lors du traitement du fichier:', error);
                    await fs.unlink(file.path).catch(console.error);
                }
            }

            // Mettre à jour req.files avec seulement les fichiers non dupliqués
            req.files = processedFiles;
            next();
        });
    } catch (error) {
        next(error);
    }
};

// Middleware pour nettoyer les fichiers de prédiction
const cleanupPredictFiles = async (req, res, next) => {
    try {
        if (req.file) {
            await fs.unlink(req.file.path);
        }
        next();
    } catch (error) {
        console.error('Erreur lors du nettoyage des fichiers de prédiction:', error);
        next(error);
    }
};

// Map pour stocker les modèles en mémoire
const userModels = new Map();

// Fonction pour vérifier et recréer un modèle si nécessaire
async function getOrCreateModel(modelId) {
    let model = userModels.get(modelId);
    if (!model) {
        console.log('Création d\'un nouveau modèle:', modelId);
        model = new ImageRecognitionModel();
        
        // Essayer de charger un modèle existant
        const loaded = await model.loadModel(modelId);
        if (!loaded) {
            console.log('Pas de modèle existant trouvé, création d\'un nouveau');
            // Récupérer les labels existants
            const labels = await db.getLabels(modelId);
            if (labels && labels.length > 0) {
                model.labels = labels;
            }
        } else {
            console.log('Modèle chargé avec succès');
        }
        
        userModels.set(modelId, model);
    }
    return model;
}

// Routes d'authentification
app.get('/api/check-auth', async (req, res) => {
    try {
        if (req.session && req.session.userId) {
            const user = await db.getUserById(req.session.userId);
            if (user) {
                res.json({
                    authenticated: true,
                    user: {
                        id: user.id,
                        email: user.email
                    }
                });
                return;
            }
        }
        res.json({ authenticated: false });
    } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/register', isNotAuthenticated, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation des champs
        if (!email || !password) {
            throw new Error('Email et mot de passe requis');
        }
        
        if (password.length < 6) {
            throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        }
        
        // Vérifier si l'email existe déjà
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            throw new Error('Cet email est déjà utilisé');
        }

        console.log('Tentative d\'inscription pour:', email);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await db.createUser(email, hashedPassword);
        
        console.log('Utilisateur créé avec succès, ID:', userId);
        
        req.session.userId = userId;
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur d\'inscription:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/login', isNotAuthenticated, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.getUserByEmail(email);
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new Error('Email ou mot de passe incorrect');
        }

        req.session.userId = user.id;
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/logout', isAuthenticated, (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Routes des modèles
app.post('/api/models', isAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        console.log('Création d\'un nouveau modèle:', { name, description });
        
        const modelId = await db.createModel(req.session.userId, name, description);
        console.log('ID du modèle créé:', modelId);
        
        const model = new ImageRecognitionModel();
        
        userModels.set(modelId, model);
        console.log('Modèle stocké dans userModels');
        
        res.json({ id: modelId });
    } catch (error) {
        console.error('Erreur lors de la création du modèle:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/models', isAuthenticated, async (req, res) => {
    try {
        console.log('Récupération des modèles pour l\'utilisateur:', req.session.userId);
        const models = await db.getModelsByUserId(req.session.userId);
        
        // Récupérer les labels pour chaque modèle
        const modelsWithLabels = await Promise.all(models.map(async (model) => {
            const labels = await db.getLabels(model.id);
            return {
                ...model,
                labels
            };
        }));
        
        console.log('Modèles avec labels:', modelsWithLabels);
        res.json(modelsWithLabels);
    } catch (error) {
        console.error('Erreur lors de la récupération des modèles:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/models/:modelId', isAuthenticated, async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        const model = await getOrCreateModel(modelId);
        
        // Récupérer les informations du modèle depuis la base de données
        const modelInfo = await db.getModelById(modelId);
        if (!modelInfo) {
            return res.status(404).json({ 
                error: 'Modèle non trouvé',
                details: 'Le modèle demandé n\'existe pas'
            });
        }

        // Vérifier que le modèle appartient à l'utilisateur
        if (modelInfo.user_id !== req.session.userId) {
            return res.status(403).json({ 
                error: 'Accès refusé',
                details: 'Vous n\'avez pas accès à ce modèle'
            });
        }

        // Combiner les informations de la base de données avec l'état du modèle
        res.json({
            ...modelInfo,
            labels: model.labels || []
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du modèle:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/models/:modelId', isAuthenticated, async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        console.log('Tentative de suppression du modèle:', modelId);

        // Vérifier si le modèle existe dans la base de données
        const modelInfo = await db.getModelById(modelId);
        if (!modelInfo) {
            return res.status(404).json({
                error: 'Modèle non trouvé',
                details: 'Le modèle demandé n\'existe pas'
            });
        }

        // Vérifier que l'utilisateur est le propriétaire du modèle
        if (modelInfo.user_id !== req.session.userId) {
            return res.status(403).json({
                error: 'Accès refusé',
                details: 'Vous n\'avez pas accès à ce modèle'
            });
        }

        // Récupérer le modèle en mémoire
        const model = userModels.get(modelId);
        if (model) {
            // Supprimer le modèle de la mémoire et du disque
            await model.deleteModel(modelId);
            userModels.delete(modelId);
        }

        // Supprimer les données du modèle de la base de données
        await db.deleteModel(modelId);

        res.json({
            success: true,
            message: 'Modèle supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du modèle:', error);
        res.status(500).json({
            error: 'Erreur de suppression',
            details: error.message
        });
    }
});

// Fonction utilitaire pour nettoyer les fichiers
async function cleanupFiles(files) {
    try {
        for (const file of files) {
            await fs.unlink(file.path);
            console.log('Fichier supprimé:', file.path);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression des fichiers:', error);
    }
}

// Prétraitement d'image
async function preprocessImage(filepath) {
    try {
        // Vérifier si le fichier existe
        try {
            await fs.access(filepath);
        } catch (error) {
            throw new Error(`Le fichier n'existe pas: ${filepath}`);
        }

        // Redimensionner l'image avec sharp
        const resizedImageBuffer = await sharp(filepath)
            .resize(224, 224, {
                fit: 'cover',
                position: 'center'
            })
            .toBuffer();

        // Convertir en tensor
        const tensor = tf.node.decodeImage(resizedImageBuffer, 3);
        
        // Normaliser les valeurs des pixels
        const normalized = tensor.div(255.0);
        
        // Nettoyer le tensor original
        tensor.dispose();
        
        return normalized;
    } catch (error) {
        console.error('Erreur lors du prétraitement de l\'image:', error);
        throw error;
    }
}

// Routes d'entraînement et de prédiction
app.post('/api/models/:modelId/train', isAuthenticated, uploadTrain, async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        const label = req.body.label;
        console.log('Début de l\'entraînement:', { modelId, label, filesCount: req.files?.length, body: req.body });

        if (!label) {
            return res.status(400).json({ 
                error: 'Label manquant',
                details: 'Veuillez spécifier un label pour les images'
            });
        }

        if (!req.files?.length) {
            return res.status(400).json({ 
                error: 'Aucune image fournie',
                details: 'Veuillez sélectionner au moins une image pour l\'entraînement'
            });
        }

        const model = await getOrCreateModel(modelId);
        
        // Ajouter le label à la base de données
        console.log('Ajout du label à la base de données...');
        const labelResult = await db.addLabel(modelId, label);
        console.log('Label ajouté avec succès:', labelResult);
        
        // Récupérer tous les labels existants
        console.log('Récupération des labels...');
        const allLabels = await db.getLabels(modelId);
        console.log('Labels disponibles:', allLabels);

        if (!allLabels || allLabels.length === 0) {
            throw new Error('Erreur lors de la récupération des labels');
        }

        if (allLabels.length < 2) {
            console.log('Pas assez de catégories, stockage des images pour plus tard');
            return res.json({
                success: true,
                labels: allLabels,
                newImagesCount: req.files.length,
                message: 'Images stockées. Ajoutez une autre catégorie pour commencer l\'entraînement.'
            });
        }

        // Prétraiter les images
        console.log('Prétraitement des images...');
        const tensors = [];
        const labelIndices = [];

        // Charger toutes les images existantes pour ce modèle
        const modelDir = path.join(__dirname, '../assets', modelId.toString());
        for (const existingLabel of allLabels) {
            const labelDir = path.join(modelDir, existingLabel);
            try {
                const files = await fs.readdir(labelDir);
                for (const file of files) {
                    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                        const filePath = path.join(labelDir, file);
                        console.log('Chargement de l\'image existante:', filePath);
                        const tensor = await preprocessImage(filePath);
                        tensors.push(tensor);
                        labelIndices.push(existingLabel);
                    }
                }
            } catch (error) {
                console.log('Dossier non trouvé pour le label:', existingLabel);
            }
        }

        // Ajouter les nouvelles images
        for (const file of req.files) {
            console.log('Traitement de la nouvelle image:', file.path);
            const tensor = await preprocessImage(file.path);
            tensors.push(tensor);
            labelIndices.push(label);
        }

        console.log('Début de l\'entraînement avec:', {
            tensorsCount: tensors.length,
            labels: labelIndices,
            uniqueLabels: allLabels
        });

        await model.train(tensors, labelIndices, modelId);
        console.log('Entraînement terminé');

        // Nettoyer les tensors
        tensors.forEach(t => t.dispose());

        res.json({
            success: true,
            labels: allLabels,
            newImagesCount: req.files.length
        });
    } catch (error) {
        console.error('Erreur lors de l\'entraînement:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'entraînement',
            details: error.message
        });
    }
});

app.post('/api/models/:modelId/predict', isAuthenticated, uploadPredict, async (req, res, next) => {
    try {
        const modelId = parseInt(req.params.modelId);
        console.log('Tentative de prédiction pour le modèle:', modelId);

        if (!req.file) {
            return res.status(400).json({ 
                error: 'Aucune image fournie',
                details: 'Veuillez sélectionner une image à analyser'
            });
        }

        const model = await getOrCreateModel(modelId);
        if (!model) {
            throw new Error('Modèle non trouvé');
        }

        // Prétraiter et prédire
        console.log('Prétraitement de l\'image...');
        const tensor = await preprocessImage(req.file.path);
        console.log('Image prétraitée, lancement de la prédiction...');
        
        const prediction = await model.predict(tensor);
        tensor.dispose();

        res.json({
            success: true,
            prediction
        });
    } catch (error) {
        console.error('Erreur de prédiction:', error);
        res.status(500).json({ 
            error: 'Erreur de prédiction',
            details: error.message || 'Une erreur est survenue lors de la prédiction'
        });
    } finally {
        // Nettoyer le fichier de prédiction
        if (req.file) {
            fs.unlink(req.file.path).catch(console.error);
        }
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
