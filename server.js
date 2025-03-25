const express = require("express")
const path = require("path")
const { open } = require("sqlite")
const sqlite3 = require("sqlite3")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const cors = require("cors")

const app = express()
app.use(express.json())
app.use(cors({
    origin: "*", // Allow all origins, or specify your frontend URL
    methods: "GET,POST,PUT,DELETE",
    credentials: true // Allow cookies if needed
}))

let db

const initializeDBandServer = async () => {
    try {
        db = await open({
            filename: path.join(__dirname, "maps.db"),
            driver: sqlite3.Database
        })
        app.listen(3000, () => {
            console.log('Server is running on http://localhost:3000/')
        })
    } catch (e) {
        console.log(`DB Error : ${e.message}`)
        process.exit(1)
    }
}
initializeDBandServer()




const authenticate = (req, res, next) => {
    const token = req.headers["authorization"]
    if (!token) return res.status(403).send("User not logged in")
    jwt.verify(token.split(" ")[1], 'MAPS8660', (err, user) => {
        if (err) return res.status(401).send("Invalid token")
        req.user = user
        next()
    })
}

app.post("/register", async (req, res) => {
    const { username, password, mapdata, carddata } = req.body;

    // Check if username already exists
    const existingUser = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (existingUser) {
        return res.status(400).send("Username already taken");
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await db.run(
        `INSERT INTO users (username, password, mapdata, carddata) VALUES (?, ?, ?, ?)`,
        [username, hashedPassword, JSON.stringify(mapdata), JSON.stringify(carddata)]
    );

    res.status(201).send("User registered successfully!")
})

app.post("/login", async (req, res) => {
    const { username, password } = req.body
    const user = await db.get(`SELECT * FROM users WHERE username = '${username}';`)
    if (!user || ! await bcrypt.compare(password, user.password)) return res.status(401).send("Invalid credentials")
    const token = jwt.sign({ username }, 'MAPS8660')
    res.status(200).send({ token })
})

app.get("/dashboard", authenticate, async (req, res) => {
    const { username } = req.user
    const data = await db.get("SELECT mapdata FROM users WHERE username = ?", [username])
    res.status(200).send(data)
})

app.get("/map", authenticate, async (req, res) => {
    const { username } = req.user
    const data = await db.get("SELECT carddata FROM users WHERE username = ?", [username])
    res.status(200).send(data)
})