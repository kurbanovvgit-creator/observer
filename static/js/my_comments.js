const MY_COMMENTS_API = '/api/comments/mine/';

function loadComments() {
    const commentList = document.getElementById('comments');
    if (!commentList) return;

    commentList.classList.add('comments-stack');

    fetch(MY_COMMENTS_API, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            commentList.innerHTML = '';

            if (!Array.isArray(data) || data.length === 0) {
                commentList.innerHTML = `<p class="comments-empty">${gettext('Postlaryňyza entek teswir ýazylmady.')}</p>`;
                return;
            }

            data.forEach((comment) => {
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
    wrap.innerHTML = CommentsUI.renderMyCommentCard(comment);
    const card = wrap.firstElementChild;
    if (card) parentElement.appendChild(card);

    if (comment.replies && comment.replies.length > 0) {
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'comment-replies';
        comment.replies.forEach((reply) => appendMyCommentCard(reply, repliesDiv));
        parentElement.appendChild(repliesDiv);
    }
}

document.addEventListener('DOMContentLoaded', loadComments);
