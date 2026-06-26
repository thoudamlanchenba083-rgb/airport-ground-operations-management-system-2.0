// theme.js — shared across all pages
// Applies saved theme immediately on load (before React mounts)
(function () {
    const saved = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', saved);
})();

// Returns a React Navbar with theme toggle built in.
// Usage: replace your existing Navbar function with this one,
// or call window.ThemedNavbar from each page's JS.
window.applyTheme = function () {
    const saved = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', saved);
};

window.toggleTheme = function () {
    const current = localStorage.getItem('theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.body.setAttribute('data-theme', next);
};
(function () {
    const saved = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', saved);
})();