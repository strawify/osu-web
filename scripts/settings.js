class GameSettings {
    constructor() {
        this.defaults = {
            backgroundDimRate: 0.7,
            backgroundBlurRate: 0.0,
            cursorSize: 1.0,
            showhwmouse: false,
            snakein: true,
            snakeout: true,
            autofullscreen: false,
            overridedpi: false,
            dpiscale: 1.0,
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

    // ADD THIS METHOD - fixes the "loadToGame is not a function" error
    loadToGame() {
        if (!window.game) return;
        
        Object.keys(this.settings).forEach(key => {
            if (key in this.defaults) {
                window.game[key] = this.settings[key];
            }
        });
    }

    // ADD THIS METHOD TOO - for refresh
    refresh() {
        this.loadFromStorage();
    }

    reset() {
        this.settings = { ...this.defaults };
        this.saveToStorage();
        if (typeof showToast !== 'undefined') {
            showToast('Settings reset to defaults', 'success');
        }
    }
}

window.gamesettings = new GameSettings();

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.settings-container')) {
        initSettingsUI();
    }
});

function initSettingsUI() {
    const settings = window.gamesettings;
    
    const bindRange = (inputId, settingKey, format = value => value) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const value = settings.get(settingKey);
        const displayValue = settingKey.includes('volume') || settingKey.includes('Dim') ? value * 100 : value;
        input.value = displayValue;
        
        const valueDisplay = document.getElementById(inputId + '-value');
        if (valueDisplay) {
            valueDisplay.textContent = format(displayValue);
        }
        
        input.addEventListener('input', (e) => {
            const rawValue = parseFloat(e.target.value);
            const actualValue = settingKey.includes('volume') || settingKey.includes('Dim') ? rawValue / 100 : rawValue;
            settings.set(settingKey, actualValue);
            
            if (valueDisplay) {
                valueDisplay.textContent = format(rawValue);
            }
        });
    };

    const bindCheckbox = (inputId, settingKey) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        input.checked = settings.get(settingKey);
        input.addEventListener('change', (e) => {
            settings.set(settingKey, e.target.checked);
        });
    };

    const bindKeyButton = (buttonId, settingKey) => {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const keyCode = settings.get(settingKey);
        button.textContent = getKeyName(keyCode);
        
        button.addEventListener('click', () => {
            button.textContent = 'Press a key...';
            button.classList.add('active');
            
            const keyHandler = (e) => {
                e.preventDefault();
                settings.set(settingKey, e.keyCode);
                button.textContent = getKeyName(e.keyCode);
                button.classList.remove('active');
                document.removeEventListener('keydown', keyHandler);
            };
            
            document.addEventListener('keydown', keyHandler);
        });
    };

    bindRange('dim-range', 'backgroundDimRate', value => Math.round(value) + '%');
    bindRange('blur-range', 'backgroundBlurRate', value => value.toFixed(1));
    bindRange('cursorsize-range', 'cursorSize', value => value.toFixed(2) + 'x');
    bindRange('mastervolume-range', 'masterVolume', value => Math.round(value) + '%');
    bindRange('effectvolume-range', 'effectVolume', value => Math.round(value) + '%');
    bindRange('musicvolume-range', 'musicVolume', value => Math.round(value) + '%');
    bindRange('audiooffset-range', 'globalOffset', value => value + 'ms');
    bindRange('customspeed-range', 'customSpeed', value => value.toFixed(2) + 'x');
    bindRange('mobile-sensitivity-range', 'mobileSensitivity', value => value.toFixed(1) + 'x');

    bindCheckbox('showhwmouse-check', 'showhwmouse');
    bindCheckbox('snakein-check', 'snakein');
    bindCheckbox('snakeout-check', 'snakeout');
    bindCheckbox('autofullscreen-check', 'autofullscreen');
    bindCheckbox('disable-wheel-check', 'allowMouseScroll');
    bindCheckbox('disable-button-check', 'allowMouseButton');
    bindCheckbox('beatmap-hitsound-check', 'beatmapHitsound');

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
    bindCheckbox('hidenumbers-check', 'hideNumbers');
    bindCheckbox('hidegreat-check', 'hideGreat');
    bindCheckbox('hidefollowpoints-check', 'hideFollowPoints');
    bindCheckbox('hpdrain-check', 'enableHPDrain');
    bindCheckbox('failanim-check', 'showFailAnimation');

    bindKeyButton('lbutton1select', 'K1keycode');
    bindKeyButton('rbutton1select', 'K2keycode');
    bindKeyButton('pausebuttonselect', 'ESCkeycode');
    bindKeyButton('skipbuttonselect', 'CTRLkeycode');

    const resetBtn = document.getElementById('restoredefault-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to defaults?')) {
                settings.reset();
                setTimeout(() => location.reload(), 1000);
            }
        });
    }

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
