import fs from 'fs';

/**
 * @param {number} from 
 * @param {number} to 
 */
export async function dataCreator(from = -10, to = 10) {

    // Generate some synthetic data for training y = 2x - 1
    const xValues = []
    const yValues = []

    for (let i = from; i < to; i++) {
        xValues.push(i)
        yValues.push((i * i))
    }

    const data = {
        xValues,
        yValues
    };

    const jsonData = JSON.stringify(data);
    if (!fs.existsSync('src/my-dataset')) {
        fs.mkdirSync('src/my-dataset');
    }
    const path = 'src/my-dataset/data.json';
    fs.writeFileSync(path, jsonData);

}
