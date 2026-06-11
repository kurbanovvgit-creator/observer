const MY_COMMENTS_API = '/api/comments/mine/';
let myCommentsCurrentUser = '';

function formatAdminDate(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function renderAdminMessageCard(message) {
    const date = formatAdminDate(message.reviewed_at || message.created_at);
    const statusClass = message.status === 'reviewed' ? 'admin-message-card--reviewed' : 'admin-message-card--dismissed';
    const meta = [
        message.report_type_label || '',
        message.book_title ? `${gettext('Kitap')}: ${message.book_title}` : '',
        `@${message.reported_user || '—'}`,
    ].filter(Boolean).join(' · ');

    return `
        <article class="admin-message-card ${statusClass}">
            <header class="admin-message-card__head">
                <span class="admin-message-card__badge">${gettext('Admin')}</span>
                <span class="admin-message-card__status">${message.status_label || ''}</span>
                <time class="admin-message-card__date">${date}</time>
            </header>
            <p class="admin-message-card__meta">${CommentsUI.escapeHtml(meta)}</p>
            ${message.comment_preview ? `<p class="admin-message-card__ref">${gettext('Teswir')}: «${CommentsUI.escapeHtml(message.comment_preview)}»</p>` : ''}
            <div class="admin-message-card__body">${message.admin_message || ''}</div>
        </article>
    `;
}

function loadComments() {
    const commentList = document.getElementById('comments');
    const adminList = document.getElementById('admin-messages');
    const adminSection = document.getElementById('admin-messages-section');
    const postTitle = document.getElementById('post-comments-title');
    if (!commentList) return;

    commentList.classList.add('comments-stack');

    Promise.all([
        fetch('/api/get-current-user/', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : {})),
        fetch(MY_COMMENTS_API, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
        }).then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        }),
    ])
        .then(([userData, data]) => {
            myCommentsCurrentUser = userData.username || '';
            const postComments = Array.isArray(data) ? data : (data.post_comments || []);
            const adminMessages = Array.isArray(data) ? [] : (data.admin_messages || []);

            if (adminList && adminSection) {
                adminList.innerHTML = '';
                if (adminMessages.length) {
                    adminSection.hidden = false;
                    adminMessages.forEach((msg) => {
                        adminList.insertAdjacentHTML('beforeend', renderAdminMessageCard(msg));
                    });
                } else {
                    adminSection.hidden = true;
                }
            }

            commentList.innerHTML = '';

            if (postComments.length && postTitle) {
                postTitle.hidden = false;
            } else if (postTitle) {
                postTitle.hidden = true;
            }

            if (!postComments.length && !adminMessages.length) {
                commentList.innerHTML = `<p class="comments-empty">${gettext('Entek habar ýok.')}</p>`;
                return;
            }

            if (!postComments.length) {
                commentList.innerHTML = `<p class="comments-empty">${gettext('Postlaryňyza entek teswir ýazylmady.')}</p>`;
                return;
            }

            postComments.forEach((comment) => {
                appendMyCommentCard(comment, commentList);
            });
        })
        .catch((error) => {
            console.error('Teswirleri ýüklemekde ýalňyşlyk:', error);
            commentList.innerHTML = `<p class="comments-empty" style="color:var(--danger);">${gettext('Teswirleri ýüklemekde ýalňyşlyk.')}</p>`;
        });
}

function appendMyCommentCard(comment, parentElement) {
    const wrap = document.createElement('div');
    wrap.innerHTML = CommentsUI.renderMyCommentCard(comment, myCommentsCurrentUser);
    const card = wrap.firstElementChild;
    if (card) parentElement.appendChild(card);

    if (comment.replies && comment.replies.length) {
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'comment-replies';
        comment.replies.forEach((reply) => appendMyCommentCard(reply, repliesDiv));
        parentElement.appendChild(repliesDiv);
    }
}

document.addEventListener('DOMContentLoaded', loadComments);
