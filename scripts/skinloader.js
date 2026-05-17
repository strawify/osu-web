(function() {
    'use strict';

    var SKIN_SPRITE_MAP = {
        'hitcircle':         'hitcircle.png',
        'hitcircleoverlay':  'hitcircleoverlay.png',
        'approachcircle':    'approachcircle.png',
        'cursor':            'cursor.png',
        'cursortrail':       'cursortrail.png',
        'sliderb':           'sliderb.png',
        'sliderfollowcircle':'sliderfollowcircle.png',
        'sliderscorepoint':  'sliderscorepoint.png',
        'reversearrow':      'reversearrow.png',
        'followpoint':       'followpoint.png',
        'hit0':              'hit0.png',
        'hit50':             'hitburst.png',
        'hit100':            'hitburst.png',
        'hit300':            'hitburst.png',
        'spinnerbase':       'spinnerbase.png',
        'spinnertop':        'spinnertop.png',
        'spinnerprogress':   'spinnerprogress.png',
    };

    for (var i = 0; i <= 9; i++) {
        SKIN_SPRITE_MAP['default-' + i] = i + '.png';
        SKIN_SPRITE_MAP['score-' + i]   = 'score-' + i + '.png';
    }

    var SKIN_SOUND_FILES = [
        'normal-hitnormal','normal-hitwhistle','normal-hitfinish','normal-hitclap','normal-slidertick',
        'soft-hitnormal','soft-hitwhistle','soft-hitfinish','soft-hitclap','soft-slidertick',
        'drum-hitnormal','drum-hitwhistle','drum-hitfinish','drum-hitclap','drum-slidertick',
        'combobreak'
    ];

    window.SkinLoader = {
        activeSkinName: null,
        _originalTextures: null,

        load: function(file, onProgress, onComplete, onError) {
            var self = this;
            onProgress = onProgress || function(){};
            onComplete = onComplete || function(){};
            onError    = onError    || function(e){ console.error('Skin error:', e); };

            if (!window.zip) { 
                onError('zip.js not available'); 
                return; 
            }

            var fs = new zip.fs.FS();

            fs.root.importBlob(file, function() {
                var entries = [];
                self._collectEntries(fs.root, entries);

                var lookup = {};

                entries.forEach(function(entry) {
                    var fname = entry.name.toLowerCase().replace(/\\/g, '/');
                    var base = fname.split('/').pop();
                    lookup[base] = entry;
                });

                onProgress(10);

                if (!self._originalTextures && window.Skin) {
                    self._originalTextures = {};

                    Object.keys(window.Skin).forEach(function(k) {
                        self._originalTextures[k] = window.Skin[k];
                    });
                }

                var textureKeys = Object.keys(SKIN_SPRITE_MAP);
                var loaded = 0;
                var total = textureKeys.length;

                function tryNextTexture(idx) {
                    if (idx >= textureKeys.length) {
                        onProgress(100);
                        self.activeSkinName = file.name || 'Custom Skin';
                        self._saveSkinName(self.activeSkinName);
                        onComplete(self.activeSkinName);
                        return;
                    }

                    var skinKey = textureKeys[idx];
                    var spriteKey = SKIN_SPRITE_MAP[skinKey];

                    var entry = lookup[skinKey + '.png'] || lookup[skinKey + '@2x.png'];

                    if (!entry) {
                        tryNextTexture(idx + 1);
                        return;
                    }

                    entry.getData(new zip.BlobWriter('image/png'), function(blob) {
                        var url = URL.createObjectURL(blob);
                        var img = new Image();

                        img.onload = function() {
                            if (window.Skin && window.PIXI) {
                                var tex = PIXI.Texture.from(img);
                                window.Skin[spriteKey] = tex;
                            }

                            loaded++;
                            onProgress(10 + Math.floor(loaded / total * 80));
                            tryNextTexture(idx + 1);
                        };

                        img.onerror = function() {
                            tryNextTexture(idx + 1);
                        };

                        img.src = url;

                    }, null, function() {
                        tryNextTexture(idx + 1);
                    });
                }

                tryNextTexture(0);

            }, function(e) {
                onError('Failed to read .osk file: ' + e);
            });
        },

        reset: function() {
            if (this._originalTextures && window.Skin) {
                Object.keys(this._originalTextures).forEach(function(k) {
                    window.Skin[k] = this._originalTextures[k];
                }, this);
            }

            this.activeSkinName = null;
            this._saveSkinName(null);
        },

        _collectEntries: function(dir, out) {
            if (!dir.children) return;

            dir.children.forEach(function(entry) {
                if (entry.directory) {
                    this._collectEntries(entry, out);
                } else {
                    out.push(entry);
                }
            }, this);
        },

        _saveSkinName: function(name) {
            try {
                if (name) {
                    localStorage.setItem('osk_skin_name', name);
                } else {
                    localStorage.removeItem('osk_skin_name');
                }
            } catch(e) {}
        },

        getSavedSkinName: function() {
            try {
                return localStorage.getItem('osk_skin_name');
            } catch(e) {
                return null;
            }
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        var saved = SkinLoader.getSavedSkinName();

        if (saved) {
            SkinLoader.activeSkinName = saved;

            var indicator = document.getElementById('skin-active-indicator');
            if (indicator) {
                indicator.style.display = 'flex';
            }

            var nameEl = document.getElementById('skin-active-name');
            if (nameEl) {
                nameEl.textContent = saved;
            }
        }
    });

})();
