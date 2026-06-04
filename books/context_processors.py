from books.models import Profile


def nav_user(request):
    avatar_url = None
    if request.user.is_authenticated:
        try:
            profile = Profile.objects.get(user=request.user)
            if profile.avatar and hasattr(profile.avatar, 'url'):
                avatar_url = profile.avatar.url
        except Profile.DoesNotExist:
            pass
    return {
        'nav_avatar_url': avatar_url,
    }
