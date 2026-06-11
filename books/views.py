from django.http import JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404
from books.models import Book, Post, Comment, CommentReport, Profile, PostLike, PostView, UserFollow
from django.db.models import F
from books.pdf_preview import refresh_book_preview, delete_book_preview
from django.contrib.auth.decorators import login_required
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from books.serializers import CommentSerializer, BookSerializer, PostSerializer, CommentReportMessageSerializer
import logging
import json
from django.db.models import Sum
from django.views.decorators.csrf import csrf_exempt
from django.utils.text import slugify
from django.utils.html import strip_tags
from django.core.paginator import Paginator
from rest_framework import status

logger = logging.getLogger(__name__)


def index_view(request):
    return render(request, 'index.html', {'project_name': 'Моя Библиотека'})


from django.conf import settings


@csrf_exempt
def ai_chat_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_message = data.get('message')
            api_key = settings.GEMINI_API_KEY
            user_lang = data.get('lang', 'en')

            if not api_key:
                return JsonResponse(
                    {'reply': 'AI açary sazlanmady. GEMINI_API_KEY gurnalyň.'},
                    status=503,
                )

            prompts = {
                'tk': "Sen 'SYNÇY' kitaphanaçysy. Diňe türkmen dilinde gysga jogap ber.",
                'ru': "Ты библиотекарь сайта 'SYNÇY'. Отвечай только на русском языке.",
                'en': "You are the librarian of 'SYNÇY'. Respond only in English.",
                'th': "คุณคือบรรณารักษ์ของเว็บไซต์ 'SYNÇY' โปรดตอบเป็นภาษาไทยเท่านั้น"
            }

            system_instruction = prompts.get(user_lang, prompts['tk'])

            from google import genai

            client = genai.Client(api_key=api_key)

            # Используем переменную system_instruction!
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"Instruction: {system_instruction}\nUser question: {user_message}"
            )

            return JsonResponse({'reply': response.text})

        except Exception as e:
            print(f"AI Error: {e}")
            return JsonResponse({'reply': f'Ýalňyşlyk: {str(e)}'}, status=500)

    return JsonResponse({'error': 'Invalid request'}, status=400)
@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            Profile.objects.get_or_create(user=user)
            return JsonResponse({'success': True})
        return JsonResponse({'success': False, 'message': 'Ulanyjy ady ýa-da parol nädogry'})
    return render(request, 'auth.html')

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'message': 'Bu ulanyjy ady eýýäm bar'})
        user = User.objects.create_user(username=username, email=email, password=password)
        user.save()
        Profile.objects.create(user=user)
        login(request, user)
        return JsonResponse({'success': True})
    return render(request, 'auth.html')


@login_required
def book_list_view(request):
    # Проверяем по имени URL, а не по тексту пути!
    if request.resolver_match.url_name == 'my_books':
        return render(request, 'my_books.html')

    books = Book.objects.filter(author=request.user)
    serializer = BookSerializer(books, many=True)
    return JsonResponse(serializer.data, safe=False)


@api_view(['GET'])
@login_required
def book_list_api(request):
    books = Book.objects.filter(author=request.user)
    serializer = BookSerializer(books, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_create(request):
    if request.method == 'POST':
        try:
            logger.info(f"Received POST data: {dict(request.POST)}")
            logger.info(f"Received files: {dict(request.FILES)}")

            if not request.POST:
                return Response({'success': False, 'message': 'Нет данных в запросе'}, status=400)

            allow_download = request.POST.get('allow_download', 'false').lower() == 'true'
            data = {
                'title': request.POST.get('title', '').strip(),
                'description': request.POST.get('description', '').strip(),
                'category': request.POST.get('category'),
                'allow_download': allow_download,
            }
            if not data['title']:
                return Response({'success': False, 'message': 'Title обязателен'}, status=400)
            if data['category'] not in dict(Book._meta.get_field('category').choices):
                return Response({'success': False, 'message': 'Неверная категория'}, status=400)

            duplicate = Book.objects.filter(
                author=request.user,
                title__iexact=data['title'],
                approval_status=Book.ApprovalStatus.PENDING,
            ).exists()
            if duplicate:
                return Response(
                    {
                        'success': False,
                        'message': 'Bu kitap üçin garaşylýan haýyş eýýäm bar.',
                    },
                    status=400,
                )

            # Передаем файл напрямую в data, не сохраняя его вручную
            if 'pdf' in request.FILES:
                data['pdf'] = request.FILES['pdf']

            logger.info(f"Processed data for validation: {data}")
            serializer = BookSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                book = serializer.save(
                    author=request.user,
                    approval_status=Book.ApprovalStatus.PENDING,
                )
                pdf_path = book.pdf.name if book.pdf else None
                full_path = book.pdf.url if book.pdf and hasattr(book.pdf, 'url') else None
                logger.info(
                    f"Book submission saved with id: {book.id}, author: {book.author.username}, "
                    f"title: {book.title}, pdf_path: {pdf_path}, full_path: {full_path}")
                Profile.objects.get_or_create(user=request.user)
                return Response({
                    'success': True,
                    'book_id': book.id,
                    'pdf_url': full_path,
                    'pending': True,
                    'message': 'Haýyş iberildi. Admin tassyklanandan soň kitap neşir ediler.',
                })
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response({'success': False, 'message': serializer.errors}, status=400)
        except Exception as e:
            logger.error(f"Server error: {str(e)}", exc_info=True)
            return Response({'success': False, 'message': f'Серверда хаталyk boldy: {str(e)}'}, status=500)
    return Response({'success': False, 'message': 'Метод не поддерживается'}, status=405)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_update(request):
    if request.method == 'POST':
        try:
            book_id = request.POST.get('book_id')
            book = get_object_or_404(Book, id=book_id, author=request.user)
            allow_download = request.POST.get('allow_download', str(book.allow_download)).lower() == 'true'
            data = {
                'title': request.POST.get('title', book.title).strip(),
                'description': request.POST.get('description', book.description).strip(),
                'category': request.POST.get('category', book.category),
                'allow_download': allow_download,
            }
            if 'pdf' in request.FILES:
                if book.pdf and default_storage.exists(book.pdf.name):
                    default_storage.delete(book.pdf.name)
                data['pdf'] = request.FILES['pdf']  # Передаем новый файл

            logger.info(f"Processed data for update: {data}")
            serializer = BookSerializer(book, data=data, partial=True, context={'request': request})
            if serializer.is_valid():
                serializer.save()
                book.refresh_from_db()
                if 'pdf' in request.FILES:
                    refresh_book_preview(book)
                pdf_path = book.pdf.name if book.pdf else None
                full_path = book.pdf.url if book.pdf and hasattr(book.pdf, 'url') else None
                preview_url = book.preview_image.url if book.preview_image else None
                logger.info(f"Book updated with id: {book.id}, pdf_path: {pdf_path}, full_path: {full_path}")
                return Response({'success': True, 'pdf_url': full_path, 'preview_url': preview_url})
            return Response({'success': False, 'message': serializer.errors}, status=400)
        except Exception as e:
            logger.error(f"Server error: {str(e)}", exc_info=True)
            return Response({'success': False, 'message': 'Серверда хаталyk boldy'}, status=500)
    return Response({'success': False, 'message': 'Метод не поддерживается'}, status=405)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_delete(request):
    try:
        book_id = request.POST.get('book_id')
        book = get_object_or_404(Book, id=book_id, author=request.user)
        if book.pdf and default_storage.exists(book.pdf.name):
            default_storage.delete(book.pdf.name)
        delete_book_preview(book)
        book.delete()
        logger.info(f"Book deleted with id: {book_id}")
        return Response({'success': True})
    except Exception as e:
        logger.error(f"Server error: {str(e)}", exc_info=True)
        return Response({'success': False, 'message': 'Серверда хаталyk boldy'}, status=500)


@login_required
def all_books_view(request):
    if request.method == 'GET':
        return render(request, 'posts.html')
    return Response({'success': False, 'message': 'Метод не поддерживается'}, status=405)


def _paginated_posts_response(request, queryset, page):
    paginator = Paginator(queryset, 3)
    page_obj = paginator.get_page(page)
    serializer = PostSerializer(page_obj, many=True, context={'request': request})
    posts_data = list(serializer.data)

    post_ids = [p['id'] for p in posts_data]
    liked_ids = set(
        PostLike.objects.filter(user=request.user, post_id__in=post_ids).values_list('post_id', flat=True)
    )
    for post in posts_data:
        post['liked_by_me'] = post['id'] in liked_ids

    return Response({
        'posts': posts_data,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'page': page_obj.number,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def post_list_view(request):
    category = request.GET.get('category', None)
    page = request.GET.get('page', 1)
    search = request.GET.get('search', '').strip()

    posts = Post.objects.select_related('book', 'author', 'author__profile').order_by('-id')

    if category and category.isdigit():
        posts = posts.filter(book__category=int(category))

    if search:
        posts = posts.filter(book__title__icontains=search)

    return _paginated_posts_response(request, posts, page)


@login_required
def author_feed_view(request, username):
    get_object_or_404(User, username=username)
    return render(request, 'author_feed.html', {'author_username': username})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def author_profile_api(request, username):
    author = get_object_or_404(User, username=username)
    profile, _ = Profile.objects.get_or_create(user=author)
    avatar_url = profile.avatar.url if profile.avatar and hasattr(profile.avatar, 'url') else None
    post_count = Post.objects.filter(author=author).count()
    total_likes = Post.objects.filter(author=author).aggregate(
        total_likes=Sum('likes_count')
    )['total_likes'] or 0
    total_views = Post.objects.filter(author=author).aggregate(
        total_views=Sum('views_count')
    )['total_views'] or 0
    followers_count = UserFollow.objects.filter(following=author).count()
    following_count = UserFollow.objects.filter(follower=author).count()
    is_following = False
    if request.user.id != author.id:
        is_following = UserFollow.objects.filter(
            follower=request.user, following=author
        ).exists()

    return Response({
        'username': author.username,
        'avatar_url': avatar_url,
        'level': profile.level,
        'post_count': post_count,
        'total_likes': total_likes,
        'total_views': total_views,
        'followers_count': followers_count,
        'following_count': following_count,
        'is_following': is_following,
        'is_self': request.user.id == author.id,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def author_posts_api(request, username):
    author = get_object_or_404(User, username=username)
    page = request.GET.get('page', 1)
    posts = Post.objects.filter(author=author).select_related(
        'book', 'author', 'author__profile'
    ).order_by('-id')
    return _paginated_posts_response(request, posts, page)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_post_view(request):
    post_id = request.data.get('post_id')
    if not post_id:
        return Response({'success': False, 'message': 'post_id required'}, status=400)
    post = get_object_or_404(Post, id=post_id)
    view, created = PostView.objects.get_or_create(post=post, user=request.user)
    if created:
        Post.objects.filter(pk=post.pk).update(views_count=F('views_count') + 1)
        post.refresh_from_db()
    return Response({'success': True, 'views_count': post.views_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_follow(request):
    username = request.data.get('username')
    if not username:
        return Response({'success': False, 'message': 'username required'}, status=400)
    target = get_object_or_404(User, username=username)
    if target.id == request.user.id:
        return Response({'success': False, 'message': 'Cannot follow yourself'}, status=400)

    follow = UserFollow.objects.filter(follower=request.user, following=target).first()
    if follow:
        follow.delete()
        following = False
    else:
        UserFollow.objects.create(follower=request.user, following=target)
        following = True

    return Response({
        'success': True,
        'following': following,
        'followers_count': UserFollow.objects.filter(following=target).count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_post(request):
    post_id = request.data.get('post_id')
    post = get_object_or_404(Post, id=post_id)
    user = request.user

    if PostLike.objects.filter(post=post, user=user).exists():
        PostLike.objects.filter(post=post, user=user).delete()
        post.likes_count -= 1
        action = 'removed'
    else:
        PostLike.objects.create(post=post, user=user)
        post.likes_count += 1
        action = 'added'
    post.save()

    author = post.author
    profile = Profile.objects.get(user=author)
    if profile.level == 0:
        total_likes = Post.objects.filter(author=author).aggregate(total_likes=Sum('likes_count'))['total_likes'] or 0
        profile.level = total_likes // 10
        profile.save()

    return Response({'success': True, 'likes_count': post.likes_count, 'action': action})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_create(request):
    data = request.data
    post_id = data.get('post_id')
    content = data.get('content')
    line_number = data.get('line_number')
    parent_id = data.get('parent_id')
    if post_id and content:
        post = Post.objects.get(id=post_id)
        comment = Comment.objects.create(
            post=post,
            author=request.user,
            content=content,
            line_number=line_number or None,
            parent_id=parent_id if parent_id else None
        )
        serializer = CommentSerializer(comment)
        return Response({'success': True, 'comment': serializer.data})
    return Response({'success': False, 'message': 'Заполните все поля'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def comment_list(request, post_id):
    comments = Comment.objects.filter(post_id=post_id)
    serializer = CommentSerializer(comments, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_comments_view(request):
    # Если зашли через обычную ссылку в меню
    if request.resolver_match.url_name == 'my_comments':
        return render(request, 'my_comments.html')

    # API: комментарии к постам пользователя + ответы админа на его жалобы
    comments = (
        Comment.objects.filter(post__author=request.user, parent__isnull=True)
        .select_related('post', 'post__book', 'post__author', 'author', 'author__profile')
        .prefetch_related('replies', 'replies__author', 'replies__author__profile')
        .order_by('-created_at')
    )
    admin_reports = (
        CommentReport.objects.filter(
            reporter=request.user,
            status__in=(
                CommentReport.Status.REVIEWED,
                CommentReport.Status.DISMISSED,
            ),
        )
        .select_related('comment', 'comment__post', 'comment__post__book', 'reported_user')
        .order_by('-reviewed_at', '-created_at')
    )
    admin_messages = [
        report for report in admin_reports
        if strip_tags(report.admin_notes or '').strip()
    ]

    return Response({
        'post_comments': CommentSerializer(comments, many=True).data,
        'admin_messages': CommentReportMessageSerializer(admin_messages, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    book_count = Book.objects.filter(author=request.user).count()
    total_likes = Post.objects.filter(author=request.user).aggregate(
        total_likes=Sum('likes_count')
    )['total_likes'] or 0

    if profile.level == 0:
        profile.level = total_likes // 10
        profile.save()

    # Проверяем имя URL: если зашли на страницу профиля
    if request.resolver_match.url_name == 'profile':
        return render(request, 'profile.html', {
            'profile': profile,
            'book_count': book_count,
            'total_likes': total_likes
        })

    # Иначе отдаем данные для API
    avatar_url = profile.avatar.url if profile.avatar and hasattr(profile.avatar, 'url') else None
    return Response({
        'bio': profile.bio,
        'avatar': avatar_url,
        'book_count': book_count,
        'level': profile.level,
        'total_likes': total_likes
    })

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def profile_update(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    bio = request.POST.get('bio')
    if bio:
        profile.bio = bio
    if 'avatar' in request.FILES:
        if profile.avatar and default_storage.exists(profile.avatar.name):
            default_storage.delete(profile.avatar.name)
        profile.avatar = request.FILES['avatar']
    profile.save()
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    avatar_url = None
    try:
        profile = Profile.objects.get(user=request.user)
        if profile.avatar and hasattr(profile.avatar, 'url'):
            avatar_url = profile.avatar.url
    except Profile.DoesNotExist:
        pass
    return Response({
        'username': request.user.username,
        'avatar': avatar_url,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def comment_list_with_replies(request, post_id):
    logger.info(f"Fetching comments for post_id: {post_id}")
    comments = Comment.objects.filter(post_id=post_id, parent__isnull=True).order_by('created_at')
    logger.info(f"Found {comments.count()} root comments for post_id: {post_id}")
    serializer = CommentSerializer(comments, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_create_with_reply(request):
    data = request.data
    post_id = data.get('post_id')
    content = data.get('content')
    line_number = data.get('line_number')
    parent_id = data.get('parent_id')
    if post_id and content:
        post = Post.objects.get(id=post_id)
        comment = Comment.objects.create(
            post=post,
            author=request.user,
            content=content,
            line_number=line_number or None,
            parent_id=parent_id if parent_id else None
        )
        serializer = CommentSerializer(comment)
        return Response({'success': True, 'comment': serializer.data})
    return Response({'success': False, 'message': 'Заполните все поля'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_delete(request):
    comment_id = request.data.get('comment_id')
    logger.info(f"Attempting to delete comment with id: {comment_id}")
    if not comment_id:
        logger.warning("No comment_id provided in request")
        return Response({'success': False, 'message': 'Comment ID is required'})
    comment = get_object_or_404(Comment, id=comment_id)
    logger.info(f"Comment author: {comment.author.username}, Current user: {request.user.username}")
    if comment.author == request.user:
        logger.info(f"Comment {comment_id} deleted by user {request.user.username}")
        comment.delete()
        return Response({'success': True})
    logger.warning(f"User {request.user.username} attempted to delete comment {comment_id} but has no permission")
    return Response({'success': False, 'message': 'У вас нет прав на удаление этого комментария'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_update(request):
    comment_id = request.data.get('comment_id')
    content = request.data.get('content')
    comment = get_object_or_404(Comment, id=comment_id)
    if comment.author == request.user and content:
        comment.content = content
        comment.save()
        serializer = CommentSerializer(comment)
        return Response({'success': True, 'comment': serializer.data})
    return Response({'success': False, 'message': 'У вас нет прав на редактирование или поле пустое'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def confirm_comment(request):
    comment_id = request.data.get('comment_id')
    try:
        comment = get_object_or_404(Comment, id=comment_id)
        if request.user.username == comment.post.author.username:  # Проверка, что пользователь — автор поста
            comment.confirmed = True
            comment.save()
            return Response({'success': True})
        else:
            return Response({'success': False, 'message': 'Только автор поста может подтвердить комментарий.'})
    except Comment.DoesNotExist:
        return Response({'success': False, 'message': 'Комментарий не найден.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_report_create(request):
    comment_id = request.data.get('comment_id')
    reported_username = (request.data.get('reported_user') or '').strip().lstrip('@')
    reason = (request.data.get('reason') or '').strip()
    message = (request.data.get('message') or '').strip()
    report_type = (request.data.get('report_type') or CommentReport.ReportType.COMMENT).strip()

    if report_type not in dict(CommentReport.ReportType.choices):
        return Response(
            {'success': False, 'message': 'Nädogry şikayat görnüşi.'},
            status=400,
        )

    if not comment_id or not message:
        return Response(
            {'success': False, 'message': 'Ähli meýdanlary dolduryň.'},
            status=400,
        )

    comment = get_object_or_404(Comment.objects.select_related('post', 'post__author', 'author'), id=comment_id)
    post_author = comment.post.author

    if report_type == CommentReport.ReportType.NO_CONFIRMATION:
        if comment.author_id != request.user.id:
            return Response(
                {'success': False, 'message': 'Diňe öz teswiriňize tassyklanmadyk bolsa şikayat edip bilersiňiz.'},
                status=400,
            )
        if comment.confirmed:
            return Response(
                {'success': False, 'message': 'Teswir eýýäm tassyklanan — şikayat gerek däl.'},
                status=400,
            )
        if post_author.id == request.user.id:
            return Response(
                {'success': False, 'message': 'Öz postyňyza şikayat edip bolmaýar.'},
                status=400,
            )
        reported_user = post_author
        reason = CommentReport.Reason.NO_CONFIRMATION
    else:
        if not reported_username or not reason:
            return Response(
                {'success': False, 'message': 'Ähli meýdanlary dolduryň.'},
                status=400,
            )
        if reason not in dict(CommentReport.Reason.choices):
            return Response(
                {'success': False, 'message': 'Nädogry sebäp.'},
                status=400,
            )
        if comment.author_id == request.user.id:
            return Response(
                {'success': False, 'message': 'Öz teswiriňize şikayat edip bolmaýar.'},
                status=400,
            )
        reported_user = get_object_or_404(User, username=reported_username)

    if CommentReport.objects.filter(
        reporter=request.user,
        comment=comment,
        report_type=report_type,
    ).exists():
        return Response(
            {'success': False, 'message': 'Bu teswir üçin şeýle şikayat eýýäm iberildi.'},
            status=400,
        )

    report = CommentReport.objects.create(
        comment=comment,
        reporter=request.user,
        reported_user=reported_user,
        report_type=report_type,
        reason=reason,
        message=message,
    )

    return Response({
        'success': True,
        'message': 'Şikayat admina iberildi. Sag boluň!',
        'report_id': report.id,
    })
