const express = require('express');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcrypt');
const tf = require('@tensorflow/tfjs-node');
const sharp = require('sharp');
const fs = require('fs').promises; // Ajouter fs.promises pour les opérations de fichiers asynchrones

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

// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Map pour stocker les modèles en mémoire
const userModels = new Map();

// Fonction pour vérifier et recréer un modèle si nécessaire
async function getOrCreateModel(modelId) {
    // Vérifier si le modèle existe déjà dans la Map
    let model = userModels.get(modelId);
    
    if (!model) {
        console.log('Création d\'un nouveau modèle:', modelId);
        
        // Vérifier si le modèle existe dans la base de données
        const dbModel = await db.getModelById(modelId);
        if (!dbModel) {
            throw new Error('Modèle non trouvé');
        }
        
        // Créer une nouvelle instance du modèle
        model = new ImageRecognitionModel();
        
        // Récupérer les labels existants
        const labels = await db.getLabels(modelId);
        model.labels = labels; // Initialiser les labels
        console.log('Labels chargés:', labels);
        
        // Stocker le modèle dans la Map
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
app.post('/api/models/:modelId/train', isAuthenticated, upload.array('images'), async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        const { label } = req.body;
        console.log('Début de l\'entraînement:', { modelId, label, filesCount: req.files?.length });

        if (!req.files?.length) {
            return res.status(400).json({ 
                error: 'Aucune image fournie',
                details: 'Veuillez fournir au moins une image pour l\'entraînement'
            });
        }
        if (!label) {
            return res.status(400).json({ 
                error: 'Label manquant',
                details: 'Veuillez spécifier un label pour les images'
            });
        }

        console.log('Récupération du modèle...');
        const model = await getOrCreateModel(modelId);
        console.log('Modèle récupéré:', { 
            modelId, 
            hasModel: !!model, 
            currentLabels: model.labels 
        });
        
        // Ajouter le label à la base de données
        console.log('Ajout du label à la base de données...');
        await db.addLabel(modelId, label);
        
        // Mettre à jour les labels du modèle
        console.log('Mise à jour des labels...');
        const labels = await db.getLabels(modelId);
        if (!labels || labels.length === 0) {
            throw new Error('Erreur lors de la récupération des labels');
        }
        model.labels = labels;
        console.log('Labels mis à jour:', { labels, modelLabels: model.labels });

        // Prétraiter les images
        console.log('Prétraitement des images...');
        const tensors = [];
        const labelIndices = [];
        for (const file of req.files) {
            console.log('Traitement de l\'image:', file.path);
            const tensor = await preprocessImage(file.path);
            tensors.push(tensor);
            const labelIndex = model.labels.indexOf(label);
            if (labelIndex === -1) {
                throw new Error(`Label ${label} non trouvé dans le modèle`);
            }
            console.log('Index du label:', { label, labelIndex });
            labelIndices.push(labelIndex);
        }

        // Entraîner si on a assez de catégories
        console.log('Vérification des catégories:', { 
            labelCount: model.labels.length,
            tensorsCount: tensors.length,
            labelIndices 
        });
        
        if (model.labels.length >= 2) {
            console.log('Début de l\'entraînement du modèle...');
            await model.train(tensors, labelIndices);
            console.log('Entraînement terminé');
        } else {
            console.log('Pas assez de catégories pour l\'entraînement');
        }

        // Nettoyer les tensors
        console.log('Nettoyage des tensors...');
        tensors.forEach(t => t.dispose());
        
        // Supprimer les fichiers d'images
        console.log('Suppression des fichiers d\'images...');
        await cleanupFiles(req.files);

        // Rafraîchir les labels une dernière fois
        const finalLabels = await db.getLabels(modelId);
        console.log('Labels finaux:', finalLabels);

        res.json({
            success: true,
            labels: finalLabels
        });
    } catch (error) {
        console.error('Erreur détaillée:', error);
        console.error('Stack trace:', error.stack);
        
        // En cas d'erreur, on nettoie quand même les fichiers
        if (req.files) {
            await cleanupFiles(req.files);
        }
        
        res.status(500).json({ 
            error: 'Erreur d\'entraînement',
            details: error.message,
            stack: error.stack
        });
    }
});

app.post('/api/models/:modelId/predict', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        console.log('Tentative de prédiction pour le modèle:', modelId);
        console.log('Modèles disponibles:', Array.from(userModels.keys()));

        if (!req.file) {
            return res.status(400).json({ 
                error: 'Aucune image fournie',
                details: 'Veuillez sélectionner une image à analyser'
            });
        }
        console.log('Image reçue:', req.file.path);

        const model = await getOrCreateModel(modelId);
        console.log('Modèle récupéré, labels:', model.labels);

        // Vérifier que le modèle est prêt
        if (model.labels.length < 2) {
            await cleanupFiles([req.file]);
            return res.status(400).json({ 
                error: 'Modèle non entraîné',
                details: 'Le modèle doit être entraîné avec au moins 2 catégories différentes avant de pouvoir faire des prédictions'
            });
        }

        // Prétraiter et prédire
        console.log('Prétraitement de l\'image...');
        const tensor = await preprocessImage(req.file.path);
        console.log('Image prétraitée, lancement de la prédiction...');
        const prediction = await model.predict(tensor);
        tensor.dispose();

        // Supprimer l'image après utilisation
        await cleanupFiles([req.file]);

        console.log('Prédiction réussie:', prediction);
        res.json({
            success: true,
            prediction
        });
    } catch (error) {
        // En cas d'erreur, on nettoie quand même le fichier
        if (req.file) {
            await cleanupFiles([req.file]);
        }
        
        console.error('Erreur de prédiction:', error);
        res.status(400).json({ 
            error: 'Erreur de prédiction',
            details: error.message || 'Une erreur est survenue lors de la prédiction'
        });
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
