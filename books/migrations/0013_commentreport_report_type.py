from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('books', '0012_commentreport'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='commentreport',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='commentreport',
            name='report_type',
            field=models.CharField(
                choices=[
                    ('comment', 'Teswir barada'),
                    ('no_confirmation', 'Tassyklanmadyk teswir'),
                ],
                default='comment',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='commentreport',
            name='reason',
            field=models.CharField(
                choices=[
                    ('spam', 'Spam'),
                    ('abuse', 'Hakaret / ýaman söz'),
                    ('misinfo', 'Ýalan maglumat'),
                    ('copyright', 'Awtor hukugy'),
                    ('harassment', 'Ýüze çykýan betlik'),
                    ('no_confirmation', 'Post awtory teswiri tassyklamady'),
                    ('other', 'Beýleki'),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='commentreport',
            unique_together={('reporter', 'comment', 'report_type')},
        ),
    ]
