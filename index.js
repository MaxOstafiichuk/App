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
const Unregistered_user = { user_surname: "User"};

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
    cookie: { maxAge: 60000 * 60, secure: false }  // Set cookie to expire after 60 minutes
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
  if (req.session.user) {
    res.render("index", { user: req.session.user });
    } else {
    res.render("index", { user: Unregistered_user });
  }
});

app.get('/myfilms', authMiddleware, async (req, res) => {
  const userId = req.session.user.id;
  const query = `SELECT films FROM user_films WHERE user_id = ?`;
  req.db.query(query, [userId], async (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: 'Error retrieving user films' });
    } else {
      if (result.length === 0) {
        // No results found, handle this case accordingly
        res.render('userhome', { user: req.session.user, films: [] });
      } else {
        const films = result[0].films;
        const filmData = [];

        for (const film of films) {
          try {
            const response = await axios.get(`https://www.omdbapi.com/?apikey=e3a613fa&i=${film}`);
            filmData.push(response.data);
          } catch (error) {
            console.error(`Error fetching film data for ${film}: ${error}`);
          }
        }

        res.render('userhome', { user: req.session.user, films: filmData });
      }
    }
  });
});

app.get("/register", (req, res) => {
  if (!req.session.user) {
    res.render("createuser", {user: Unregistered_user});
  } else {
    res.render("createuser", { user: req.session.user });
  }
});

app.get("/search", authMiddleware, (req, res) => {
  if (req.session.user) {
    res.render("search", { user: req.session.user });
    } else {
      res.status(401).send('You are not logged in');
  }
});

app.get("/login", (req, res) => {
  if (!req.session.user) {
    res.render("login", {user: Unregistered_user});
  } else {
    res.render("login", { user: req.session.user });
  }
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
          res.redirect("/");
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

app.post("/send_films", authMiddleware, (req, res) => {
  if (!req.session.user) {
    res.status(401).send('You are not logged in');
  } else {
    const film = req.body;
    const user_id = req.session.user.id;
    const query = `UPDATE user_films SET films = JSON_ARRAY_APPEND(films, '$', ?) where user_id = ?`;
    pool.query(query, [film.imdbid, user_id], (err, result) => {
      if (err) {
        console.error(`Error adding movie to favorites: ${err}`);
        res.status(500).send({ message: 'Error adding movie to favorites' });
      } else {
        console.log(`Movie added to favorites successfully! Affected rows: ${result.affectedRows}`);
        res.send({ message: 'Movie added to favorites successfully' });
      }
    });
  }
});

app.post("/logout", (req, res) => {
  if (!req.session.user) {
    res.render("index", { user: Unregistered_user });
  } else {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session:", err);
        return res.status(500).send('Error occurred during logout');
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  }
}); 

app.post("/send_register", (req, res) => {
  const { user_name, user_surname, user_number, user_password } = req.body;
  
  pool.promise().query(
    `SELECT * FROM users WHERE user_number = ? AND user_password = ?`,
      [user_number, user_password]
  ).then(([rows]) => {
    if (rows.length > 0) {
      const existing_user = rows[0];
      res.status(400).send(`User with number ${existing_user.user_number} already exists`);
    } else {
      bcrypt.hash(user_password, saltRounds, (err, hash) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error during hashing!");
        } else {
          const query = "INSERT INTO users (user_name, user_surname, user_number, user_password) VALUES (?, ?, ?, ?)";
          pool.query(query, [user_name, user_surname, user_number, hash], (err, result) => {
            if (err) {
              console.log("Error: ", err);
              return res.send('Error occurred during registration.');
            }
            res.redirect("/login");
            console.log('User added:', result);
          });
          const film_query = "INSERT INTO user_films (user_id, films) VALUES ((SELECT user_id FROM users WHERE user_surname = ?), '[]')";
          pool.query(film_query, [user_surname], (err, result) => {
            if (err) {
              console.log("Error: ", err);
            } else {
              console.log('User film added:', result);
            }
          });
        }
      });
    }
  });
});

app.post("/remove_favorite", authMiddleware, async (req, res) => {
  try {
    if (!req.session.user) {
      throw new Error('You are not logged in');
    }

    const movieData = req.body; // get the JSON data from the request body

    if (!movieData || !movieData.imdbid) {
      throw new Error('Invalid movie data');
    }

    // Check if the movie is already in the user's favorites
    const query = "SELECT * FROM user_films WHERE user_id = ? AND JSON_SEARCH(films, 'one', ?) IS NOT NULL";
    pool.query(query, [req.session.user.id, movieData.imdbid], (err, result) => {
      if (err) {
        throw err;
      }

      if (result.length > 0) {
        // Movie is already in favorites, remove it
        const removeQuery = "UPDATE user_films SET films = JSON_REMOVE(films, JSON_UNQUOTE(JSON_SEARCH(films, 'one', ?))) WHERE user_id = ?";
        pool.query(removeQuery, [movieData.imdbid, req.session.user.id], (err, result) => {
          if (err) {
            throw err;
          }

          res.json({ success: true, message: 'Movie removed from favorites successfully!' }); // Return a JSON response
        });
      } else {
        res.json({ success: false, message: 'Movie is not in favorites' }); // Return a JSON response
      }
    });
  } catch (err) {
    console.error('Error removing movie from favorites:', err);
    res.status(500).json({ success: false, message: `Error occurred while removing movie from favorites: ${err.message}` }); // Return a JSON response
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

    // Check if the movie is already in the user's favorites
    const query = "SELECT * FROM user_films WHERE user_id = ? AND JSON_SEARCH(films, 'one', ?) IS NOT NULL";
    pool.query(query, [req.session.user.id, response.data.imdbID], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error occurred while checking favorites.");
      }

      let favoriteState;
      if (result.length > 0) {
        favoriteState = 'FAVORITE';
      } else {
        favoriteState = 'NOT_FAVORITE';
      }

      req.session.favoriteState = favoriteState;

      // Add a flag to indicate if the movie is already in favorites
      response.data.isFavorite = favoriteState === 'FAVORITE';

      return res.render("movie", { movie: response.data, user: req.session.user, favoriteState: favoriteState });
    });
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
  console.log(`Server is running on http://185.167.78.226:${PORT}`); 
});