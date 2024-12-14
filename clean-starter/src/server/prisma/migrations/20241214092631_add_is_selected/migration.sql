-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrainingSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TrainingSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TrainingSet" ("createdAt", "description", "id", "name", "updatedAt", "userId") SELECT "createdAt", "description", "id", "name", "updatedAt", "userId" FROM "TrainingSet";
DROP TABLE "TrainingSet";
ALTER TABLE "new_TrainingSet" RENAME TO "TrainingSet";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
