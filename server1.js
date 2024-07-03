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
    const userResult = await client.query('SELECT user_id FROM public.login WHERE email=$1 AND password=$2', [email, password]);
    console.log(userResult.rows);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].user_id;
      const gradesResult = await client.query('SELECT math FROM public.grades WHERE user_id=$1', [userId]);
      const grades = gradesResult.rows;

      // Pass grades to the client
      res.render('grades', { email: email, grades: grades });
    } else {
      // User not found, handle login failure
      res.send('Login failed. Invalid email or password.');
    }
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
