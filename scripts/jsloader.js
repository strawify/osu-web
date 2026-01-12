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
            console.error(`Failed to load script: ${url}`);
            reject(new Error(`Failed to load ${url}`));
        };
        
        document.head.appendChild(script);
    });
}

window.beatmaplistLoadedCallback = async function() {
    console.log('Starting game load...');
    
    // Save original define/require if they exist
    const originalDefine = window.define;
    const originalRequire = window.require;
    const originalRequirejs = window.requirejs;
    
    // Temporarily clear to prevent conflicts
    window.define = undefined;
    window.require = undefined;
    window.requirejs = undefined;
    
    // Create a queue for early define calls
    window.__earlyDefines = [];
    window.__tempDefine = function() {
        window.__earlyDefines.push(arguments);
        console.log('Queued early define() call');
    };
    window.__tempDefine.amd = {};
    window.define = window.__tempDefine;
    
    window.__tempRequire = function() {
        console.log('Early require() call queued', arguments);
        window.__earlyDefines.push(['early-require', arguments]);
    };
    window.require = window.__tempRequire;
    
    try {
        // Step 1: Load RequireJS
        console.log('Loading RequireJS...');
        await loadScript('scripts/lib/require.js');
        
        // Wait a moment for RequireJS to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Step 2: Check if RequireJS loaded properly
        if (typeof requirejs === 'undefined' && typeof require === 'undefined') {
            console.error('RequireJS failed to load');
            throw new Error('RequireJS failed to load');
        }
        
        // Use requirejs if available, otherwise use require
        const req = window.requirejs || window.require;
        
        if (typeof req.config !== 'function') {
            console.error('require.config is not a function', req);
            throw new Error('RequireJS not properly initialized');
        }
        
        console.log('Configuring RequireJS...');
        
        // Configure RequireJS
        req.config({
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
                },
                'playback': {
                    deps: ['osu', 'underscore'],
                    exports: 'Playback'
                }
            },
            waitSeconds: 30,
            enforceDefine: false,
            skipDataMain: true
        });
        
        // Set global require/define to the RequireJS versions
        if (window.requirejs) {
            window.require = window.requirejs;
            window.define = window.requirejs.define;
        }
        
        // Step 3: Process any early define() calls
        if (window.__earlyDefines && window.__earlyDefines.length > 0) {
            console.log(`Processing ${window.__earlyDefines.length} early define() calls...`);
            window.__earlyDefines.forEach((args, i) => {
                try {
                    // Skip the special 'early-require' marker
                    if (args[0] === 'early-require') {
                        console.log('Skipping early require call');
                        return;
                    }
                    
                    if (args.length === 1) {
                        define(args[0]);
                    } else if (args.length === 2) {
                        define(args[0], args[1]);
                    } else if (args.length === 3) {
                        define(args[0], args[1], args[2]);
                    }
                } catch(e) {
                    console.warn(`Failed to process early define #${i}:`, e);
                }
            });
            delete window.__earlyDefines;
            delete window.__tempDefine;
            delete window.__tempRequire;
        }
        
        // Step 4: Load other dependencies
        console.log('Loading dependencies...');
        
        const dependencies = [
            { url: 'scripts/lib/pixi.min.js', name: 'Pixi.js' },
            { url: 'scripts/lib/zip.js', name: 'zip.js' },
            { url: 'scripts/lib/mp3parse.min.js', name: 'mp3parse.js' },
            { url: 'scripts/lib/sound.min.js', name: 'CreateJS Sound' }
        ];
        
        for (const dep of dependencies) {
            console.log(`Loading ${dep.name}...`);
            await loadScript(dep.url);
            
            // Special handling for zip.js
            if (dep.name === 'zip.js' && window.zip) {
                window.zip.workerScriptsPath = 'scripts/lib/';
                await loadScript('scripts/lib/zip-fs.js');
            }
        }
        
        // Step 5: Setup sound system
        console.log('Setting up sound system...');
        if (typeof createjs !== 'undefined' && createjs.Sound) {
            window.sounds = {
                load: function(files) {
                    console.log('Loading sounds:', files);
                    let loaded = 0;
                    const total = files.length;
                    
                    createjs.Sound.alternateExtensions = ['mp3', 'ogg'];
                    
                    createjs.Sound.on('fileload', (event) => {
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
                        
                        if (loaded === total && this.whenLoaded) {
                            this.whenLoaded();
                        }
                    });
                    
                    files.forEach(file => {
                        createjs.Sound.registerSound(file, file);
                    });
                },
                whenLoaded: null
            };
            console.log('Sound system ready');
        } else {
            console.error('CreateJS Sound not available');
            window.sounds = {
                load: function() {
                    console.log('Sound loading disabled');
                    if (this.whenLoaded) this.whenLoaded();
                },
                whenLoaded: null
            };
        }
        
        // Step 6: Load initgame
        console.log('Loading initgame...');
        
        // Use the correct require function
        const requireFunc = window.requirejs || window.require;
        
        requireFunc(['initgame'], function() {
            console.log('Game initialization complete!');
            
            // Setup beatmap menu if function exists
            if (typeof window.setupBeatmapMenu === 'function') {
                window.setupBeatmapMenu();
            }
        }, function(err) {
            console.error('Failed to load initgame:', err);
            if (err.requireModules) {
                console.error('Failed modules:', err.requireModules);
                
                // Try to load failed modules individually
                err.requireModules.forEach(function(module) {
                    console.log('Attempting to load', module, 'directly...');
                    loadScript('scripts/' + module + '.js', function() {
                        console.log('Loaded', module, 'directly, retrying initgame...');
                        requireFunc(['initgame']);
                    });
                });
            }
        });
        
        // Step 7: Load liked set
        if (typeof localforage !== 'undefined') {
            localforage.getItem('likedsidset', function(err, item) {
                if (!err) {
                    window.liked_sid_set = item && item.size ? item : new Set();
                } else {
                    console.error('Failed to load liked set:', err);
                    window.liked_sid_set = new Set();
                }
                
                if (window.liked_sid_set_callbacks) {
                    window.liked_sid_set_callbacks.forEach(cb => cb());
                    window.liked_sid_set_callbacks = [];
                }
            });
        } else {
            // Fallback to localStorage
            console.warn('localforage not available, using localStorage fallback');
            window.liked_sid_set = new Set();
            try {
                const saved = localStorage.getItem('likedsidset');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) {
                        window.liked_sid_set = new Set(parsed);
                    }
                }
            } catch (e) {
                console.error('Failed to load liked set from localStorage:', e);
            }
            
            if (window.liked_sid_set_callbacks) {
                window.liked_sid_set_callbacks.forEach(cb => cb());
                window.liked_sid_set_callbacks = [];
            }
        }
        
    } catch (error) {
        console.error('Failed to load game:', error);
        
        // Try fallback loading
        console.log('Attempting fallback loading...');
        try {
            // Directly load essential scripts
            await loadScript('scripts/lib/pixi.min.js');
            await loadScript('scripts/initgame.js');
            console.log('Fallback loading successful');
        } catch (fallbackError) {
            console.error('Fallback loading failed:', fallbackError);
            alert('Failed to load game. Please refresh the page or check console for errors.');
        }
    }
};
