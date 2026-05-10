// 1. Убрали getLocalizedApiUrl, так как API теперь глобальное (вне i18n_patterns)

function addBook() {
    const title = document.getElementById('book-title').value.trim();
    const description = document.getElementById('book-description').value.trim();
    const category = document.getElementById('book-category').value;
    const pdfInput = document.getElementById('book-pdf');
    const allowDownload = document.getElementById('allow-download').checked;

    if (!title) { alert(gettext("Kitabyň ady hökman bolmaly!")); return; }
    if (!category) { alert(gettext("Kategoriýa Saýla!")); return; }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('allow_download', allowDownload);
    if (pdfInput.files.length > 0) {
        formData.append('pdf', pdfInput.files[0]);
    }

    // Используем ПРЯМОЙ путь /api/...
    fetch('/api/books/create/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('book-title').value = '';
            document.getElementById('book-description').value = '';
            document.getElementById('book-pdf').value = '';
            document.getElementById('allow-download').checked = false;
            loadBooks();
        } else {
            alert(data.message || gettext("Nädogry maglumatlar"));
        }
    })
    .catch(error => alert('Серверда хаталык: ' + error.message));
}

function loadBooks() {
    // Используем ПРЯМОЙ путь /api/...
    fetch('/api/books/', {
        method: 'GET',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    })
    .then(response => {
        if (!response.ok) throw new Error('Kitaplary ýüklemekde hata boldy');
        return response.json();
    })
    .then(data => {
        const bookList = document.getElementById('books');
        if (!bookList) return;
        bookList.innerHTML = '';
        data.forEach(book => {
            const bookDiv = document.createElement('div');
            bookDiv.className = 'book';
            bookDiv.innerHTML = `
                <h3>${book.title || gettext("No Title")}</h3>
                <p>${book.description || gettext("No Description")}</p>
                ${book.pdf ? `<a href="${book.pdf}" target="_blank">${gettext('Open a PDF')}</a>${book.allow_download ? ` | <a href="${book.pdf}" class="download-link" download>${gettext('Download a PDF')}</a>` : ''}` : gettext("PDF ýok")}
                <p>${gettext("Category")}: ${book.category_display || gettext("Belli däl")}</p>
                <div>
                    <button class="edit" onclick="showEditForm(${book.id})">${gettext('Üýtgetmek')}</button>
                    <button class="delete" onclick="deleteBook(${book.id})">${gettext('Öçürmek')}</button>
                </div>
                <div class="edit-form" id="edit-form-${book.id}" style="display:none; border:1px solid #ddd; padding:10px; margin-top:10px;">
                    <input type="text" id="edit-title-${book.id}" value="${book.title.replace(/"/g, '&quot;')}" required>
                    <textarea id="edit-description-${book.id}">${book.description}</textarea>
                    <select id="edit-category-${book.id}">
                        <option value="1" ${book.category == '1' ? 'selected' : ''}>${gettext('Kitap')}</option>
                        <option value="2" ${book.category == '2' ? 'selected' : ''}>${gettext('Gollanma')}</option>
                        <option value="3" ${book.category == '3' ? 'selected' : ''}>${gettext('Okuw maksatnama')}</option>
                        <option value="4" ${book.category == '4' ? 'selected' : ''}>${gettext('Ylmy iş')}</option>
                        <option value="5" ${book.category == '5' ? 'selected' : ''}>${gettext('Referat')}</option>
                        <option value="6" ${book.category == '6' ? 'selected' : ''}>${gettext('Diplom işi')}</option>
                        <option value="7" ${book.category == '7' ? 'selected' : ''}>${gettext('Sapak ýazgysy')}</option>
                    </select>
                    <input type="file" id="edit-pdf-${book.id}" accept="application/pdf">
                    <button onclick="updateBook(${book.id})">${gettext('Ýatda saklamak')}</button>
                    <button onclick="hideEditForm(${book.id})">${gettext('Ýatyrmak')}</button>
                </div>
            `;
            bookList.appendChild(bookDiv);
        });
    })
    .catch(error => console.error('Error loading books:', error));
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
            hideEditForm(bookId);
            loadBooks();
        } else {
            alert(data.message || 'Hata boldy');
        }
    });
}

function deleteBook(bookId) {
    if (confirm(gettext("Bu kitaby pozmak isleýärsiňizmi?"))) {
        const formData = new FormData();
        formData.append('book_id', bookId);
        fetch('/api/books/delete/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            body: formData
        })
        .then(response => response.json())
        .then(data => { if (data.success) loadBooks(); });
    }
}

function showEditForm(id) { document.getElementById(`edit-form-${id}`).style.display = 'block'; }
function hideEditForm(id) { document.getElementById(`edit-form-${id}`).style.display = 'none'; }

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