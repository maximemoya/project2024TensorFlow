import { dataCreator } from "../dataCreator/dataCreator.js";
import { MathLearning } from "./MathLearning.js";

await dataCreator(0, 10);
let data = await MathLearning.loadDataset('src/my-dataset/data.json');
await MathLearning.createAsyncModel(data.x_vales, data.y_values, 10);

await dataCreator(-2, 8);
data = await MathLearning.loadDataset('src/my-dataset/data.json');
await MathLearning.loadAsyncModel(data.x_vales, data.y_values, 10);

await MathLearning.useAsyncModel(10);
