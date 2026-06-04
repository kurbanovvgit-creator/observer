from django.urls import path, include
from django.conf.urls.i18n import i18n_patterns
from django.conf import settings
from django.conf.urls.static import static
from django.views.i18n import JavaScriptCatalog
from django.contrib import admin
from django.contrib.auth import views as auth_views
from books import views

# 1. Глобальные пути (БЕЗ ПЕРЕВОДА)
# Эти пути всегда одинаковы, независимо от выбранного языка.
# Это исправляет ошибки 403 и путаницу в auth.js
urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),

    # API и Авторизация (теперь auth.js всегда найдет их по прямым ссылкам)
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),

    # Все API запросы выносим сюда
    path('api/chat/', views.ai_chat_view, name='ai_chat'),
    path('api/books/', views.book_list_api, name='api_book_list'),
    path('api/books/create/', views.book_create, name='book_create'),
    path('api/books/update/', views.book_update, name='book_update'),
    path('api/books/delete/', views.book_delete, name='book_delete'),
    path('api/posts/', views.post_list_view, name='api_post_list'),
    path('api/comments/', views.comment_create, name='comment_create'),
    path('api/comments/<int:post_id>/', views.comment_list, name='comment_list'),
    path('api/comments/mine/', views.my_comments_view, name='api_my_comments'),
    path('api/profile/update/', views.profile_update, name='profile_update'),
    path('api/comment-list-with-replies/<int:post_id>/', views.comment_list_with_replies,
         name='comment_list_with_replies'),
    path('api/comment-create-with-reply/', views.comment_create_with_reply, name='comment_create_with_reply'),
    path('api/comment-delete/', views.comment_delete, name='comment_delete'),
    path('api/comment-update/', views.comment_update, name='comment_update'),
    path('api/get-current-user/', views.get_current_user, name='get_current_user'),
    path('api/like-post/', views.like_post, name='like_post'),
    path('api/confirm-comment/', views.confirm_comment, name='confirm_comment'),
]

# 2. Пути с поддержкой языков (ТОЛЬКО СТРАНИЦЫ)
# Эти пути будут иметь префиксы /ru/, /tk/ и т.д.
urlpatterns += i18n_patterns(
    path('', views.index_view, name='index'),
    path('my-books/', views.book_list_view, name='my_books'),
    path('posts/', views.all_books_view, name='posts'),
    path('my-comments/', views.my_comments_view, name='my_comments'),
    path('profile/', views.profile_view, name='profile'),
    path('jsi18n/', JavaScriptCatalog.as_view(), name='javascript-catalog'),

    prefix_default_language=False
)

# Поддержка медиа-файлов (аватарки, PDF) в режиме отладки
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)