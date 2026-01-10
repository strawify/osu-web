(() => {
    const createSettingsModal = () => {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.id = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h2>Settings</h2>
                    <button class="close-settings" id="close-settings">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="settings-tabs">
                    <button class="settings-tab active" data-tab="display">
                        <i class="fas fa-display"></i> Display
                    </button>
                    <button class="settings-tab" data-tab="input">
                        <i class="fas fa-gamepad"></i> Input
                    </button>
                    <button class="settings-tab" data-tab="audio">
                        <i class="fas fa-volume-up"></i> Audio
                    </button>
                    <button class="settings-tab" data-tab="mods">
                        <i class="fas fa-puzzle-piece"></i> Mods
                    </button>
                    <button class="settings-tab" data-tab="skins">
                        <i class="fas fa-palette"></i> Skins
                    </button>
                </div>
                <div class="settings-body">
                    <div class="tab-content active" id="tab-display">
                        <div class="settings-section">
                            <h3>Display Settings</h3>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Background Dim</div>
                                    <div class="setting-description">Darken background during gameplay</div>
                                </div>
                                <input id="dim-range" type="range" min="0" max="100" value="0">
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Background Blur</div>
                                    <div class="setting-description">Blur background during gameplay</div>
                                </div>
                                <input id="blur-range" type="range" min="0" max="8" value="0">
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Cursor Size</div>
                                    <div class="setting-description">Adjust cursor size</div>
                                </div>
                                <input id="cursorsize-range" type="range" min="0.5" max="2.0" step="0.01" value="1.0">
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Hardware Cursor</div>
                                    <div class="setting-description">Reduce cursor latency (may cause issues)</div>
                                </div>
                                <label>
                                    <input id="showhwmouse-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Slider Snake In</div>
                                    <div class="setting-description">Animate slider appearance</div>
                                </div>
                                <label>
                                    <input id="snakein-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Slider Snake Out</div>
                                    <div class="setting-description">Animate slider disappearance</div>
                                </div>
                                <label>
                                    <input id="snakeout-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Auto Fullscreen</div>
                                    <div class="setting-description">Enter fullscreen when starting game</div>
                                </div>
                                <label>
                                    <input id="autofullscreen-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Use System Resolution</div>
                                    <div class="setting-description">Match system DPI scaling</div>
                                </div>
                                <label>
                                    <input id="sysdpi-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Resolution Scale</div>
                                    <div class="setting-description">Adjust rendering resolution</div>
                                </div>
                                <input id="dpi-range" type="range" min="0.5" max="2.0" value="1.0" step="0.05">
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-input">
                        <div class="settings-section">
                            <h3>Input Settings</h3>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Disable Mouse Wheel</div>
                                    <div class="setting-description">Prevent accidental volume changes</div>
                                </div>
                                <label>
                                    <input id="disable-wheel-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Disable Mouse Buttons</div>
                                    <div class="setting-description">Prevent accidental clicks</div>
                                </div>
                                <label>
                                    <input id="disable-button-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Left Key</div>
                                    <div class="setting-description">Primary click key</div>
                                </div>
                                <div>
                                    <input id="lbutton1select" type="button" value="Z"/>
                                    <input type="button" value="M1"/>
                                </div>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Right Key</div>
                                    <div class="setting-description">Secondary click key</div>
                                </div>
                                <div>
                                    <input id="rbutton1select" type="button" value="X"/>
                                    <input type="button" value="M2"/>
                                </div>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Pause Keys</div>
                                    <div class="setting-description">Keys to pause game</div>
                                </div>
                                <div>
                                    <input id="pausebuttonselect" type="button" value="ESC"/>
                                    <input id="pausebutton2select" type="button" value="~"/>
                                </div>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Skip Key</div>
                                    <div class="setting-description">Skip intro/outro</div>
                                </div>
                                <input id="skipbuttonselect" type="button" value="SPACE"/>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-audio">
                        <div class="settings-section">
                            <h3>Audio Settings</h3>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Master Volume</div>
                                    <div class="setting-description">Overall audio level</div>
                                </div>
                                <input id="mastervolume-range" type="range" min="0" max="100" value="50">
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Effect Volume</div>
                                    <div class="setting-description">Hitsound volume</div>
                                </div>
                                <input id="effectvolume-range" type="range" min="0" max="100" value="50">
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Music Volume</div>
                                    <div class="setting-description">Background music volume</div>
                                </div>
                                <input id="musicvolume-range" type="range" min="0" max="100" value="50">
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Audio Offset</div>
                                    <div class="setting-description">Adjust audio timing (advanced)</div>
                                </div>
                                <input id="audiooffset-range" type="range" min="-50" max="50" value="0">
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-mods">
                        <div class="settings-section">
                            <h3>Game Modifiers</h3>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Easy</div>
                                    <div class="setting-description">Larger hit circles, more forgiving timing</div>
                                </div>
                                <label>
                                    <input id="easy-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Daycore</div>
                                    <div class="setting-description">Slower playback speed</div>
                                </div>
                                <label>
                                    <input id="daycore-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Hard Rock</div>
                                    <div class="setting-description">Smaller hit circles, stricter timing</div>
                                </div>
                                <label>
                                    <input id="hardrock-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Hidden</div>
                                    <div class="setting-description">Fading approach circles and hit objects</div>
                                </div>
                                <label>
                                    <input id="hidden-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Nightcore</div>
                                    <div class="setting-description">Faster playback speed with pitch change</div>
                                </div>
                                <label>
                                    <input id="nightcore-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Autoplay</div>
                                    <div class="setting-description">Watch perfect automated play</div>
                                </div>
                                <label>
                                    <input id="autoplay-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="tab-skins">
                        <div class="settings-section">
                            <h3>Skin Settings</h3>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Hide Hit Object Numbers</div>
                                    <div class="setting-description">Remove combo numbers from circles</div>
                                </div>
                                <label>
                                    <input id="hidenumbers-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Hide Great Indicator</div>
                                    <div class="setting-description">Hide 300 judgment text</div>
                                </div>
                                <label>
                                    <input id="hidegreat-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <div>
                                    <div class="setting-label">Hide Follow Points</div>
                                    <div class="setting-description">Hide connecting lines between objects</div>
                                </div>
                                <label>
                                    <input id="hidefollowpoints-check" type="checkbox" />
                                    <span></span>
                                </label>
                            </div>
                            <div class="setting-item">
                                <input id="restoredefault-btn" type="button" class="warnbtn" value="Restore All Defaults"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        initSettingsModal();
    };

    const initSettingsModal = () => {
        const modal = document.getElementById('settings-modal');
        const openBtn = document.getElementById('open-settings');
        const closeBtn = document.getElementById('close-settings');
        const tabs = document.querySelectorAll('.settings-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        openBtn?.addEventListener('click', () => {
            modal.classList.add('active');
        });

        closeBtn?.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`tab-${targetTab}`)?.classList.add('active');
            });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSettingsModal);
    } else {
        createSettingsModal();
    }
})();
