const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const SECRET = 'your_secret_key'; // Use a strong secret in production

// Allow requests from frontend
app.use(cors());
app.use(express.json());

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      
  password: 'Yashraj@1218',  
  database: 'nmf'      
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database.');
});

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

// Save donation details (without amount)
app.post('/api/donate', (req, res) => {
  const { name, address, phone } = req.body;
  const sql = 'INSERT INTO donations (name, address, phone) VALUES (?, ?, ?)';
  db.query(sql, [name, address, phone], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM admin WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const admin = results[0];
    if (!bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Generate JWT token
    const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Middleware to check admin JWT
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all donations (admin only)
app.get('/api/admin/donations', (req, res) => {
  let sql = "SELECT * FROM donations WHERE 1=1";
  const params = [];

  // Partial, case-insensitive search by name
  if (req.query.name) {
    sql += " AND LOWER(name) LIKE LOWER(?)";
    params.push(`%${req.query.name}%`);
  }

  // Date range search
  if (req.query.from) {
    sql += " AND entry_date >= ?";
    params.push(req.query.from);
  }
  if (req.query.to) {
    sql += " AND entry_date <= ?";
    params.push(req.query.to);
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Admin sets amount for a donation
app.post('/api/admin/set-amount', auth, (req, res) => {
  const { id, amount } = req.body;
  db.query("UPDATE donations SET amount = ? WHERE id = ?", [amount, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Delete a donation entry (admin only)
app.delete('/api/admin/delete-donation/:id', auth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM donations WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});