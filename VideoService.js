const HTTPS = require('https');
const FS = require('fs');
const FormData = require('form-data');
const FFMPEG = require('fluent-ffmpeg');
FFMPEG.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);
const Express = require('express');
const cors = require('cors')
const server = Express();
server.use(cors());
server.use(Express.json());
const Port = process.env.PORT || 5000;
const delay = 1000;


var sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

var Upload = FileID => new Promise((resolve, reject) => {
    var Form = new FormData();
    Form.append('file', FS.createReadStream(`./downloads/${FileID}`));

    var option = {
        hostname: 'storage.ru-srv1.ipst.englishpatient.org',
        path: '/video/upload-and-transcode',
        method: 'POST',
        headers: Form.getHeaders()
    }

    var req = HTTPS.request(option, res => {
        if (res.statusCode !== 200)
            reject("something went wrong");

        let body = '';
        res.on('data', chunk => { 
            body += chunk;
        })
        // ответ
        res.on('end', () => { 
            resolve(JSON.parse(body));
        })
    })

    req.on('error', err => {
        reject(err);
    })
    Form.pipe(req);
})

var CheckStatus = hash => new Promise((resolve, reject) => {
    HTTPS.get(`https://storage.ru-srv1.ipst.englishpatient.org/video/${hash}/status`, res => {
        let body = '';
        res.on('data', chunk => { 
            body += chunk;
        })
        // ответ
        res.on('end', () => {
            resolve(JSON.parse(body).status);
        })
    })
    .on('error', err => reject(err));
})

server.post('/', function(Request, Response) {
    var Data = Request.body, FileID, FileMP4;

    if(Data.URL.toLowerCase().includes('y.yarn.co'))
    {
        FileID = Data.URL.split('/').pop();
        FileMP4 = FS.createWriteStream(`./downloads/${FileID}`);
        
        HTTPS.get(Data.URL, function(file) {
            file.pipe(FileMP4);
        })
        .on("error", () => {
            Response.send("Не удалось скачать видео");
        })
        .on("close", async () => {
            // send to server
            try{
                let result = await Upload(FileID);
                FS.unlink(`./downloads/${FileID}`, (err) => { 
                    if (err)    console.log(err);
                })

                //wait for finish
                let status;
                do {
                    await sleep(delay);
                    status = await CheckStatus(result.hash);
                } while(status != 'finished')

                Response.json({
                    info: 'Uploaded!',
                    hash: result.hash,
                    status: status,
                    url: result.url
                })
            }
            catch(ex){
                console.log(ex);
                Response.send("something went wrong");
            }
        })
    }
    // else if(Data.URL.toLowerCase().includes('youtu.be'))
    // {
        // let T1 = Number(Data.Time1.split(':')[0]) * 3600 + Number(Data.Time1.split(':')[1]) * 60 + Number(Data.Time1.split(':')[2]);
        // let T2 = Number(Data.Time2.split(':')[0]) * 3600 + Number(Data.Time2.split(':')[1]) * 60 + Number(Data.Time2.split(':')[2]);
        // let Duration = T2 - T1;
        // FileID = 'input';// ??
        // FileMP4 = FS.createWriteStream(`./downloads/${FileID}.mp4`);
        // HTTPS.get(`https://y.yarn.co/${FileID}.mp4`, function(file) {
        //     file.pipe(FileMP4);
        // })
        // .on("error", () => {
        //     Response.send("Не удалось скачать видео");
        // })
        // .on("close", () => {

/****************************************************************** */
            // FFMPEG(`./downloads/${FileID}.mp4`)
            // .setStartTime(Data.Time1)
            // .setDuration(Duration)
            // .output(`./downloads/${FileID}_cropped.mp4`)
            // .on("error", err => {
            //     console.log(err);
            //     Response.send("Не удалось обработать видео");
            // })
            // .on("end", async () => {
            //     // send to server
            //     try{
            //         let result = await Upload(FileID+'_cropped');
            //         // FS.unlink(`./downloads/${FileID}.mp4`, (err) => { 
            //         //     if (err)    console.log(err);
            //         // })
            //         FS.unlink(`./downloads/${FileID}_cropped.mp4`, (err) => { 
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
    else Response.send("Не удалось обработать ссылку");
})

server.listen(Port, ()=>{
    var dir = './downloads';
    if (!FS.existsSync(dir))    FS.mkdirSync(dir);
    console.log('Server run on port: '+Port);
});
