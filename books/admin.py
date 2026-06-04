from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Book, Post, Comment, PostLike, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'level')
    search_fields = ('user__username',)


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'created_at', 'allow_download')
    list_filter = ('category', 'allow_download')
    search_fields = ('title', 'author__username')


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'book', 'author', 'likes_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content', 'book__title', 'author__username')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'author', 'line_number', 'confirmed', 'created_at')
    list_filter = ('confirmed', 'created_at')
    search_fields = ('content', 'author__username')


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')
    list_filter = ('created_at',)
