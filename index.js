const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const axios = require("axios");
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const bodyParser = require('body-parser');
const redis = require('redis');
const path = require("path");
const bcrypt = require('bcrypt');
const app = express();

const API_KEY = "e3a613fa";
app.use(bodyParser.urlencoded({ extended: true }));
const saltRounds = 4;

const redisClient = redis.createClient({
  url: 'redis://redis_server:6379' 
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.connect(); // Ensure the client is connected


app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'BoberBoing',
    resave: false,
    saveUninitialized: false,  // Prevent uninitialized sessions
    cookie: { maxAge: 60000 * 30, secure: false }  // Set cookie to expire after 30 minutes
  }));
  

// Define the connection variable
const pool = mysql.createPool({
    host: 'db',
    user: 'connect',
    password: 'Pop80bebe',
    database: 'app'
});

app.use((req, res, next) => {
    req.db = pool;
    next();
});

  const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).send('You are not logged in');
    }
    next();
  };
  
app.use(express.static(__dirname));
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views/"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/web-site/index.html");
});

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/web-site/login.html");
  });

app.post("/login", (req, res) => {
  const { user_number, user_password } = req.body;
  pool.promise().query(`SELECT * FROM users WHERE user_number = ?`, [user_number])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(401).send('Invalid credentials');
      }
      const user = rows[0];
      bcrypt.compare(user_password, user.user_password, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send('Error occurred during login');
        }
        if (result) {
          req.session.user = { 
            id: user.user_id, 
            user_number: user.user_number, 
            user_surname: user.user_surname 
          };
          res.send(`Logged in as ${user.user_surname}`);
        } else {
          res.status(401).send('Invalid credentials');
        }
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error occurred during login');
    });
});

app.post("/success", (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('You are not logged in');
      }
      // User is logged in, proceed with the original logic
      return res.send("Perfect");
  });

app.post("/send_register", (req, res) => {
    const {user_name, user_surname, user_number, user_password} = req.body;

    pool.promise().query(
      `SELECT * FROM users WHERE user_number = ? AND user_password = ?`, [user_number, user_password])
    .then(([rows]) => {
      if (rows.length > 0) {
          const existing_user = rows[0];
          res.status(400).send(`User with number ${existing_user.user_number} already exists`);
          } 
          else {
            bcrypt.hash(user_password, saltRounds, (err, hash) => {
              if (err) {
                console.error(err);
                return res.status(500).send("Error during hashing!");
              }
            else{
              const query = "INSERT INTO users (user_name, user_surname, user_number, user_password) VALUES (?, ?, ?, ?)";
              pool.query(query, [user_name, user_surname, user_number, hash], (err, result) => {
              if (err) {
                console.log("Error: ", err);
                return res.send('Error occurred during registration.');
            }
            res.redirect("/login");
            console.log('User added:', result);
          });
            }
            })   
          }
    })
});

app.get("/register", (req, res) => {return res.sendFile(__dirname + '/web-site/createuser.html');});
app.get("/search", authMiddleware, (req, res) => {
    try {
        return res.sendFile(__dirname + '/web-site/search.html');
    }
    catch{
        return res.status(500).send("Error you`re not logged in")
    }
});


app.post("/result", async (req, res) => {
    const { title, year } = req.body;

    if (!title) {
        return res.status(400).send("Please provide a movie title.");
    }

    try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${API_KEY}&t=${title}&y=${year}`);
        // Check if the movie data exists
        if (response.data.Response === "False") {
            return res.status(404).send("Movie not found.");
        }

        // Render the 'movie.ejs' file and pass movie data to the template
        return res.render("movie", { movie: response.data });
    } catch (error) {
        console.error("Error fetching data from OMDb API:", error);

        // Ensure that only one response is sent
        if (!res.headersSent) {
            return res.status(500).send("Error occurred while fetching movie data.");
        }
    }
});

// цей код відповідає де буде видно апку, не чіпати
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://192.168.1.74:${PORT}`);
});
