const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Allow requests from frontend
app.use(cors());

// Serve static images from the Gallery folder
app.use('/gallery', express.static(path.join(__dirname, 'Gallery')));

// API endpoint to list all images in the Gallery folder
app.get('/api/gallery', (req, res) => {
  const galleryDir = path.join(__dirname, 'Gallery');
  fs.readdir(galleryDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read gallery folder' });
    }
    // Filter for image files only (jpg, jpeg, png, gif)
    const images = files.filter(file =>
      /\.(jpg|jpeg|png|gif)$/i.test(file)
    );
    // Return URLs for frontend to use
    const imageUrls = images.map(file => `http://localhost:${PORT}/gallery/${file}`);
    res.json(imageUrls);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});