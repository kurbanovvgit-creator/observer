from django.db import migrations, models


def approve_existing_books(apps, schema_editor):
    Book = apps.get_model('books', 'Book')
    Book.objects.all().update(approval_status='approved')


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0010_post_views_count_postview_userfollow'),
    ]

    operations = [
        migrations.AddField(
            model_name='book',
            name='approval_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Garaşylýar'),
                    ('approved', 'Tassyklandy'),
                    ('rejected', 'Ret edildi'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.RunPython(approve_existing_books, migrations.RunPython.noop),
    ]
