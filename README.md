# mtmanager

A Node.js based application for managing a Minetest server ([Minetest](minetest.net), yes, not Minecraft).
It allows stop/start, editing `minetest.conf`, viewing `debug.txt` logs, and running commands and seeing the results (somewhat buggily, since it is effectively just wrapping `minetest --server --terminal` because there doesn't seem to be another way to do it without making a MT mod).
Not really particularly well-tested or likely reliable, so... don't use it on a server you care much about, unless you have good backups.
It probably won't delete your world, at least!

## Configuration

mtmanager uses a `.env` file for configuration. You can configure `PORT`, `PASSWORD` (SHA256 hash of the password to use to access it), `SESSION_KEY` (secret key used for the sessions, set this to a random value and keep it secret) and `BASE_URL`.

## TODO

(eventually - your help would be appreciated if you happen to be interested in this project?)

* Figure out how to make the terminal behave better - it doesn't show anything printed by Minetest before you connect to it, although the log viewer does mostly make up for this.
* Autorestart on Minetest server crash.
* General reliability and/or performance improvements.
* Actually write tests for this. Somehow.