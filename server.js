const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 9000;

// Set up connection pool to PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'lms',
  password: 'admin',
  port: 5432,
});

// Middleware setup to serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// Assuming you're using EJS as your template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const client = await pool.connect();
  
      // Query user details including role
      const result = await client.query(
        'SELECT username, password, role FROM login WHERE username = $1',
        [username]
      );
  
      if (result.rows.length === 0) {
        client.release();
        return res.status(401).send('Invalid username or password');
      }
  
      const storedPassword = result.rows[0].password;
      const role = result.rows[0].role;
  
      // Compare the provided password with the stored hashed password
      const match = await bcrypt.compare(password, storedPassword);
  
      if (!match) {
        client.release();
        return res.status(401).send('Invalid username or password');
      }
  
      // Check if role is 'student'
      if (role === 'student') {
        // Redirect to grades.html upon successful login
        return res.redirect('/grades.html');
      } else {
        // Handle other roles if necessary
        client.release();
        return res.status(403).send('Unauthorized access');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      res.status(500).send('Internal server error');
    }
  });
  

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
