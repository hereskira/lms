const express = require('express');
const app = express();
const port = 1000;
const bodyParser = require('body-parser');
const { Pool, Client } = require('pg');
const path = require('path'); // for working with file paths

// PostgreSQL connection configuration
const connectionString = 'postgresql://postgres:admin@localhost:5432/lms';

const client = new Client({
  connectionString: connectionString
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Connection error', err.stack));

// Correct usage of express.static() to serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));

// Serve the index.html file at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle form submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await client.query('SELECT * FROM public.login WHERE email=$1 AND password=$2', [email, password]);
    console.log(result.rows);

    if (result.rows.length > 0) {
      // User found, handle login success
      res.redirect('/grades.html'); // Redirect to grades.html on successful login
    } else {
      // User not found, handle login failure
      res.send('Login failed. Invalid email or password.');
    }
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
