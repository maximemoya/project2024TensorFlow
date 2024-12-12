const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

async function initDb() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), async (err) => {
            if (err) {
                console.error('Erreur de connexion à la base de données:', err);
                reject(err);
                return;
            }
            console.log('Connecté à la base de données SQLite');

            try {
                // Créer les tables
                await new Promise((res, rej) => {
                    db.serialize(() => {
                        // Table utilisateurs
                        db.run(`CREATE TABLE IF NOT EXISTS users (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            email TEXT UNIQUE NOT NULL,
                            password TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )`);

                        // Table modèles
                        db.run(`CREATE TABLE IF NOT EXISTS models (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            description TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users (id)
                        )`);

                        // Table labels
                        db.run(`CREATE TABLE IF NOT EXISTS labels (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            model_id INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (model_id) REFERENCES models (id)
                        )`);

                        // Table images d'entraînement
                        db.run(`CREATE TABLE IF NOT EXISTS training_images (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            model_id INTEGER NOT NULL,
                            label_id INTEGER NOT NULL,
                            filepath TEXT NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (model_id) REFERENCES models (id),
                            FOREIGN KEY (label_id) REFERENCES labels (id)
                        )`);

                        res();
                    });
                });

                // Créer un utilisateur de test
                const testUser = {
                    email: 'test@example.com',
                    password: await bcrypt.hash('password123', 10)
                };

                await new Promise((res, rej) => {
                    db.run('INSERT OR IGNORE INTO users (email, password) VALUES (?, ?)',
                        [testUser.email, testUser.password],
                        function(err) {
                            if (err) {
                                console.error('Erreur lors de la création de l\'utilisateur test:', err);
                                rej(err);
                            } else {
                                console.log('Utilisateur test créé avec succès');
                                res();
                            }
                        }
                    );
                });

                // Fermer la connexion
                db.close((err) => {
                    if (err) {
                        console.error('Erreur lors de la fermeture de la base de données:', err);
                        reject(err);
                    } else {
                        console.log('Connexion à la base de données fermée');
                        resolve();
                    }
                });

            } catch (error) {
                console.error('Erreur lors de l\'initialisation de la base de données:', error);
                reject(error);
            }
        });
    });
}

initDb().catch(console.error);
