if (typeof showToast === 'undefined') {
    window.showToast = (message, type = 'info') => {
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: message,
                duration: 3000,
                gravity: 'bottom',
                position: 'right',
                className: type,
                stopOnFocus: true,
                style: {
                    background: type === 'success' ? 'var(--success)' : 
                               type === 'error' ? 'var(--error)' : 
                               type === 'warning' ? 'var(--warning)' : 
                               'var(--bg-elevated)'
                }
            }).showToast();
        }
    };
}

const getStarName = star => {
    if (star == null || star === undefined) return "unknown";
    if (star < 2) return "easy";
    if (star < 2.7) return "normal";
    if (star < 4) return "hard";
    if (star < 5.3) return "insane";
    if (star < 6.5) return "expert";
    return "expert-plus";
};

const getDifficultyClass = star => {
    const name = getStarName(star);
    return name === 'unknown' ? '' : name;
};

let currentDifficultyMenu = null;

const showDifficultyMenu = (box, event) => {
    event.stopPropagation();
    
    if (!box.data || !Array.isArray(box.data) || box.data.length === 0) {
        console.log('No difficulty data available yet');
        
        if (box.setdata && box.setdata.title) {
            showToast(`Loading difficulties for ${box.setdata.title}...`, 'info');
        } else {
            showToast('Loading beatmap data...', 'info');
        }
        
        setTimeout(() => {
            if (box.data && box.data.length > 0) {
                showDifficultyMenu(box, event);
            }
        }, 500);
        return;
    }
    
    if (currentDifficultyMenu) {
        currentDifficultyMenu.remove();
        currentDifficultyMenu = null;
        
        const prevBox = document.querySelector('.beatmapbox.has-diff-menu');
        if (prevBox) {
            prevBox.classList.remove('has-diff-menu');
        }
        
        if (prevBox === box) {
            return;
        }
    }
    
    box.classList.add('has-diff-menu');
    
    const menu = document.createElement('div');
    menu.className = 'difficulty-selection-menu';
    menu.style.zIndex = '1000';
    currentDifficultyMenu = menu;
    
    const difficulties = box.data
        .filter(d => d.mode === 0)
        .sort((a, b) => a.star - b.star);
    
    if (difficulties.length === 0) {
        const noDiffItem = document.createElement('div');
        noDiffItem.className = 'difficulty-item';
        noDiffItem.innerHTML = `
            <div class="difficulty-info">
                <div class="difficulty-version">No osu!standard difficulties</div>
                <div class="difficulty-mapper">This beatmap might be for other modes</div>
            </div>
        `;
        menu.appendChild(noDiffItem);
    } else {
        difficulties.forEach(diff => {
            const item = document.createElement('div');
            item.className = 'difficulty-item';
            item.dataset.bid = diff.bid;
            item.dataset.sid = box.sid;
            
            const diffClass = getDifficultyClass(diff.star);
            
            item.innerHTML = `
                <div class="difficulty-ring ${diffClass}"></div>
                <div class="difficulty-info">
                    <div class="difficulty-version">${diff.version}</div>
                    <div class="difficulty-mapper">Mapped by ${diff.creator}</div>
                    <div class="difficulty-stats">
                        <span>CS: ${diff.difficultyrating}</span>
                        <span>OD: ${diff.overalldifficulty}</span>
                        <span class="difficulty-star">
                            <img src="star.png" alt="star">
                            ${parseFloat(diff.difficultyrating).toFixed(2)}
                        </span>
                    </div>
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (box.downloading && !box.downloadComplete) {
                    showToast('Beatmap is still downloading...', 'warning');
                    return;
                }
                
                if (!box.oszblob) {
                    showToast('Please wait for download to complete', 'warning');
                    return;
                }
                
                if (typeof launchGame === 'function') {
                    launchGame(box.oszblob, diff.bid, diff.version);
                } else {
                    showToast('Game system not ready yet', 'error');
                }
                
                menu.remove();
                currentDifficultyMenu = null;
                box.classList.remove('has-diff-menu');
            });
            
            menu.appendChild(item);
        });
    }
    
    box.appendChild(menu);
    
    // Position the menu above if it would go off-screen
    const rect = box.getBoundingClientRect();
    const menuHeight = difficulties.length * 60 + 20;
    const viewportHeight = window.innerHeight;
    
    if (rect.bottom + menuHeight > viewportHeight - 20) {
        menu.style.top = 'auto';
        menu.style.bottom = '100%';
        menu.style.borderRadius = '16px 16px 0 0';
        menu.style.boxShadow = '0 -12px 32px rgba(0, 0, 0, 0.5)';
    } else {
        menu.style.bottom = 'auto';
        menu.style.top = '100%';
        menu.style.borderRadius = '0 0 16px 16px';
        menu.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.5)';
    }
    
    const closeMenu = (e) => {
        if (menu && !menu.contains(e.target) && e.target !== box && !box.contains(e.target)) {
            menu.remove();
            currentDifficultyMenu = null;
            box.classList.remove('has-diff-menu');
            document.removeEventListener('click', closeMenu);
            document.removeEventListener('scroll', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
        document.addEventListener('scroll', closeMenu, { passive: true });
    }, 10);
};

const BeatmapManager = {
    addLikeIcon(box) {
        const icon = document.createElement("div");
        icon.className = "beatmaplike icon-heart-empty";
        box.appendChild(icon);

        box.initLike = () => {
            if (!window.liked_sid_set || !box.sid) return;

            if (window.liked_sid_set.has(box.sid)) {
                icon.classList.remove("icon-heart-empty");
                icon.classList.add("icon-heart");
                icon.onclick = box.undoLike;
            } else {
                icon.onclick = box.like;
            }
        };

        box.like = async e => {
            e.stopPropagation();
            
            if (!window.liked_sid_set) {
                window.liked_sid_set = new Set();
            }
            
            window.liked_sid_set.add(box.sid);
            
            try {
                if (typeof localforage !== 'undefined') {
                    await localforage.setItem("likedsidset", window.liked_sid_set);
                } else {
                    localStorage.setItem("likedsidset", JSON.stringify(Array.from(window.liked_sid_set)));
                }
                
                icon.classList.remove("icon-heart-empty");
                icon.classList.add("icon-heart");
                icon.onclick = box.undoLike;
                showToast('Added to favorites', 'success');
            } catch (err) {
                console.error("Error saving liked beatmap list:", err);
                showToast('Failed to save favorite', 'error');
            }
        };

        box.undoLike = async e => {
            e.stopPropagation();
            
            if (!window.liked_sid_set) return;
            
            window.liked_sid_set.delete(box.sid);
            
            try {
                if (typeof localforage !== 'undefined') {
                    await localforage.setItem("likedsidset", window.liked_sid_set);
                } else {
                    localStorage.setItem("likedsidset", JSON.stringify(Array.from(window.liked_sid_set)));
                }
                
                icon.classList.remove("icon-heart");
                icon.classList.add("icon-heart-empty");
                icon.onclick = box.like;
                showToast('Removed from favorites', 'info');
            } catch (err) {
                console.error("Error saving liked beatmap list:", err);
            }
        };

        if (window.liked_sid_set) {
            box.initLike();
        } else {
            window.liked_sid_set = new Set();
            window.liked_sid_set_callbacks = window.liked_sid_set_callbacks || [];
            
            const loadLikedSet = async () => {
                try {
                    if (typeof localforage !== 'undefined') {
                        const savedSet = await localforage.getItem("likedsidset");
                        if (savedSet && savedSet.size) {
                            window.liked_sid_set = savedSet;
                        }
                    } else {
                        const saved = localStorage.getItem("likedsidset");
                        if (saved) {
                            window.liked_sid_set = new Set(JSON.parse(saved));
                        }
                    }
                } catch (err) {
                    console.error("Failed to load liked set:", err);
                }
                
                if (window.liked_sid_set_callbacks) {
                    window.liked_sid_set_callbacks.forEach(cb => cb());
                    window.liked_sid_set_callbacks = [];
                }
            };
            
            window.liked_sid_set_callbacks.push(box.initLike);
            loadLikedSet();
        }
    },

    getApprovedText(status) {
        const statuses = {
            4: "LOVED",
            3: "QUALIFIED",
            2: "APPROVED",
            1: "RANKED",
            0: "PENDING",
            "-1": "WIP",
            "-2": "GRAVEYARD"
        };
        return statuses[status] || "UNKNOWN";
    },

    addPreviewBox(map, list) {
        const box = document.createElement("div");
        box.setdata = map;
        box.sid = map.sid;
        box.className = "beatmapbox";
        box.dataset.sid = map.sid;
        box.style.position = 'relative';

        const cover = document.createElement("img");
        cover.className = "beatmapcover";
        cover.alt = map.title;
        cover.src = `https://cdn.sayobot.cn:25225/beatmaps/${map.sid}/covers/cover.webp`;
        cover.loading = "lazy";
        cover.onerror = function() {
            this.src = 'https://via.placeholder.com/380x160/1a1a1a/ffffff?text=No+Image';
        };

        const overlay = document.createElement("div");
        overlay.className = "beatmapcover-overlay";

        const title = document.createElement("div");
        title.className = "beatmaptitle";
        title.innerText = map.title || "Unknown Title";

        const artist = document.createElement("div");
        artist.className = "beatmapartist";
        artist.innerText = map.artist || "Unknown Artist";

        const infoContainer = document.createElement("div");
        infoContainer.className = "beatmap-info-container";

        const creator = document.createElement("div");
        creator.className = "beatmapcreator";
        creator.innerText = `Mapped by ${map.creator || "Unknown"}`;

        const approved = document.createElement("div");
        approved.className = "beatmapapproved";
        approved.innerText = this.getApprovedText(map.approved);

        box.appendChild(cover);
        box.appendChild(overlay);
        box.appendChild(title);
        box.appendChild(artist);
        box.appendChild(infoContainer);
        
        infoContainer.appendChild(creator);
        infoContainer.appendChild(approved);
        
        this.addLikeIcon(box);
        
        if (list) {
            list.appendChild(box);
        }

        return box;
    },

    addDifficultyTags(box, data) {
        const container = document.createElement("div");
        container.className = "beatmap-difficulties";
        
        if (!data || data.length === 0) {
            const tag = document.createElement("div");
            tag.className = "difficulty-tag";
            tag.innerText = "Loading...";
            container.appendChild(tag);
        } else {
            const difficulties = data
                .filter(d => d.mode === 0)
                .sort((a, b) => a.star - b.star);
            
            if (difficulties.length === 0) {
                const tag = document.createElement("div");
                tag.className = "difficulty-tag";
                tag.innerText = "No std";
                container.appendChild(tag);
            } else if (difficulties.length <= 4) {
                difficulties.forEach(diff => {
                    const tag = document.createElement("div");
                    tag.className = `difficulty-tag ${getDifficultyClass(diff.star)}`;
                    tag.innerText = getDifficultyClass(diff.star).toUpperCase();
                    container.appendChild(tag);
                });
            } else {
                const first = difficulties[0];
                const last = difficulties[difficulties.length - 1];
                
                const easyTag = document.createElement("div");
                easyTag.className = `difficulty-tag ${getDifficultyClass(first.star)}`;
                easyTag.innerText = getDifficultyClass(first.star).toUpperCase();
                container.appendChild(easyTag);
                
                const countTag = document.createElement("div");
                countTag.className = "difficulty-tag";
                countTag.innerText = `+${difficulties.length - 2}`;
                container.appendChild(countTag);
                
                const hardTag = document.createElement("div");
                hardTag.className = `difficulty-tag ${getDifficultyClass(last.star)}`;
                hardTag.innerText = getDifficultyClass(last.star).toUpperCase();
                container.appendChild(hardTag);
            }
        }
        
        const infoContainer = box.querySelector('.beatmap-info-container');
        if (infoContainer) {
            infoContainer.appendChild(container);
        }
    },

    addMoreInfo(box, data) {
        if (!data || !Array.isArray(data)) {
            console.warn('No valid data for beatmap', box.sid);
            return;
        }
        
        const stdData = data
            .filter(o => o.mode === 0)
            .sort((a, b) => a.star - b.star);
        
        box.data = stdData;
        this.addDifficultyTags(box, stdData);
    },

    async requestMoreInfo(box) {
        try {
            const response = await fetch(`https://api.sayobot.cn/beatmapinfo?1=${box.sid}`);
            const data = await response.json();
            
            if (data && data.data) {
                this.addMoreInfo(box, data.data);
            } else {
                console.error('Invalid response format for beatmap info:', data);
                this.addDifficultyTags(box, []);
            }
        } catch (err) {
            console.error("Failed to fetch beatmap info:", err);
            this.addDifficultyTags(box, []);
        }
    }
};

const addBeatmapList = async (listUrl, list, filter, maxSize) => {
    if (!list) list = document.getElementById("beatmap-list");

    try {
        const response = await fetch(listUrl);
        const res = await response.json();

        if (typeof res.endid !== "undefined") {
            window.list_endid = res.endid;
        } else {
            window.list_endid = 0;
            return;
        }

        let data = res.data;

        if (filter && data) {
            data = data.filter(filter);
        }

        if (maxSize && data) {
            data = data.slice(0, maxSize);
        }

        const boxes = [];
        for (const item of data) {
            boxes.push(BeatmapManager.addPreviewBox(item, list));
        }

        for (let i = 0; i < data.length; i++) {
            boxes[i].sid = data[i].sid;
            
            boxes[i].onclick = function(e) {
                if (e.target.closest('.beatmaplike')) return;
                showDifficultyMenu(this, e);
                startDownload(this);
            };
            
            BeatmapManager.requestMoreInfo(boxes[i]);
        }

        if (window.beatmaplistLoadedCallback) {
            window.beatmaplistLoadedCallback();
        }
    } catch (err) {
        console.error("Failed to load beatmap list:", err);
        showToast('Failed to load beatmaps', 'error');
    }
};

const addBeatmapSid = async (sid, list) => {
    if (!list) list = document.getElementById("beatmap-list");

    try {
        const response = await fetch(`https://api.sayobot.cn/v2/beatmapinfo?0=${sid}`);
        const res = await response.json();

        if (res.status === -1) {
            showToast('Beatmap not found with specified sid', 'error');
            return;
        }

        const box = BeatmapManager.addPreviewBox(res.data, list);
        box.sid = res.data.sid;
        
        box.onclick = function(e) {
            if (e.target.closest('.beatmaplike')) return;
            showDifficultyMenu(this, e);
            startDownload(this);
        };
        
        BeatmapManager.requestMoreInfo(box);

        if (window.beatmaplistLoadedCallback) {
            window.beatmaplistLoadedCallback();
        }
    } catch (err) {
        console.error("Failed to load beatmap:", err);
        showToast('Failed to load beatmap', 'error');
    }
};
