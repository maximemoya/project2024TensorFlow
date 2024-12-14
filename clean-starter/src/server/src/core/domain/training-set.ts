export interface TrainingSet {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  userId: string;
  isSelected: boolean;
  dataPath: string; // Chemin vers les données d'entraînement
}

export interface CreateTrainingSetDTO {
  name: string;
  description?: string;
  dataPath: string;
  userId: string;
}
