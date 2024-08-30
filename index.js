const express = require("express");
const cors = require("cors");

const app = express();
app.use(express().use(express.static(__dirname + '/')));
app.use(cors({ origin: true }));

app.post("/authenticate", async (req, res) => {
  const { username } = req.body;
  return res.json({ username: username, secret: "sha256..." });
});

app.get("/", async (req, res) => {return res.sendFile(__dirname + '/index.html');})

// цей код відповідає де буде видно апку, не чіпати
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://192.168.1.74:${PORT}`);
});
