const { rejects } = require('assert');
const FS = require('fs');
const ytdl = require('ytdl-core');

async function videoformat(ytburl) {
    const _videoid = ytdl.getURLVideoID(ytburl);
    const info = await ytdl.getInfo(ytburl);
    // try{
    //     const videoinfo = ytdl.chooseFormat(info.formats, { quality: '22' }); //720p
    //     return { format: videoinfo.itag, videoid: _videoid, container: videoinfo.container };
    // }
    // catch(ex) { }
    try {
        const videoinfo = ytdl.chooseFormat(info.formats, { quality: '18' }); //360p or possible
        return { format: videoinfo.itag, videoid: _videoid, container: videoinfo.container };
    }
    catch (ex) { }
}

async function main() {
    // 18 - 360p, 22 - 720p, 
    const url1 = 'https://www.youtube.com/watch?v=KwXKTUOydKQ';
    const url2 = 'https://www.youtube.com/watch?v=rq8Aeq2RIf4';
    if (!ytdl.validateURL(url1)) {
        return;
    }

    const video = await videoformat(url1);
    console.log('start');
    ytdl(url1, { quality: 18 }).pipe(FS.createWriteStream(video.videoid + '.' + video.container)).on('close', () => console.log('done'));
}

main();
