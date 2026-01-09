const showToast = (message, type = 'info') => {
    if (typeof Toastify !== 'undefined') {
        Toastify({
            text: message,
            duration: 3000,
            gravity: 'top',
            position: 'right',
            className: type,
            stopOnFocus: true
        }).showToast();
    }
};

const startPreview = box => {
    const getVolume = () => {
        if (!window.gamesettings) return 1;
        const volume = (window.gamesettings.mastervolume / 100) * (window.gamesettings.musicvolume / 100);
        return Math.min(1, Math.max(0, volume));
    };

    const stopAllPreviews = () => {
        const audios = document.getElementsByTagName('audio');
        for (let audio of audios) {
            if (audio.softstop) audio.softstop();
        }
    };

    const createAudioElement = () => {
        const audio = document.createElement('audio');
        const source = document.createElement('source');
        source.src = `https://cdn.sayobot.cn:25225/preview/${box.sid}.mp3`;
        source.type = 'audio/mpeg';
        audio.appendChild(source);
        audio.volume = 0;
        document.body.appendChild(audio);
        return audio;
    };

    const fadeVolume = (audio, targetVolume) => {
        const fadeInInterval = setInterval(() => {
            if (audio.volume < targetVolume) {
                audio.volume = Math.min(targetVolume, audio.volume + 0.05 * targetVolume);
            } else {
                clearInterval(fadeInInterval);
            }
        }, 30);

        const fadeOutInterval = setInterval(() => {
            if (audio.currentTime > 9.3) {
                audio.volume = Math.max(0, audio.volume - 0.05 * targetVolume);
            }
            if (audio.volume === 0) {
                clearInterval(fadeOutInterval);
            }
        }, 30);
    };

    stopAllPreviews();
    const audio = createAudioElement();
    const volume = getVolume();
    
    audio.play();
    fadeVolume(audio, volume);

    audio.softstop = () => {
        const fadeOut = setInterval(() => {
            audio.volume = Math.max(0, audio.volume - 0.05 * volume);
            if (audio.volume === 0) {
                clearInterval(fadeOut);
                audio.remove();
            }
        }, 10);
    };
};

const logToServer = async message => {
    try {
        await fetch(`http://api.osugame.online/log/?msg=${message}`);
    } catch (err) {
        console.error('Failed to log to server:', err);
    }
};

const startDownload = async box => {
    if (box.downloading) {
        showToast('Download already in progress', 'warning');
        return;
    }

    startPreview(box);
    box.downloading = true;
    box.classList.add('downloading');
    box.download_starttime = Date.now();

    const url = `https://txy1.sayobot.cn/beatmaps/download/mini/${box.sid}`;
    const statuslines = document.getElementById('statuslines');

    if (typeof NProgress !== 'undefined') {
        NProgress.start();
    }

    const container = document.createElement('div');
    const title = document.createElement('div');
    const progressBar = document.createElement('progress');

    container.className = 'download-progress';
    title.className = 'title';
    title.innerText = box.setdata.title;
    progressBar.max = 1;
    progressBar.value = 0;

    container.appendChild(title);
    container.appendChild(progressBar);
    statuslines.insertBefore(container, statuslines.children[3]);

    showToast(`Downloading: ${box.setdata.title}`, 'info');

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Download failed');
        }

        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        let receivedLength = 0;
        const chunks = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            const progress = receivedLength / contentLength;
            progressBar.value = progress;
            
            if (typeof NProgress !== 'undefined') {
                NProgress.set(progress);
            }
        }

        box.oszblob = new Blob(chunks);
        progressBar.className = 'finished';
        box.classList.remove('downloading');
        
        const downloadTime = Date.now() - box.download_starttime;
        logToServer(`got ${box.sid} in ${downloadTime}`);
        
        if (typeof NProgress !== 'undefined') {
            NProgress.done();
        }
        
        showToast(`Download complete: ${box.setdata.title}`, 'success');
    } catch (err) {
        console.error('Download failed:', err);
        box.downloading = false;
        box.classList.remove('downloading');
        logToServer(`fail ${box.sid}`);
        
        if (typeof NProgress !== 'undefined') {
            NProgress.done();
        }
        
        showToast('Beatmap download failed. Please retry later.', 'error');
    }
};
