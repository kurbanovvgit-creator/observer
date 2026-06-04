"""Генерация JPEG-превью первой страницы PDF для быстрой ленты постов."""
import logging
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)

PREVIEW_MAX_WIDTH = 720
PREVIEW_JPEG_QUALITY = 82


def _delete_preview_file(preview_field):
    if preview_field and preview_field.name and default_storage.exists(preview_field.name):
        default_storage.delete(preview_field.name)


def refresh_book_preview(book):
    """
    Создаёт или обновляет preview_image для книги.
    Возвращает True при успехе, False если PDF нет или рендер не удался.
    """
    if not book.pdf or not book.pdf.name:
        _delete_preview_file(book.preview_image)
        book.preview_image = None
        book.save(update_fields=['preview_image'])
        return False

    try:
        import fitz
    except ImportError:
        logger.error('PyMuPDF (pymupdf) не установлен — превью PDF недоступно')
        return False

    try:
        if hasattr(book.pdf, 'path'):
            doc = fitz.open(book.pdf.path)
        else:
            with book.pdf.open('rb') as pdf_file:
                doc = fitz.open(stream=pdf_file.read(), filetype='pdf')

        if doc.page_count == 0:
            doc.close()
            return False

        page = doc.load_page(0)
        rect = page.rect
        scale = min(1.0, PREVIEW_MAX_WIDTH / max(rect.width, 1))
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        jpeg_bytes = pix.tobytes('jpeg', jpg_quality=PREVIEW_JPEG_QUALITY)
        doc.close()

        _delete_preview_file(book.preview_image)
        name = f'book_{book.id}.jpg'
        book.preview_image.save(name, ContentFile(jpeg_bytes), save=False)
        book.save(update_fields=['preview_image'])
        return True
    except Exception as exc:
        logger.warning('Не удалось создать превью для книги %s: %s', book.id, exc)
        return False


def delete_book_preview(book):
    _delete_preview_file(book.preview_image)
