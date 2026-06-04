(function () {
    const body = document.body;
    const urls = {
        login: body.dataset.urlLogin || '/login/',
        register: body.dataset.urlRegister || '/register/',
        home: body.dataset.urlHome || '/my-books/'
    };

    const TEXT = {
        loginHeading: 'Giriş',
        registerHeading: 'Hasaba alyş',
        loginTitle: 'Giriş',
        registerTitle: 'Hasaba alyş',
        loginError: 'Girişde ýalňyşlyk',
        registerError: 'Hasaba alyşda ýalňyşlyk'
    };

    if (typeof gettext === 'function') {
        TEXT.loginHeading = gettext('Giriş');
        TEXT.registerHeading = gettext('Hasaba alyş');
        TEXT.loginTitle = TEXT.loginHeading;
        TEXT.registerTitle = TEXT.registerHeading;
        TEXT.loginError = gettext('Girişde ýalňyşlyk');
        TEXT.registerError = gettext('Hasaba alyşda ýalňyşlyk');
    }

    function setAuthMode(mode) {
        const isRegister = mode === 'register';
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const loginLink = document.getElementById('login-link');
        const switchLink = document.getElementById('switch-link');
        const heading = document.getElementById('auth-heading');
        const pageTitle = document.getElementById('auth-page-title');

        if (loginForm) loginForm.style.display = isRegister ? 'none' : 'flex';
        if (regForm) regForm.style.display = isRegister ? 'flex' : 'none';
        if (loginLink) loginLink.style.display = isRegister ? 'block' : 'none';
        if (switchLink) switchLink.style.display = isRegister ? 'none' : 'block';

        if (heading) {
            heading.textContent = isRegister ? TEXT.registerHeading : TEXT.loginHeading;
        }
        if (pageTitle) {
            pageTitle.textContent = (isRegister ? TEXT.registerTitle : TEXT.loginTitle) + ' — SYNÇY';
        }
        body.dataset.authMode = mode;
    }

    window.showRegister = function () {
        setAuthMode('register');
        history.replaceState(null, '', urls.register);
    };

    window.showLogin = function () {
        setAuthMode('login');
        history.replaceState(null, '', urls.login);
    };

    const initialMode = body.dataset.authMode === 'register' ? 'register' : 'login';
    setAuthMode(initialMode);

    const loginFormElement = document.getElementById('login-form');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', function (event) {
            event.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            fetch(urls.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ username, password })
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        window.location.href = urls.home;
                    } else {
                        alert(data.message || TEXT.loginError);
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert(TEXT.loginError);
                });
        });
    }

    const registerFormElement = document.getElementById('register-form');
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', function (event) {
            event.preventDefault();
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;

            fetch(urls.register, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ username, email, password })
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        window.location.href = urls.home;
                    } else {
                        alert(data.message || TEXT.registerError);
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                    alert(TEXT.registerError);
                });
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
})();
