from django.contrib import admin
from django.utils import timezone
from ckeditor.widgets import CKEditorWidget
from django import forms

from .models import Book, Post, Comment, CommentReport, PostLike, PostView, UserFollow, Profile
from .book_publish import publish_book


@admin.action(description='Tassykla we neşir et')
def approve_books(modeladmin, request, queryset):
    for book in queryset.filter(approval_status=Book.ApprovalStatus.PENDING):
        book.approval_status = Book.ApprovalStatus.APPROVED
        book.save(update_fields=['approval_status'])
        publish_book(book)


@admin.action(description='Ret et')
def reject_books(modeladmin, request, queryset):
    queryset.filter(approval_status=Book.ApprovalStatus.PENDING).update(
        approval_status=Book.ApprovalStatus.REJECTED
    )


@admin.action(description='Görüldi diýip belle')
def mark_reports_reviewed(modeladmin, request, queryset):
    queryset.filter(status=CommentReport.Status.PENDING).update(
        status=CommentReport.Status.REVIEWED,
        reviewed_at=timezone.now(),
    )


@admin.action(description='Ret et (şikayat)')
def dismiss_reports(modeladmin, request, queryset):
    queryset.filter(status=CommentReport.Status.PENDING).update(
        status=CommentReport.Status.DISMISSED,
        reviewed_at=timezone.now(),
    )


class BookAdminForm(forms.ModelForm):
    class Meta:
        model = Book
        fields = '__all__'
        widgets = {
            'description': CKEditorWidget(),
        }


class PostAdminForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = '__all__'
        widgets = {
            'content': CKEditorWidget(),
        }


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'level')
    search_fields = ('user__username',)


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    form = BookAdminForm
    list_display = ('title', 'author', 'category', 'approval_status', 'created_at', 'allow_download', 'preview_image')
    list_filter = ('approval_status', 'category', 'allow_download')
    search_fields = ('title', 'author__username')
    actions = [approve_books, reject_books]
    list_editable = ('approval_status',)
    list_per_page = 25
    date_hierarchy = 'created_at'

    def save_model(self, request, obj, form, change):
        previous_status = None
        if change and obj.pk:
            previous_status = Book.objects.filter(pk=obj.pk).values_list(
                'approval_status', flat=True
            ).first()
        super().save_model(request, obj, form, change)
        if (
            obj.approval_status == Book.ApprovalStatus.APPROVED
            and previous_status != Book.ApprovalStatus.APPROVED
        ):
            publish_book(obj)


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    form = PostAdminForm
    list_display = ('id', 'book', 'author', 'likes_count', 'views_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content', 'book__title', 'author__username')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'author', 'line_number', 'confirmed', 'created_at')
    list_filter = ('confirmed', 'created_at')
    search_fields = ('content', 'author__username')


@admin.register(CommentReport)
class CommentReportAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'report_type', 'reported_user', 'reporter', 'reason', 'status',
        'comment', 'created_at', 'reviewed_at',
    )
    list_filter = ('report_type', 'status', 'reason', 'created_at')
    search_fields = (
        'reported_user__username', 'reporter__username',
        'message', 'comment__content',
    )
    readonly_fields = ('reporter', 'reported_user', 'comment', 'report_type', 'reason', 'message', 'created_at')
    actions = [mark_reports_reviewed, dismiss_reports]
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Şikayat', {
            'fields': ('status', 'report_type', 'reporter', 'reported_user', 'comment', 'reason', 'message', 'created_at'),
        }),
        ('Admin jogaby (CKEditor)', {
            'fields': ('admin_notes', 'reviewed_at'),
        }),
    )

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data and obj.status != CommentReport.Status.PENDING:
            if not obj.reviewed_at:
                obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')
    list_filter = ('created_at',)


@admin.register(PostView)
class PostViewAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')
    list_filter = ('created_at',)


@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')
    search_fields = ('follower__username', 'following__username')
