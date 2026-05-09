from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings
from .models import Book, Post, Comment, PostLike, Profile

class BookSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True, required=False)
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_level = serializers.SerializerMethodField()
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
                  'category', 'allow_download']

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
    book_title = serializers.CharField(source='book.title', read_only=True)
    pdf = serializers.SerializerMethodField()  # Кастомное поле для URL PDF
    allow_download = serializers.BooleanField(source='book.allow_download', read_only=True)
    category = serializers.CharField(source='book.category', read_only=True)  # Отображение категории

    def get_author_level(self, obj):
        return obj.author.profile.level if hasattr(obj.author, 'profile') else 0

    def get_pdf(self, obj):
        if obj.book and obj.book.pdf and hasattr(obj.book.pdf, 'url'):
            return obj.book.pdf.url  # Возвращает полный URL медиафайла из книги
        return None

    def create(self, validated_data):
        author = validated_data.pop('author')
        book_data = validated_data.pop('book')
        post = Post.objects.create(author=author, book_id=book_data.id if isinstance(book_data, Book) else book_data,
                                   **validated_data)
        return post

    class Meta:
        model = Post
        fields = ['id', 'book', 'book_title', 'author', 'author_username', 'author_level', 'content', 'created_at',
                  'likes_count', 'allow_download', 'pdf', 'category']

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    replies = serializers.SerializerMethodField()
    author_level = serializers.SerializerMethodField()
    confirmed = serializers.BooleanField(default=False)  # Добавляем поле confirmed
    post_title = serializers.CharField(source='post.content', read_only=True)  # Добавляем поле для заголовка поста
    post_author = serializers.CharField(source='post.author.username', read_only=True)  # Добавляем автора поста

    def get_replies(self, obj):
        replies = obj.replies.all().order_by('created_at')
        return CommentSerializer(replies, many=True).data

    def get_author_level(self, obj):
        return obj.author.profile.level if hasattr(obj.author, 'profile') else 0

    class Meta:
        model = Comment
        fields = ['id', 'content', 'line_number', 'author', 'author_username', 'author_level', 'confirmed', 'created_at', 
                  'replies', 'post_title', 'post_author']

    def create(self, validated_data):
        author = validated_data.pop('author')
        comment = Comment.objects.create(author=author, **validated_data)
        return comment

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