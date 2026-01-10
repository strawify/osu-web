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

const startPreview = box => {
    const getVolume = () => {
        if (!window.gamesettings) return 0.5;
        const settings = window.gamesettings;
        const volume = (settings.get('masterVolume') || 0.7) * (settings.get('musicVolume') || 1.0);
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
    
    audio.play().catch(err => {
        console.error('Audio play failed:', err);
    });
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
        await fetch(`https://api.osugame.online/log/?msg=${encodeURIComponent(message)}`);
    } catch (err) {
        console.error('Failed to log to server:', err);
    }
};

const activeDownloads = new Map();

const startDownload = async box => {
    if (box.downloading) {
        showToast('Download already in progress', 'warning');
        return;
    }

    if (activeDownloads.has(box.sid)) {
        showToast('This beatmap is already being downloaded', 'warning');
        return;
    }

    startPreview(box);
    box.downloading = true;
    box.downloadComplete = false;
    activeDownloads.set(box.sid, true);
    box.classList.add('downloading');
    box.download_starttime = Date.now();

    const url = `https://txy1.sayobot.cn/beatmaps/download/mini/${box.sid}`;
    const statuslines = document.getElementById('statuslines');

    if (typeof NProgress !== 'undefined') {
        NProgress.configure({ 
            showSpinner: true,
            trickleSpeed: 200,
            parent: '#main-page'
        });
        NProgress.start();
    }

    const container = document.createElement('div');
    const titleEl = document.createElement('div');
    const progressBar = document.createElement('progress');
    const progressText = document.createElement('div');

    container.className = 'download-progress';
    container.dataset.sid = box.sid;
    
    titleEl.className = 'title';
    titleEl.innerText = box.setdata.title;
    
    progressBar.max = 1;
    progressBar.value = 0;
    
    progressText.className = 'progress-text';
    progressText.innerText = '0%';

    container.appendChild(titleEl);
    container.appendChild(progressBar);
    container.appendChild(progressText);
    statuslines.insertBefore(container, statuslines.children[3]);

    showToast(`Downloading: ${box.setdata.title}`, 'info');

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const contentLength = +response.headers.get('Content-Length');
        
        if (!contentLength) {
            throw new Error('Content-Length header missing');
        }

        let receivedLength = 0;
        const chunks = [];
        const startTime = Date.now();

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;
            const progress = receivedLength / contentLength;
            const percentage = Math.round(progress * 100);
            
            progressBar.value = progress;
            progressText.innerText = `${percentage}%`;
            
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = receivedLength / elapsed / 1024;
            const remaining = (contentLength - receivedLength) / (speed * 1024);
            
            if (speed > 0 && remaining > 0) {
                progressText.innerHTML = `
                    <span>${percentage}%</span>
                    <span class="progress-speed">${speed.toFixed(1)} KB/s - ${remaining.toFixed(0)}s remaining</span>
                `;
            }
            
            if (typeof NProgress !== 'undefined') {
                NProgress.set(progress);
            }
        }

        box.oszblob = new Blob(chunks);
        box.downloadComplete = true;
        box.downloading = false;
        activeDownloads.delete(box.sid);
        
        container.classList.add('completed');
        progressBar.value = 1;
        progressText.innerHTML = '<span>100% - Complete!</span>';
        
        const downloadTime = Date.now() - box.download_starttime;
        const sizeMB = (contentLength / 1024 / 1024).toFixed(2);
        logToServer(`downloaded ${box.sid} (${sizeMB}MB) in ${downloadTime}ms`);
        
        if (typeof NProgress !== 'undefined') {
            NProgress.done();
        }
        
        showToast(`Download complete: ${box.setdata.title}`, 'success');
        
        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            }, 500);
        }, 3000);
        
    } catch (err) {
        console.error('Download failed:', err);
        box.downloading = false;
        activeDownloads.delete(box.sid);
        
        container.classList.add('failed');
        progressText.innerHTML = '<span>Download failed!</span>';
        
        logToServer(`failed ${box.sid}: ${err.message}`);
        
        if (typeof NProgress !== 'undefined') {
            NProgress.done();
        }
        
        showToast(`Download failed: ${err.message}. Please try again.`, 'error');
        
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 5000);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { startDownload, startPreview, showToast };
}
