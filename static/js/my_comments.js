
function loadComments() {
    // 1. Определяем текущий язык из URL (например, 'en', 'ru' или 'tk')
    const pathParts = window.location.pathname.split('/');
    const lang = pathParts[1];

    // 2. Формируем правильный путь к API с учетом языка
    // Если в URL есть код языка (длина 2 символа), добавляем его.
    // Если нет (базовый язык), используем обычный путь.
    let apiPath = '/api/comments/mine/';
    if (lang && lang.length === 2) {
        apiPath = `/${lang}/api/comments/mine/`;
    }

    console.log('Загрузка комментариев по пути:', apiPath);

    fetch(apiPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Данные получены:', data);
            const commentList = document.getElementById('comments');

            if (!commentList) {
                console.error('Ошибка: Элемент <div id="comments"> не найден на странице!');
                return;
            }

            commentList.innerHTML = '';

            if (!data || data.length === 0) {
                return;
            }

            data.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment';
                commentDiv.style = "border-bottom: 1px solid #ccc; padding: 10px; margin-bottom: 10px;";

                commentDiv.innerHTML = `
                    <p><strong>${comment.content || '...'}</strong></p>
                    ${comment.line_number ? `<p><small>${gettext('Setir')}: ${comment.line_number}</small></p>` : ''}
                    <p style="font-size: 0.9em; color: #555;">
                        ${gettext('Post')}: <em>${comment.post_title || '---'}</em>
                        <br>${gettext('Awtor')}: ${comment.post_author || '---'}
                    </p>
                `;
                commentList.appendChild(commentDiv);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке:', error);
            const commentList = document.getElementById('comments');
            if (commentList) {
                commentList.innerHTML = '<p>Ошибка загрузки данных. / Maglumatlary ýükläp bolmady.</p>';
            }
        });
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', loadComments);

        window.onload = loadComments;