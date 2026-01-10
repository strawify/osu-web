# osu!web
Rewritten version of [webosu](https://github.com/111116/webosu) & Rhythm game where players click circles following rhythm of the music.  
Scoring and judgement rules differ from official versions. Some music might not be perfectly syncing. Modes other than osu! (std) are **unsupported**.  
Note: This is an unofficial implementation of [osu!](https://osu.ppy.sh).  

## Hosting
Set up a web server with root directory located where `index.html` is in.  
To host a separate live score, redirect send/fetch api requests to localhost:3000/3001 respectively, and change the api url in `index.html` and `scripts/overlay/score.js` accordingly. Then run:  

```bash
nohup node api.js &
```

## Credits
Powered by [PixiJS](https://www.pixijs.com). 
Beatmap source: [Sayobot](https://osu.sayobot.cn).  
Toastify.js (Toast Notifications)  
NProgress (loading bar)  
LocalForage (storage)  

## License Notes
Some media files are copyrighted by [ppy](https://github.com/ppy/) and other people.  
Check their respective license before you use them.  
