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

    function buildReportButton(postId, commentId, username, reportType, label, inline) {
        const wrapTag = inline ? 'span' : 'div';
        const wrapClass = inline ? 'comment-card__report-inline' : 'comment-card__report-row';
        return `
            <${wrapTag} class="${wrapClass}">
                <button
                    type="button"
                    class="comment-card__action comment-card__action--report${reportType === 'no_confirmation' ? ' comment-card__action--report-post' : ''}"
                    data-report-comment="${commentId}"
                    data-report-post="${postId}"
                    data-report-user="${escapeHtml(username)}"
                    data-report-type="${reportType}"
                    onclick="CommentsUI.openReportModal(this)"
                >
                    🚩 ${escapeHtml(label || gettext('Şikayat'))}
                </button>
            </${wrapTag}>`;
    }

    function renderCard(comment, options) {
        const {
            postId,
            postAuthorUsername,
            currentUsername,
            userAvatar,
            readOnly = false
        } = options;

        const resolvedPostAuthor = postAuthorUsername || comment.post_author || '';
        const viewer = currentUsername || '';
        const isCurrentUser = viewer && comment.author_username === viewer;
        const isPostAuthor = viewer && viewer === resolvedPostAuthor;
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

        let actionButtons = '';

        if (!readOnly && !isConfirmed) {
            actionButtons += `
                <button type="button" class="comment-card__action comment-card__action--primary" onclick="CommentsUI.toggleReply(${postId}, ${comment.id})">
                    💬 ${gettext('Jogap ber')}
                </button>`;
        }

        if (viewer && comment.author_username !== viewer) {
            actionButtons += buildReportButton(
                postId,
                comment.id,
                comment.author_username,
                'comment',
                gettext('Şikayat'),
                true
            );
        }

        if (
            viewer &&
            isCurrentUser &&
            !isConfirmed &&
            resolvedPostAuthor &&
            resolvedPostAuthor !== viewer
        ) {
            actionButtons += buildReportButton(
                postId,
                comment.id,
                resolvedPostAuthor,
                'no_confirmation',
                gettext('Post awtoryna şikayat'),
                true
            );
        }

        const actions = actionButtons
            ? `<div class="comment-card__actions">${actionButtons}</div>`
            : '';

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

    function renderMyCommentCard(comment, currentUsername) {
        const bookTitle = escapeHtml(comment.book_title || comment.post_title || '—');
        const commentAuthor = escapeHtml(comment.author_username || '—');
        const metaExtra = ` · ${gettext('Kitap')}: ${bookTitle} · ${gettext('Awtor')}: ${commentAuthor}`;

        return renderCard(comment, {
            postId: comment.post || 0,
            postAuthorUsername: comment.post_author || '',
            readOnly: true,
            currentUsername,
            metaExtra
        });
    }

    function ensureReportModal() {
        if (document.getElementById('comment-report-modal')) return;

        const reasons = [
            ['spam', gettext('Spam')],
            ['abuse', gettext('Hakaret / ýaman söz')],
            ['misinfo', gettext('Ýalan maglumat')],
            ['copyright', gettext('Awtor hukugy')],
            ['harassment', gettext('Ýüze çykýan betlik')],
            ['other', gettext('Beýleki')],
        ];

        const options = reasons.map(([value, label]) =>
            `<option value="${value}">${escapeHtml(label)}</option>`
        ).join('');

        document.body.insertAdjacentHTML('beforeend', `
            <div class="report-modal" id="comment-report-modal" hidden aria-hidden="true">
                <div class="report-modal__backdrop" onclick="CommentsUI.closeReportModal()"></div>
                <div class="report-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
                    <header class="report-modal__header">
                        <h3 id="report-modal-title">${gettext('Admina şikayat')}</h3>
                        <button type="button" class="report-modal__close" onclick="CommentsUI.closeReportModal()" aria-label="${gettext('Ýap')}">×</button>
                    </header>
                    <form class="report-modal__form" id="comment-report-form" novalidate onsubmit="CommentsUI.submitReport(event)">
                        <input type="hidden" id="report-comment-id" name="comment_id" value="">
                        <input type="hidden" id="report-type" name="report_type" value="comment">
                        <p class="report-modal__hint" id="report-modal-hint" hidden></p>
                        <label class="report-modal__label" for="report-user-input">@${gettext('Ulanyjy')}</label>
                        <div class="report-modal__at-field">
                            <span class="report-modal__at">@</span>
                            <input type="text" id="report-user-input" name="reported_user" autocomplete="username" placeholder="${gettext('username')}">
                        </div>
                        <div id="report-reason-wrap">
                            <label class="report-modal__label" for="report-reason">${gettext('Sebäp')}</label>
                            <select id="report-reason" name="reason">
                                <option value="no_confirmation">${escapeHtml(gettext('Post awtory teswiri tassyklamady'))}</option>
                                ${options}
                            </select>
                        </div>
                        <label class="report-modal__label" for="report-message">${gettext('Goşmaça maglumat')}</label>
                        <textarea id="report-message" name="message" rows="4" placeholder="${gettext('Näme bolup geçdi?')}"></textarea>
                        <div class="report-modal__actions">
                            <button type="button" class="comment-composer__btn comment-composer__btn--ghost" onclick="CommentsUI.closeReportModal()">${gettext('Ýatyr')}</button>
                            <button type="button" class="comment-composer__btn comment-composer__btn--primary" id="report-submit-btn" onclick="CommentsUI.submitReportFromBtn()">${gettext('Ugrat')}</button>
                        </div>
                    </form>
                </div>
            </div>
        `);
    }

    function openReportModal(button) {
        ensureReportModal();
        const modal = document.getElementById('comment-report-modal');
        const commentId = button.dataset.reportComment;
        const username = button.dataset.reportUser || '';
        const reportType = button.dataset.reportType || 'comment';
        const titleEl = document.getElementById('report-modal-title');
        const hintEl = document.getElementById('report-modal-hint');
        const reasonWrap = document.getElementById('report-reason-wrap');
        const userInput = document.getElementById('report-user-input');

        document.getElementById('report-comment-id').value = commentId;
        document.getElementById('report-type').value = reportType;
        document.getElementById('report-user-input').value = username;
        document.getElementById('report-message').value = '';

        const reasonSelect = document.getElementById('report-reason');

        if (reportType === 'no_confirmation') {
            if (titleEl) titleEl.textContent = gettext('Post awtory tassyklamady');
            if (hintEl) {
                hintEl.textContent = gettext('Teswiriňiz heniz tassyklanmady. Post awtory barada admina habar beriň.');
                hintEl.hidden = false;
            }
            if (reasonWrap) reasonWrap.hidden = true;
            if (userInput) {
                userInput.readOnly = true;
                userInput.value = username;
            }
            if (reasonSelect) reasonSelect.value = 'no_confirmation';
        } else {
            if (titleEl) titleEl.textContent = gettext('Admina şikayat');
            if (hintEl) hintEl.hidden = true;
            if (reasonWrap) reasonWrap.hidden = false;
            if (userInput) {
                userInput.readOnly = false;
                userInput.value = username;
            }
            if (reasonSelect) reasonSelect.value = 'abuse';
        }

        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('is-open');
        document.getElementById('report-message').focus();
    }

    function closeReportModal() {
        const modal = document.getElementById('comment-report-modal');
        if (!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('is-open');
    }

    function submitReportFromBtn() {
        submitReport({ preventDefault() {} });
    }

    function submitReport(event) {
        event.preventDefault();
        const submitBtn = document.getElementById('report-submit-btn');
        if (submitBtn && submitBtn.disabled) return;

        const commentId = document.getElementById('report-comment-id').value;
        const reportType = document.getElementById('report-type').value || 'comment';
        const reportedUser = document.getElementById('report-user-input').value.trim().replace(/^@+/, '');
        const reasonEl = document.getElementById('report-reason');
        const reason = reportType === 'no_confirmation'
            ? 'no_confirmation'
            : (reasonEl ? reasonEl.value : '');
        const message = document.getElementById('report-message').value.trim();

        if (!commentId) {
            alert(gettext('Ýalňyşlyk'));
            return;
        }
        if (reportType !== 'no_confirmation' && (!reportedUser || !reason)) {
            alert(gettext('Ähli meýdanlary dolduryň.'));
            return;
        }
        if (!message) {
            alert(gettext('Goşmaça maglumat ýazyň.'));
            return;
        }

        if (submitBtn) submitBtn.disabled = true;

        fetch('/api/comment-report/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getReportCookie('csrftoken'),
            },
            body: JSON.stringify({
                comment_id: commentId,
                report_type: reportType,
                reported_user: reportedUser,
                reason,
                message,
            }),
        })
            .then(async (response) => {
                let data = {};
                try {
                    data = await response.json();
                } catch {
                    data = { message: gettext('Ugratmak başartmady.') };
                }
                return { ok: response.ok, data };
            })
            .then(({ ok, data }) => {
                if (ok && data.success) {
                    alert(data.message || gettext('Şikayat iberildi.'));
                    closeReportModal();
                } else {
                    alert(data.message || gettext('Ýalňyşlyk'));
                }
            })
            .catch(() => alert(gettext('Ugratmak başartmady.')))
            .finally(() => {
                if (submitBtn) submitBtn.disabled = false;
            });
    }

    function getReportCookie(name) {
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
        resetComposer,
        openReportModal,
        closeReportModal,
        submitReport,
        submitReportFromBtn,
    };
})();
