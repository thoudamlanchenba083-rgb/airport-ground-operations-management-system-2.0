// ==========================
// SHARED LANDING SITE LOGIC
// Used by: landing, about, services, careers
// ==========================

// Initialize AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', function () {
    if (window.AOS) {
        AOS.init({
            duration: 700,
            once: true,
            offset: 60,
        });
    }
});

// Mobile hamburger menu toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open');
}

// Count-up animation for stats
function animateCounter(el, target, duration) {
    let startTime = null;
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * target);
        el.textContent = value.toLocaleString() + (el.dataset.suffix || '');
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = target.toLocaleString() + (el.dataset.suffix || '');
        }
    }
    requestAnimationFrame(step);
}

// Trigger counters when they scroll into view
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target, 10);
                animateCounter(el, target, 1500);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.4 });

    counters.forEach(c => observer.observe(c));
}

document.addEventListener('DOMContentLoaded', initCounters);