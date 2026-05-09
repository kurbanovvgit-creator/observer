from django.apps import AppConfig

class BooksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'books'  # Имя приложения
    label = 'books'  # Уникальная метка (должна совпадать с name)