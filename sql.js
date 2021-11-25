const Database = require('better-sqlite3');
const db = new Database('videos.db')

console.log("start")
db.exec("CREATE TABLE IF NOT EXISTS videos('youtubeid' VARCHAR PRIMARY KEY NOT NULL, 'hash' VARCHAR, 'status' VARCHAR, 'url' VARCHAR)")
db.prepare("INSERT INTO videos(youtubeid, hash) values(?, ?)").run('qw4', 'boowoa')
db.prepare("UPDATE videos SET status = ? WHERE youtubeid = ?").run('finished', 'qw4')
const row = db.prepare("SELECT * FROM videos WHERE youtubeid = ?").get('qw4')
console.log(row)
console.log("close")
