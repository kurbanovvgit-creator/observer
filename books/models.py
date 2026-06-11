from django.db import models
from django.contrib.auth.models import User
from ckeditor.fields import RichTextField


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    level = models.IntegerField(default=0)

    def __str__(self):
        return self.user.username


class Book(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Garaşylýar'
        APPROVED = 'approved', 'Tassyklandy'
        REJECTED = 'rejected', 'Ret edildi'

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='books')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    pdf = models.FileField(upload_to='books/', null=True, blank=True)
    preview_image = models.ImageField(upload_to='books/previews/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
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
    views_count = models.IntegerField(default=0)

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


class PostView(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='post_views')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} viewed {self.post_id}"


class UserFollow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_relations')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follower_relations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower.username} → {self.following.username}"


class CommentReport(models.Model):
    class ReportType(models.TextChoices):
        COMMENT = 'comment', 'Teswir barada'
        NO_CONFIRMATION = 'no_confirmation', 'Tassyklanmadyk teswir'

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        ABUSE = 'abuse', 'Hakaret / ýaman söz'
        MISINFO = 'misinfo', 'Ýalan maglumat'
        COPYRIGHT = 'copyright', 'Awtor hukugy'
        HARASSMENT = 'harassment', 'Ýüze çykýan betlik'
        NO_CONFIRMATION = 'no_confirmation', 'Post awtory teswiri tassyklamady'
        OTHER = 'other', 'Beýleki'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Garaşylýar'
        REVIEWED = 'reviewed', 'Görüldi'
        DISMISSED = 'dismissed', 'Ret edildi'

    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comment_reports_sent')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comment_reports_received')
    report_type = models.CharField(
        max_length=20,
        choices=ReportType.choices,
        default=ReportType.COMMENT,
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    message = models.TextField(help_text='Goşmaça maglumat')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    admin_notes = RichTextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('reporter', 'comment', 'report_type')
        ordering = ['-created_at']

    def __str__(self):
        return f'Şikayat #{self.id} ({self.get_report_type_display()}) → @{self.reported_user.username}'
