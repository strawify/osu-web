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

const createStarDisplay = star => {
    const container = document.createElement("div");
    container.className = "star-display";
    
    const icon = document.createElement("img");
    icon.src = "star.png";
    icon.alt = "star";
    
    const text = document.createElement("span");
    text.innerText = star != null ? star.toFixed(2) : "N/A";
    
    container.appendChild(icon);
    container.appendChild(text);
    return container;
};

const showDifficultyMenu = (box, event) => {
    event.stopPropagation();
    
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
    
    if (!box.data || box.data.length === 0) {
        showToast('No difficulties available for this beatmap', 'warning');
        return;
    }
    
    box.classList.add('has-diff-menu');
    
    const menu = document.createElement('div');
    menu.className = 'difficulty-selection-menu';
    currentDifficultyMenu = menu;
    
    const difficulties = box.data.sort((a, b) => a.star - b.star);
    
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
            
            launchGame(box.oszblob, diff.bid, diff.version);
            menu.remove();
            currentDifficultyMenu = null;
            box.classList.remove('has-diff-menu');
        });
        
        menu.appendChild(item);
    });
    
    box.appendChild(menu);
    
    const closeMenu = (e) => {
        if (menu && !menu.contains(e.target) && e.target !== box) {
            menu.remove();
            currentDifficultyMenu = null;
            box.classList.remove('has-diff-menu');
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
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
            window.liked_sid_set.add(box.sid);
            
            try {
                await localforage.setItem("likedsidset", window.liked_sid_set);
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
            window.liked_sid_set.delete(box.sid);
            
            try {
                await localforage.setItem("likedsidset", window.liked_sid_set);
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
            if (!window.liked_sid_set_callbacks) {
                window.liked_sid_set_callbacks = [];
            }
            window.liked_sid_set_callbacks.push(box.initLike);
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

        const cover = document.createElement("img");
        cover.className = "beatmapcover";
        cover.alt = map.title;
        cover.src = `https://cdn.sayobot.cn:25225/beatmaps/${map.sid}/covers/cover.webp`;
        cover.loading = "lazy";

        const overlay = document.createElement("div");
        overlay.className = "beatmapcover-overlay";

        const title = document.createElement("div");
        title.className = "beatmaptitle";
        title.innerText = map.title;

        const artist = document.createElement("div");
        artist.className = "beatmapartist";
        artist.innerText = map.artist;

        const infoContainer = document.createElement("div");
        infoContainer.className = "beatmap-info-container";

        const creator = document.createElement("div");
        creator.className = "beatmapcreator";
        creator.innerText = `Mapped by ${map.creator}`;

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
        list.appendChild(box);

        return box;
    },

    addDifficultyTags(box, data) {
        const container = document.createElement("div");
        container.className = "beatmap-difficulties";
        
        if (data.length === 0) {
            const tag = document.createElement("div");
            tag.className = "difficulty-tag";
            tag.innerText = "No std map";
            container.appendChild(tag);
        } else {
            const difficulties = data
                .filter(d => d.mode === 0)
                .sort((a, b) => a.star - b.star);
            
            if (difficulties.length <= 4) {
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

    addLengthInfo(box, data) {
        const lengths = data.map(d => d.length || 0);
        const maxLength = Math.max(...lengths);
        
        if (maxLength > 0) {
            const lengthDiv = document.createElement("div");
            lengthDiv.className = "beatmaplength";
            
            const minutes = Math.floor(maxLength / 60);
            const seconds = maxLength % 60;
            lengthDiv.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            
            box.appendChild(lengthDiv);
        }
    },

    addBPMInfo(box, data) {
        const bpms = data.map(d => d.bpm || 0).filter(bpm => bpm > 0);
        if (bpms.length > 0) {
            const avgBPM = Math.round(bpms.reduce((a, b) => a + b) / bpms.length);
            const bpmDiv = document.createElement("div");
            bpmDiv.className = "beatmapbpm";
            bpmDiv.innerText = `${avgBPM} BPM`;
            box.appendChild(bpmDiv);
        }
    },

    addMoreInfo(box, data) {
        const stdData = data
            .filter(o => o.mode === 0)
            .sort((a, b) => a.star - b.star);
        
        box.data = stdData;
        this.addDifficultyTags(box, stdData);
        this.addLengthInfo(box, stdData);
        this.addBPMInfo(box, stdData);
    },

    async requestMoreInfo(box) {
        try {
            const response = await fetch(`https://api.sayobot.cn/beatmapinfo?1=${box.sid}`);
            const data = await response.json();
            this.addMoreInfo(box, data.data);
        } catch (err) {
            console.error("Failed to fetch beatmap info:", err);
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
            BeatmapManager.requestMoreInfo(boxes[i]);
            
            boxes[i].onclick = function(e) {
                if (e.target.closest('.beatmaplike')) return;
                showDifficultyMenu(this, e);
                startDownload(this);
            };
        }

        if (window.beatmaplistLoadedCallback) {
            window.beatmaplistLoadedCallback();
            window.beatmaplistLoadedCallback = null;
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
        BeatmapManager.requestMoreInfo(box);
        
        box.onclick = function(e) {
            if (e.target.closest('.beatmaplike')) return;
            showDifficultyMenu(this, e);
            startDownload(this);
        };

        if (window.beatmaplistLoadedCallback) {
            window.beatmaplistLoadedCallback();
            window.beatmaplistLoadedCallback = null;
        }
    } catch (err) {
        console.error("Failed to load beatmap:", err);
        showToast('Failed to load beatmap', 'error');
    }
};
