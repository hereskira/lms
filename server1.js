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

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle form submission for login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await client.query('SELECT user_id FROM public.login WHERE email=$1 AND password=$2', [email, password]);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].user_id;
      const gradesResult = await client.query('SELECT math, science, english, pe FROM public.grades WHERE user_id=$1', [userId]);
      const grades = gradesResult.rows[0]; // Assuming there's only one row per user_id

      // Render grades.ejs with grades data
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

// Redirect root URL to /grades
app.get('/', (req, res) => {
  res.redirect('/grades');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
