let currentUsername = null;
let allPosts = [];
let currentPage = 1;
let isLoading = false;
let hasMorePosts = true;

function loadCurrentUser() {
    fetch('/api/get-current-user/')
        .then(response => response.json())
        .then(data => {
            currentUsername = data.username;
            console.log('Häzirki ulanyjy:', currentUsername);
            loadPosts();
        })
        .catch(error => {
            console.error('Häzirki ulanyjy ýüklenende ýalňyşlyk:', error);
        });
}

function loadPosts(reset = false) {
    if (isLoading) return;

    if (reset) {
        currentPage = 1;
        hasMorePosts = true;
        document.getElementById('post-list').innerHTML = '';
        const container = document.getElementById('load-more-container');
        if (container) container.style.display = 'block';
        const nomore = document.getElementById('no-more-message');
        if (nomore) nomore.remove();
    }

    if (!hasMorePosts) return;

    isLoading = true;
    const category = document.getElementById('category-filter').value;
    const searchQuery = document.getElementById('search-input').value;

    let url = `/api/posts/?page=${currentPage}`;
    if (category) url += `&category=${category}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    fetch(url)
        .then(r => r.json())
        .then(data => {
            const posts = data.posts || [];
            if (reset) allPosts = [];
            allPosts = allPosts.concat(posts);

            if (posts.length === 0) {
                hasMorePosts = false;
                if (currentPage === 1) {
                    document.getElementById('post-list').innerHTML = `<p style="text-align:center; padding:40px; color:#999;">${gettext('Postlar tapylmady.')}</p>`;
                } else {
                    showNoMoreMessage();
                }
                isLoading = false;
                return;
            }

            posts.forEach(post => renderPost(post));

            hasMorePosts = data.has_next === true;
            currentPage++;

            if (!hasMorePosts) showNoMoreMessage();

            isLoading = false;
        })
        .catch(err => {
            console.error(err);
            isLoading = false;
        });
}

function renderPost(post) {
    const postList = document.getElementById('post-list');
    const postDiv = document.createElement('div');
    postDiv.className = 'post';

    // Формируем текст для условий PDF
    const pdfLink = post.pdf
        ? `<a href="${post.pdf}" target="_blank">${gettext('Kitaby açmak')}</a>${post.allow_download ? ` | <a href="${post.pdf}" download>${gettext('PDF download')}</a>` : ''}`
        : gettext('PDF ýok');

    postDiv.innerHTML = `
        <div class="post-header">
             <h3>${post.book_title || 'Без названия'} (${gettext("Awtor")}: ${post.author_username || 'Неизвестен'} <span class="author-level">[${gettext("Dereje")} ${post.author_level || 0}]</span>)</h3>
            <button class="toggle-post" onclick="togglePost(${post.id}, this)">${gettext("Giňişleýin...")}</button>
        </div>
        <div class="post-body collapsed" id="post-body-${post.id}">
            <p>${post.content || gettext('Mazmun ýok')}</p>
            ${pdfLink}
            <p>${gettext("Kategoriýa")}: ${getCategoryName(post.category)}</p>
            <p>${gettext('Like')}: <span id="likes-count-${post.id}">${post.likes_count || 0}</span></p>
            <button class="like-button" onclick="toggleLike(${post.id}, this)">❤️</button>
            <div class="comment-list" id="comments-${post.id}"><h4>${gettext('Teswirler')}</h4></div>
            <div class="comment-form">
                <input type="text" placeholder="${gettext('Teswir')}">
                <input type="number" placeholder="${gettext('Setir belgisi')}.">
                <button onclick="addComment(${post.id}, this)">${gettext('Goşmak')}</button>
            </div>
        </div>`;
    postList.appendChild(postDiv);
    loadComments(post.id, post.author_username);
}

function showNoMoreMessage() {
    if (document.getElementById('no-more-message')) return;
    const div = document.createElement('div');
    div.id = 'no-more-message';
    div.innerHTML = `<p style="text-align:center; color:#999; margin:40px 0;">${gettext('Ähli postlar görkezildi')}</p>`;

    const container = document.getElementById('load-more-container');
    if (container) container.style.display = 'none';

    document.getElementById('post-list').after(div);
}

function getCategoryName(category) {
    const categories = {
        '1': gettext("Kitap"),
        '2': gettext("Gollanma"),
        '3': gettext("Referat"),
        '4': gettext("Ylmy iş"),
        '5': gettext("Konspekt"),
        '6': gettext("Diplom işi"),
        '7': gettext("Sapak ýazgylary"),
    };
    return categories[category] || gettext("Näbelli kategoriýa");
}

function togglePost(postId, button) {
    const postBody = document.getElementById(`post-body-${postId}`);
    if (postBody.classList.contains('collapsed')) {
        postBody.classList.remove('collapsed');
        button.textContent = gettext("Gysga");
    } else {
        postBody.classList.add('collapsed');
        button.textContent = gettext("Giňişleýin...");
    }
}

function toggleLike(postId, button) {
    fetch('/api/like-post/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ post_id: postId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const likesCountElement = document.getElementById(`likes-count-${postId}`);
            likesCountElement.textContent = data.likes_count;
            // Обновляем посты, если это необходимо по вашей логике
            // loadPosts(); // Внимание: полный loadPosts() сбросит скролл, лучше просто обновить цифру
        }
    })
    .catch(error => {
        console.error('Like ýalňyşlygy:', error);
    });
}

function loadComments(postId, postAuthorUsername) {
    fetch(`/api/comment-list-with-replies/${postId}/`)
        .then(response => response.json())
        .then(data => {
            const commentList = document.getElementById(`comments-${postId}`);
            commentList.innerHTML = `<h4>${gettext('Teswirler')}</h4>`;
            if (!data || data.length === 0) {
                commentList.innerHTML += `<p>${gettext('Teswir ýok')}.</p>`;
            } else {
                data.forEach(comment => {
                    renderComment(comment, commentList, postId, postAuthorUsername);
                });
            }
        })
        .catch(error => {
            console.error('Teswirler ýüklenende ýalňyşlyk:', error);
        });
}

function renderComment(comment, parentElement, postId, postAuthorUsername) {
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment' + (comment.replies?.length > 0 ? ' has-replies' : '');
    if (comment.confirmed) commentDiv.classList.add('confirmed');
    commentDiv.setAttribute('data-comment-id', comment.id);

    const isCurrentUser = comment.author_username === currentUsername;
    const isPostAuthor = currentUsername === postAuthorUsername;

    let actions = '';
    if (isCurrentUser) {
        actions += `
            <div class="comment-actions">
                <button class="comment-action" onclick="editComment(${postId}, ${comment.id}, this)">${gettext('Üýtget')}</button>
                <button class="comment-action" onclick="deleteComment(${postId}, ${comment.id})">${gettext('Öçür')}</button>
            </div>
            <div class="edit-form" id="edit-form-${postId}-${comment.id}">
                <input type="text" value="${escapeHtml(comment.content)}">
                <button onclick="saveEdit(${postId}, ${comment.id}, this)">${gettext('Ýatda saklamak')}</button>
            </div>`;
    }
    if (isPostAuthor && !comment.confirmed) {
        actions += `<button class="confirm-button" onclick="confirmComment(${postId}, ${comment.id}, this)">${gettext('TASSYKLAMAK')}</button>`;
    }

    commentDiv.innerHTML = `
        <img src="${comment.avatar_url || '/static/img/default-avatar.png'}" class="comment-avatar">
        <div class="comment-content">
            <p><strong>${comment.author_username}</strong> <span class="author-level">[${comment.author_level || 0}]</span></p>
            <p>${escapeHtml(comment.content)}</p>
            ${comment.line_number ? `<p><small>${gettext('Setir')}: ${comment.line_number}</small></p>` : ''}
            <div class="timestamp">${new Date(comment.created_at).toLocaleString('tm-TM')}</div>
            ${actions}
            <button class="toggle-reply" onclick="toggleReplyForm(${postId}, ${comment.id}, this)">${gettext('Jogap ber')}</button>
            <div class="reply-form" id="reply-form-${postId}-${comment.id}">
                <input type="text" placeholder="${gettext("Jogabyňyz")}">
                <button onclick="addReply(${postId}, ${comment.id}, this)">${gettext('Ugratmak')}</button>
            </div>
        </div>
    `;

    parentElement.appendChild(commentDiv);
    if (comment.replies && comment.replies.length > 0) {
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'replies';
        comment.replies.forEach(reply => renderComment(reply, repliesDiv, postId, postAuthorUsername));
        parentElement.appendChild(repliesDiv);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function toggleReplyForm(postId, commentId, button) {
    const form = document.getElementById(`reply-form-${postId}-${commentId}`);
    if (form) form.classList.toggle('show');
}

function addReply(postId, parentId, button) {
    const form = button.parentElement;
    const content = form.querySelector('input[type="text"]').value;
    fetch('/api/comment-create-with-reply/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ post_id: postId, content, parent_id: parentId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            form.querySelector('input[type="text"]').value = '';
            loadComments(postId);
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Jogap goşmakda ýalňyşlyk:', error);
    });
}

function addComment(postId, button) {
    const form = button.parentElement;
    const content = form.querySelector('input[type="text"]').value;
    const lineNumber = form.querySelector('input[type="number"]').value;
    fetch('/api/comment-create-with-reply/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ post_id: postId, content, line_number: lineNumber })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            form.querySelector('input[type="text"]').value = '';
            form.querySelector('input[type="number"]').value = '';
            loadComments(postId);
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Teswir goşmakda ýalňyšlyk:', error);
    });
}

function deleteComment(postId, commentId) {
    if (confirm(gettext("Teswiri pozmak isleýärsiňizmi?"))) {
        fetch('/api/comment-delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ comment_id: commentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadComments(postId);
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Teswiri pozmakda ýalňyşlyk:', error);
        });
    }
}

function editComment(postId, commentId, button) {
    const form = document.getElementById(`edit-form-${postId}-${commentId}`);
    if (form) form.classList.toggle('show');
}

function saveEdit(postId, commentId, button) {
    const form = button.parentElement;
    const content = form.querySelector('input[type="text"]').value;
    fetch('/api/comment-update/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ comment_id: commentId, content })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            form.classList.remove('show');
            loadComments(postId);
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Üýtgetmekde ýalňyşlyk:', error);
    });
}

function confirmComment(postId, commentId, button) {
    if (confirm(gettext("Вы точно хотите подтвердить комментарий?"))) {
        fetch('/api/confirm-comment/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ comment_id: commentId, post_id: postId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadComments(postId);
            } else {
                alert(data.message || gettext("Не удалось подтвердить комментарий."));
            }
        })
        .catch(error => {
            console.error('Tassyklamakda ýalňyşlyk:', error);
        });
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

window.onload = loadCurrentUser;

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 && !isLoading && hasMorePosts) {
        loadPosts();
    }
});

// События фильтрации
document.querySelector('#category-filter').onchange = () => loadPosts(true);