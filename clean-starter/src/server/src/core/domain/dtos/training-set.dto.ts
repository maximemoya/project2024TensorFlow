export interface CreateTrainingSetDTO {
  name: string;
  userId: string;
}

export interface TrainingImageDTO {
  filename: string;
  path: string;
}

export interface UpdateTrainingSetDTO {
  name?: string;
  isSelected?: boolean;
}
