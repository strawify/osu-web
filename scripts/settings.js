// Enhanced settings.js with new mods and features

class GameSettings {
    constructor() {
        this.defaults = {
            // Display
            backgroundDimRate: 0.7,
            backgroundBlurRate: 0.0,
            cursorSize: 1.0,
            showhwmouse: false,
            snakein: true,
            snakeout: true,
            autofullscreen: false,
            overridedpi: false,
            dpiscale: 1.0,

            // Audio
            masterVolume: 0.7,
            effectVolume: 1.0,
            musicVolume: 1.0,
            beatmapHitsound: true,
            globalOffset: 0,

            // Input
            allowMouseButton: true,
            allowMouseScroll: true,
            K1keycode: 90,
            K2keycode: 88,
            ESCkeycode: 27,
            ESC2keycode: 27,
            CTRLkeycode: 17,

            // Mods - Difficulty
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

            // Custom speed (1.0 = normal, 1.5 = 1.5x speed, etc)
            customSpeed: 1.0,
            useCustomSpeed: false,

            // Skin mods
            hideNumbers: false,
            hideGreat: false,
            hideFollowPoints: false,

            // Gameplay
            enableHPDrain: true,
            showFailAnimation: true,

            // Mobile
            mobileMode: 'auto', // 'auto', 'drag', 'tap'
            mobileSensitivity: 1.0
        };

        this.settings = { ...this.defaults };
        this.loadFromStorage();
    }

    loadFromStorage() {
        if (typeof localforage === 'undefined') return;
        
        const stored = localStorage.getItem('osu_game_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.settings = { ...this.defaults, ...parsed };
            } catch (e) {
                console.error('Failed to parse settings:', e);
            }
        }
    }

    saveToStorage() {
        localStorage.setItem('osu_game_settings', JSON.stringify(this.settings));
    }

    get(key) {
        return this.settings[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.saveToStorage();
    }

    loadToGame() {
        if (!window.game) return;
        
        // Copy all settings to game object
        Object.keys(this.settings).forEach(key => {
            window.game[key] = this.settings[key];
        });
    }

    reset() {
        this.settings = { ...this.defaults };
        this.saveToStorage();
        if (typeof showToast !== 'undefined') {
            showToast('Settings reset to defaults', 'success');
        }
    }

    // Calculate actual playback rate based on mods
    getPlaybackRate() {
        let rate = 1.0;
        
        if (this.settings.useCustomSpeed) {
            rate = this.settings.customSpeed;
        } else {
            if (this.settings.nightcore || this.settings.doubletime) rate *= 1.5;
            if (this.settings.daycore || this.settings.halftime) rate *= 0.75;
        }
        
        return rate;
    }

    // Calculate score multiplier based on active mods
    getScoreMultiplier() {
        let multiplier = 1.0;
        
        if (this.settings.easy) multiplier *= 0.50;
        if (this.settings.nofail) multiplier *= 0.50;
        if (this.settings.halftime || this.settings.daycore) multiplier *= 0.30;
        if (this.settings.hardrock) multiplier *= 1.06;
        if (this.settings.doubletime || this.settings.nightcore) multiplier *= 1.12;
        if (this.settings.hidden) multiplier *= 1.06;
        if (this.settings.suddendeath) multiplier *= 1.0;
        if (this.settings.relax) multiplier *= 0.0; // No score in relax
        if (this.settings.autopilot) multiplier *= 0.0; // No score in autopilot
        
        return multiplier;
    }

    // Check if any no-score mods are active
    hasNoScoreMods() {
        return this.settings.relax || this.settings.autopilot || this.settings.autoplay;
    }
}

// Initialize global settings
window.gamesettings = new GameSettings();

// Settings UI initialization
document.addEventListener('DOMContentLoaded', () => {
    initSettingsUI();
});

function initSettingsUI() {
    const settings = window.gamesettings;
    if (!settings) return;

    // Helper to bind range input
    const bindRange = (id, settingKey, display = true) => {
        const input = document.getElementById(id);
        const indicator = document.getElementById(id + '-indicator');
        
        if (!input) return;
        
        input.value = settings.get(settingKey) * (settingKey.includes('volume') || settingKey.includes('Dim') ? 100 : 1);
        
        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            const actualValue = (settingKey.includes('volume') || settingKey.includes('Dim')) ? value / 100 : value;
            settings.set(settingKey, actualValue);
            
            if (display && indicator) {
                indicator.innerText = Math.round(value) + (settingKey.includes('volume') || settingKey.includes('Dim') ? '%' : '');
                indicator.removeAttribute('hidden');
            }
        });
    };

    // Helper to bind checkbox
    const bindCheckbox = (id, settingKey) => {
        const input = document.getElementById(id);
        if (!input) return;
        
        input.checked = settings.get(settingKey);
        input.addEventListener('change', (e) => {
            settings.set(settingKey, e.target.checked);
        });
    };

    // Helper to bind button for key selection
    const bindKeyButton = (id, settingKey) => {
        const button = document.getElementById(id);
        if (!button) return;
        
        const keyCode = settings.get(settingKey);
        button.value = getKeyName(keyCode);
        
        button.addEventListener('click', () => {
            button.value = 'Press a key...';
            button.classList.add('active');
            
            const keyHandler = (e) => {
                e.preventDefault();
                settings.set(settingKey, e.keyCode);
                button.value = getKeyName(e.keyCode);
                button.classList.remove('active');
                document.removeEventListener('keydown', keyHandler);
            };
            
            document.addEventListener('keydown', keyHandler);
        });
    };

    // Bind all settings
    bindRange('dim-range', 'backgroundDimRate');
    bindRange('blur-range', 'backgroundBlurRate', false);
    bindRange('cursorsize-range', 'cursorSize');
    bindRange('dpi-range', 'dpiscale');
    bindRange('mastervolume-range', 'masterVolume');
    bindRange('effectvolume-range', 'effectVolume');
    bindRange('musicvolume-range', 'musicVolume');
    bindRange('audiooffset-range', 'globalOffset', false);
    bindRange('customspeed-range', 'customSpeed');
    bindRange('mobile-sensitivity-range', 'mobileSensitivity');

    bindCheckbox('showhwmouse-check', 'showhwmouse');
    bindCheckbox('snakein-check', 'snakein');
    bindCheckbox('snakeout-check', 'snakeout');
    bindCheckbox('autofullscreen-check', 'autofullscreen');
    bindCheckbox('sysdpi-check', 'overridedpi');
    bindCheckbox('disable-wheel-check', 'allowMouseScroll');
    bindCheckbox('disable-button-check', 'allowMouseButton');
    bindCheckbox('beatmap-hitsound-check', 'beatmapHitsound');

    // Mods
    bindCheckbox('autoplay-check', 'autoplay');
    bindCheckbox('relax-check', 'relax');
    bindCheckbox('autopilot-check', 'autopilot');
    bindCheckbox('nightcore-check', 'nightcore');
    bindCheckbox('daycore-check', 'daycore');
    bindCheckbox('doubletime-check', 'doubletime');
    bindCheckbox('halftime-check', 'halftime');
    bindCheckbox('hardrock-check', 'hardrock');
    bindCheckbox('easy-check', 'easy');
    bindCheckbox('hidden-check', 'hidden');
    bindCheckbox('suddendeath-check', 'suddendeath');
    bindCheckbox('nofail-check', 'nofail');
    bindCheckbox('mirror-check', 'mirror');
    bindCheckbox('customspeed-check', 'useCustomSpeed');

    // Skin
    bindCheckbox('hidenumbers-check', 'hideNumbers');
    bindCheckbox('hidegreat-check', 'hideGreat');
    bindCheckbox('hidefollowpoints-check', 'hideFollowPoints');

    // Gameplay
    bindCheckbox('hpdrain-check', 'enableHPDrain');
    bindCheckbox('failanim-check', 'showFailAnimation');

    // Key bindings
    bindKeyButton('lbutton1select', 'K1keycode');
    bindKeyButton('rbutton1select', 'K2keycode');
    bindKeyButton('pausebuttonselect', 'ESCkeycode');
    bindKeyButton('pausebutton2select', 'ESC2keycode');
    bindKeyButton('skipbuttonselect', 'CTRLkeycode');

    // Reset button
    const resetBtn = document.getElementById('restoredefault-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                settings.reset();
                location.reload();
            }
        });
    }

    // Mobile mode selector
    const mobileSelect = document.getElementById('mobile-mode-select');
    if (mobileSelect) {
        mobileSelect.value = settings.get('mobileMode');
        mobileSelect.addEventListener('change', (e) => {
            settings.set('mobileMode', e.target.value);
        });
    }
}

function getKeyName(keyCode) {
    const keyMap = {
        8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl',
        18: 'Alt', 27: 'Esc', 32: 'Space', 37: 'Left', 38: 'Up',
        39: 'Right', 40: 'Down', 90: 'Z', 88: 'X', 67: 'C'
    };
    
    return keyMap[keyCode] || String.fromCharCode(keyCode);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameSettings;
}
