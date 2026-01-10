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

const createStarDisplay = star => {
    const container = document.createElement("div");
    container.className = "star-display";
    container.style.cssText = "display: flex; align-items: center; gap: 0.25rem;";
    
    const icon = document.createElement("img");
    icon.src = "star.png";
    icon.style.cssText = "width: 1rem; height: 1rem; filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5));";
    
    const text = document.createElement("span");
    text.style.cssText = "font-size: 0.875rem; font-weight: 600; color: var(--text-primary);";
    text.innerText = star != null ? star.toFixed(2) : "N/A";
    
    container.appendChild(icon);
    container.appendChild(text);
    return container;
};

const createDifficultyList = (boxClicked, event) => {
    if (window.currentDifficultyList) {
        window.currentDifficultyList.remove();
        window.currentDifficultyList = null;
    }

    event.stopPropagation();

    const difficultyBox = document.createElement("div");
    window.currentDifficultyList = difficultyBox;
    difficultyBox.className = "difficulty-box";
    boxClicked.appendChild(difficultyBox);

    const closeDifficultyList = (e) => {
        if (!difficultyBox.contains(e.target) && e.target !== boxClicked) {
            difficultyBox.remove();
            window.currentDifficultyList = null;
            document.removeEventListener('click', closeDifficultyList, false);
        }
    };

    setTimeout(() => {
        document.addEventListener("click", closeDifficultyList, false);
    }, 100);

    for (const difficulty of boxClicked.data) {
        const difficultyItem = document.createElement("div");
        difficultyItem.className = "difficulty-item";
        difficultyBox.appendChild(difficultyItem);
        difficultyItem.data = difficulty;

        const ringBase = document.createElement("div");
        const ring = document.createElement("div");
        ringBase.className = "bigringbase";
        ring.className = "bigring";
        ring.classList.add(getStarName(difficulty.star));
        difficultyItem.appendChild(ringBase);
        difficultyItem.appendChild(ring);

        const line = document.createElement("div");
        const version = document.createElement("div");
        const mapper = document.createElement("div");
        line.className = "versionline";
        version.className = "version";
        mapper.className = "mapper";
        line.appendChild(version);
        line.appendChild(mapper);
        difficultyItem.appendChild(line);
        version.innerText = difficulty.version;
        mapper.innerText = `mapped by ${difficulty.creator}`;

        difficultyItem.appendChild(createStarDisplay(difficulty.star));

        difficultyItem.onclick = function(e) {
            e.stopPropagation();
            
            if (!boxClicked.oszblob) {
                showToast('Beatmap is still downloading...', 'warning');
                return;
            }
            
            launchGame(boxClicked.oszblob, this.data.bid, this.data.version);
        };
    }

    difficultyBox.onclick = e => e.stopPropagation();
};

const BeatmapManager = {
    addLikeIcon(box) {
        const icon = document.createElement("div");
        icon.className = "beatmaplike";
        icon.setAttribute("hidden", "");
        box.appendChild(icon);

        box.initLike = () => {
            if (!window.liked_sid_set || !box.sid) return;

            if (window.liked_sid_set.has(box.sid)) {
                icon.classList.add("icon-heart");
                icon.onclick = box.undoLike;
            } else {
                icon.classList.add("icon-heart-empty");
                icon.onclick = box.like;
            }
            icon.removeAttribute("hidden");
        };

        box.like = async e => {
            e.stopPropagation();
            window.liked_sid_set.add(box.sid);
            
            try {
                await localforage.setItem("likedsidset", window.liked_sid_set);
                showToast('Added to favorites', 'success');
            } catch (err) {
                console.error("Error saving liked beatmap list:", err);
                showToast('Failed to save favorite', 'error');
            }
            
            icon.onclick = box.undoLike;
            icon.classList.remove("icon-heart-empty");
            icon.classList.add("icon-heart");
        };

        box.undoLike = async e => {
            e.stopPropagation();
            window.liked_sid_set.delete(box.sid);
            
            try {
                await localforage.setItem("likedsidset", window.liked_sid_set);
                showToast('Removed from favorites', 'info');
            } catch (err) {
                console.error("Error saving liked beatmap list:", err);
            }
            
            icon.onclick = box.like;
            icon.classList.remove("icon-heart");
            icon.classList.add("icon-heart-empty");
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
        cover.alt = `cover${map.sid}`;
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

        const creator = document.createElement("div");
        creator.className = "beatmapcreator";
        creator.innerText = `mapped by ${map.creator}`;

        const approved = document.createElement("div");
        approved.className = "beatmapapproved";
        approved.innerText = this.getApprovedText(map.approved);

        box.appendChild(cover);
        box.appendChild(overlay);
        box.appendChild(title);
        box.appendChild(artist);
        box.appendChild(creator);
        box.appendChild(approved);
        
        this.addLikeIcon(box);
        list.appendChild(box);

        return box;
    },

    addStarRings(box, data) {
        const stars = data.map(d => d.star);
        const row = document.createElement("div");
        row.className = "beatmap-difficulties";
        box.appendChild(row);

        if (data.length === 0) {
            const cnt = document.createElement("span");
            cnt.className = "difficulty-count";
            cnt.innerText = "no std map";
            row.appendChild(cnt);
            return;
        }

        if (stars.length <= 13) {
            for (const star of stars) {
                const ring = document.createElement("div");
                ring.className = "difficulty-ring";
                const starClass = getStarName(star);
                if (starClass) ring.classList.add(starClass);
                row.appendChild(ring);
            }
        } else {
            const ring = document.createElement("div");
            ring.className = "difficulty-ring";
            const starClass = getStarName(stars[stars.length - 1]);
            if (starClass) ring.classList.add(starClass);
            row.appendChild(ring);

            const cnt = document.createElement("span");
            cnt.className = "difficulty-count";
            cnt.innerText = stars.length;
            row.appendChild(cnt);
        }
    },

    addLength(box, data) {
        const length = Math.max(...data.map(d => d.length || 0));
        const lengthDiv = document.createElement("div");
        lengthDiv.className = "beatmaplength";
        box.appendChild(lengthDiv);
        
        const minutes = Math.floor(length / 60);
        const seconds = length % 60;
        lengthDiv.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    },

    addMoreInfo(box, data) {
        const stdData = data
            .filter(o => o.mode === 0)
            .sort((a, b) => a.star - b.star);
        
        box.data = stdData;
        this.addStarRings(box, stdData);
        this.addLength(box, stdData);
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
                createDifficultyList(boxes[i], e);
                startDownload(boxes[i]);
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
            createDifficultyList(box, e);
            startDownload(box);
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
