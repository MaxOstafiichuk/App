const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const axios = require("axios");
const path = require("path");


const API_KEY = "e3a613fa";

// Define the connection variable
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'dev-connect',
    password: 'pop80bebe',
    database: 'Dev'
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.log("Error with connection to DB:", err);
        return;
    }
    console.log("Connection successful");

    // End the connection
    // connection.end();
});

const app = express();
app.use(express.static(__dirname));
app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views/"));

app.get("/123", async (req, res) => {
    res.sendFile(__dirname + "/web-site/createuser.html");
});

app.get("/login", (req, res) => {return res.sendFile(__dirname + '/web-site/login.html');});

app.post("/success", (req, res) => {
    const {phone_number, password} = req.body;

    const query = "select * from users where phone_number= ? and password= ?";
    connection.query(query, [phone_number, password], (err, result) => {
        if (result.length > 0) {
            res.redirect("/home");
            console.log('User logged in:', result);
        } else {
            res.send('Login failed. Invalid phone number or password.');
        }
    });
});

app.post("/register", (req, res) => {
    const {name, surname, phone_number, password} = req.body;

        // Добавити сюди перевірку чи є такий користувач

        const query = "INSERT INTO users (name, surname, phone_number, password) VALUES (?, ?, ?, ?)";
        connection.query(query, [name, surname, phone_number, password], (err, result) => {
            if (err) {
                console.log("Error: ", err);
                return res.send('Error occurred during registration.');
            }
            res.redirect("/login");
            console.log('User added:', result);
        });
});

app.get("/home", (req, res) => {return res.sendFile(__dirname + '/web-site/index.html');});
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://192.168.1.86:${PORT}`);
});
