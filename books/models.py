from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    level = models.IntegerField(default=0)

    def __str__(self):
        return self.user.username


class Book(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='books')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    pdf = models.FileField(upload_to='books/', null=True, blank=True)
    preview_image = models.ImageField(upload_to='books/previews/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    category = models.CharField(
        max_length=50,
        choices=[
            ('1', 'Kitap'),
            ('2', 'Gollanma'),
            ('3', 'Okuw maksatnama'),
            ('4', 'Ylmy is'),
            ('5', 'Referat'),
            ('6', 'Diplom is'),
            ('7', 'Sapak yazgysy'),
        ],
        default='1'
    )
    allow_download = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class Post(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(default="")
    created_at = models.DateTimeField(auto_now_add=True)
    likes_count = models.IntegerField(default=0)

    def __str__(self):
        return f"Post by {self.author} on {self.book}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    line_number = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='replies', on_delete=models.CASCADE)
    confirmed = models.BooleanField(default=False)  # Добавляем поле confirmed

    def __str__(self):
        return f"Comment by {self.author} on {self.post}"


class PostLike(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} likes {self.post}"
