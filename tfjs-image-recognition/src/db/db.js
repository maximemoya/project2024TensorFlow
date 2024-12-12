const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        const dbPath = path.join(__dirname, 'database.sqlite');
        const dbDir = path.dirname(dbPath);

        // Créer le dossier de la base de données s'il n'existe pas
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Erreur de connexion à la base de données:', err);
                return;
            }
            console.log('Connecté à la base de données SQLite');
            this.initDatabase();
        });
    }

    initDatabase() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`,
            `CREATE TABLE IF NOT EXISTS model_labels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (model_id) REFERENCES models (id),
                UNIQUE(model_id, label)
            )`,
            `CREATE TABLE IF NOT EXISTS labels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (model_id) REFERENCES models (id)
            )`,
            `CREATE TABLE IF NOT EXISTS training_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER NOT NULL,
                label_id INTEGER NOT NULL,
                path TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (model_id) REFERENCES models (id),
                FOREIGN KEY (label_id) REFERENCES labels (id)
            )`
        ];

        this.db.serialize(() => {
            queries.forEach(query => {
                this.db.run(query, (err) => {
                    if (err) {
                        console.error('Erreur lors de la création des tables:', err);
                    }
                });
            });
            console.log('Base de données initialisée avec succès');
        });
    }

    // Utilisateurs
    async createUser(email, hashedPassword) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO users (email, password) VALUES (?, ?)',
                [email, hashedPassword],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    // Modèles
    async createModel(userId, name, description = '') {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO models (user_id, name, description) VALUES (?, ?, ?)',
                [userId, name, description],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getModelById(modelId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM models WHERE id = ?',
                [modelId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getModelsByUserId(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM models WHERE user_id = ? ORDER BY created_at DESC',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async deleteModel(modelId) {
        try {
            // Supprimer les labels associés au modèle
            await this.db.run('DELETE FROM labels WHERE model_id = ?', modelId);
            
            // Supprimer le modèle lui-même
            await this.db.run('DELETE FROM models WHERE id = ?', modelId);
            
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression du modèle de la base de données:', error);
            throw error;
        }
    }

    // Labels
    async createLabel(modelId, name) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO labels (model_id, name) VALUES (?, ?)',
                [modelId, name],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getLabelsByModelId(modelId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM labels WHERE model_id = ?',
                [modelId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async addLabel(modelId, label) {
        console.log('Ajout du label dans la base de données:', { modelId, label });
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO model_labels (model_id, label) VALUES (?, ?)',
                [modelId, label],
                function(err) {
                    if (err) {
                        console.error('Erreur lors de l\'ajout du label:', err);
                        reject(err);
                    } else {
                        console.log('Label ajouté avec succès:', { 
                            changes: this.changes,
                            lastID: this.lastID 
                        });
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    async getLabels(modelId) {
        console.log('Récupération des labels pour le modèle:', modelId);
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT label FROM model_labels WHERE model_id = ? ORDER BY created_at',
                [modelId],
                (err, rows) => {
                    if (err) {
                        console.error('Erreur lors de la récupération des labels:', err);
                        reject(err);
                    } else {
                        const labels = rows.map(row => row.label);
                        console.log('Labels récupérés:', labels);
                        resolve(labels);
                    }
                }
            );
        });
    }

    // Images d'entraînement
    async saveTrainingImage(modelId, labelId, path) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO training_images (model_id, label_id, path) VALUES (?, ?, ?)',
                [modelId, labelId, path],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async getTrainingImagesByModelId(modelId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT ti.*, l.name as label_name FROM training_images ti JOIN labels l ON ti.label_id = l.id WHERE ti.model_id = ?',
                [modelId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();
