// --- ПЕРЕКЛЮЧЕНИЕ ФОРМ ---
function showRegister() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginLink = document.getElementById('login-link');
    const switchLink = document.getElementById('switch-link');

    if (loginForm) loginForm.style.display = 'none';
    if (regForm) regForm.style.display = 'block';
    if (loginLink) loginLink.style.display = 'block';
    if (switchLink) switchLink.style.display = 'none';
}

function showLogin() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginLink = document.getElementById('login-link');
    const switchLink = document.getElementById('switch-link');

    if (regForm) regForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (loginLink) loginLink.style.display = 'none';
    if (switchLink) switchLink.style.display = 'block';
}

// --- ЛОГИН ---
const loginFormElement = document.getElementById('login-form');
if (loginFormElement) {
    loginFormElement.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        // window.location.pathname автоматически подставит /tk/login/ или /ru/login/
        fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Редирект на список книг относительно текущего языка
                window.location.href = '../my-books/';
            } else {
                alert(data.message || 'Girişde ýalňyşlyk');
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

// --- РЕГИСТРАЦИЯ ---
const registerFormElement = document.getElementById('register-form');
if (registerFormElement) {
    registerFormElement.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username, email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '../my-books/';
            } else {
                alert(data.message || 'Hasaba alyşda ýalňyşlyk');
            }
        })
        .catch(error => console.error('Error:', error));
    });
}

// --- ЗАГРУЗКА ФОНА ---
const bgUpload = document.getElementById('background-upload');
if (bgUpload) {
    bgUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file); // В твоем views.py в profile_update ожидается 'avatar'

            fetch('/api/profile/update/', { // Путь к API (проверь префиксы в urls.py)
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const url = URL.createObjectURL(file);
                    document.body.style.backgroundImage = `url(${url})`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center';
                } else {
                    alert('Fon ýüklenende ýalňyşlyk');
                }
            })
            .catch(error => console.error('Error:', error));
        }
    });
}

// --- ПОЛУЧЕНИЕ CSRF TOKEN ---
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