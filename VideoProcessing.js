const FormData = require('form-data');
const FS = require('fs');
const HTTPS = require('https');
const ytdl = require('ytdl-core');
const SyncRequest = require('sync-request');
const serverEP = process.env.SERVER_EP;
const MaxSize = process.env.MAXSIZE; //BYTE


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const Upload = VideoID => new Promise((resolve, reject) => {
    let Form = new FormData();
    Form.append('file', FS.createReadStream(`./caches/${VideoID}`));

    const option = {
        hostname: serverEP,
        path: '/video/upload-and-transcode',
        method: 'POST',
        headers: Form.getHeaders()
    }

    const uploadrequest = HTTPS.request(option, res => {
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
        const size = SyncRequest('HEAD', videoinfo.url).headers['content-length'];
        if(size > MaxSize)
            throw "Too big video size";
        return { format: videoinfo.itag, output: _videoid+'.'+videoinfo.container };
    }
    catch(ex) { }
    try {
        const videoinfo = ytdl.chooseFormat(info.formats, { quality: '18' }); //360p or possible
        return { format: videoinfo.itag, output: _videoid+'.'+videoinfo.container };
    }
    catch (ex) { }
}

module.exports = {
    sleep,
    Upload,
    CheckStatus,
    GetVideoFormat
}