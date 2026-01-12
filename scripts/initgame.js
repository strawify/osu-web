require(["osu", "underscore", "sound", "playback"], function(Osu, _, sound, Playback) {
    if (!PIXI || !PIXI.utils.isWebGLSupported())
        alert("This website uses WebGL for rendering. Your browser does not support WebGL, please switch browsers.");

    window.Osu = Osu;
    window.Playback = Playback;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;

    // Initialize window.game if it doesn't exist, or use the existing one
    window.game = window.game || {};
    var game = window.game;

    // Default settings - apply only if missing
    var defaults = {
        window: window,
        stage: null,
        scene: null,
        updatePlayerActions: null,
        backgroundDimRate: 0.7,
        backgroundBlurRate: 0.0,
        cursorSize: 1.0,
        showhwmouse: false,
        snakein: true,
        snakeout: true,
        masterVolume: 0.7,
        effectVolume: 1.0,
        musicVolume: 1.0,
        beatmapHitsound: true,
        globalOffset: 0,
        allowMouseButton: true,
        allowMouseScroll: true,
        K1keycode: 90,
        K2keycode: 88,
        ESCkeycode: 27,
        ESC2keycode: 27,
        CTRLkeycode: 17,
        autoplay: false,
        relax: false,
        autopilot: false,
        nightcore: false,
        daycore: false,
        doubletime: false,
        halftime: false,
        hardrock: false,
        easy: false,
        hidden: false,
        suddendeath: false,
        nofail: false,
        mirror: false,
        customSpeed: 1.0,
        useCustomSpeed: false,
        hideNumbers: false,
        hideGreat: false,
        hideFollowPoints: false,
        enableHPDrain: true,
        showFailAnimation: true,
        mobileMode: 'auto',
        mobileSensitivity: 1.0,
        mouseX: 0,
        mouseY: 0,
        mouse: null,
        K1down: false,
        K2down: false,
        M1down: false,
        M2down: false,
        down: false,
        finished: false,
        failed: false,
        sample: [{}, {}, {}, {}],
        sampleSet: 1
    };

    for (var key in defaults) {
        if (game[key] === undefined) {
            game[key] = defaults[key];
        }
    }

    window.currentFrameInterval = 16;

    if (window.gamesettings) {
        window.gamesettings.loadToGame();
    }

    if (!window.skinReady) window.skinReady = false;
    if (!window.soundReady) window.soundReady = false;
    if (!window.scriptReady) window.scriptReady = false;
    
    if (!game.stage) game.stage = new PIXI.Container();
    game.cursor = null;

    // Safe PIXI Loader
    // Only load if resources are missing AND loader is not busy
    var loader = PIXI.Loader.shared;
    if (!loader.resources['sprites.json'] && !loader.loading) {
        loader
            .add('fonts/venera.fnt')
            .add("sprites.json")
            .load(function(loader, resources) {
                window.skinReady = true;
                var skinProgress = document.getElementById("skin-progress");
                if (skinProgress) skinProgress.classList.add("finished");
                document.body.classList.add("skin-ready");
                if (resources["sprites.json"]) {
                    window.Skin = resources["sprites.json"].textures;
                }
            });
    } else {
        // If already loaded or loading, just mark ready
        if (loader.resources['sprites.json']) {
            window.Skin = loader.resources['sprites.json'].textures;
            window.skinReady = true;
            var skinProgress = document.getElementById("skin-progress");
            if (skinProgress) skinProgress.classList.add("finished");
            document.body.classList.add("skin-ready");
        }
    }

    // Safe Sound Loading
    if (!window.soundReady) {
        var sample = [
            'hitsounds/normal-hitnormal.ogg',
            'hitsounds/normal-hitwhistle.ogg',
            'hitsounds/normal-hitfinish.ogg',
            'hitsounds/normal-hitclap.ogg',
            'hitsounds/normal-slidertick.ogg',
            'hitsounds/soft-hitnormal.ogg',
            'hitsounds/soft-hitwhistle.ogg',
            'hitsounds/soft-hitfinish.ogg',
            'hitsounds/soft-hitclap.ogg',
            'hitsounds/soft-slidertick.ogg',
            'hitsounds/drum-hitnormal.ogg',
            'hitsounds/drum-hitwhistle.ogg',
            'hitsounds/drum-hitfinish.ogg',
            'hitsounds/drum-hitclap.ogg',
            'hitsounds/drum-slidertick.ogg',
            'hitsounds/combobreak.ogg',
            'hitsounds/sectionfail.ogg',
        ];

        sounds.whenLoaded = function() {
            // Ensure sample array exists
            if (!game.sample) game.sample = [{}, {}, {}, {}];

            var assign = function(idx, prop, path) {
                if (sounds[path]) game.sample[idx][prop] = sounds[path];
            };

            assign(1, 'hitnormal', 'hitsounds/normal-hitnormal.ogg');
            assign(1, 'hitwhistle', 'hitsounds/normal-hitwhistle.ogg');
            assign(1, 'hitfinish', 'hitsounds/normal-hitfinish.ogg');
            assign(1, 'hitclap', 'hitsounds/normal-hitclap.ogg');
            assign(1, 'slidertick', 'hitsounds/normal-slidertick.ogg');
            
            assign(2, 'hitnormal', 'hitsounds/soft-hitnormal.ogg');
            assign(2, 'hitwhistle', 'hitsounds/soft-hitwhistle.ogg');
            assign(2, 'hitfinish', 'hitsounds/soft-hitfinish.ogg');
            assign(2, 'hitclap', 'hitsounds/soft-hitclap.ogg');
            assign(2, 'slidertick', 'hitsounds/soft-slidertick.ogg');
            
            assign(3, 'hitnormal', 'hitsounds/drum-hitnormal.ogg');
            assign(3, 'hitwhistle', 'hitsounds/drum-hitwhistle.ogg');
            assign(3, 'hitfinish', 'hitsounds/drum-hitfinish.ogg');
            assign(3, 'hitclap', 'hitsounds/drum-hitclap.ogg');
            assign(3, 'slidertick', 'hitsounds/drum-slidertick.ogg');
            
            if (sounds['hitsounds/combobreak.ogg']) game.sampleComboBreak = sounds['hitsounds/combobreak.ogg'];
            if (sounds['hitsounds/sectionfail.ogg']) game.sampleSectionFail = sounds['hitsounds/sectionfail.ogg'];
            
            window.soundReady = true;
            var soundProgress = document.getElementById("sound-progress");
            if (soundProgress) soundProgress.classList.add("finished");
            document.body.classList.add("sound-ready");
        };

        sounds.load(sample);
    }

    if (PIXI && PIXI.Sprite) {
        PIXI.Sprite.prototype.bringToFront = function() {
            if (this.parent) {
                var parent = this.parent;
                parent.removeChild(this);
                parent.addChild(this);
            }
        };
    }

    window.scriptReady = true;
    var scriptProgress = document.getElementById("script-progress");
    if (scriptProgress) scriptProgress.classList.add("finished");
    document.body.classList.add("script-ready");

    if (window.localforage) {
        localforage.getItem("playhistory1000", function(err, item) {
            if (!err && item && item.length) {
                window.playHistory1000 = item;
            }
        });
    }

    // Drag and drop preventions
    window.addEventListener("drag", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("dragend", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("dragenter", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("dragexit", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("dragleave", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("dragover", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("dragstart", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
    window.addEventListener("drop", function(e) { e = e || window.event; e.preventDefault(); e.stopPropagation(); });
});
