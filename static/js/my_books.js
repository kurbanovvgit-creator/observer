let booksCache = [];
let addBookSubmitting = false;

const ADD_BOOK_LABEL = typeof gettext === 'function' ? gettext('Kitaby goş') : 'Kitaby goş';
const ADD_BOOK_LOADING = typeof gettext === 'function' ? gettext('Ugradylýar...') : 'Ugradylýar...';

const CATEGORY_KEYS = {
    '1': 'Kitap',
    '2': 'Gollanma',
    '3': 'Okuw maksatnama',
    '4': 'Ylmy iş',
    '5': 'Referat',
    '6': 'Diplom işi',
    '7': 'Sapak ýazgysy'
};

function getCategoryLabel(code) {
    const key = CATEGORY_KEYS[String(code)] || '';
    return key ? gettext(key) : gettext('Belli däl');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function collapseAddForm() {
    const details = document.getElementById('add-book-details');
    if (details) details.open = false;
}

function clearAddForm() {
    document.getElementById('book-title').value = '';
    document.getElementById('book-description').value = '';
    document.getElementById('book-pdf').value = '';
    document.getElementById('allow-download').checked = false;
}

function addBook() {
    if (addBookSubmitting) return;

    const title = document.getElementById('book-title').value.trim();
    const description = document.getElementById('book-description').value.trim();
    const category = document.getElementById('book-category').value;
    const pdfInput = document.getElementById('book-pdf');
    const allowDownload = document.getElementById('allow-download').checked;
    const submitBtn = document.getElementById('btn-add-book');

    if (!title) {
        alert(gettext('Kitabyň ady hökman bolmaly!'));
        return;
    }
    if (!category) {
        alert(gettext('Kategoriýa Saýla!'));
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('allow_download', allowDownload);
    if (pdfInput.files.length > 0) {
        formData.append('pdf', pdfInput.files[0]);
    }

    addBookSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = ADD_BOOK_LOADING;
    }

    fetch('/api/books/create/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                clearAddForm();
                collapseAddForm();
                loadBooks();
                alert(data.message || gettext('Haýyş iberildi. Admin tassyklanandan soň kitap neşir ediler.'));
            } else {
                const msg = typeof data.message === 'string'
                    ? data.message
                    : gettext('Nädogry maglumatlar');
                alert(msg);
            }
        })
        .catch(error => alert('Серверда хаталык: ' + error.message))
        .finally(() => {
            addBookSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = ADD_BOOK_LABEL;
            }
        });
}

function getApprovalBadge(book) {
    const status = book.approval_status || 'approved';
    if (status === 'pending') {
        return `<span class="cassette-card__status cassette-card__status--pending">${gettext('Garaşylýar (admin)')}</span>`;
    }
    if (status === 'rejected') {
        return `<span class="cassette-card__status cassette-card__status--rejected">${gettext('Ret edildi')}</span>`;
    }
    return '';
}

function buildCassetteCard(book) {
    const title = escapeHtml(book.title || gettext('No Title'));
    const desc = escapeHtml(book.description || '');
    const cat = getCategoryLabel(book.category);
    const statusBadge = getApprovalBadge(book);
    const pdfBlock = book.pdf
        ? `<a href="${book.pdf}" target="_blank" rel="noopener">${gettext('PDF')}</a>` +
          (book.allow_download ? ` · <a href="${book.pdf}" download>${gettext('Ýükle')}</a>` : '')
        : `<span class="cassette-card__no-pdf">${gettext('PDF ýok')}</span>`;

    const article = document.createElement('article');
    article.className = 'cassette-card';
    article.dataset.bookId = book.id;
    article.innerHTML = `
        <div class="cassette-card__spine"></div>
        <div class="cassette-card__tape" aria-hidden="true">
            <span class="cassette-card__hole"></span>
            <span class="cassette-card__hole"></span>
        </div>
        <div class="cassette-card__body">
            <h3 class="cassette-card__title" title="${title}">${title}</h3>
            ${statusBadge}
            <span class="cassette-card__cat">${escapeHtml(cat)}</span>
            ${desc ? `<p class="cassette-card__desc">${desc}</p>` : ''}
            <div class="cassette-card__links">${pdfBlock}</div>
            <div class="cassette-card__actions">
                <button type="button" class="btn-edit" onclick="showEditForm(${book.id})">${gettext('Üýtget')}</button>
                <button type="button" class="btn-delete" onclick="deleteBook(${book.id})">${gettext('Öçür')}</button>
            </div>
        </div>
    `;
    return article;
}

function buildEditPanel(book) {
    const panel = document.createElement('div');
    panel.className = 'cassette-card__edit';
    panel.id = `edit-panel-${book.id}`;
    panel.innerHTML = `
        <div class="edit-form-inner">
            <h4>${gettext('Üýtgetmek')}: ${escapeHtml(book.title)}</h4>
            <input type="text" id="edit-title-${book.id}" value="${escapeHtml(book.title)}" required>
            <textarea id="edit-description-${book.id}" rows="2">${escapeHtml(book.description)}</textarea>
            <select id="edit-category-${book.id}">
                ${[1, 2, 3, 4, 5, 6, 7].map(n => {
                    const sel = String(book.category) === String(n) ? 'selected' : '';
                    return `<option value="${n}" ${sel}>${escapeHtml(getCategoryLabel(n))}</option>`;
                }).join('')}
            </select>
            <label class="file-label">
                <span>${gettext('Täze PDF')}</span>
                <input type="file" id="edit-pdf-${book.id}" accept="application/pdf">
            </label>
            <div class="cassette-card__edit-actions">
                <button type="button" onclick="updateBook(${book.id})">${gettext('Ýatda sakla')}</button>
                <button type="button" class="btn-secondary" onclick="hideEditForm(${book.id})">${gettext('Ýatyr')}</button>
            </div>
        </div>
    `;
    return panel;
}

function loadBooks() {
    fetch('/api/books/', {
        method: 'GET',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    })
        .then(response => {
            if (!response.ok) throw new Error('Kitaplary ýüklemekde ýalňyşlyk');
            return response.json();
        })
        .then(data => {
            const grid = document.getElementById('books');
            const emptyEl = document.getElementById('books-empty');
            const countEl = document.getElementById('books-count');
            if (!grid) return;

            booksCache = data;
            grid.innerHTML = '';
            closeAllEditPanels();

            if (!data.length) {
                if (emptyEl) emptyEl.hidden = false;
                if (countEl) countEl.hidden = true;
                return;
            }

            if (emptyEl) emptyEl.hidden = true;
            if (countEl) {
                countEl.hidden = false;
                countEl.textContent = `${data.length} ${gettext('kitap')}`;
            }

            data.forEach(book => {
                grid.appendChild(buildCassetteCard(book));
            });
        })
        .catch(error => console.error('Error loading books:', error));
}

function closeAllEditPanels() {
    document.querySelectorAll('.cassette-card__edit.is-open').forEach(el => {
        el.classList.remove('is-open');
    });
}

function showEditForm(bookId) {
    closeAllEditPanels();
    const grid = document.getElementById('books');
    const book = booksCache.find(b => b.id === bookId);
    if (!book || !grid) return;

    let panel = document.getElementById(`edit-panel-${bookId}`);
    if (!panel) {
        panel = buildEditPanel(book);
        grid.appendChild(panel);
    } else {
        grid.appendChild(panel);
    }

    panel.classList.add('is-open');
    const scrollBlock = window.matchMedia('(max-width: 768px)').matches ? 'start' : 'nearest';
    panel.scrollIntoView({ behavior: 'smooth', block: scrollBlock });
}

function hideEditForm(bookId) {
    const panel = document.getElementById(`edit-panel-${bookId}`);
    if (panel) panel.classList.remove('is-open');
}

function updateBook(bookId) {
    const title = document.getElementById(`edit-title-${bookId}`).value.trim();
    const description = document.getElementById(`edit-description-${bookId}`).value.trim();
    const category = document.getElementById(`edit-category-${bookId}`).value;
    const pdfInput = document.getElementById(`edit-pdf-${bookId}`);

    const formData = new FormData();
    formData.append('book_id', bookId);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    if (pdfInput && pdfInput.files.length > 0) {
        formData.append('pdf', pdfInput.files[0]);
    }

    fetch('/api/books/update/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const oldPanel = document.getElementById(`edit-panel-${bookId}`);
                if (oldPanel) oldPanel.remove();
                loadBooks();
            } else {
                alert(data.message || gettext('Ýalňyşlyk'));
            }
        });
}

function deleteBook(bookId) {
    if (!confirm(gettext('Bu kitaby pozmak isleýärsiňizmi?'))) return;

    const formData = new FormData();
    formData.append('book_id', bookId);
    fetch('/api/books/delete/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const panel = document.getElementById(`edit-panel-${bookId}`);
                if (panel) panel.remove();
                loadBooks();
            }
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

document.addEventListener('DOMContentLoaded', loadBooks);
