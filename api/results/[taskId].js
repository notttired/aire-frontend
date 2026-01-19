export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { taskId } = req.query;
    const SERVER_URL = 'http://34.9.62.158:8000';

    try {
        const response = await fetch(`${SERVER_URL}/results/${taskId}`);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}