const express = require('express');
const app = express();
const port = 1000;
const bodyParser = require('body-parser');
const { Pool, Client } = require('pg');
const path = require('path'); // for working with file paths
const session = require('express-session'); // for session management

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

// Set up session management
app.use(session({
  secret: 'your-secret-key', // Replace with your own secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle form submission for login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await client.query('SELECT user_id, fname, mname, lname, role FROM public.login WHERE email=$1 AND password=$2', [email, password]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const gradesResult = await client.query('SELECT math, science, english, pe FROM public.grades WHERE user_id=$1', [1]);
      const grades = gradesResult.rows[0] || {}; // Initialize grades as an empty object if no row is found

      // Store user data in the session
      req.session.user = user;

      // Render grades.ejs with user and grades data
      res.render('grades', { user: user, grades: grades });
    } else {
      // User not found, handle login failure
      res.send('Login failed. Invalid email or password.');
    }
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Middleware to check if the user is a teacher
function isTeacher(req, res, next) {
  if (req.session.user && req.session.user.role === 'teacher') {
    next();
  } else {
    res.status(403).send('Access denied. Only teachers can perform this action.');
  }
}

// Route to update grades (only accessible by teachers)
app.post('/update-grades', isTeacher, async (req, res) => {
  const { math, science, english, pe } = req.body;

  try {
    await client.query('UPDATE public.grades SET math=$1, science=$2, english=$3, pe=$4 WHERE user_id=$5', [math, science, english, pe, 1]);
    res.send('Grades updated successfully.');
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Redirect root URL to /grades
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/grades');
  } else {
    res.redirect('/login');
  }
});

// Route to display grades page
app.get('/grades', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const gradesResult = await client.query('SELECT math, science, english, pe FROM public.grades WHERE user_id=$1', [1]);
    const grades = gradesResult.rows[0] || {}; // Initialize grades as an empty object if no row is found
    res.render('grades', { user: req.session.user, grades: grades });
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
