from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0008_alter_post_content'),
    ]

    operations = [
        migrations.AddField(
            model_name='book',
            name='preview_image',
            field=models.ImageField(blank=True, null=True, upload_to='books/previews/'),
        ),
    ]
