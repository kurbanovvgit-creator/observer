(function () {
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-mobile-menu');
    const backdrop = document.getElementById('nav-mobile-backdrop');
    const logoutForm = document.getElementById('nav-logout-form-mobile');

    function normalizePath(path) {
        const p = (path || '/').replace(/\/+$/, '') || '/';
        return p;
    }

    function getCurrentPath() {
        return normalizePath(window.location.pathname);
    }

    function linkPath(href) {
        if (!href) return null;
        try {
            return normalizePath(new URL(href, window.location.origin).pathname);
        } catch {
            return normalizePath(href);
        }
    }

    function pathsMatch(current, target) {
        if (!target) return false;
        if (current === target) return true;
        if (current.endsWith(target)) return true;
        return current.startsWith(target + '/');
    }

    function setMenuOpen(open) {
        if (!toggle || !menu) return;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        menu.classList.toggle('is-open', open);
        menu.hidden = !open;
        if (backdrop) {
            backdrop.hidden = !open;
            backdrop.classList.toggle('is-visible', open);
        }
        document.body.classList.toggle('nav-menu-open', open);
    }

    function closeMenu() {
        setMenuOpen(false);
    }

    function openMenu() {
        setMenuOpen(true);
    }

    function syncActiveLinks() {
        const current = getCurrentPath();

        document.querySelectorAll(
            '.nav-desktop .nav-btn[href], .nav-mobile-link[href], .nav-profile-btn[href]'
        ).forEach((link) => {
            const active = pathsMatch(current, linkPath(link.getAttribute('href')));
            link.classList.toggle('nav-btn--active', active);
            link.classList.toggle('nav-mobile-link--active', active);
            link.classList.toggle('nav-profile-btn--active', active);
        });
    }

    if (toggle && menu) {
        toggle.addEventListener('click', function () {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        menu.querySelectorAll('.nav-mobile-link[href]').forEach((link) => {
            link.addEventListener('click', function () {
                closeMenu();
            });
        });

        if (backdrop) {
            backdrop.addEventListener('click', closeMenu);
        }

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeMenu();
            }
        });
    }

    if (logoutForm) {
        const mobileLogoutBtn = menu && menu.querySelector('.nav-mobile-link--logout');
        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener('click', function () {
                closeMenu();
            });
        }
    }

    syncActiveLinks();
})();
