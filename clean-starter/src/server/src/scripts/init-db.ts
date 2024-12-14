import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();

  try {
    // Vérifier si un utilisateur existe déjà
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      // Créer un utilisateur par défaut
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          name: 'Admin'
        }
      });
      console.log('Utilisateur par défaut créé avec succès');
    } else {
      console.log('La base de données contient déjà des utilisateurs');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
