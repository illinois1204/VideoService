const FS = require('fs');
const ytdl = require('ytdl-core');
const HTTPS = require('https');

async function videoformat(ytburl){
    const _videoid = ytdl.getURLVideoID(ytburl);
    const info = await ytdl.getInfo(ytburl);
    try{
        const videoinfo = ytdl.chooseFormat(info.formats, { quality: '22' }); //720p
        return { format: videoinfo.itag, videoid: _videoid, container: videoinfo.container };
    }
    catch(ex) { }
    try{
        const videoinfo = ytdl.chooseFormat(info.formats, { quality: '18' }); //360p or possible
        return { format: videoinfo.itag, videoid: _videoid, container: videoinfo.container };
    }
    catch(ex) { }
}

async function main(){
    // 18 - 360p, 22 - 720p, 
    // with 1080p
    const url1 = 'https://www.youtube.com/watch?v=KwXKTUOydKQ';
    const url2 = 'https://www.youtube.com/watch?v=rq8Aeq2RIf4';
    if(!ytdl.validateURL(url1)){
        return;
    }
    
    const video = await videoformat(url1);
    console.log(video);
    ytdl(url1, { quality: video.format }).pipe(FS.createWriteStream(video.videoid+'.mp4'));
    
    //with 360p
    // ytdl('https://www.youtube.com/watch?v=rq8Aeq2RIf4', { quality: 18 }).pipe(fs.createWriteStream('video.mp4'));
}

main();