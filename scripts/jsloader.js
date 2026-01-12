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
    if (!window.game) {
        window.game = {
            window: window,
            sample: [{}, {}, {}, {}],
            sampleSet: 1,
            stage: null,
            scene: null,
            finished: false,
            failed: false,
            paused: false
        };
    }

    window.__earlyDefines = window.__earlyDefines || [];
    window.__earlyRequires = window.__earlyRequires || [];
    
    const originalDefine = window.define;
    const originalRequire = window.require;
    
    window.define = function() {
        if (!window.__earlyDefines) window.__earlyDefines = [];
        window.__earlyDefines.push(['define', arguments]);
    };
    
    if (window.define) {
        window.define.amd = {};
    }
    
    window.require = function() {
        if (!window.__earlyRequires) window.__earlyRequires = [];
        window.__earlyRequires.push(['require', arguments]);
    };
    
    try {
        await loadScript('scripts/lib/require.js');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (typeof require === 'undefined' && typeof requirejs === 'undefined') {
            throw new Error('RequireJS failed to load');
        }
        
        const req = window.requirejs || window.require;
        
        await loadScript('scripts/lib/pixi.min.js');
        
        await loadScript('scripts/lib/zip.js');
        if (window.zip) {
            window.zip.workerScriptsPath = 'scripts/lib/';
            await loadScript('scripts/lib/zip-fs.js');
        }
        
        await loadScript('scripts/lib/mp3parse.min.js');
        await loadScript('scripts/lib/sound.min.js');
        
        if (typeof createjs !== 'undefined' && createjs.Sound) {
            window.sounds = {
                load: function(files) {
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
        
        if (PIXI && PIXI.Loader) {
            const loader = PIXI.Loader.shared;
            if (!loader.resources['sprites.json'] && !loader.loading) {
                loader
                .add('fonts/venera.fnt')
                .add("sprites.json")
                .load(function(loader, resources) {
                    window.skinReady = true;
                    const skinProgress = document.getElementById("skin-progress");
                    if (skinProgress) skinProgress.classList.add("finished");
                    document.body.classList.add("skin-ready");
                    window.Skin = PIXI.Loader.shared.resources["sprites.json"] ? 
                        PIXI.Loader.shared.resources["sprites.json"].textures : {};
                });
            } else if (loader.resources['sprites.json']) {
                window.skinReady = true;
                const skinProgress = document.getElementById("skin-progress");
                if (skinProgress) skinProgress.classList.add("finished");
                document.body.classList.add("skin-ready");
                window.Skin = PIXI.Loader.shared.resources["sprites.json"].textures;
            }
        }
        
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
        
        if (window.sounds) {
            window.sounds.whenLoaded = function(){
                if (!window.game) window.game = {};
                if (!window.game.sample) window.game.sample = [{}, {}, {}, {}];
                
                const assignSound = (index, prop, path) => {
                    if (window.sounds[path]) window.game.sample[index][prop] = window.sounds[path];
                };

                assignSound(1, 'hitnormal', 'hitsounds/normal-hitnormal.ogg');
                assignSound(1, 'hitwhistle', 'hitsounds/normal-hitwhistle.ogg');
                assignSound(1, 'hitfinish', 'hitsounds/normal-hitfinish.ogg');
                assignSound(1, 'hitclap', 'hitsounds/normal-hitclap.ogg');
                assignSound(1, 'slidertick', 'hitsounds/normal-slidertick.ogg');
                
                assignSound(2, 'hitnormal', 'hitsounds/soft-hitnormal.ogg');
                assignSound(2, 'hitwhistle', 'hitsounds/soft-hitwhistle.ogg');
                assignSound(2, 'hitfinish', 'hitsounds/soft-hitfinish.ogg');
                assignSound(2, 'hitclap', 'hitsounds/soft-hitclap.ogg');
                assignSound(2, 'slidertick', 'hitsounds/soft-slidertick.ogg');
                
                assignSound(3, 'hitnormal', 'hitsounds/drum-hitnormal.ogg');
                assignSound(3, 'hitwhistle', 'hitsounds/drum-hitwhistle.ogg');
                assignSound(3, 'hitfinish', 'hitsounds/drum-hitfinish.ogg');
                assignSound(3, 'hitclap', 'hitsounds/drum-hitclap.ogg');
                assignSound(3, 'slidertick', 'hitsounds/drum-slidertick.ogg');
                
                if (window.sounds['hitsounds/combobreak.ogg']) window.game.sampleComboBreak = window.sounds['hitsounds/combobreak.ogg'];
                if (window.sounds['hitsounds/sectionfail.ogg']) window.game.sampleSectionFail = window.sounds['hitsounds/sectionfail.ogg'];
                
                window.soundReady = true;
                const soundProgress = document.getElementById("sound-progress");
                if (soundProgress) soundProgress.classList.add("finished");
                document.body.classList.add("sound-ready");
            };
            
            window.sounds.load(sample);
        }
        
        if (PIXI && PIXI.Sprite) {
            PIXI.Sprite.prototype.bringToFront = function() {
                if (this.parent) {
                    const parent = this.parent;
                    parent.removeChild(this);
                    parent.addChild(this);
                }
            };
        }
        
        window.scriptReady = true;
        const scriptProgress = document.getElementById("script-progress");
        if (scriptProgress) scriptProgress.classList.add("finished");
        document.body.classList.add("script-ready");
        
        if (window.__earlyDefines && window.__earlyDefines.length > 0) {
            for (const item of window.__earlyDefines) {
                try {
                    const [type, args] = item;
                    if (type === 'define' && window.define) {
                        if (args.length === 1) window.define(args[0]);
                        else if (args.length === 2) window.define(args[0], args[1]);
                        else if (args.length === 3) window.define(args[0], args[1], args[2]);
                    }
                } catch(e) {
                    console.warn(e);
                }
            }
        }
        
        delete window.__earlyDefines;
        delete window.__earlyRequires;
        
        if (originalDefine) window.define = originalDefine;
        if (originalRequire) window.require = originalRequire;
        
        req(['osu', 'underscore', 'sound', 'playback'], function(Osu, _, sounds, Playback) {
            window.Osu = Osu;
            window.Playback = Playback;
            window._ = _;
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            
            const defaults = {
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
                down: false
            };

            for (let key in defaults) {
                if (window.game[key] === undefined) {
                    window.game[key] = defaults[key];
                }
            }
            
            window.currentFrameInterval = 16;
            
            if (window.gamesettings) {
                window.gamesettings.loadToGame();
            }
            
            if (!window.game.stage) window.game.stage = new PIXI.Container();
            window.game.cursor = null;
            
            if (typeof window.setupBeatmapMenu === 'function') {
                window.setupBeatmapMenu();
            }
        }, function(err) {
            console.error(err);
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
            window.liked_sid_set_callbacks.forEach(cb => {
                try {
                    cb();
                } catch(e) {}
            });
            window.liked_sid_set_callbacks = [];
        }
        
    } catch (error) {
        console.error(error);
        const scriptProgress = document.getElementById("script-progress");
        if (scriptProgress) scriptProgress.classList.add("finished");
        document.body.classList.add("script-ready");
    }
};
