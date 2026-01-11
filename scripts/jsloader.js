function loadScript(url, callback, aux) {
    let script = document.createElement("script");
    script.onerror = function() {
        console.error("Failed to load script:", url);
    };
    if (callback) script.onload = callback;
    if (aux) {
        for (let key in aux) {
            script.setAttribute(key, aux[key]);
        }
    }
    script.src = url;
    document.head.appendChild(script);
}

window.beatmaplistLoadedCallback = function () {
    console.log('Loading game dependencies...');
    
    let defineBackup = window.define;
    let requireBackup = window.require;
    let requirejsBackup = window.requirejs;
    
    window.define = null;
    window.require = null;
    window.requirejs = null;
    
    console.log('Loading RequireJS first...');
    loadScript("scripts/lib/require.js", function() {
        console.log('RequireJS loaded, configuring...');
        
        if (defineBackup && window.__defineQueue) {
            window.define = defineBackup;
        }
        if (requireBackup && window.__requireQueue) {
            window.require = requireBackup;
        }
        if (requirejsBackup && window.__requirejsQueue) {
            window.requirejs = requirejsBackup;
        }
        
        require.config({
            baseUrl: 'scripts',
            paths: {
                'osu': 'osu',
                'underscore': 'lib/underscore',
                'sound': 'lib/sound',
                'playback': 'playback',
                'playerActions': 'playerActions',
                'SliderMesh': 'SliderMesh',
                'overlay/score': 'overlay/score',
                'overlay/volume': 'overlay/volume',
                'overlay/loading': 'overlay/loading',
                'overlay/break': 'overlay/break',
                'overlay/progress': 'overlay/progress',
                'overlay/hiterrormeter': 'overlay/hiterrormeter',
                'curves/LinearBezier': 'curves/LinearBezier',
                'curves/CircumscribedCircle': 'curves/CircumscribedCircle',
                'osu-audio': 'osu-audio'
            },
            shim: {
                'underscore': {
                    exports: '_'
                },
                'sound': {
                    exports: 'sounds',
                    init: function() {
                        return window.sounds;
                    }
                }
            },
            waitSeconds: 30,
            enforceDefine: false,
            skipDataMain: true
        });
        
        console.log('RequireJS configured, loading other dependencies...');
        
        let loadedCount = 0;
        const totalDeps = 4;
        
        function checkdep() {
            loadedCount++;
            console.log(`Loaded dependency ${loadedCount}/${totalDeps}`);
            
            if (loadedCount === totalDeps) {
                console.log('All dependencies loaded, setting up sound wrapper...');
                
                if (typeof createjs !== 'undefined' && createjs.Sound) {
                    window.sounds = {
                        load: function(files) {
                            console.log('Loading sounds with CreateJS:', files);
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
                                
                                console.log(`Sound loaded: ${soundId} (${loaded}/${total})`);
                                
                                if (loaded === total) {
                                    console.log('All sounds loaded successfully');
                                    if (this.whenLoaded) this.whenLoaded();
                                }
                            });
                            
                            files.forEach(file => {
                                createjs.Sound.registerSound(file, file);
                            });
                        },
                        whenLoaded: null
                    };
                    console.log('Sound wrapper created successfully');
                } else {
                    console.error('CreateJS Sound not available!');
                }
                
                console.log('Processing any queued define calls...');
                
                setTimeout(function() {
                    console.log('Loading initgame...');
                    
                    require(['initgame'], function() {
                        console.log('Game initialization complete');
                    }, function(err) {
                        console.error('RequireJS load error:', err);
                        console.error('Failed modules:', err.requireModules);
                    });
                }, 100);
                
                if (window.localforage) {
                    localforage.getItem("likedsidset", function(err, item) {
                        if (!err) {
                            if (item && item.size) {
                                window.liked_sid_set = item;
                            } else {
                                window.liked_sid_set = new Set();
                            }
                            if (window.liked_sid_set_callbacks) {
                                for (let i=0; i<window.liked_sid_set_callbacks.length; ++i) {
                                    window.liked_sid_set_callbacks[i]();
                                }
                                window.liked_sid_set_callbacks = [];
                            }
                        } else {
                            console.error("Failed loading liked list");
                            window.liked_sid_set = new Set();
                            window.liked_sid_set_callbacks = [];
                        }
                    });
                } else {
                    window.liked_sid_set = new Set();
                    window.liked_sid_set_callbacks = [];
                }
            }
        }
        
        loadScript("scripts/lib/zip.js", function(){
            console.log('zip.js loaded');
            window.zip.workerScriptsPath = 'scripts/lib/';
            loadScript("scripts/lib/zip-fs.js", function() {
                console.log('zip-fs.js loaded');
                checkdep();
            });
        });
        
        loadScript("scripts/lib/pixi.min.js", function() {
            console.log('pixi.js loaded');
            checkdep();
        });
        
        loadScript("scripts/lib/mp3parse.min.js", function() {
            console.log('mp3parse.js loaded');
            checkdep();
        });
        
        loadScript("scripts/lib/sound.min.js", function() {
            console.log('sound.min.js (CreateJS) loaded');
            checkdep();
        });
    });
};
