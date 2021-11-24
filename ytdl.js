const HTTPS = require('https');
const FS = require('fs');
const ytdl = require('ytdl-core');
const { spawnSync } = require('child_process');

async function videoformat(ytburl) {
    const _videoid = ytdl.getURLVideoID(ytburl);
    const info = await ytdl.getInfo(ytburl);
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

async function main() {
    // 18 - 360p, 22 - 720p, 
    const url = 'https://www.youtube.com/watch?v=OP0WLhinJiw';
    // const url = 'https://www.youtube.com/watch?v=KwXKTUOydKQ';
    // const url = 'https://www.youtube.com/watch?v=rq8Aeq2RIf4';

    if (!ytdl.validateURL(url)) {
        return;
    }

    const video = await videoformat(url);
    console.log('start');
    // yt-dlp.exe -f 22 -P ./downloads -o vd75843.mp4 https://www.youtube.com/watch?v=OP0WLhinJiw
    const result = spawnSync("yt-dlp.exe", [`-f ${video.format}`, "-P ./downloads", `-o ${video.output}`, url]);
    if(result.error) {
        console.log(result.error?.message);
        return;
    }
    console.log("done");
}

main();
