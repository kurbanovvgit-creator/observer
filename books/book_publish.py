import logging

from .models import Book, Post
from .pdf_preview import refresh_book_preview

logger = logging.getLogger(__name__)


def publish_book(book):
    """Publish an approved book: preview + feed post (idempotent)."""
    if book.approval_status != Book.ApprovalStatus.APPROVED:
        return False
    if book.posts.exists():
        return True
    refresh_book_preview(book)
    Post.objects.create(book=book, author=book.author, content=book.title)
    logger.info('Book #%s published for %s', book.id, book.author.username)
    return True
