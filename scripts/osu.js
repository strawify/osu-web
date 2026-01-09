define(["underscore", "osu-audio", "curves/LinearBezier", "curves/CircumscribedCircle"],
(_, OsuAudio, LinearBezier, CircumscribedCircle) => {
    const HIT_TYPE_CIRCLE = 1;
    const HIT_TYPE_SLIDER = 2;
    const HIT_TYPE_NEWCOMBO = 4;
    const HIT_TYPE_SPINNER = 8;

    class Track {
        constructor(zip, track) {
            this.track = track;
            this.zip = zip;
            this.ondecoded = null;
            this.general = {};
            this.metadata = {};
            this.difficulty = {};
            this.colors = [];
            this.events = [];
            this.timingPoints = [];
            this.hitObjects = [];
        }

        decode() {
            const lines = this.track.replace("\r", "").split("\n");
            
            if (lines[0] !== "osu file format v14") {
                console.warn("Non-standard osu file format version");
            }

            let section = null;
            let combo = 0;
            let index = 0;
            let forceNewCombo = false;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("//")) continue;

                if (trimmed.startsWith("[")) {
                    section = trimmed;
                    continue;
                }

                this.parseSection(section, trimmed, { combo, index, forceNewCombo });
            }

            this.postProcess();

            if (this.ondecoded) {
                this.ondecoded(this);
            }
        }

        parseSection(section, line, state) {
            switch (section) {
                case "[General]":
                    this.parseKeyValue(line, this.general);
                    break;
                case "[Metadata]":
                    this.parseKeyValue(line, this.metadata, false);
                    break;
                case "[Events]":
                    this.events.push(line.split(","));
                    break;
                case "[Difficulty]":
                    this.parseKeyValue(line, this.difficulty);
                    break;
                case "[TimingPoints]":
                    this.parseTimingPoint(line);
                    break;
                case "[Colours]":
                    this.parseColor(line);
                    break;
                case "[HitObjects]":
                    this.parseHitObject(line, state);
                    break;
            }
        }

        parseKeyValue(line, target, parseNumber = true) {
            const colonIndex = line.indexOf(":");
            const key = line.substr(0, colonIndex);
            const value = line.substr(colonIndex + 1).trim();
            target[key] = parseNumber && !isNaN(value) ? +value : value;
        }

        parseTimingPoint(line) {
            const parts = line.split(",");
            const timingPoint = {
                offset: +parts[0],
                millisecondsPerBeat: +parts[1],
                meter: +parts[2],
                sampleSet: Math.min(+parts[3], 3),
                sampleIndex: +parts[4],
                volume: +parts[5],
                uninherited: +parts[6],
                kaiMode: +parts[7]
            };

            if (timingPoint.millisecondsPerBeat < 0) {
                timingPoint.uninherited = 0;
            }

            this.timingPoints.push(timingPoint);
        }

        parseColor(line) {
            const [key, value] = line.split(":").map(s => s.trim());
            const colorValues = value.split(',');

            if (key === "SliderTrackOverride") {
                this.colors.SliderTrackOverride = colorValues;
            } else if (key === "SliderBorder") {
                this.colors.SliderBorder = colorValues;
            } else {
                this.colors.push(colorValues);
            }
        }

        parseHitObject(line, state) {
            const parts = line.split(",");
            const hit = {
                x: +parts[0],
                y: +parts[1],
                time: +parts[2],
                type: +parts[3],
                hitSound: +parts[4]
            };

            if ((hit.type & HIT_TYPE_NEWCOMBO) > 0 || state.forceNewCombo) {
                state.combo++;
                state.combo += (hit.type >> 4) & 7;
                state.index = 0;
            }
            state.forceNewCombo = false;

            hit.combo = state.combo;
            hit.index = state.index++;

            if ((hit.type & HIT_TYPE_CIRCLE) > 0) {
                this.parseCircle(hit, parts);
            } else if ((hit.type & HIT_TYPE_SLIDER) > 0) {
                this.parseSlider(hit, parts);
            } else if ((hit.type & HIT_TYPE_SPINNER) > 0) {
                this.parseSpinner(hit, parts, state);
            } else {
                console.warn("Unknown hit object type:", hit.type, line);
                return;
            }

            if (hit.hitSample) {
                hit.hitSample.normalSet = Math.min(hit.hitSample.normalSet, 3);
                hit.hitSample.additionSet = Math.min(hit.hitSample.additionSet, 3);
            }

            this.hitObjects.push(hit);
        }

        parseCircle(hit, parts) {
            hit.type = "circle";
            const hitSample = (parts.length > 5 ? parts[5] : '0:0:0:0:').split(":");
            hit.hitSample = this.createHitSample(hitSample);
        }

        parseSlider(hit, parts) {
            hit.type = "slider";
            const sliderKeys = parts[5].split("|");
            hit.sliderType = sliderKeys[0];
            hit.keyframes = sliderKeys.slice(1).map(key => {
                const [x, y] = key.split(":");
                return { x: +x, y: +y };
            });
            hit.repeat = +parts[6];
            hit.pixelLength = +parts[7];

            hit.edgeHitsounds = parts.length > 8 
                ? parts[8].split("|").map(Number)
                : new Array(hit.repeat + 1).fill(0);

            hit.edgeSets = new Array(hit.repeat + 1).fill(null).map(() => ({
                normalSet: 0,
                additionSet: 0
            }));

            if (parts.length > 9) {
                const additions = parts[9].split("|");
                additions.forEach((addition, i) => {
                    const [normalSet, additionSet] = addition.split(":");
                    hit.edgeSets[i] = {
                        normalSet: +normalSet,
                        additionSet: +additionSet
                    };
                });
            }

            const hitSample = (parts.length > 10 ? parts[10] : '0:0:0:0:').split(":");
            hit.hitSample = this.createHitSample(hitSample);
        }

        parseSpinner(hit, parts, state) {
            if (hit.type & HIT_TYPE_NEWCOMBO) {
                state.combo--;
            }
            hit.combo = state.combo - ((hit.type >> 4) & 7);
            state.forceNewCombo = true;

            hit.type = "spinner";
            hit.endTime = Math.max(+parts[5], hit.time + 1);

            const hitSample = (parts.length > 6 ? parts[6] : '0:0:0:0:').split(":");
            hit.hitSample = this.createHitSample(hitSample);
        }

        createHitSample(parts) {
            return {
                normalSet: +parts[0],
                additionSet: +parts[1],
                index: +parts[2],
                volume: +parts[3],
                filename: parts[4]
            };
        }

        postProcess() {
            this.general.PreviewTime /= 10;
            if (this.general.PreviewTime > this.hitObjects[0]?.time) {
                this.general.PreviewTime = 0;
            }

            if (this.colors.length === 0) {
                this.colors = [
                    [96, 159, 159],
                    [192, 192, 192],
                    [128, 255, 255],
                    [139, 191, 222]
                ];
            }

            if (this.difficulty.OverallDifficulty) {
                this.difficulty.HPDrainRate = this.difficulty.HPDrainRate || this.difficulty.OverallDifficulty;
                this.difficulty.CircleSize = this.difficulty.CircleSize || this.difficulty.OverallDifficulty;
                this.difficulty.ApproachRate = this.difficulty.ApproachRate || this.difficulty.OverallDifficulty;
            } else {
                console.warn("Overall Difficulty undefined");
            }

            this.calculateInheritedTimingPoints();
            preallocateTiming(this);
            this.calculateEndTimes();
            this.length = Math.round((this.hitObjects[this.hitObjects.length - 1].endTime) / 1000 + 1.5);
            calculateCurve(this);
            stackHitObjects(this);
        }

        calculateInheritedTimingPoints() {
            let lastUninherited = this.timingPoints[0];

            for (const point of this.timingPoints) {
                if (point.uninherited === 0) {
                    point.uninherited = 1;
                    point.millisecondsPerBeat = Math.max(
                        Math.min(point.millisecondsPerBeat, -10),
                        -1000
                    ) * -0.01 * lastUninherited.millisecondsPerBeat;
                    point.trueMillisecondsPerBeat = lastUninherited.trueMillisecondsPerBeat;
                } else {
                    lastUninherited = point;
                    point.trueMillisecondsPerBeat = point.millisecondsPerBeat;
                }
            }
        }

        calculateEndTimes() {
            for (const hit of this.hitObjects) {
                if (hit.type === "circle") {
                    hit.endTime = hit.time;
                } else if (hit.type === "slider") {
                    hit.sliderTime = hit.timing.millisecondsPerBeat * 
                        (hit.pixelLength / this.difficulty.SliderMultiplier) / 100;
                    hit.sliderTimeTotal = hit.sliderTime * hit.repeat;
                    hit.endTime = hit.time + hit.sliderTimeTotal;
                }
            }
        }
    }

    class Osu {
        constructor(zip) {
            this.zip = zip;
            this.song = null;
            this.ondecoded = null;
            this.onready = null;
            this.tracks = [];
            this.raw_tracks = [];
            this.loadedCount = 0;
        }

        trackDecoded() {
            this.loadedCount++;
            if (this.loadedCount === this.raw_tracks.length && this.ondecoded) {
                this.ondecoded(this);
            }
        }

        load() {
            this.raw_tracks = this.zip.children.filter(c => 
                c.name.length >= 4 && c.name.endsWith(".osu")
            );

            if (this.raw_tracks.length === 0) {
                this.onerror("No .osu files found!");
                return;
            }

            for (const rawTrack of this.raw_tracks) {
                console.log("Loading track:", rawTrack.name);
                rawTrack.getText(text => {
                    const track = new Track(this.zip, text);
                    this.tracks.push(track);
                    track.ondecoded = () => this.trackDecoded();
                    track.decode();
                });
            }
        }

        getCoverSrc(img) {
            try {
                let file = this.tracks[0].events[0][2];
                if (this.tracks[0].events[0][0] === "Video") {
                    file = this.tracks[0].events[1][2];
                }
                file = file.substring(1, file.length - 1);
                
                const fileEntry = this.zip.getChildByName(file);
                if (fileEntry) {
                    fileEntry.getBlob("image/jpeg", blob => {
                        img.src = URL.createObjectURL(blob);
                    });
                    return;
                }
            } catch (error) {
                console.error("Failed to get cover:", error);
            }
            img.src = "skin/defaultbg.jpg";
        }

        async requestStar() {
            try {
                const response = await fetch(
                    `https://api.sayobot.cn/beatmapinfo?1=${this.tracks[0].metadata.BeatmapSetID}`
                );
                const info = await response.json();

                if (info.status === 0) {
                    for (const data of info.data) {
                        for (const track of this.tracks) {
                            if (track.metadata.BeatmapID == data.bid) {
                                track.difficulty.star = data.star;
                                track.length = data.length;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch star rating:", error);
            }
        }

        filterTracks() {
            this.tracks = this.tracks.filter(t => t.general.Mode == 0);
        }

        sortTracks() {
            this.tracks.sort((a, b) => 
                a.difficulty.OverallDifficulty - b.difficulty.OverallDifficulty
            );
        }

        load_mp3(track = this.tracks[0]) {
            const mp3Raw = this.zip.children.find(c => 
                c.name.toLowerCase() === track.general.AudioFilename.toLowerCase()
            );

            mp3Raw.getBlob("audio/mpeg", blob => {
                const reader = new FileReader();
                reader.onload = e => {
                    console.log("Loaded audio blob");
                    this.audio = new OsuAudio(
                        mp3Raw.name.toLowerCase(),
                        e.target.result,
                        () => {
                            if (this.onready) this.onready();
                        }
                    );
                };
                reader.readAsArrayBuffer(blob);
            });
        }
    }

    const preallocateTiming = track => {
        let currentTimingIndex = 0;
        
        for (const hit of track.hitObjects) {
            while (currentTimingIndex + 1 < track.timingPoints.length &&
                   track.timingPoints[currentTimingIndex + 1].offset <= hit.time) {
                currentTimingIndex++;
            }
            hit.timing = track.timingPoints[currentTimingIndex];
        }
    };

    const calculateCurve = track => {
        for (const hit of track.hitObjects) {
            if (hit.type !== "slider") continue;

            if (hit.sliderType === "P" && hit.keyframes.length === 2) {
                hit.curve = new CircumscribedCircle(hit);
                if (hit.curve.length === 0) {
                    hit.curve = new LinearBezier(hit, hit.sliderType === "L");
                }
            } else {
                if (hit.sliderType === "C") {
                    console.warn("Catmull curve unsupported, using Bezier fallback");
                }
                hit.curve = new LinearBezier(hit, hit.sliderType === "L");
            }

            if (hit.curve.length < 2) {
                console.error("Slider curve calculation failed");
            }
        }
    };

    const stackHitObjects = track => {
        const AR = track.difficulty.ApproachRate;
        const approachTime = AR < 5 ? 1800 - 120 * AR : 1950 - 150 * AR;
        const stackDistance = 3;
        const stackThreshold = approachTime * track.general.StackLeniency;

        const getInterval = (A, B) => {
            let endTime = A.time;
            if (A.type === "slider") {
                endTime += A.repeat * A.timing.millisecondsPerBeat * 
                    (A.pixelLength / track.difficulty.SliderMultiplier) / 100;
            }
            return B.time - endTime;
        };

        const getDistance = (A, B) => {
            let x = A.x;
            let y = A.y;
            
            if (A.type === "slider" && A.repeat % 2 === 1) {
                const lastPoint = A.curve.curve[A.curve.curve.length - 1];
                x = lastPoint.x;
                y = lastPoint.y;
            }
            
            return Math.hypot(x - B.x, y - B.y);
        };

        const chains = [];
        const stacked = new Array(track.hitObjects.length).fill(false);

        for (let i = 0; i < track.hitObjects.length; i++) {
            if (stacked[i]) continue;
            
            const hitI = track.hitObjects[i];
            if (hitI.type === "spinner") continue;

            stacked[i] = true;
            const newChain = [hitI];

            for (let j = i + 1; j < track.hitObjects.length; j++) {
                const hitJ = track.hitObjects[j];
                if (hitJ.type === "spinner") break;
                if (getInterval(newChain[newChain.length - 1], hitJ) > stackThreshold) break;

                if (getDistance(newChain[newChain.length - 1], hitJ) <= stackDistance) {
                    if (stacked[j]) {
                        console.warn("Intersecting object stacks detected");
                        break;
                    }
                    stacked[j] = true;
                    newChain.push(hitJ);
                }
            }

            if (newChain.length > 1) {
                chains.push(newChain);
            }
        }

        const stackScale = (1.0 - 0.7 * (track.difficulty.CircleSize - 5) / 5) / 2;
        const scaleX = stackScale * 6.4;
        const scaleY = stackScale * 6.4;

        const moveHit = (hit, depth) => {
            hit.x += scaleX * depth;
            hit.y += scaleY * depth;
            
            if (hit.type === "slider") {
                for (const keyframe of hit.keyframes) {
                    keyframe.x += scaleX * depth;
                    keyframe.y += scaleY * depth;
                }
                for (const point of hit.curve.curve) {
                    point.x += scaleX * depth;
                    point.y += scaleY * depth;
                }
            }
        };

        for (const chain of chains) {
            if (chain[0].type === "slider") {
                let depth = 0;
                for (const hit of chain) {
                    moveHit(hit, depth);
                    if (hit.type !== "slider" || hit.repeat % 2 === 0) {
                        depth++;
                    }
                }
            } else {
                let depth = 0;
                for (let j = 0; j < chain.length; j++) {
                    const current = chain.length - 1 - j;
                    if (j > 0 && chain[current].type === "slider" && chain[current].repeat % 2 === 1) {
                        depth--;
                    }
                    moveHit(chain[current], -depth);
                    depth++;
                }
            }
        }
    };

    return Osu;
});
