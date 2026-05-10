from django.http import JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404
from books.models import Book, Post, Comment, Profile, PostLike
from django.contrib.auth.decorators import login_required
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from books.serializers import CommentSerializer, BookSerializer, PostSerializer
import logging
import json
from django.db.models import Sum
from django.views.decorators.csrf import csrf_exempt
from django.utils.text import slugify
from django.core.paginator import Paginator
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from google import genai
logger = logging.getLogger(__name__)


def index_view(request):
    return render(request, 'index.html', {'project_name': 'Моя Библиотека'})


import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def ai_chat_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_message = data.get('message')
            api_key = data.get('api_key', '')  # Твой ключ
            user_lang = data.get('lang', 'en')

            prompts = {
                'tk': "Sen 'SYNÇY' kitaphanaçysy. Diňe türkmen dilinde gysga jogap ber.",
                'ru': "Ты библиотекарь сайта 'SYNÇY'. Отвечай только на русском языке.",
                'en': "You are the librarian of 'SYNÇY'. Respond only in English.",
                'th': "คุณคือบรรณารักษ์ของเว็บไซต์ 'SYNÇY' โปรดตอบเป็นภาษาไทยเท่านั้น"
            }

            system_instruction = prompts.get(user_lang, prompts['tk'])

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
        return JsonResponse({'success': False, 'message': 'Неверные данные'})
    return render(request, 'auth.html')


def register_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'message': 'Пользователь уже существует'})
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

            # Передаем файл напрямую в data, не сохраняя его вручную
            if 'pdf' in request.FILES:
                data['pdf'] = request.FILES['pdf']

            logger.info(f"Processed data for validation: {data}")
            serializer = BookSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                serializer.save(author=request.user)
                book = serializer.instance
                pdf_path = book.pdf.name if book.pdf else None
                full_path = book.pdf.url if book.pdf and hasattr(book.pdf, 'url') else None
                logger.info(
                    f"Book saved with id: {book.id}, author: {book.author.username}, title: {book.title}, pdf_path: {pdf_path}, full_path: {full_path}")
                Post.objects.create(book=book, author=request.user,
                                    content=data['title'])
                profile, created = Profile.objects.get_or_create(user=request.user)
                profile.save()
                return Response({'success': True, 'book_id': book.id, 'pdf_url': full_path})
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
                pdf_path = book.pdf.name if book.pdf else None
                full_path = book.pdf.url if book.pdf and hasattr(book.pdf, 'url') else None
                logger.info(f"Book updated with id: {book.id}, pdf_path: {pdf_path}, full_path: {full_path}")
                return Response({'success': True, 'pdf_url': full_path})
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def post_list_view(request):
    category = request.GET.get('category', None)
    page = request.GET.get('page', 1)  # ← НОВАЯ СТРОЧКА
    search = request.GET.get('search', '').strip()  # ← если потом захочешь поиск по заголовку

    # Базовый queryset
    posts = Post.objects.all().order_by('-id')

    # Фильтр по категории
    if category and category.isdigit():
        posts = posts.filter(book__category=int(category))

    # Поиск по названию книги (по желанию — можно включить потом)
    if search:
        posts = posts.filter(book__title__icontains=search)

    # ПАГИНАЦИЯ — вот и всё волшебство!
    paginator = Paginator(posts, 3)
    page_obj = paginator.get_page(page)

    serializer = PostSerializer(page_obj, many=True, context={'request': request})

    return Response({
        'posts': serializer.data,
        'has_next': page_obj.has_next()  # ← фронт поймёт, есть ли ещё страницы
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

    # Если запрос пришел от JavaScript (API)
    comments = Comment.objects.filter(post__book__author=request.user)
    serializer = CommentSerializer(comments, many=True)
    return Response(serializer.data)


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
    return Response({'username': request.user.username})


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
