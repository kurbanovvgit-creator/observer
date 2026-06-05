"""
WSGI config for book_platform project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
from pathlib import Path

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'book_platform.settings')

# PythonAnywhere: GEMINI_API_KEY env, or one-line file gemini_api_key.txt in project root
if not os.environ.get('GEMINI_API_KEY'):
    _base = Path(__file__).resolve().parent.parent
    for _key_file in (_base / 'gemini_api_key.txt', _base / 'book_platform' / 'gemini_api_key.txt'):
        if _key_file.is_file():
            os.environ['GEMINI_API_KEY'] = _key_file.read_text(encoding='utf-8').strip()
            break

application = get_wsgi_application()
