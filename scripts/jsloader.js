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
    console.log('Loading game...');
    
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
        await loadScript('scripts/lib/require.js');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const req = window.requirejs || window.require;
        
        if (!req || typeof req !== 'function') {
            throw new Error('RequireJS failed');
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
        
        const deps = [
            { url: 'scripts/lib/pixi.min.js', name: 'Pixi' },
            { url: 'scripts/lib/zip.js', name: 'zip.js' },
            { url: 'scripts/lib/mp3parse.min.js', name: 'mp3parse' },
            { url: 'scripts/lib/sound.min.js', name: 'CreateJS' }
        ];
        
        for (const dep of deps) {
            await loadScript(dep.url);
            if (dep.name === 'zip.js' && window.zip) {
                window.zip.workerScriptsPath = 'scripts/lib/';
                await loadScript('scripts/lib/zip-fs.js');
            }
        }
        
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
        
        const requireFunc = window.requirejs || window.require;
        
        requireFunc(['initgame'], function() {
            console.log('Game ready');
            if (typeof window.setupBeatmapMenu === 'function') {
                window.setupBeatmapMenu();
            }
        }, function(err) {
            console.error('Load error:', err);
            if (err.requireModules) {
                err.requireModules.forEach(function(module) {
                    loadScript('scripts/' + module + '.js', function() {
                        requireFunc(['initgame']);
                    });
                });
            }
        });
        
        if (typeof localforage !== 'undefined') {
            localforage.getItem("likedsidset", function(err, item) {
                window.liked_sid_set = item && item.size ? item : new Set();
                if (window.liked_sid_set_callbacks) {
                    window.liked_sid_set_callbacks.forEach(cb => cb());
                    window.liked_sid_set_callbacks = [];
                }
            });
        } else {
            window.liked_sid_set = new Set();
            try {
                const saved = localStorage.getItem('likedsidset');
                if (saved) window.liked_sid_set = new Set(JSON.parse(saved));
            } catch(e) {}
            if (window.liked_sid_set_callbacks) {
                window.liked_sid_set_callbacks.forEach(cb => cb());
                window.liked_sid_set_callbacks = [];
            }
        }
        
    } catch (error) {
        console.error('Load failed:', error);
        try {
            await loadScript('scripts/lib/pixi.min.js');
            await loadScript('scripts/initgame.js');
        } catch(e) {
            console.error('Fallback failed:', e);
        }
    }
};
