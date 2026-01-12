function loadScript(url, callback) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            if (callback) callback();
            resolve();
        };
        script.onerror = () => {
            console.error(`Failed to load: ${url}`);
            reject();
        };
        document.head.appendChild(script);
    });
}

window.beatmaplistLoadedCallback = async function() {
    console.log('Loading game dependencies...');
    
    delete window.define;
    delete window.require;
    delete window.requirejs;
    
    window.__earlyDefines = [];
    window.define = function() {
        window.__earlyDefines.push(['define', arguments]);
    };
    window.define.amd = {};
    
    window.require = function() {
        window.__earlyDefines.push(['require', arguments]);
    };
    
    try {
        console.log('Loading RequireJS...');
        await loadScript('scripts/lib/require.js');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (typeof require === 'undefined') {
            throw new Error('RequireJS failed to load');
        }
        
        if (window.__earlyDefines.length > 0) {
            window.__earlyDefines.forEach((item) => {
                const [type, args] = item;
                if (type === 'define') {
                    try {
                        if (args.length === 1) define(args[0]);
                        else if (args.length === 2) define(args[0], args[1]);
                        else if (args.length === 3) define(args[0], args[1], args[2]);
                    } catch(e) {}
                }
            });
            delete window.__earlyDefines;
        }
        
        console.log('Loading Pixi.js...');
        await loadScript('scripts/lib/pixi.min.js');
        
        console.log('Loading zip.js...');
        await loadScript('scripts/lib/zip.js');
        if (window.zip) {
            window.zip.workerScriptsPath = 'scripts/lib/';
            await loadScript('scripts/lib/zip-fs.js');
        }
        
        console.log('Loading mp3parse...');
        await loadScript('scripts/lib/mp3parse.min.js');
        
        console.log('Loading CreateJS Sound...');
        await loadScript('scripts/lib/sound.min.js');
        
        if (typeof createjs !== 'undefined' && createjs.Sound) {
            window.sounds = {
                load: function(files) {
                    console.log('Loading sounds...');
                    let loaded = 0;
                    const total = files.length;
                    createjs.Sound.alternateExtensions = ["mp3", "ogg"];
                    createjs.Sound.on("fileload", (event) => {
                        loaded++;
                        const soundId = event.src;
                        this[soundId] = {
                            play: function() {
                                createjs.Sound.play(soundId, {
                                    volume: this.volume || 1
                                });
                            },
                            volume: 1
                        };
                        if (loaded === total && this.whenLoaded) this.whenLoaded();
                    });
                    files.forEach(file => createjs.Sound.registerSound(file, file));
                },
                whenLoaded: null
            };
        } else {
            window.sounds = {
                load: function() {
                    if (this.whenLoaded) this.whenLoaded();
                },
                whenLoaded: null
            };
        }
        
        console.log('Loading skin and fonts...');
        PIXI.Loader.shared
            .add('fonts/venera.fnt')
            .add("sprites.json")
            .load(function(loader, resources) {
                window.skinReady = true;
                document.getElementById("skin-progress").classList.add("finished");
                document.body.classList.add("skin-ready");
                window.Skin = PIXI.Loader.shared.resources["sprites.json"].textures;
            });
        
        const sample = [
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
        
        window.sounds.whenLoaded = function(){
            window.game.sample[1].hitnormal = window.sounds['hitsounds/normal-hitnormal.ogg'];
            window.game.sample[1].hitwhistle = window.sounds['hitsounds/normal-hitwhistle.ogg'];
            window.sample[1].hitfinish = window.sounds['hitsounds/normal-hitfinish.ogg'];
            window.game.sample[1].hitclap = window.sounds['hitsounds/normal-hitclap.ogg'];
            window.game.sample[1].slidertick = window.sounds['hitsounds/normal-slidertick.ogg'];
            window.game.sample[2].hitnormal = window.sounds['hitsounds/soft-hitnormal.ogg'];
            window.game.sample[2].hitwhistle = window.sounds['hitsounds/soft-hitwhistle.ogg'];
            window.game.sample[2].hitfinish = window.sounds['hitsounds/soft-hitfinish.ogg'];
            window.game.sample[2].hitclap = window.sounds['hitsounds/soft-hitclap.ogg'];
            window.game.sample[2].slidertick = window.sounds['hitsounds/soft-slidertick.ogg'];
            window.game.sample[3].hitnormal = window.sounds['hitsounds/drum-hitnormal.ogg'];
            window.game.sample[3].hitwhistle = window.sounds['hitsounds/drum-hitwhistle.ogg'];
            window.game.sample[3].hitfinish = window.sounds['hitsounds/drum-hitfinish.ogg'];
            window.game.sample[3].hitclap = window.sounds['hitsounds/drum-hitclap.ogg'];
            window.game.sample[3].slidertick = window.sounds['hitsounds/drum-slidertick.ogg'];
            window.game.sampleComboBreak = window.sounds['hitsounds/combobreak.ogg'];
            window.game.sampleSectionFail = window.sounds['hitsounds/sectionfail.ogg'];
            window.soundReady = true;
            document.getElementById("sound-progress").classList.add("finished");
            document.body.classList.add("sound-ready");
        };
        
        window.sounds.load(sample);
        
        PIXI.Sprite.prototype.bringToFront = function() {
            if (this.parent) {
                var parent = this.parent;
                parent.removeChild(this);
                parent.addChild(this);
            }
        }
        
        window.scriptReady = true;
        document.getElementById("script-progress").classList.add("finished");
        document.body.classList.add("script-ready");
        
        console.log('Loading game modules...');
        
        require(['osu', 'underscore', 'sound', 'playback'], function(Osu, _, sounds, Playback) {
            console.log('Game modules loaded!');
            
            window.Osu = Osu;
            window.Playback = Playback;
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            
            window.game = {
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
            
            window.currentFrameInterval = 16;
            
            if (window.gamesettings) {
                window.gamesettings.loadToGame();
            }
            
            window.skinReady = false;
            window.soundReady = false;
            window.scriptReady = false;
            window.game.stage = new PIXI.Container();
            window.game.cursor = null;
            
            console.log('Game initialized successfully!');
            
            if (typeof window.setupBeatmapMenu === 'function') {
                window.setupBeatmapMenu();
            }
        }, function(err) {
            console.error('Failed to load game modules:', err);
            alert('Failed to load game. Please refresh the page.');
        });
        
        window.liked_sid_set = new Set();
        window.liked_sid_set_callbacks = [];
        
        try {
            const saved = localStorage.getItem('likedsidset');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    window.liked_sid_set = new Set(parsed);
                }
            }
        } catch(e) {}
        
        if (window.liked_sid_set_callbacks) {
            window.liked_sid_set_callbacks.forEach(cb => cb());
            window.liked_sid_set_callbacks = [];
        }
        
    } catch (error) {
        console.error('Failed to load game:', error);
        alert('Game loading failed. Please refresh the page.');
    }
};
