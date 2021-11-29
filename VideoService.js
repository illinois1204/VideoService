const HTTPS = require('https');
const FS = require('fs');
const ytdl = require('ytdl-core');
const { spawnSync } = require('child_process');
const Express = require('express');
const cors = require('cors');
const server = Express();
server.use(cors());
server.use(Express.json());
const Database = require('better-sqlite3');
const DB = new Database('videos.db')
const { sleep, Upload, CheckStatus, GetVideoFormat } = require('./VideoProcessing');
const Port = process.env.PORT || 5000;
const delay = 1000;


server.get('/', (Request, Response) => Response.send('App is working'))

server.get('/upload-youtube/status', function(Request, Response) {
    const _videoid = Request.query?.videoid;
    if (!_videoid  || _videoid == '') {
        console.log(_videoid);
        Response.status(404).json({ message: "No videoid parametr" });
        return;
    }

    const row = DB.prepare("SELECT * FROM videos WHERE youtubeid = ?").get(_videoid);
    if(!row){
        Response.status(404).json({ message: "No info about current videoid" });
        return;
    }

    Response.json({
        YouTubeVideoid: row.youtubeid,
        hash: row.hash,
        status: row.status,
        url: row.url
    });
})

server.post('/upload-yarn', function(Request, Response) {
    let Data = Request.body, videoid;
    if(!Data.URL.toLowerCase().includes('y.yarn.co')) {
        Response.status(400).json({ message: "invalid url" });
        return;
    }

    videoid = Data.URL.split('/').pop();
    HTTPS.get(Data.URL, function(file) {
        file.pipe(FS.createWriteStream(`./caches/${videoid}`));
    })
    .on("error", () => {
        Response.status(404).json({ message: "Couldn't download the video" });
    })
    .on("close", async () => {
        // send to server
        try{
            const result = await Upload(videoid);
            //wait for finish
            let status;
            do {
                await sleep(delay);
                status = await CheckStatus(result.hash);
            } while(status != 'finished')
            FS.unlink(`./caches/${videoid}`, (err) => { if (err) console.log(err) });

            Response.json({
                info: 'Uploaded!',
                hash: result.hash,
                status: status,
                url: result.url
            })
        }
        catch(ex){
            FS.unlink(`./caches/${videoid}`, (err) => { if (err) console.log(err) });
            console.log(ex);
            Response.status(500).json({ message: ex?.reason ?? 'Request reject' });
        }
    })
})

server.post('/upload-youtube', async function(Request, Response) {
    const Data = Request.body;

    if(!ytdl.validateURL(Data.URL)){
        Response.status(400).json({ message: "invalid url" });
        return;
    }
    const _videoid = ytdl.getURLVideoID(Data.URL);

    const row = DB.prepare("SELECT * FROM videos WHERE youtubeid = ?").get(_videoid);
    if (row) {
        console.log(row);
        Response.json({
            YouTubeVideoid: row.youtubeid,
            hash: row.hash,
            status: row.status,
            url: row.url
        });
        return;
    }

    try {
        DB.prepare("INSERT INTO videos(youtubeid, status) values(?, ?)").run(_videoid, 'downloading');
        Response.json({
            YouTubeVideoid: _videoid,
            status: 'downloading'
        });
    }
    catch(ex){
        Response.status(500).json({ message: 'Request reject, try again' });
        return;
    }
    
    try {
        var info = await ytdl.getInfo(Data.URL);
    }
    catch(e) {
        console.log(e.message);
        DB.prepare("DELETE FROM videos WHERE youtubeid = ?").run(_videoid);
        return;
    }

    const video = await GetVideoFormat(info, Data.URL);
    const download = spawnSync("./yt-dlp", [`-f ${video.format}`, "-P ./caches", `-o${video.output}`, Data.URL]);
    if(download.error) {
        console.log(download.error?.message);
        DB.prepare("DELETE FROM videos WHERE youtubeid = ?").run(_videoid);
        return;
    }
    DB.prepare("UPDATE videos SET status = ? WHERE youtubeid = ?").run("uploading", _videoid);

    try {
        const result = await Upload(video.output);
        let status;
        do {
            await sleep(delay);
            status = await CheckStatus(result.hash);
        } while(status != 'finished')
        FS.unlink(`./caches/${video.output}`, (err) => { if (err) console.log(err) });
        DB.prepare("UPDATE videos SET hash = ?, status = ?, url = ? WHERE youtubeid = ?").run(result.hash, status, result.url, _videoid);
    }
    catch(ex) {
        FS.unlink(`./caches/${video.output}`, (err) => { if (err) console.log(err) });
        console.log(ex?.reason ?? 'Request reject');
        DB.prepare("DELETE FROM videos WHERE youtubeid = ?").run(_videoid);
    }
})

server.listen(Port, () => {
    DB.exec("CREATE TABLE IF NOT EXISTS videos('youtubeid' VARCHAR PRIMARY KEY NOT NULL, 'hash' VARCHAR, 'status' VARCHAR, 'url' VARCHAR)");
    const dir = './caches';
    if (!FS.existsSync(dir))    FS.mkdirSync(dir);
    console.log('Server run on port: '+Port);
});