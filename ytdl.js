const FS = require('fs');
const ytdl = require('ytdl-core');
const HTTPS = require('https');

async function videoformat(ytburl){
    const _videoid = ytdl.getURLVideoID(ytburl);
    const info = await ytdl.getInfo(ytburl);
    try{
        const format = ytdl.chooseFormat(info.formats, { quality: '22' }); //720p
        return { link: format.url, videoid: _videoid, container: format.container };
    }
    catch(ex) { }
    try{
        const format = ytdl.chooseFormat(info.formats, { quality: '18' }); //360p or possible
        return { link: format.url, videoid: _videoid, container: format.container };
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
    // HTTPS.get(video.link, file => {
    //     file.pipe(FS.createWriteStream(video.videoid+'.'+video.container));
    // });
    //or
    ytdl('https://www.youtube.com/watch?v=KwXKTUOydKQ', { quality: 22 }).pipe(FS.createWriteStream(video.videoid+'.mp4'));
    
    //with 360p
    // ytdl('https://www.youtube.com/watch?v=rq8Aeq2RIf4', { quality: 18 }).pipe(fs.createWriteStream('video.mp4'));
}

main();