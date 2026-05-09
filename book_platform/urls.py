from django.contrib import admin
from django.urls import path, include  # Добавили include
from django.conf.urls.i18n import i18n_patterns  # Добавили это для языков
from books.views import (
    login_view, register_view, index_view, book_list_view, my_comments_view,
    all_books_view, post_list_view, profile_view, profile_update, book_create,
    book_update, book_delete, comment_create, comment_list, comment_list_with_replies,
    comment_create_with_reply, comment_delete, comment_update, get_current_user,
    like_post, confirm_comment
)
from django.conf import settings
from django.conf.urls.static import static
from django.views.i18n import JavaScriptCatalog
from books import views
from django.contrib.auth import views as auth_views
urlpatterns = [
    path('i18n/', include('django.conf.urls.i18n')),  # Важно для смены языка
]
urlpatterns += i18n_patterns(
    path('admin/', admin.site.urls),
    path('', index_view, name='index'),
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('my-books/', book_list_view, name='my_books'),
    path('posts/', all_books_view, name='posts'),
    path('my-comments/', my_comments_view, name='my_comments'),
    path('profile/', profile_view, name='profile'),
    path('api/books/', book_list_view, name='api_book_list'),
    path('api/books/create/', book_create, name='book_create'),
    path('api/books/update/', book_update, name='book_update'),
    path('api/books/delete/', book_delete, name='book_delete'),
    path('api/posts/', post_list_view, name='api_post_list'),
    path('api/comments/', comment_create, name='comment_create'),
    path('api/comments/<int:post_id>/', comment_list, name='comment_list'),
    path('api/comments/mine/', my_comments_view, name='api_my_comments'),
    path('api/profile/', profile_view, name='api_profile_view'),
    path('api/profile/update/', profile_update, name='profile_update'),
    path('api/comment-list-with-replies/<int:post_id>/', comment_list_with_replies, name='comment_list_with_replies'),
    path('api/comment-create-with-reply/', comment_create_with_reply, name='comment_create_with_reply'),
    path('api/comment-delete/', comment_delete, name='comment_delete'),
    path('api/comment-update/', comment_update, name='comment_update'),
    path('api/get-current-user/', get_current_user, name='get_current_user'),
    path('api/like-post/', like_post, name='like_post'),
    path('api/confirm-comment/', confirm_comment, name='confirm_comment'),
    path('jsi18n/', JavaScriptCatalog.as_view(), name='javascript-catalog'),
    path('api/chat/', views.ai_chat_view, name='ai_chat'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    prefix_default_language=False
)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
