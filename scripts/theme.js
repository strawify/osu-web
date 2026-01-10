(() => {
    const THEME_KEY = 'osu-web-theme';
    const DARK_THEME = 'dark';
    const LIGHT_THEME = 'light';

    const getStoredTheme = () => localStorage.getItem(THEME_KEY) || DARK_THEME;
    
    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateThemeIcon(theme);
    };

    const updateThemeIcon = (theme) => {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        const icon = themeToggle.querySelector('i');
        if (!icon) return;

        icon.className = theme === DARK_THEME ? 'fas fa-moon' : 'fas fa-sun';
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
        setTheme(newTheme);
    };

    const initTheme = () => {
        const storedTheme = getStoredTheme();
        setTheme(storedTheme);

        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    window.toggleTheme = toggleTheme;
})();
