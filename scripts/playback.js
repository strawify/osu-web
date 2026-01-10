define(["osu", "playerActions", "SliderMesh", "overlay/score", "overlay/volume", "overlay/loading", "overlay/break", "overlay/progress", "overlay/hiterrormeter"],
function(Osu, setPlayerActions, SliderMesh, ScoreOverlay, VolumeMenu, LoadingMenu, BreakOverlay, ProgressOverlay, ErrorMeterOverlay) {
    function clamp01(a) {
        return Math.min(1, Math.max(0, a));
    }
    function colorLerp(rgb1, rgb2, t) {
        let r = (1-t) * ((rgb1>>16)/255) + t * ((rgb2>>16)/255);
        let g = (1-t) * (((rgb1>>8)&255)/255) + t * (((rgb2>>8)&255)/255);
        let b = (1-t) * ((rgb1&255)/255) + t * ((rgb2&255)/255);
        return Math.round(r*255)<<16 | Math.round(g*255)<<8 | Math.round(b*255);
    }
    function repeatclamp(a) {
        a%=2;
        return a>1? 2-a: a;
    }
    
    function Playback(game, osu, track) {
        var self = this;
        window.playback = this;
        self.game = game;
        self.osu = osu;
        self.track = track;
        self.background = null;
        self.started = false;
        self.upcomingHits = [];
        
        self.hits = [];
        _.each(self.track.hitObjects, function(o){
            self.hits.push(Object.assign({},o));
        });
        
        self.offset = 0;
        self.currentHitIndex = 0;
        self.ended = false;
        
        self.autoplay = game.autoplay;
        self.relax = game.relax;
        self.autopilot = game.autopilot;
        self.modhidden = game.hidden;
        self.mirror = game.mirror;
        self.suddendeath = game.suddendeath;
        self.nofail = game.nofail;
        
        self.playbackRate = 1.0;
        if (game.useCustomSpeed) {
            self.playbackRate = game.customSpeed;
        } else {
            if (game.nightcore || game.doubletime) self.playbackRate *= 1.5;
            if (game.daycore || game.halftime) self.playbackRate *= 0.75;
        }
        
        self.hideNumbers = game.hideNumbers;
        self.hideGreat = game.hideGreat;
        self.hideFollowPoints = game.hideFollowPoints;
        
        self.enableHPDrain = game.enableHPDrain && !game.nofail;
        self.showFailAnimation = game.showFailAnimation;
        self.failed = false;
        self.hp = 1.0;
        
        self.approachScale = 3;
        self.audioReady = false;
        self.endTime = self.hits[self.hits.length-1].endTime + 1500;
        this.wait = Math.max(0, 1500-this.hits[0].time);
        self.skipTime = this.hits[0].time / 1000 - 3;
        self.skipped = false;

        self.osu.onready = function() {
            self.loadingMenu.hide();
            self.audioReady = true;
            if (self.onload)
                self.onload();
            self.start();
        }
        
        self.load = function() {
            self.osu.load_mp3(self.track);
        }

        var gfx = window.gfx = {};
        self.gamefield = new PIXI.Container();
        
        self.calcSize = function() {
            gfx.width = game.window.innerWidth;
            gfx.height = game.window.innerHeight;
            if (gfx.width / 512 > gfx.height / 384)
                gfx.width = gfx.height / 384 * 512;
            else
                gfx.height = gfx.width / 512 * 384;
            gfx.width *= 0.8;
            gfx.height *= 0.8;
            gfx.xoffset = (game.window.innerWidth - gfx.width) / 2;
            gfx.yoffset = (game.window.innerHeight - gfx.height) / 2;
            self.gamefield.x = gfx.xoffset;
            self.gamefield.y = gfx.yoffset;
            self.gamefield.scale.set(gfx.width / 512);
        };
        
        self.calcSize();
        game.mouseX = 512 / 2;
        game.mouseY = 384 / 2;
        
        self.loadingMenu = new LoadingMenu({width: game.window.innerWidth, height: game.window.innerHeight}, track);
        self.volumeMenu = new VolumeMenu({width: game.window.innerWidth, height: game.window.innerHeight});
        self.breakOverlay = new BreakOverlay({width: game.window.innerWidth, height: game.window.innerHeight});
        self.progressOverlay = new ProgressOverlay({width: game.window.innerWidth, height: game.window.innerHeight}, this.hits[0].time - 1500, this.hits[this.hits.length-1].endTime);

        window.onresize = function() {
            window.app.renderer.resize(window.innerWidth, window.innerHeight);
            if (self.audioReady) self.pause();
            self.calcSize();
            self.scoreOverlay.resize({width: window.innerWidth, height: window.innerHeight});
            self.errorMeter.resize({width: window.innerWidth, height: window.innerHeight});
            self.loadingMenu.resize({width: window.innerWidth, height: window.innerHeight});
            self.volumeMenu.resize({width: window.innerWidth, height: window.innerHeight});
            self.breakOverlay.resize({width: window.innerWidth, height: window.innerHeight});
            self.progressOverlay.resize({width: window.innerWidth, height: window.innerHeight});

            if (self.background && self.background.texture) {
                self.background.x = window.innerWidth / 2;
                self.background.y = window.innerHeight / 2;
                self.background.scale.set(Math.max(window.innerWidth / self.background.texture.width, window.innerHeight / self.background.texture.height));
            }
           
            SliderMesh.prototype.resetTransform({
                dx: 2 * gfx.width / window.innerWidth / 512,
                ox: -1 + 2 * gfx.xoffset / window.innerWidth,
                dy: -2 * gfx.height / window.innerHeight / 384,
                oy: 1 - 2 * gfx.yoffset / window.innerHeight,
            });
        }

        var blurCallback = function(e){
            if (self.audioReady)
                self.pause();
        };
        window.addEventListener("blur", blurCallback);

        this.OD = track.difficulty.OverallDifficulty;
        this.CS = track.difficulty.CircleSize;
        this.AR = track.difficulty.ApproachRate;
        this.HP = track.difficulty.HPDrainRate;
        
        if (game.hardrock) {
            this.OD = Math.min(this.OD * 1.4, 10);
            this.CS = Math.min(this.CS * 1.3, 10);
            this.AR = Math.min(this.AR * 1.4, 10);
            this.HP = Math.min(this.HP * 1.4, 10);
        }
        if (game.easy) {
            this.OD = this.OD * 0.5;
            this.CS = this.CS * 0.5;
            this.AR = this.AR * 0.5;
            this.HP = this.HP * 0.5;
        }

        let scoreModMultiplier = 1.0;
        if (game.easy) scoreModMultiplier *= 0.50;
        if (game.nofail) scoreModMultiplier *= 0.50;
        if (game.daycore || game.halftime) scoreModMultiplier *= 0.30;
        if (game.hardrock) scoreModMultiplier *= 1.06;
        if (game.nightcore || game.doubletime) scoreModMultiplier *= 1.12;
        if (game.hidden) scoreModMultiplier *= 1.06;
        if (game.relax || game.autopilot) scoreModMultiplier *= 0.0;

        self.scoreOverlay = new ScoreOverlay({width: game.window.innerWidth, height: game.window.innerHeight}, this.HP, scoreModMultiplier);
        self.circleRadius = (109 - 9 * this.CS)/2;
        self.hitSpriteScale = self.circleRadius / 60;
        self.MehTime = 200 - 10 * this.OD;
        self.GoodTime = 140 - 8 * this.OD;
        self.GreatTime = 80 - 6 * this.OD;
        self.errorMeter = new ErrorMeterOverlay({width: game.window.innerWidth, height: game.window.innerHeight}, this.GreatTime, this.GoodTime, this.MehTime);
        self.approachTime = this.AR<5? 1800-120*this.AR: 1950-150*this.AR;
        self.approachFadeInTime = Math.min(800, self.approachTime);
        
        for (let i=0; i<self.hits.length; ++i) {
            let hit = self.hits[i];
            if (self.modhidden && (i>0 && self.hits[i-1].type != "spinner")) {
                hit.objectFadeInTime = 0.4 * self.approachTime;
                hit.objectFadeOutOffset = -0.6 * self.approachTime;
                hit.circleFadeOutTime = 0.3 * self.approachTime;
            }
            else {
                hit.enableflash = true;
                hit.objectFadeInTime = Math.min(400, self.approachTime);
                hit.circleFadeOutTime = 100;
                hit.objectFadeOutOffset = self.MehTime;
            }
            
            if (self.mirror) {
                hit.x = 512 - hit.x;
                if (hit.keyframes) {
                    for (let j=0; j<hit.keyframes.length; ++j) {
                        hit.keyframes[j].x = 512 - hit.keyframes[j].x;
                    }
                }
            }
        }
        
        for (let i=0; i<self.hits.length; ++i) {
            if (self.hits[i].type == "slider") {
                if (self.modhidden && (i>0 && self.hits[i-1].type != "spinner")) {
                    self.hits[i].fadeOutOffset = -0.6 * self.approachTime;
                    self.hits[i].fadeOutDuration = self.hits[i].sliderTimeTotal - self.hits[i].fadeOutOffset;
                }
                else {
                    self.hits[i].fadeOutOffset = self.hits[i].sliderTimeTotal;
                    self.hits[i].fadeOutDuration = 300;
                }
            }
        }

        self.glowFadeOutTime = 350;
        self.glowMaxOpacity = 0.5;
        self.flashFadeInTime = 40;
        self.flashFadeOutTime = 120;
        self.flashMaxOpacity = 0.8;
        self.scoreFadeOutTime = 500;
        self.followZoomInTime = 100;
        self.followFadeOutTime = 100;
        self.ballFadeOutTime = 100;
        self.objectDespawnTime = 1500;
        self.backgroundFadeTime = 800;
        self.spinnerAppearTime = self.approachTime;
        self.spinnerZoomInTime = 300;
        self.spinnerFadeOutTime = 150;

        setPlayerActions(self);

        self.game.paused = false;self.triggerFail = function(time) {
        if (self.failed || self.nofail) return;
    
    self.failed = true;
    self.game.failed = true;
    
    if (game.sampleSectionFail) {
        game.sampleSectionFail.volume = game.masterVolume * game.effectVolume;
        game.sampleSectionFail.play();
    }
    
    self.osu.audio.pause();
    
    if (self.showFailAnimation) {
        for (let i=0; i<self.upcomingHits.length; ++i) {
            let hit = self.upcomingHits[i];
            if (hit.score < 0 && hit.objects) {
                for (let j=0; j<hit.objects.length; ++j) {
                    let obj = hit.objects[j];
                    if (obj && obj.visible) {
                        obj.classList = obj.classList || [];
                        obj.classList.push('hit-object-falling');
                        
                        let fallDelay = Math.random() * 500;
                        setTimeout(() => {
                            if (obj.parent) {
                                let container = obj.parent;
                                container.removeChild(obj);
                            }
                        }, 1000 + fallDelay);
                    }
                }
            }
        }
    }
    
    self.showFailScreen();
};

self.showFailScreen = function() {
    const failOverlay = document.createElement('div');
    failOverlay.className = 'fail-overlay';
    failOverlay.style.animation = 'fadeIn 0.5s ease';
    
    const failText = document.createElement('div');
    failText.className = 'fail-text';
    failText.innerText = 'FAILED';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'fail-buttons';
    
    const retryBtn = document.createElement('button');
    retryBtn.className = 'fail-button retry';
    retryBtn.innerText = 'Retry';
    retryBtn.onclick = () => {
        document.body.removeChild(failOverlay);
        self.retry();
    };
    
    const quitBtn = document.createElement('button');
    quitBtn.className = 'fail-button quit';
    quitBtn.innerText = 'Quit';
    quitBtn.onclick = () => {
        document.body.removeChild(failOverlay);
        self.quit();
    };
    
    buttonContainer.appendChild(retryBtn);
    buttonContainer.appendChild(quitBtn);
    
    failOverlay.appendChild(failText);
    failOverlay.appendChild(buttonContainer);
    
    document.body.appendChild(failOverlay);
};

self.drainHP = function(amount) {
    if (!self.enableHPDrain || self.nofail) return;
    
    self.hp -= amount;
    if (self.hp < 0) self.hp = 0;
    
    self.scoreOverlay.setHP(self.hp);
    
    if (self.hp <= 0 && !self.failed) {
        self.triggerFail(self.osu.audio.getPosition() * 1000);
    }
};

self.gainHP = function(amount) {
    if (!self.enableHPDrain) return;
    
    self.hp += amount;
    if (self.hp > 1) self.hp = 1;
    
    self.scoreOverlay.setHP(self.hp);
};

this.pause = function() {
    if (self.failed) return;
    if (this.osu.audio.pause()) {
        this.game.paused = true;
        let menu = document.getElementById("pause-menu");
        menu.removeAttribute("hidden");
        btn_continue = document.getElementById("pausebtn-continue");
        btn_retry = document.getElementById("pausebtn-retry");
        btn_quit = document.getElementById("pausebtn-quit");
        btn_continue.onclick = function() {
            self.resume();
            btn_continue.onclick = null;
            btn_retry.onclick = null;
            btn_quit.onclick = null;
        }
        btn_retry.onclick = function() {
            self.game.paused = false;
            menu.setAttribute("hidden","");
            self.retry();
        }
        btn_quit.onclick = function() {
            self.game.paused = false;
            menu.setAttribute("hidden","");
            self.quit();
        }
    }
};

this.resume = function() {
    this.osu.audio.play();
    this.game.paused = false;
    document.getElementById("pause-menu").setAttribute("hidden","");
};

var wheelCallback;
if (game.allowMouseScroll) {
    wheelCallback = function(e) {
        self.game.masterVolume -= e.deltaY * 0.002;
        if (self.game.masterVolume < 0) {
            self.game.masterVolume = 0;
        } 
        if (self.game.masterVolume > 1) {
            self.game.masterVolume = 1;
        }
        self.osu.audio.gain.gain.value = self.game.musicVolume * self.game.masterVolume;
        self.volumeMenu.setVolume(self.game.masterVolume * 100);
    };
    window.addEventListener('wheel', wheelCallback);
}

var pauseKeyCallback = function(e) {
    if ((e.keyCode === game.ESCkeycode || e.keyCode == game.ESC2keycode) && !self.game.paused && !self.failed) {
        self.pause();
        self.pausing = true;
    }
};

var resumeKeyCallback = function(e) {
    if ((e.keyCode === game.ESCkeycode || e.keyCode == game.ESC2keycode) && self.game.paused) {
        if (self.pausing)
            self.pausing = false;
        else
            self.resume();
    }
};

var skipKeyCallback = function(e) {
    if (e.keyCode === game.CTRLkeycode && !self.game.paused && !self.failed) {
        if (!self.skipped && !self.pausing)
            self.skip();
    }
}

window.addEventListener("keydown", pauseKeyCallback);
window.addEventListener("keyup", resumeKeyCallback);
window.addEventListener("keydown", skipKeyCallback);

this.fadeOutEasing = function(t) {
    if (t <= 0) return 1;
    if (t > 1) return 0;
    return 1 - Math.sin(t * Math.PI/2);
}

function judgementText(points) {
    switch (points) {
        case 0: return "miss";
        case 50: return "meh";
        case 100: return "good";
        case 300: return "great";
        default: throw "no such judgement";
    }
}

function judgementColor(points) {
    switch (points) {
        case 0: return 0xed1121;
        case 50: return 0xffcc22;
        case 100: return 0x88b300;
        case 300: return 0x66ccff;
        default: throw "no such judgement";
    }
}

this.createJudgement = function(x, y, depth, finalTime) {
    let judge = new PIXI.BitmapText('', {font: {name: 'Venera', size: 20}});
    judge.anchor.set(0.5);
    judge.scale.set(0.85 * this.hitSpriteScale, 1 * this.hitSpriteScale);
    judge.visible = false;
    judge.basex = judge.x = x;
    judge.basey = judge.y = y;
    judge.depth = depth;
    judge.points = -1;
    judge.finalTime = finalTime;
    judge.defaultScore = 0;
    return judge;
}

this.invokeJudgement = function(judge, points, time) {
    judge.visible = true;
    judge.points = points;
    judge.t0 = time;
    if (!this.hideGreat || points!=300)
        judge.text = judgementText(points);
    judge.tint = judgementColor(points);
    this.updateJudgement(judge, time);
}

this.updateJudgement = function(judge, time) {
    if (judge.points < 0 && time >= judge.finalTime) {
        this.scoreOverlay.hit(judge.defaultScore, 300, time);
        
        if (judge.defaultScore === 0) {
            this.drainHP(0.02);
            if (this.suddendeath) {
                this.triggerFail(time);
            }
        }
        
        this.invokeJudgement(judge, judge.defaultScore, time);
        return;
    }
    if (!judge.visible) return;

    let t = time - judge.t0;

    if (judge.points == 0) {
        if (t > 800) {
            judge.visible = false;
            return;
        }
        judge.alpha = (t<100)? t/100: (t<600)? 1: 1-(t-600)/200;
        judge.y = judge.basey + 100 * Math.pow(t/800, 5) * this.hitSpriteScale;
        judge.rotation = 0.7 * Math.pow(t/800, 5);
    }
    else {
        if (t > 500) {
            judge.visible = false;
            return;
        }
        judge.alpha = (t<100)? t/100: 1-(t-100)/400;
        judge.letterSpacing = 70 *(Math.pow(t/1800-1,5)+1);
    }
}

this.curtimingid = 0;

this.playTicksound = function playTicksound(hit, time) {
    while (this.curtimingid+1 < this.track.timingPoints.length && this.track.timingPoints[this.curtimingid+1].offset <= time)
        this.curtimingid++;
    while (this.curtimingid>0 && this.track.timingPoints[this.curtimingid].offset > time)
        this.curtimingid--;
    let timing = this.track.timingPoints[this.curtimingid];
    let volume = self.game.masterVolume * self.game.effectVolume * (hit.hitSample.volume || timing.volume) / 100;
    let defaultSet = timing.sampleSet || self.game.sampleSet;
    self.game.sample[defaultSet].slidertick.volume = volume;
    self.game.sample[defaultSet].slidertick.play();
};

this.playHitsound = function playHitsound(hit, id, time) {
    while (this.curtimingid+1 < this.track.timingPoints.length && this.track.timingPoints[this.curtimingid+1].offset <= time)
        this.curtimingid++;
    while (this.curtimingid>0 && this.track.timingPoints[this.curtimingid].offset > time)
        this.curtimingid--;
    let timing = this.track.timingPoints[this.curtimingid];
    let volume = self.game.masterVolume * self.game.effectVolume * (hit.hitSample.volume || timing.volume) / 100;
    let defaultSet = timing.sampleSet || self.game.sampleSet;
    
    function playHit(bitmask, normalSet, additionSet) {
        self.game.sample[normalSet].hitnormal.volume = volume;
        self.game.sample[normalSet].hitnormal.play();
        if (bitmask & 2) {
            self.game.sample[additionSet].hitwhistle.volume = volume;
            self.game.sample[additionSet].hitwhistle.play();
        }
        if (bitmask & 4) {
            self.game.sample[additionSet].hitfinish.volume = volume;
            self.game.sample[additionSet].hitfinish.play();
        }
        if (bitmask & 8) {
            self.game.sample[additionSet].hitclap.volume = volume;
            self.game.sample[additionSet].hitclap.play();
        }
    }
    
    if (hit.type == 'circle' || hit.type == 'spinner') {
        let toplay = hit.hitSound;
        let normalSet = hit.hitSample.normalSet || defaultSet;
        let additionSet = hit.hitSample.additionSet || normalSet;
        playHit(toplay, normalSet, additionSet);
    }
    if (hit.type == 'slider') {
        let toplay = hit.edgeHitsounds[id];
        let normalSet = hit.edgeSets[id].normalSet || defaultSet;
        let additionSet = hit.edgeSets[id].additionSet || normalSet;
        playHit(toplay, normalSet, additionSet);
    }
};

this.hitSuccess = function hitSuccess(hit, points, time){
    this.scoreOverlay.hit(points, 300, time);
    
    let hpGain = 0;
    let hpLoss = 0;
    
    if (points === 300) {
        hpGain = 0.01;
    } else if (points === 100) {
        hpGain = 0.005;
    } else if (points === 50) {
        hpLoss = 0.005;
    } else if (points === 0) {
        hpLoss = 0.02;
        if (this.suddendeath) {
            this.triggerFail(time);
        }
    }
    
    if (hpGain > 0) {
        this.gainHP(hpGain);
    } else if (hpLoss > 0) {
        this.drainHP(hpLoss);
    }
    
    if (points > 0) {
        if (hit.type == "spinner")
            self.playHitsound(hit, 0, hit.endTime);
        else {
            self.playHitsound(hit, 0, hit.time);
            self.errorMeter.hit(time - hit.time, time);
        }
        if (hit.type == "slider") {
            hit.judgements[hit.judgements.length-1].defaultScore = 50;
        }
    }
    
    hit.score = points;
    hit.clickTime = time;
    self.invokeJudgement(hit.judgements[0], points, time);
};
