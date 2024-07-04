const express = require('express');
const app = express();
const port = 1000;
const bodyParser = require('body-parser');
const { Client } = require('pg');
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

// Middleware to parse JSON bodies
app.use(bodyParser.json());

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

// Handle form submission for registration
app.post('/register', async (req, res) => {
  const { user_id, email, fname, lname, password } = req.body;

  try {
    // Check if user_id or email already exists
    const existingUserResult = await client.query('SELECT user_id FROM public.login WHERE user_id=$1 OR email=$2', [user_id, email]);

    if (existingUserResult.rows.length > 0) {
      // User already exists, show error
      res.send('Registration failed. User ID or Email already exists.');
    } else {
      // Insert new user into the database
      await client.query('INSERT INTO public.login (user_id, email, fname, lname, password, role) VALUES ($1, $2, $3, $4, $5, $6)', [user_id, email, fname, lname, password, 'student']);
      // Insert a new row in the grades table for the new user
      await client.query('INSERT INTO public.grades (user_id, math, science, english, pe) VALUES ($1, 0, 0, 0, 0)', [user_id]);

      // Redirect to index.html after successful registration
      res.redirect('/index.html?success=true');
    }
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Handle form submission for login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await client.query('SELECT user_id, fname, lname, role FROM public.login WHERE email=$1 AND password=$2', [email, password]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      if (user.role === 'teacher') {
        const studentsResult = await client.query('SELECT l.user_id, l.fname, l.lname, g.math, g.science, g.english, g.pe FROM public.login l JOIN public.grades g ON l.user_id = g.user_id');
        const students = studentsResult.rows;

        req.session.user = user;
        res.render('teacher-grades', { user: user, students: students });
      } else {
        const gradesResult = await client.query('SELECT math, science, english, pe FROM public.grades WHERE user_id=$1', [user.user_id]);
        const grades = gradesResult.rows[0] || {}; // Initialize grades as an empty object if no row is found

        req.session.user = user;
        res.render('grades', { user: user, grades: grades });
      }
    } else {
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
  const { user_id, grades } = req.body;

  console.log('Received grades:', grades);

  try {
    // Check if grades object is defined
    if (!grades || typeof grades !== 'object') {
      return res.status(400).send('Invalid grades data.');
    }

    // Update each subject grade for the specified student
    for (const [subject, grade] of Object.entries(grades)) {
      await client.query(`UPDATE public.grades SET ${subject}=$1 WHERE user_id=$2`, [grade, user_id]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Route to display grades page
app.get('/grades', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    if (req.session.user.role === 'teacher') {
      const studentsResult = await client.query('SELECT l.user_id, l.fname, l.lname, g.math, g.science, g.english, g.pe FROM public.login l JOIN public.grades g ON l.user_id = g.user_id');
      const students = studentsResult.rows;
      res.render('teacher-grades', { user: req.session.user, students: students });
    } else {
      const gradesResult = await client.query('SELECT math, science, english, pe FROM public.grades WHERE user_id=$1', [req.session.user.user_id]);
      const grades = gradesResult.rows[0] || {}; // Initialize grades as an empty object if no row is found
      res.render('grades', { user: req.session.user, grades: grades });
    }
  } catch (err) {
    console.error('Database query error', err.stack);
    res.status(500).send('Internal server error');
  }
});

// Serve index.html and other static files
app.get('/index.html', (req, res) => {
  const successMessage = req.query.success ? 'Account created, please log in.' : '';
  res.render('index', { successMessage });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
