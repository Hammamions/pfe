
const express = require('express');
const app = express();
const PORT = 4000;

app.get('/test', (req, res) => {
    res.send('Server is alive!');
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});
