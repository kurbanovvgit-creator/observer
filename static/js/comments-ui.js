/* Общий UI комментариев — карточки в стиле MDB */
window.CommentsUI = (function () {
    const DEFAULT_AVATAR =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23faf7f1'/%3E%3Ccircle cx='12' cy='8' r='3.5' fill='%236b4423'/%3E%3Cpath fill='%236b4423' d='M5 20.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5z'/%3E%3C/svg%3E";

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function formatDate(iso) {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleString();
        } catch {
            return iso;
        }
    }

    function avatarHtml(url, username, sizeClass) {
        const cls = `comment-card__avatar ${sizeClass || ''}`.trim();
        if (url) {
            return `<img class="${cls}" src="${escapeHtml(url)}" alt="" width="60" height="60" loading="lazy">`;
        }
        const initial = (username || '?').charAt(0).toUpperCase();
        return `<span class="${cls} comment-card__avatar--placeholder" aria-hidden="true">${initial}</span>`;
    }

    function buildPostComposer(postId, userAvatar, username) {
        return `
            <div class="comment-composer-wrap" id="composer-wrap-${postId}">
                <button
                    type="button"
                    class="comment-add-trigger"
                    id="composer-trigger-${postId}"
                    onclick="CommentsUI.toggleComposer(${postId}, true)"
                    aria-expanded="false"
                    aria-controls="composer-${postId}"
                >
                    <span class="comment-add-trigger__icon" aria-hidden="true">+</span>
                    <span>${gettext('Teswir goşmak')}</span>
                </button>
                <div class="comment-card comment-composer is-hidden" id="composer-${postId}" hidden>
                    <div class="comment-card__footer">
                        <div class="comment-composer__row">
                            ${avatarHtml(userAvatar, username, 'comment-card__avatar--sm')}
                            <div class="comment-composer__field">
                                <textarea class="comment-composer__textarea" id="composer-text-${postId}" rows="3" placeholder="${gettext('Teswiriňiz')}"></textarea>
                                <span class="comment-composer__label">${gettext('Habar')}</span>
                            </div>
                        </div>
                        <div class="comment-composer__toolbar">
                            <input type="number" class="comment-composer__line" id="composer-line-${postId}" placeholder="${gettext('Setir')}" min="1" aria-label="${gettext('Setir belgisi')}">
                            <button type="button" class="comment-composer__btn comment-composer__btn--ghost" onclick="CommentsUI.toggleComposer(${postId}, false)">${gettext('Ýatyr')}</button>
                            <button type="button" class="comment-composer__btn comment-composer__btn--primary" onclick="addComment(${postId})">${gettext('Teswir goş')}</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function toggleComposer(postId, show) {
        const composer = document.getElementById(`composer-${postId}`);
        const trigger = document.getElementById(`composer-trigger-${postId}`);
        if (!composer) return;

        const open = Boolean(show);
        composer.classList.toggle('is-hidden', !open);
        composer.hidden = !open;

        if (trigger) {
            trigger.classList.toggle('is-hidden', open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        if (open) {
            const text = document.getElementById(`composer-text-${postId}`);
            if (text) text.focus();
        } else {
            resetComposer(postId);
        }
    }

    function buildReplyFooter(postId, commentId, userAvatar, username) {
        return `
            <div class="comment-card__footer is-hidden" id="reply-form-${postId}-${commentId}">
                <div class="comment-composer__row">
                    ${avatarHtml(userAvatar, username, 'comment-card__avatar--sm')}
                    <div class="comment-composer__field">
                        <textarea class="comment-composer__textarea" rows="2" placeholder="${gettext('Jogabyňyz')}"></textarea>
                        <span class="comment-composer__label">${gettext('Jogap')}</span>
                    </div>
                </div>
                <div class="comment-composer__toolbar">
                    <button type="button" class="comment-composer__btn comment-composer__btn--ghost" onclick="CommentsUI.toggleReply(${postId}, ${commentId})">${gettext('Ýatyr')}</button>
                    <button type="button" class="comment-composer__btn comment-composer__btn--primary" onclick="addReply(${postId}, ${commentId}, this)">${gettext('Ugrat')}</button>
                </div>
            </div>`;
    }

    function renderCard(comment, options) {
        const {
            postId,
            postAuthorUsername,
            currentUsername,
            userAvatar,
            readOnly = false
        } = options;

        const isCurrentUser = comment.author_username === currentUsername;
        const isPostAuthor = currentUsername === postAuthorUsername;
        const isConfirmed = Boolean(comment.confirmed);
        const confirmed = isConfirmed ? ' confirmed' : '';

        let extra = '';
        if (!readOnly && !isConfirmed && isCurrentUser) {
            extra += '<div class="comment-card__extra">';
            if (isCurrentUser) {
                extra += `
                    <div class="comment-card__chips">
                        <button type="button" class="btn-chip" onclick="editComment(${postId}, ${comment.id})">${gettext('Üýtget')}</button>
                        <button type="button" class="btn-chip btn-chip--danger" onclick="deleteComment(${postId}, ${comment.id})">${gettext('Öçür')}</button>
                    </div>
                    <div class="comment-edit-form" id="edit-form-${postId}-${comment.id}">
                        <label class="comment-edit-form__label" for="edit-text-${postId}-${comment.id}">${gettext('Teswiri üýtget')}</label>
                        <textarea class="comment-composer__textarea" id="edit-text-${postId}-${comment.id}" rows="3">${escapeHtml(comment.content)}</textarea>
                        <div class="comment-composer__toolbar">
                            <button type="button" class="comment-composer__btn comment-composer__btn--ghost" onclick="cancelEdit(${postId}, ${comment.id})">${gettext('Ýatyr')}</button>
                            <button type="button" class="comment-composer__btn comment-composer__btn--primary" onclick="saveEdit(${postId}, ${comment.id})">${gettext('Ýatda sakla')}</button>
                        </div>
                    </div>`;
            }
            extra += '</div>';
        }
        if (!readOnly && !isConfirmed && isPostAuthor) {
            extra += `
                <div class="comment-card__extra">
                    <div class="comment-card__chips comment-card__chips--author">
                        <button type="button" class="btn-chip btn-chip--confirm" onclick="confirmComment(${postId}, ${comment.id}, this)">${gettext('Tassykla')}</button>
                    </div>
                </div>`;
        }

        const lineHtml = comment.line_number
            ? `<p class="comment-card__line">${gettext('Setir')}: ${comment.line_number}</p>`
            : '';

        const actions = readOnly || isConfirmed
            ? ''
            : `
            <div class="comment-card__actions">
                <button type="button" class="comment-card__action comment-card__action--primary" onclick="CommentsUI.toggleReply(${postId}, ${comment.id})">
                    💬 ${gettext('Jogap ber')}
                </button>
            </div>`;

        const confirmedBadge = isConfirmed
            ? `<span class="comment-card__badge">${gettext('Tassyklanan')}</span>`
            : '';

        const metaExtra = options.metaExtra || '';

        const footer = readOnly || isConfirmed
            ? ''
            : buildReplyFooter(postId, comment.id, userAvatar, currentUsername);

        return `
            <article class="comment-card${confirmed}" data-comment-id="${comment.id}">
                <div class="comment-card__body">
                    <div class="comment-card__head">
                        ${avatarHtml(comment.avatar_url, comment.author_username)}
                        <div class="comment-card__meta-wrap">
                            <h6 class="comment-card__author">${escapeHtml(comment.author_username)}</h6>
                            <p class="comment-card__meta">
                                ${formatDate(comment.created_at)}
                                · ${gettext('Dereje')} ${comment.author_level || 0}
                                ${metaExtra}
                                ${confirmedBadge}
                            </p>
                        </div>
                    </div>
                    <p class="comment-card__text">${escapeHtml(comment.content)}</p>
                    ${lineHtml}
                    ${actions}
                    ${extra}
                </div>
                ${footer}
            </article>`;
    }

    function renderMyCommentCard(comment) {
        const bookTitle = escapeHtml(comment.book_title || comment.post_title || '—');
        const commentAuthor = escapeHtml(comment.author_username || '—');
        const metaExtra = ` · ${gettext('Kitap')}: ${bookTitle} · ${gettext('Awtor')}: ${commentAuthor}`;

        return renderCard(comment, {
            postId: 0,
            readOnly: true,
            metaExtra
        });
    }

    function toggleReply(postId, commentId) {
        const el = document.getElementById(`reply-form-${postId}-${commentId}`);
        if (el) el.classList.toggle('is-hidden');
    }

    function resetComposer(postId) {
        const text = document.getElementById(`composer-text-${postId}`);
        const line = document.getElementById(`composer-line-${postId}`);
        if (text) text.value = '';
        if (line) line.value = '';
    }

    return {
        DEFAULT_AVATAR,
        escapeHtml,
        formatDate,
        avatarHtml,
        buildPostComposer,
        renderCard,
        renderMyCommentCard,
        toggleReply,
        toggleComposer,
        resetComposer
    };
})();
