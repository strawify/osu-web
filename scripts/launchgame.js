function launchOSU(osu, beatmapid, version){
    let trackid = -1;
    
    for (let i=0; i<osu.tracks.length; ++i) {
        if (osu.tracks[i].metadata.BeatmapID == beatmapid || (!osu.tracks[i].mode && osu.tracks[i].metadata.Version == version)) {
            trackid = i;
            break;
        }
    }
    
    console.log("Launching track:", beatmapid, version);
    
    if (trackid == -1) {
        console.error("Track not found");
        console.log("Available tracks:", osu.tracks.map(t => ({id: t.metadata.BeatmapID, version: t.metadata.Version})));
        showToast('Track not found in beatmap', 'error');
        return;
    }
    
    if (window.app) {
        console.log('Game already running');
        return;
    }
    
    console.log("Creating PIXI app");
    
    let app = window.app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x111111,
        antialias: true
    });
    
    let defaultAlert = window.alert;
    window.alert = function(msg) {
        console.log("IN-GAME ALERT:", msg);
    };
    
    document.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        return false;
    });
    
    document.body.classList.add("gaming");
    
    if (window.gamesettings) {
        window.gamesettings.refresh();
        window.gamesettings.loadToGame();
    }
    
    if (!window.game.showhwmouse || window.game.autoplay) {
        window.game.cursor = new PIXI.Sprite(window.Skin ? window.Skin["cursor.png"] : PIXI.Texture.WHITE);
        window.game.cursor.anchor.x = window.game.cursor.anchor.y = 0.5;
        window.game.cursor.scale.x = window.game.cursor.scale.y = 0.3 * window.game.cursorSize;
        window.game.stage.addChild(window.game.cursor);
    }
    
    if (window.game.autofullscreen) {
        document.documentElement.requestFullscreen();
    }
    
    let pGameArea = document.getElementById("game-area");
    let pMainPage = document.getElementById("main-page");
    let pNav = document.getElementById("main-nav");
    
    pGameArea.appendChild(app.view);
    
    if (window.game.autoplay) {
        pGameArea.classList.remove("shownomouse");
        pGameArea.classList.remove("showhwmousemedium");
        pGameArea.classList.remove("showhwmousesmall");
        pGameArea.classList.remove("showhwmousetiny");
    }
    else if (window.game.showhwmouse) {
        pGameArea.classList.remove("shownomouse");
        if (window.game.cursorSize < 0.65)
            pGameArea.classList.add("showhwmousetiny");
        else if (window.game.cursorSize < 0.95)
            pGameArea.classList.add("showhwmousesmall");
        else
            pGameArea.classList.add("showhwmousemedium");
    }
    else {
        pGameArea.classList.add("shownomouse");
        pGameArea.classList.remove("showhwmousemedium");
        pGameArea.classList.remove("showhwmousesmall");
        pGameArea.classList.remove("showhwmousetiny");
    }
    
    pMainPage.setAttribute("hidden","");
    if (pNav) pNav.setAttribute("style","display: none");
    pGameArea.removeAttribute("hidden");
    
    window.game.scene = new window.Playback(window.game, osu, osu.tracks[trackid]);
    app.stage.addChild(window.game.scene.gamefield);
    
    window.game.scene.load();
    
    window.game.scene.onload = function() {
        console.log("Playback loaded, starting game loop");
    };
    
    window.quitGame = function() {
        if (window.game.scene && window.game.scene.osu) {
            window.game.scene.osu.audio.stop();
        }
        
        pGameArea.setAttribute("hidden", "");
        pMainPage.removeAttribute("hidden");
        if (pNav) pNav.removeAttribute("style");
        document.body.classList.remove("gaming");
        
        window.alert = defaultAlert;
        
        if (window.game.cursor) {
            window.game.stage.removeChild(window.game.cursor);
            window.game.cursor.destroy();
            window.game.cursor = null;
        }
        
        if (window.app) {
            window.app.destroy(true, {children: true, texture: false});
            window.app = null;
        }
        
        if (window.game.scene) {
            window.game.scene = null;
        }
        
        let audios = document.getElementsByTagName("audio");
        for (let i=0; i<audios.length; ++i) {
            if (audios[i].softstop) audios[i].softstop();
            audios[i].remove();
        }
        
        console.log("Game quit successfully");
    };
    
    app.ticker.add(function(delta) {
        if (!window.game.paused && !window.game.failed && window.game.scene) {
            const time = window.game.scene.osu ? window.game.scene.osu.audio.getPosition() * 1000 : 0;
            window.game.scene.update(time);
        }
        
        if (window.game.cursor && window.gfx) {
            window.game.cursor.x = window.game.mouseX / 512 * window.gfx.width + window.gfx.xoffset;
            window.game.cursor.y = window.game.mouseY / 384 * window.gfx.height + window.gfx.yoffset;
            window.game.cursor.bringToFront();
        }
    });
    
    if (typeof addPlayHistory === 'function') {
        const track = osu.tracks[trackid];
        addPlayHistory(track.metadata.BeatmapSetID, track.metadata.Title, track.metadata.Artist, track.metadata.Creator, track.difficulty.star);
    }
}

function launchGame(osublob, beatmapid, version) {
    if (!window.Osu) {
        console.error("Osu class not loaded");
        showToast('Game not ready yet. Please wait...', 'error');
        return;
    }
    
    if (!window.zip || !window.zip.fs) {
        console.error("zip.js not loaded");
        showToast('Game libraries not loaded', 'error');
        return;
    }
    
    console.log("Unzipping beatmap...");
    
    let fs = new zip.fs.FS();
    fs.root.importBlob(osublob,
        function(){
            console.log("Beatmap unzipped, parsing...");
            let osu = new window.Osu(fs.root);
            osu.ondecoded = function() {
                console.log("Beatmap parsed, launching...");
                launchOSU(osu, beatmapid, version);
            };
            osu.onerror = function(err) {
                console.error("Beatmap parse error:", err);
                showToast('Failed to parse beatmap', 'error');
            };
            osu.load();
        },
        function(err) {
            console.error("Unzip failed:", err);
            showToast('Failed to extract beatmap', 'error');
        }
    );
}

window.launchGame = launchGame;
