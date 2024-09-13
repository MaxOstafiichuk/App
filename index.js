const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const axios = require("axios");
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const bodyParser = require('body-parser');
const path = require("path");
const app = express();

const API_KEY = "e3a613fa";
app.use(bodyParser.urlencoded({ extended: true }));

const redisClient = redis.createClient({
    host: 'redis_server', 
    port: 6379
  });

redisClient.on('error', (err) => {
    console.error('Redis error: ', err);
});

app.use(session({
    secret: 'yourSecretKey',   // Use a secure key
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


app.use(express.static(__dirname));
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views/"));

app.get("/", async (req, res) => {
    res.sendFile(__dirname + "/web-site/index.html");
});

app.get("/login", (req, res) => {return res.sendFile(__dirname + '/web-site/login.html');});

app.post("/success", (req, res) => {
    const {user_number, user_password} = req.body;

    const query = "select * from users where user_number= ? and user_password= ?";
    pool.query(query, [user_number, user_password], (err, result) => {
        if (result.length > 0) {
            const user = result[0];
            if (user.password === password) {
            req.session.user = { username };
            res.send(`Logged in as ${username}`);
            console.log('User logged in:', result);
            }
            else {
                return res.status(401).send('Invalid password');
            }
            //res.redirect("/");
            
        } else {
            res.send('Login failed. Invalid phone number or password.');
        }
    });
});

app.post("/send_register", (req, res) => {
    const {user_name, user_surname, user_number, user_password} = req.body;

        // Добавити сюди перевірку чи є такий користувач

        const query = "INSERT INTO users (user_name, user_surname, user_number, user_password) VALUES (?, ?, ?, ?)";
        pool.query(query, [user_name, user_surname, user_number, user_password], (err, result) => {
            if (err) {
                console.log("Error: ", err);
                return res.send('Error occurred during registration.');
            }
            res.redirect("/login");
            console.log('User added:', result);
        });
});

app.get("/register", (req, res) => {return res.sendFile(__dirname + '/web-site/createuser.html');});
app.get("/search", (req, res) => {return res.sendFile(__dirname + '/web-site/search.html');});


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
  console.log(`Server is running on http://192.168.1.86:${PORT}`);
});
