# -*- coding: utf-8 -*-


from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('destinations', '0005_add_help_text'),
    ]

    operations = [
        migrations.AlterField(
            model_name='destination',
            name='city',
            field=models.CharField(default='Philadelphia', max_length=40),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='destination',
            name='state',
            field=models.CharField(default='PA', max_length=20),
            preserve_default=True,
        ),
    ]
