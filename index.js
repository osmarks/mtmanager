const express = require("express")
const WebSocket = require("ws")
const crypto = require("crypto")
const cookieSession = require("cookie-session")
const pty = require("node-pty")
const flash = require("simple-flash")
const os = require("os")
const path = require("path")
const expressWS = require("express-ws")
const sliceFile = require("slice-file")
const fs = require("fs")
require("dotenv").config()

const minetestDir = path.join(os.homedir(), ".minetest")

const app = express()
const appWS = expressWS(app)

let ptyProcess = null
let lastExitCode = null
const runProcess = () => {
	lastExitCode = null
	ptyProcess = pty.spawn("minetest", ["--server", "--terminal"], {
		cols: 80,
		rows: 30
	})

	ptyProcess.onData(data => {
		appWS.getWss().clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(data)
			}
		})
	})

	ptyProcess.onExit(info => {
		ptyProcess = null
		lastExitCode = info.exitCode
	})
}

const makeURL = x => path.posix.join(process.env.BASE_URL || "/", x)

app.use(cookieSession({
	name: `mtmanager:session`,
	secret: process.env.SESSION_KEY
}))
app.use(flash())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(function(req, res, next) {
	res.locals.path = req.path
	res.flashRedirect = (ty, val, redirect) => { 
		req.flash(ty, val) 
		res.redirect(makeURL(redirect) || req.get("Referer")) }
	next()
});

app.get("/login", (req, res) => {
	res.render("login")
})

app.post("/login", (req, res) => {
	const password = req.body.password
	if (!password) { return res.flashRedirect("error", "No password provided", "/login") }
	if (crypto.createHash("sha256").update(password).digest("hex") !== process.env.PASSWORD) {
		return res.flashRedirect("error", "Password invalid", "/login")
	}
	req.session.authed = true
	res.redirect(makeURL("/"))
})

const adminRoutes = express.Router()

adminRoutes.use((req, res, next) => {
	if (!req.session.authed) {
		return res.redirect(makeURL("/login"))
	}
	next()
})

adminRoutes.get("/", (req, res) => {
	res.render("index")
})

adminRoutes.post("/config", (req, res) => {
	if (typeof req.body.content !== "string") { return res.flashRedirect("error", "No content provided", "/config") }
	fs.writeFile(path.join(minetestDir, "minetest.conf"), req.body.content, (err) => {
		if (err) { next(err) } 
		return res.flashRedirect("info", "Saved", "/config")
	})
})

adminRoutes.get("/config", (req, res, next) => {
	fs.readFile(path.join(minetestDir, "minetest.conf"), (err, data) => {
		if (err) { return next(err) }
		res.render("config", { content: data })
	})
})

adminRoutes.get("/terminal", (req, res) => {
	res.render("terminal")
})

adminRoutes.get("/logs", (req, res) => {
	const lines = []
	const sliceStart = parseInt(req.query.start) || -100
	const sliceEnd = parseInt(req.query.end) || null
	const stream = sliceFile(path.join(minetestDir, "debug.txt")).slice(sliceStart, sliceEnd)
	stream.on("data", line => lines.push(line.toString()))
	stream.on("end", () => {
		res.render("log", { lines, sliceStart, sliceEnd })
	})
})

adminRoutes.ws("/termws", (ws, req) => {
	ws.on("message", msg => {
		if (ptyProcess) { ptyProcess.write(msg) }
	})
})

adminRoutes.post("/start", (req, res) => {
	if (ptyProcess) { return res.flashRedirect("error", "Already started") }
	runProcess()
	res.flashRedirect("info", "Server started")
})

adminRoutes.post("/stop", (req, res) => {
	if (!ptyProcess) { return res.flashRedirect("error", "Already stopped") }
	ptyProcess.kill()
	res.flashRedirect("info", "Server stopped")
})

adminRoutes.post("/logout", (req, res) => {
	req.session = null
	res.redirect(makeURL("/login"))
})

app.locals.serverRunning = () => ptyProcess !== null
app.locals.lastExitCode = () => lastExitCode
app.locals.url = makeURL

app.use("/static", express.static("./static"))
app.use(adminRoutes)
app.use((err, req, res, next) => {
	console.warn(err.stack)
	if (res.headersSent) {
		return next(err)
	}
	res.status(err.code || 500)
	res.render("error", { error: process.env.NODE_ENV === "production" ? err.toString() : err.stack })
})
app.set("trust proxy", "loopback")
app.set("view engine", "pug")
const port = parseInt(process.env.PORT) || 5783
app.listen(port, () => console.log("listening on port", port))
runProcess()