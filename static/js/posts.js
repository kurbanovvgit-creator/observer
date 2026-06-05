let currentUsername = null;
let currentUserAvatar = null;
let allPosts = [];
let currentPage = 1;
let isLoading = false;
let hasMorePosts = true;
const recordedViewPostIds = new Set();

const feedConfig = {
    mode: 'all',
    authorUsername: null,
    authorUrlTpl: '',
};

function readFeedConfig() {
    const el = document.getElementById('posts-feed-config');
    if (!el) return;
    feedConfig.mode = el.dataset.mode || 'all';
    feedConfig.authorUsername = el.dataset.authorUsername || null;
    feedConfig.authorUrlTpl = el.dataset.authorUrlTpl || '';
}

function authorProfileUrl(username) {
    if (!username) return '#';
    const tpl = feedConfig.authorUrlTpl;
    if (tpl && tpl.includes('/0/')) {
        return tpl.replace('/0/', `/${encodeURIComponent(username)}/`);
    }
    if (tpl && tpl.endsWith('/0/')) {
        return tpl.slice(0, -2) + `${encodeURIComponent(username)}/`;
    }
    return `/user/${encodeURIComponent(username)}/`;
}

function buildPostsApiUrl(page) {
    if (feedConfig.mode === 'author' && feedConfig.authorUsername) {
        return `/api/users/${encodeURIComponent(feedConfig.authorUsername)}/posts/?page=${page}`;
    }
    const category = document.getElementById('category-filter')?.value;
    const searchQuery = document.getElementById('search-input')?.value || '';
    let url = `/api/posts/?page=${page}`;
    if (category) url += `&category=${category}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    return url;
}

function loadCurrentUser() {
    fetch('/api/get-current-user/')
        .then(response => response.json())
        .then(data => {
            currentUsername = data.username;
            currentUserAvatar = data.avatar || null;
            console.log('Häzirki ulanyjy:', currentUsername);
            if (feedConfig.mode === 'author') {
                loadAuthorProfile();
            }
            loadPosts();
        })
        .catch(error => {
            console.error('Häzirki ulanyjy ýüklenende ýalňyşlyk:', error);
        });
}

function loadAuthorProfile() {
    const username = feedConfig.authorUsername;
    if (!username) return;

    fetch(`/api/users/${encodeURIComponent(username)}/`, { credentials: 'same-origin' })
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then((data) => {
            const nameEl = document.getElementById('author-profile-username');
            const statsEl = document.getElementById('author-profile-stats');
            const avatarWrap = document.getElementById('author-profile-avatar');
            if (nameEl) nameEl.textContent = data.username;

            if (statsEl) {
                statsEl.textContent =
                    `${data.post_count} ${gettext('Post')} · ${data.followers_count || 0} ${gettext('Yazylan')} · ${data.following_count || 0} ${gettext('Yazylýan')} · ${gettext('Dereje')} ${data.level || 0}`;
            }

            renderAuthorFollowButton(data);

            if (avatarWrap) {
                if (data.avatar_url) {
                    avatarWrap.innerHTML =
                        `<img class="ig-post__avatar author-profile__avatar" src="${CommentsUI.escapeHtml(data.avatar_url)}" alt="" width="88" height="88" loading="lazy">`;
                } else {
                    const initial = (data.username || '?').charAt(0).toUpperCase();
                    avatarWrap.innerHTML =
                        `<span class="ig-post__avatar ig-post__avatar--placeholder author-profile__avatar" aria-hidden="true">${initial}</span>`;
                }
            }

        })
        .catch((err) => console.error('Profil ýüklenende ýalňyşlyk:', err));
}

function renderAuthorFollowButton(profile) {
    const wrap = document.getElementById('author-profile-actions');
    if (!wrap) return;

    if (profile.is_self) {
        wrap.innerHTML = '';
        return;
    }

    const following = Boolean(profile.is_following);
    wrap.innerHTML = `
        <button
            type="button"
            class="author-follow-btn${following ? ' author-follow-btn--active' : ''}"
            id="author-follow-btn"
            onclick="toggleFollow('${CommentsUI.escapeHtml(profile.username)}', this)"
            aria-pressed="${following ? 'true' : 'false'}"
        >
            ${following ? gettext('Yazylýarsyňyz') : gettext('Yazyl')}
        </button>`;
}

function toggleFollow(username, button) {
    if (!username || !button) return;
    button.disabled = true;

    fetch('/api/follow/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ username }),
    })
        .then((r) => r.json())
        .then((data) => {
            if (!data.success) {
                alert(data.message || gettext('Ýalňyşlyk'));
                return;
            }
            const following = Boolean(data.following);
            button.classList.toggle('author-follow-btn--active', following);
            button.setAttribute('aria-pressed', following ? 'true' : 'false');
            button.textContent = following ? gettext('Yazylýarsyňyz') : gettext('Yazyl');
            loadAuthorProfile();
        })
        .catch((err) => console.error('Yazylmakda ýalňyşlyk:', err))
        .finally(() => {
            button.disabled = false;
        });
}

function recordPostView(postId) {
    if (!postId || recordedViewPostIds.has(postId)) return;
    recordedViewPostIds.add(postId);

    fetch('/api/post-view/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ post_id: postId }),
    })
        .then((r) => r.json())
        .then((data) => {
            if (data.success) {
                const el = document.getElementById(`views-count-${postId}`);
                if (el) el.textContent = data.views_count;
            }
        })
        .catch(() => {});
}

function loadPosts(reset = false) {
    if (isLoading) return;

    if (reset) {
        currentPage = 1;
        hasMorePosts = true;
        document.getElementById('post-list').innerHTML = '';
        clearNoMoreMessage();
        const container = document.getElementById('load-more-container');
        if (container) container.style.display = '';
        const btn = document.getElementById('load-more-btn');
        if (btn) {
            btn.hidden = false;
            btn.style.display = '';
        }
        const info = document.getElementById('feed-pagination-info');
        if (info) info.hidden = true;
    }

    if (!hasMorePosts) return;

    isLoading = true;
    setPaginationLoading(true);
    const url = buildPostsApiUrl(currentPage);

    fetch(url, { credentials: 'same-origin' })
        .then((r) => {
            if (!r.ok) {
                throw new Error(`HTTP ${r.status}`);
            }
            return r.json();
        })
        .then(data => {
            const posts = data.posts || [];
            if (reset) allPosts = [];
            allPosts = allPosts.concat(posts);

            if (posts.length === 0) {
                hasMorePosts = false;
                if (currentPage === 1) {
                    document.getElementById('post-list').innerHTML = `<p class="ig-post__empty">${gettext('Postlar tapylmady.')}</p>`;
                } else {
                    showNoMoreMessage();
                }
                updateFeedPagination(data, 0);
                isLoading = false;
                setPaginationLoading(false);
                return;
            }

            posts.forEach(post => renderPost(post));

            const loadedPage = currentPage;
            hasMorePosts = data.has_next === true;
            currentPage++;

            updateFeedPagination(data, loadedPage);
            if (!hasMorePosts) {
                showNoMoreMessage();
            } else {
                clearNoMoreMessage();
            }

            isLoading = false;
            setPaginationLoading(false);
        })
        .catch(err => {
            console.error('Postlar ýüklenende ýalňyşlyk:', err);
            if (currentPage === 1) {
                document.getElementById('post-list').innerHTML =
                    `<p class="ig-post__empty" style="color:var(--danger);">${gettext('Postlar ýüklenende ýalňyşlyk. Sahypany täzeläň.')}</p>`;
            }
            isLoading = false;
            setPaginationLoading(false);
            updateFeedPagination(null, 0);
        });
}

function setPaginationLoading(loading) {
    const loadingEl = document.getElementById('loading-text');
    const btn = document.getElementById('load-more-btn');
    if (loadingEl) loadingEl.hidden = !loading;
    if (btn) btn.disabled = loading;
}

function updateFeedPagination(data, loadedPage) {
    const container = document.getElementById('load-more-container');
    const btn = document.getElementById('load-more-btn');
    const info = document.getElementById('feed-pagination-info');

    if (!container) return;

    const totalPages = data?.total_pages || 0;
    const totalCount = data?.total_count ?? 0;
    const hasNext = Boolean(data?.has_next);
    const page = loadedPage || data?.page || 1;

    if (info) {
        if (totalPages > 1) {
            info.textContent = `${gettext('Sahypa')} ${page} / ${totalPages} · ${totalCount} ${gettext('Post')}`;
            info.hidden = false;
        } else if (totalCount > 0) {
            info.textContent = `${totalCount} ${gettext('Post')}`;
            info.hidden = false;
        } else {
            info.hidden = true;
        }
    }

    if (btn) btn.hidden = !hasNext;
    container.hidden = !hasNext;
}

function clearNoMoreMessage() {
    const nomore = document.getElementById('no-more-message');
    if (nomore) nomore.remove();
}

const IG_ICONS = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
};

function formatPostDate(iso) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}

function renderPostAvatar(avatarUrl, username) {
    const name = username || '?';
    if (avatarUrl) {
        return `<img class="ig-post__avatar" src="${CommentsUI.escapeHtml(avatarUrl)}" alt="" width="40" height="40" loading="lazy">`;
    }
    return `<span class="ig-post__avatar ig-post__avatar--placeholder" aria-hidden="true">${name.charAt(0).toUpperCase()}</span>`;
}

function countCommentsTree(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, c) => sum + 1 + countCommentsTree(c.replies || []), 0);
}

function renderPost(post) {
    const postList = document.getElementById('post-list');
    const postEl = document.createElement('article');
    postEl.className = 'ig-post';
    postEl.dataset.postId = post.id;

    const bookTitle = CommentsUI.escapeHtml(post.book_title || gettext('Ady ýok'));
    const rawUsername = post.author_username || '—';
    const username = CommentsUI.escapeHtml(rawUsername);
    const profileUrl = authorProfileUrl(rawUsername);
    const profileHref = CommentsUI.escapeHtml(profileUrl);
    const caption = CommentsUI.escapeHtml((post.content || gettext('Mazmun ýok')).trim());
    const categoryName = getCategoryName(post.category);
    const catClass = post.category ? ` ig-post__media--cat-${post.category}` : '';
    const likes = post.likes_count || 0;
    const views = post.views_count || 0;
    const hasPdf = Boolean(post.pdf);
    const previewUrl = post.preview_url || '';

    let mediaInner;
    if (previewUrl) {
        mediaInner = hasPdf
            ? `<a class="ig-post__media-link ig-post__media-link--preview" href="${post.pdf}" target="_blank" rel="noopener">
                    <img class="ig-post__preview" src="${CommentsUI.escapeHtml(previewUrl)}" alt="${bookTitle}" loading="lazy" decoding="async" width="720" height="432">
                    <div class="ig-post__media-overlay">
                        <span class="ig-post__category-pill">${CommentsUI.escapeHtml(categoryName)}</span>
                        <span class="ig-post__pdf-hint">${gettext('Kitaby açmak')} →</span>
                    </div>
               </a>`
            : `<div class="ig-post__media-link ig-post__media-link--preview">
                    <img class="ig-post__preview" src="${CommentsUI.escapeHtml(previewUrl)}" alt="${bookTitle}" loading="lazy" decoding="async" width="720" height="432">
                    <div class="ig-post__media-overlay">
                        <span class="ig-post__category-pill">${CommentsUI.escapeHtml(categoryName)}</span>
                    </div>
               </div>`;
    } else if (hasPdf) {
        mediaInner = `<a class="ig-post__media-link" href="${post.pdf}" target="_blank" rel="noopener">
                <div class="ig-post__media-inner">
                    <h2 class="ig-post__book-title">${bookTitle}</h2>
                    <span class="ig-post__category-pill">${CommentsUI.escapeHtml(categoryName)}</span>
                    <span class="ig-post__pdf-hint">${gettext('Kitaby açmak')} →</span>
                </div>
           </a>`;
    } else {
        mediaInner = `<div class="ig-post__media-link">
                <div class="ig-post__media-inner">
                    <h2 class="ig-post__book-title">${bookTitle}</h2>
                    <span class="ig-post__category-pill">${CommentsUI.escapeHtml(categoryName)}</span>
                </div>
           </div>`;
    }

    const likedClass = post.liked_by_me ? ' is-liked' : '';

    const downloadLink = hasPdf && post.allow_download
        ? ` · <a href="${post.pdf}" download>${gettext('PDF download')}</a>`
        : '';

    const avatarBlock = rawUsername !== '—'
        ? `<a href="${profileHref}" class="ig-post__profile-link">${renderPostAvatar(post.author_avatar_url, post.author_username)}</a>`
        : renderPostAvatar(post.author_avatar_url, post.author_username);

    const usernameBlock = rawUsername !== '—'
        ? `<a href="${profileHref}" class="ig-post__username-link">${username}</a>`
        : `<span>${username}</span>`;

    postEl.innerHTML = `
        <header class="ig-post__head">
            ${avatarBlock}
            <div class="ig-post__user">
                <p class="ig-post__username">
                    ${usernameBlock}
                    <span class="ig-post__badge-level">${gettext('Dereje')} ${post.author_level || 0}</span>
                </p>
                <span class="ig-post__subtitle">${bookTitle} · ${CommentsUI.escapeHtml(categoryName)}</span>
            </div>
        </header>
        <div class="ig-post__media${catClass}${hasPdf ? '' : ' ig-post__media--no-pdf'}">
            ${mediaInner}
        </div>
        <div class="ig-post__actions">
            <button type="button" class="ig-post__action ig-post__action--like${likedClass}" onclick="toggleLike(${post.id}, this)" aria-label="${gettext('Like')}" aria-pressed="${post.liked_by_me ? 'true' : 'false'}">
                ${IG_ICONS.heart}
            </button>
            <button type="button" class="ig-post__action ig-post__action--comment" data-comments-toggle="${post.id}" data-post-author="${CommentsUI.escapeHtml(post.author_username || '')}" onclick="toggleCommentsPanel(${post.id})" aria-expanded="false" aria-label="${gettext('Teswirler')}">
                ${IG_ICONS.comment}
                <span class="ig-post__action-count" id="comment-count-${post.id}"></span>
            </button>
        </div>
        <div class="ig-post__body">
            <p class="ig-post__likes">
                <span id="likes-count-${post.id}">${likes}</span> ${gettext('Like')}
                · <span id="views-count-${post.id}">${views}</span> ${gettext('Görnüş')}
            </p>
            <p class="ig-post__caption">
                ${rawUsername !== '—'
                    ? `<a href="${profileHref}" class="ig-post__caption-user">${username}</a>`
                    : `<span class="ig-post__caption-user">${username}</span>`}
                <span class="ig-post__caption-text">${caption}</span>
            </p>
            <p class="ig-post__meta-line">${gettext('Kategoriýa')}: ${CommentsUI.escapeHtml(categoryName)}${downloadLink}</p>
            <button type="button" class="ig-post__comments-toggle" data-comments-toggle="${post.id}" data-post-author="${CommentsUI.escapeHtml(post.author_username || '')}" onclick="toggleCommentsPanel(${post.id})">
                ${gettext('Teswirleri gör')}
            </button>
            <time class="ig-post__time" datetime="${post.created_at || ''}">${formatPostDate(post.created_at)}</time>
        </div>
        <section class="ig-post__comments" id="comments-panel-${post.id}" aria-label="${gettext('Teswirler')}">
            <div class="comments-stack" id="comments-${post.id}"></div>
            ${CommentsUI.buildPostComposer(post.id, currentUserAvatar, currentUsername)}
        </section>`;

    postList.appendChild(postEl);
    prefetchCommentCount(post.id);
    recordPostView(post.id);
}

function prefetchCommentCount(postId) {
    fetch(`/api/comment-list-with-replies/${postId}/`)
        .then((r) => r.json())
        .then((data) => updateCommentCount(postId, countCommentsTree(data)))
        .catch(() => {});
}

function updateCommentCount(postId, count) {
    const el = document.getElementById(`comment-count-${postId}`);
    const toggles = document.querySelectorAll(`[data-comments-toggle="${postId}"]`);
    if (el) el.textContent = count > 0 ? String(count) : '';
    toggles.forEach((btn) => {
        if (btn.classList.contains('ig-post__comments-toggle')) {
            btn.textContent = count > 0
                ? `${gettext('Teswirleri gör')} (${count})`
                : gettext('Teswirleri gör');
        }
    });
}

function toggleCommentsPanel(postId) {
    const panel = document.getElementById(`comments-panel-${postId}`);
    if (!panel) return;

    const toggleEl = document.querySelector(`[data-comments-toggle="${postId}"]`);
    const postAuthorUsername = toggleEl?.dataset.postAuthor || '';

    const isOpen = panel.classList.toggle('is-open');
    document.querySelectorAll(`[data-comments-toggle="${postId}"]`).forEach((el) => {
        el.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    if (isOpen && panel.dataset.loaded !== '1') {
        loadComments(postId, postAuthorUsername);
        panel.dataset.loaded = '1';
    }
}

function showNoMoreMessage() {
    if (document.getElementById('no-more-message')) return;
    const div = document.createElement('div');
    div.id = 'no-more-message';
    div.innerHTML = `<p class="ig-post__empty">${gettext('Ähli postlar görkezildi')}</p>`;

    const container = document.getElementById('load-more-container');
    if (container) container.style.display = 'none';

    const postList = document.getElementById('post-list');
    if (postList) postList.after(div);
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

function toggleLike(postId, button) {
    if (button.disabled) return;
    button.disabled = true;

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
            if (likesCountElement) likesCountElement.textContent = data.likes_count;

            const liked = data.action === 'added';
            button.classList.toggle('is-liked', liked);
            button.setAttribute('aria-pressed', liked ? 'true' : 'false');
        }
    })
    .catch(error => {
        console.error('Like ýalňyşlygy:', error);
    })
    .finally(() => {
        button.disabled = false;
    });
}

function loadComments(postId, postAuthorUsername) {
    fetch(`/api/comment-list-with-replies/${postId}/`)
        .then(response => response.json())
        .then(data => {
            const commentList = document.getElementById(`comments-${postId}`);
            commentList.innerHTML = `<h4 class="comments-section-title">${gettext('Teswirler')}</h4>`;
            const count = countCommentsTree(data);
            updateCommentCount(postId, count);
            if (!data || data.length === 0) {
                commentList.innerHTML += `<p class="comments-empty">${gettext('Teswir ýok')}.</p>`;
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
    const wrap = document.createElement('div');
    wrap.innerHTML = CommentsUI.renderCard(comment, {
        postId,
        postAuthorUsername,
        currentUsername,
        userAvatar: currentUserAvatar,
        readOnly: false
    });
    const card = wrap.firstElementChild;
    if (card) parentElement.appendChild(card);

    if (comment.replies && comment.replies.length > 0) {
        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'comment-replies';
        comment.replies.forEach(reply => renderComment(reply, repliesDiv, postId, postAuthorUsername));
        parentElement.appendChild(repliesDiv);
    }
}

function addReply(postId, parentId, button) {
    const footer = button.closest('.comment-card__footer');
    const content = footer.querySelector('textarea').value.trim();
    if (!content) return;
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
            footer.querySelector('textarea').value = '';
            CommentsUI.toggleReply(postId, parentId);
            loadComments(postId);
        } else {
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Jogap goşmakda ýalňyşlyk:', error);
    });
}

function addComment(postId) {
    const contentEl = document.getElementById(`composer-text-${postId}`);
    const lineEl = document.getElementById(`composer-line-${postId}`);
    const content = contentEl ? contentEl.value.trim() : '';
    const lineNumber = lineEl ? lineEl.value : '';
    if (!content) return;
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
            CommentsUI.toggleComposer(postId, false);
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

function setCommentEditing(postId, commentId, editing) {
    const form = document.getElementById(`edit-form-${postId}-${commentId}`);
    const card = form ? form.closest('.comment-card') : null;
    if (!form || !card) return;
    form.classList.toggle('is-open', editing);
    card.classList.toggle('is-editing', editing);
    if (editing) {
        const textarea = form.querySelector('textarea');
        if (textarea) textarea.focus();
    }
}

function editComment(postId, commentId) {
    const form = document.getElementById(`edit-form-${postId}-${commentId}`);
    if (!form) return;
    setCommentEditing(postId, commentId, !form.classList.contains('is-open'));
}

function cancelEdit(postId, commentId) {
    const form = document.getElementById(`edit-form-${postId}-${commentId}`);
    if (!form) return;
    const text = document.getElementById(`edit-text-${postId}-${commentId}`);
    const original = form.closest('.comment-card')?.querySelector('.comment-card__text');
    if (text && original) text.value = original.textContent;
    setCommentEditing(postId, commentId, false);
}

function saveEdit(postId, commentId) {
    const form = document.getElementById(`edit-form-${postId}-${commentId}`);
    if (!form) return;
    const content = form.querySelector('textarea').value.trim();
    if (!content) return;
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
            setCommentEditing(postId, commentId, false);
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

let searchDebounceTimer = null;
function debouncedSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => loadPosts(true), 350);
}

function initPostsPage() {
    readFeedConfig();
    loadCurrentUser();

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 && !isLoading && hasMorePosts) {
            loadPosts();
        }
    });

    const categoryFilter = document.querySelector('#category-filter');
    if (categoryFilter) {
        categoryFilter.onchange = () => loadPosts(true);
    }
}

window.onload = initPostsPage;