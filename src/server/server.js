import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAsyncModel } from '../mathDegree1MachineLearning/createModelAndSave.js';
import { loadAsyncModel } from '../mathDegree1MachineLearning/loadModelAndContinueLearning.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app
const app = express();
const port = 3210;

// Serve static index.html file
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Serve static htmlResponse
app.get('/create', async (req, res) => {
    try {
        const result = await createAsyncModel();
        res.send(getHTmlResponse(result));
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Serve static htmlResponse
app.get('/load', async (req, res) => {
    try {
        const result = await loadAsyncModel();
        res.send(getHTmlResponse(result));
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.listen(port, (result) => {
    console.log(`Server is running at http://localhost:${port}`);
});

/**
 * Get the HTML response
 * @param {tf.Tensor} result
 * @returns {string} HTML response
 */
function getHTmlResponse(result) {
    return `<!DOCTYPE html>
<html>

<head>
    <title>Health Check</title>
</head>

<body>
    <h1>Model</h1>
    <p>Prediction of ((2 * 20) - 1): ${result.dataSync()[0]}</p>
    <button onclick="window.location.href = '/create';">Create model</button>
    <button onclick="window.location.href = '/load';">Train model</button>
</body>

</html>`
}
