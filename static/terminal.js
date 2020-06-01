const termContainer = document.getElementById("xterm")
const infoContainer = document.getElementById("info")
infoContainer.innerHTML = "Connecting..."
const tryConnect = () => {
    const term = new Terminal({cols: 80, rows: 30})
    const socket = new WebSocket("ws://localhost:5783/termws")
    socket.onopen = () => {
        infoContainer.innerHTML = ""
        term.open(termContainer)
        socket.onmessage = ev => term.write(ev.data)
        term.onData(data => socket.send(data))
        document.querySelector(".xterm-viewport").style.width = document.querySelector(".xterm-screen").style.width
    }
    socket.onclose = ev => {
        term.dispose()
        infoContainer.innerHTML = `Disconnected (code ${ev.code}). <a href="javascript:tryConnect()">Click to attempt reconnect.</a>`
    }
}
tryConnect()