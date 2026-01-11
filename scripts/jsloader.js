function loadScript(url, callback, aux) {
    let script = document.createElement("script");
    document.head.appendChild(script);
    if (callback) script.onload = callback;
    if (aux) {
        for (let key in aux) {
            script.setAttribute(key, aux[key]);
        }
    }
    script.src = url;
}

window.scriptReady = false;
window.skinReady = false;
window.soundReady = false;

window.beatmaplistLoadedCallback = function () {
    console.log('Loading game dependencies...');
    
    let loadedCount = 0;
    const totalDeps = 5; // Changed from 4 to 5
    
    function checkdep() {
        loadedCount++;
        console.log(`Loaded dependency ${loadedCount}/${totalDeps}`);
        
        if (loadedCount === totalDeps) {
            console.log('All dependencies loaded, loading main game scripts...');
            
            loadScript("scripts/lib/require.js", function() {
                require.config({
                    paths: {
                        underscore: 'scripts/lib/underscore',
                        sound: 'https://code.createjs.com/1.0.0/soundjs.min.js'
                    },
                    shim: {
                        "underscore": {
                            exports: "_"
                        },
                        "sound": {
                            exports: "createjs"
                        }
                    }
                });
                
                console.log('RequireJS configured, loading game modules...');
                
                loadScript("scripts/initgame.js", function() {
                    console.log('Game scripts loaded');
                    window.scriptReady = true;
                    updateLoadingStatus();
                    
                    if (typeof createjs !== 'undefined') {
                        console.log('CreateJS SoundJS loaded:', createjs.Sound);
                        window.soundReady = true;
                        updateLoadingStatus();
                    }
                });
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
                        console.error("failed loading liked list");
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
    loadScript("scripts/lib/localforage.min.js", checkdep);
    
    loadScript("https://code.createjs.com/1.0.0/soundjs.min.js", function() {
        console.log('SoundJS loaded from CDN');
        checkdep();
    });
    
    updateLoadingStatus();
}

function updateLoadingStatus() {
    const scriptProgress = document.getElementById('script-progress');
    const skinProgress = document.getElementById('skin-progress');
    const soundProgress = document.getElementById('sound-progress');
    
    if (window.scriptReady && scriptProgress) {
        const spinner = scriptProgress.querySelector('.lds-dual-ring');
        if (spinner) {
            spinner.classList.add('finished');
        }
        scriptProgress.style.opacity = '0.7';
    }
    
    if (window.skinReady && skinProgress) {
        const spinner = skinProgress.querySelector('.lds-dual-ring');
        if (spinner) {
            spinner.classList.add('finished');
        }
        skinProgress.style.opacity = '0.7';
    }
    
    if (window.soundReady && soundProgress) {
        const spinner = soundProgress.querySelector('.lds-dual-ring');
        if (spinner) {
            spinner.classList.add('finished');
        }
        soundProgress.style.opacity = '0.7';
    }
}

// Auto-start loading if beatmaps don't trigger it
setTimeout(function() {
    if (!window.scriptReady && !window.beatmaplistLoadedTriggered) {
        console.log('Auto-starting script loading...');
        window.beatmaplistLoadedTriggered = true;
        if (window.beatmaplistLoadedCallback) {
            window.beatmaplistLoadedCallback();
        }
    }
}, 2000);

// Check if all loaded every second
setInterval(function() {
    if (window.scriptReady && window.skinReady && window.soundReady) {
        console.log('All systems loaded and ready!');
        const statuslines = document.getElementById('statuslines');
        if (statuslines) {
            statuslines.style.opacity = '0.5';
        }
    }
}, 1000);
