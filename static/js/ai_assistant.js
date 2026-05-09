const MY_GEMINI_API_KEY = "AIzaSyDeFWbOAGwmcMN9SPiI1VxY9NLVpyG1eUI";

function toggleAIChat() {
    const win = document.getElementById('aiWindow');
    if (win) {
        win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
    }
}

async function sendAIMessage() {
const input = document.getElementById('aiUserInput');
    const body = document.getElementById('aiChatBody');
    const btn = document.querySelector('.ai-chat-footer button');

    // --- УЛУЧШЕННОЕ ОПРЕДЕЛЕНИЕ ЯЗЫКА ---
    let currentLang = 'tk'; // По умолчанию
    const urlPath = window.location.pathname; // Берем путь из адресной строки

    if (urlPath.includes('/ru/')) {
        currentLang = 'ru';
    } else if (urlPath.includes('/en/')) {
        currentLang = 'en';
    } else if (urlPath.includes('/th/')) {
        currentLang = 'th';
    } else {
        // Если в URL нет префикса, пробуем взять из конфига или html
        const configEl = document.getElementById('ai-app-config');
        currentLang = configEl ? configEl.getAttribute('data-lang') : document.documentElement.lang || 'tk';
    }

    currentLang = currentLang.split('-')[0]; // Чистим от ru-RU -> ru
    console.log("РЕАЛЬНЫЙ язык, который уходит:", currentLang);
    console.log("Отправляю язык на сервер:", currentLang);

    const text = input.value.trim();
    if (!text) return;

    // Блокировка интерфейса
    input.value = '';
    input.disabled = true;
    btn.disabled = true;

    body.innerHTML += `<div class="ai-bubble user">${text}</div>`;
    const loadingId = "ai-loading-" + Date.now();
    body.innerHTML += `<div class="ai-bubble bot" id="${loadingId}">...</div>`;
    body.scrollTop = body.scrollHeight;

    try {
        const response = await fetch('/api/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                message: text,
                api_key: MY_GEMINI_API_KEY,
                lang: currentLang // Передаем свежеполученный язык
            })
        });

        const data = await response.json();
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (response.ok) {
            body.innerHTML += `<div class="ai-bubble bot">${data.reply}</div>`;
        } else {
            body.innerHTML += `<div class="ai-bubble bot" style="color:red">Error: ${data.reply}</div>`;
        }
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();
        body.innerHTML += `<div class="ai-bubble bot" style="color:red">Connection error.</div>`;
    } finally {
        input.disabled = false;
        btn.disabled = false;
        input.focus();
        body.scrollTop = body.scrollHeight;
    }
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