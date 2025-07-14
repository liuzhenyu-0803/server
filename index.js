// index.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('hello');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});