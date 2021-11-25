const HTTPS = require('https');
const FS = require('fs');
const FormData = require('form-data');
const ytdl = require('ytdl-core');
const { spawnSync } = require('child_process');
const FFMPEG = require('fluent-ffmpeg');
FFMPEG.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
const Express = require('express');
const cors = require('cors');
const { info } = require('console');
const server = Express();
server.use(cors());
server.use(Express.json());
const Port = process.env.PORT || 5000;
const delay = 500;
const serverEP = process.env.serverEP;


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const Upload = VideoID => new Promise((resolve, reject) => {
    var Form = new FormData();
    Form.append('file', FS.createReadStream(`./caches/${VideoID}`));

    var option = {
        hostname: serverEP,
        path: '/video/upload-and-transcode',
        method: 'POST',
        headers: Form.getHeaders()
    }

    var uploadrequest = HTTPS.request(option, res => {
        if (res.statusCode !== 200)
            reject("Something went wrong. Server response: " + res.statusCode);

        let body = '';
        res.on('data', chunk => { 
            body += chunk;
        })
        // ответ
        res.on('end', () => { 
            resolve(JSON.parse(body));
        })
    })

    uploadrequest.on('error', err => {
        reject(err);
    })
    Form.pipe(uploadrequest);
})

const CheckStatus = hash => new Promise((resolve, reject) => {
    HTTPS.get(`https://${serverEP}/video/${hash}/status`, res => {
        let body = '';
        res.on('data', chunk => { 
            body += chunk;
        })
        // ответ
        res.on('end', () => {
            try { resolve(JSON.parse(body).status) }
            catch(e) { reject('no answer in body') }            
        })
    })
    .on('error', err => reject(err));
})

async function GetVideoFormat(info, YTurl) {
    const _videoid = ytdl.getURLVideoID(YTurl);
    try{
        const videoinfo = ytdl.chooseFormat(info.formats, { quality: '22' }); //720p
        return { format: videoinfo.itag, output: _videoid+'.'+videoinfo.container };
    }
    catch(ex) { }
    try {
        const videoinfo = ytdl.chooseFormat(info.formats, { quality: '18' }); //360p or possible
        return { format: videoinfo.itag, output: _videoid+'.'+videoinfo.container };
    }
    catch (ex) { }
}


server.get('/', (Request, Response) => Response.send('App is working'))

server.post('/yarncore', function(Request, Response) {
    let Data = Request.body, videoid;
    if(Data.URL.toLowerCase().includes('y.yarn.co'))
    {
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
    }
    else Response.status(400).json({ message: "invalid url" });
})

server.post('/ytcore', async function(Request, Response) {
    const Data = Request.body;

    if(!ytdl.validateURL(Data.URL)){
        Response.status(400).json({ message: "invalid url" });
        return;
    }

    try{
        var info = await ytdl.getInfo(Data.URL);
    }
    catch(e) {
        Response.status(400).json({ message: e.message });
        return;
    }

    const video = await GetVideoFormat(info, Data.URL);
    const download = spawnSync("./yt-dlp", [`-f ${video.format}`, "-P ./caches", `-o${video.output}`, Data.URL]);
    if(download.error) {
        console.log(download.error?.message);
        Response.status(400).json({ message: "Couldn't download the video" });
        return;
    }

    try {
        const result = await Upload(video.output);
        let status;
        do {
            await sleep(delay);
            status = await CheckStatus(result.hash);
        } while(status != 'finished')
        FS.unlink(`./caches/${video.output}`, (err) => { if (err) console.log(err) });

        Response.json({
            info: 'Uploaded!',
            hash: result.hash,
            status: status,
            url: result.url
        })
    }
    catch(ex) {
        FS.unlink(`./caches/${video.output}`, (err) => { if (err) console.log(err) });
        console.log(ex);
        Response.status(500).json({ message: ex?.reason ?? 'Request reject' });
    }
})

server.listen(Port, () => {
    var dir = './caches';
    if (!FS.existsSync(dir))    FS.mkdirSync(dir);
    console.log('Server run on port: '+Port);
});


// else if(Data.URL.toLowerCase().includes('youtu.be'))
// {
    // let T1 = Number(Data.Time1.split(':')[0]) * 3600 + Number(Data.Time1.split(':')[1]) * 60 + Number(Data.Time1.split(':')[2]);
    // let T2 = Number(Data.Time2.split(':')[0]) * 3600 + Number(Data.Time2.split(':')[1]) * 60 + Number(Data.Time2.split(':')[2]);
    // let Duration = T2 - T1;
    // FileID = 'input';// ??
    // FileMP4 = FS.createWriteStream(`./caches/${FileID}.mp4`);
    // HTTPS.get(`https://y.yarn.co/${FileID}.mp4`, function(file) {
    //     file.pipe(FileMP4);
    // })
    // .on("error", () => {
    //     Response.send("Не удалось скачать видео");
    // })
    // .on("close", () => {

/****************************************************************** */
        // FFMPEG(`./caches/${FileID}.mp4`)
        // .setStartTime(Data.Time1)
        // .setDuration(Duration)
        // .output(`./caches/${FileID}_cropped.mp4`)
        // .on("error", err => {
        //     console.log(err);
        //     Response.send("Не удалось обработать видео");
        // })
        // .on("end", async () => {
        //     // send to server
        //     try{
        //         let result = await Upload(FileID+'_cropped');
        //         // FS.unlink(`./caches/${FileID}.mp4`, (err) => { 
        //         //     if (err)    console.log(err);
        //         // })
        //         FS.unlink(`./caches/${FileID}_cropped.mp4`, (err) => { 
        //             if (err)    console.log(err);
        //         })

        //         // wait for finish
        //         let status;
        //         do {
        //             await sleep(delay);
        //             status = await CheckStatus(result.hash);
        //         } while(status != 'finished')

        //         Response.json({
        //             info: 'Uploaded!',
        //             hash: result.hash,
        //             status: status,
        //             url: result.url
        //         })
        //     }
        //     catch(ex){
        //         console.log(ex);
        //         Response.send("something went wrong");
        //     }
        // }).run();
/****************************************************************** */

    // })
// }