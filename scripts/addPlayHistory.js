function addPlayHistory(sid, title, artist, creator, stars) {
    if (!window.playHistory1000) {
        window.playHistory1000 = [];
    }
    
    const historyItem = {
        sid: sid,
        title: title,
        artist: artist,
        creator: creator,
        stars: stars,
        timestamp: Date.now()
    };
    
    window.playHistory1000.unshift(historyItem);
    
    if (window.playHistory1000.length > 1000) {
        window.playHistory1000 = window.playHistory1000.slice(0, 1000);
    }
    
    try {
        localStorage.setItem('playhistory1000', JSON.stringify(window.playHistory1000));
    } catch(e) {
        console.error('Failed to save play history:', e);
    }
}
