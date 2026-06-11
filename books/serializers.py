from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Book, Post, Comment, CommentReport, PostLike, Profile

class BookSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True, required=False)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_level = serializers.SerializerMethodField()
    approval_status = serializers.CharField(read_only=True)
    pdf = serializers.FileField(required=False, allow_null=True)  # Разрешаем null и обрабатываем как FileField

    def get_author_level(self, obj):
        if hasattr(obj.author, 'profile'):
            return obj.author.profile.level
        return 0

    def get_pdf(self, obj):
        if obj.pdf and hasattr(obj.pdf, 'url'):
            return obj.pdf.url  # Возвращаем полный URL
        return None

    class Meta:
        model = Book
        fields = ['id', 'author', 'author_username', 'author_level', 'title', 'description', 'pdf', 'created_at',
                  'category', 'allow_download', 'approval_status']

    def create(self, validated_data):
        author = validated_data.pop('author', None)
        if not author and hasattr(self.context['request'], 'user'):
            author = self.context['request'].user
        book = Book.objects.create(author=author, **validated_data)
        Profile.objects.get_or_create(user=author)
        return book

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.category = validated_data.get('category', instance.category)
        instance.allow_download = validated_data.get('allow_download', instance.allow_download)

        # Обработка файла PDF
        if 'pdf' in validated_data:
            if validated_data['pdf'] is not None:  # Если новый файл предоставлен
                if instance.pdf and instance.pdf.name:  # Удаляем старый файл, если он есть
                    from django.core.files.storage import default_storage
                    if default_storage.exists(instance.pdf.name):
                        default_storage.delete(instance.pdf.name)
                instance.pdf = validated_data['pdf']  # Сохраняем новый файл
            else:  # Если pdf=None, оставляем как есть или устанавливаем null (зависит от модели)
                instance.pdf = None
        instance.save()
        return instance

class PostSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_level = serializers.SerializerMethodField()
    author_avatar_url = serializers.SerializerMethodField()
    book_title = serializers.CharField(source='book.title', read_only=True)
    pdf = serializers.SerializerMethodField()  # Кастомное поле для URL PDF
    preview_url = serializers.SerializerMethodField()
    allow_download = serializers.BooleanField(source='book.allow_download', read_only=True)
    category = serializers.CharField(source='book.category', read_only=True)  # Отображение категории

    def get_author_level(self, obj):
        return obj.author.profile.level if hasattr(obj.author, 'profile') else 0

    def get_author_avatar_url(self, obj):
        profile = getattr(obj.author, 'profile', None)
        if profile and profile.avatar and hasattr(profile.avatar, 'url'):
            return profile.avatar.url
        return None

    def get_pdf(self, obj):
        if obj.book and obj.book.pdf and hasattr(obj.book.pdf, 'url'):
            return obj.book.pdf.url  # Возвращает полный URL медиафайла из книги
        return None

    def get_preview_url(self, obj):
        if obj.book and obj.book.preview_image and hasattr(obj.book.preview_image, 'url'):
            return obj.book.preview_image.url
        return None

    def create(self, validated_data):
        author = validated_data.pop('author')
        book_data = validated_data.pop('book')
        post = Post.objects.create(author=author, book_id=book_data.id if isinstance(book_data, Book) else book_data,
                                   **validated_data)
        return post

    class Meta:
        model = Post
        fields = (
            'id', 'book', 'book_title', 'author', 'author_username', 'author_level',
            'author_avatar_url', 'content', 'created_at', 'likes_count', 'views_count',
            'allow_download', 'pdf', 'preview_url', 'category',
        )

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    replies = serializers.SerializerMethodField()
    author_level = serializers.SerializerMethodField()
    confirmed = serializers.BooleanField(default=False)  # Добавляем поле confirmed
    post_title = serializers.SerializerMethodField()
    post_author = serializers.CharField(source='post.author.username', read_only=True)
    book_title = serializers.CharField(source='post.book.title', read_only=True)
    avatar_url = serializers.SerializerMethodField()

    def get_avatar_url(self, obj):
        profile = getattr(obj.author, 'profile', None)
        if profile and profile.avatar and hasattr(profile.avatar, 'url'):
            return profile.avatar.url
        return None

    def get_post_title(self, obj):
        if obj.post and obj.post.book:
            return obj.post.book.title
        text = (obj.post.content or '').strip() if obj.post else ''
        return text[:120] if text else '—'

    def get_replies(self, obj):
        replies = obj.replies.all().order_by('created_at')
        return CommentSerializer(replies, many=True).data

    def get_author_level(self, obj):
        return obj.author.profile.level if hasattr(obj.author, 'profile') else 0

    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'content', 'line_number', 'author', 'author_username', 'author_level',
            'confirmed', 'created_at', 'replies', 'post_title', 'post_author', 'book_title',
            'avatar_url',
        ]

    def create(self, validated_data):
        author = validated_data.pop('author')
        comment = Comment.objects.create(author=author, **validated_data)
        return comment


class CommentReportMessageSerializer(serializers.ModelSerializer):
    reported_user = serializers.CharField(source='reported_user.username', read_only=True)
    report_type_label = serializers.CharField(source='get_report_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    reason_label = serializers.CharField(source='get_reason_display', read_only=True)
    comment_preview = serializers.SerializerMethodField()
    admin_message = serializers.CharField(source='admin_notes', read_only=True)
    book_title = serializers.CharField(source='comment.post.book.title', read_only=True)

    def get_comment_preview(self, obj):
        text = (obj.comment.content or '').strip()
        return text[:160] if text else '—'

    class Meta:
        model = CommentReport
        fields = [
            'id', 'report_type', 'report_type_label', 'status', 'status_label',
            'reason', 'reason_label', 'reported_user', 'comment_preview', 'book_title',
            'admin_message', 'created_at', 'reviewed_at',
        ]


class PostLikeSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = PostLike
        fields = ['id', 'post', 'user', 'user_username', 'created_at']

    def create(self, validated_data):
        user = validated_data.pop('user')
        like = PostLike.objects.create(user=user, **validated_data)
        return like

# Дополнительный сериализатор для профиля (если нужен)
class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        if obj.avatar and hasattr(obj.avatar, 'url'):
            return obj.avatar.url
        return None

    class Meta:
        model = Profile
        fields = ['id', 'user', 'bio', 'avatar', 'level']

    def create(self, validated_data):
        user = validated_data.pop('user')
        profile = Profile.objects.create(user=user, **validated_data)
        return profile

    def update(self, instance, validated_data):
        instance.bio = validated_data.get('bio', instance.bio)
        if 'avatar' in validated_data:
            instance.avatar = validated_data['avatar']
        instance.save()
        return instance