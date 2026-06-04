from django.core.management.base import BaseCommand

from books.models import Book
from books.pdf_preview import refresh_book_preview


class Command(BaseCommand):
    help = 'Создаёт JPEG-превью первой страницы PDF для всех книг'

    def handle(self, *args, **options):
        books = Book.objects.exclude(pdf='').exclude(pdf__isnull=True)
        ok = 0
        fail = 0
        for book in books:
            if refresh_book_preview(book):
                ok += 1
                self.stdout.write(self.style.SUCCESS(f'OK book #{book.id}: {book.title}'))
            else:
                fail += 1
                self.stdout.write(self.style.WARNING(f'Skip book #{book.id}: {book.title}'))
        self.stdout.write(self.style.SUCCESS(f'Готово: {ok} превью, {fail} пропущено'))
