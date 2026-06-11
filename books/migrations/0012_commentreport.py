from django.db import migrations, models
import ckeditor.fields


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0011_book_approval_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='CommentReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(choices=[('spam', 'Spam'), ('abuse', 'Hakaret / ýaman söz'), ('misinfo', 'Ýalan maglumat'), ('copyright', 'Awtor hukugy'), ('harassment', 'Ýüze çykýan betlik'), ('other', 'Beýleki')], max_length=20)),
                ('message', models.TextField(help_text='Goşmaça maglumat')),
                ('status', models.CharField(choices=[('pending', 'Garaşylýar'), ('reviewed', 'Görüldi'), ('dismissed', 'Ret edildi')], default='pending', max_length=20)),
                ('admin_notes', ckeditor.fields.RichTextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('comment', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='reports', to='books.comment')),
                ('reported_user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='comment_reports_received', to='auth.user')),
                ('reporter', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='comment_reports_sent', to='auth.user')),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('reporter', 'comment')},
            },
        ),
    ]
