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

window.scriptReady = false;
window.skinReady = false;
window.soundReady = false;

window.beatmaplistLoadedCallback = function () {
    console.log('Loading game dependencies...');
    
    let loadedCount = 0;
    const totalDeps = 4;
    
    function checkdep() {
        loadedCount++;
        console.log(`Loaded dependency ${loadedCount}/${totalDeps}`);
        
        if (loadedCount === totalDeps) {
            console.log('All dependencies loaded, setting up sound system...');
            
            window.sounds = {
                load: function(files) {
                    console.log('Loading sounds:', files);
                    let loaded = 0;
                    const total = files.length;
                    
                    if (typeof createjs === 'undefined' || !createjs.Sound) {
                        console.error('CreateJS Sound not available');
                        if (this.whenLoaded) this.whenLoaded();
                        return;
                    }
                    
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
                        
                        if (loaded === total) {
                            console.log('All sounds loaded');
                            if (this.whenLoaded) this.whenLoaded();
                        }
                    });
                    
                    files.forEach(file => {
                        createjs.Sound.registerSound(file, file);
                    });
                },
                whenLoaded: null
            };
            
            console.log('Loading RequireJS...');
            loadScript("scripts/lib/require.js", function() {
                require.config({
                    baseUrl: 'scripts',
                    paths: {
                        underscore: 'lib/underscore',
                        sound: 'lib/sound.min'
                    },
                    shim: {
                        "underscore": {
                            exports: "_"
                        }
                    },
                    waitSeconds: 15
                });
                
                console.log('RequireJS configured, loading game modules...');
                loadScript("scripts/initgame.js");
            }, {"data-main":"scripts/initgame"});
            
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
        window.zip.workerScriptsPath = 'scripts/lib/';
        loadScript("scripts/lib/zip-fs.js", checkdep);
    });
    loadScript("scripts/lib/pixi.min.js", checkdep);
    loadScript("scripts/lib/mp3parse.min.js", checkdep);
    loadScript("scripts/lib/sound.min.js", checkdep);
};
