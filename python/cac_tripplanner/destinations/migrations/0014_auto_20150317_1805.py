# -*- coding: utf-8 -*-


from django.db import models, migrations
import ckeditor.fields


class Migration(migrations.Migration):

    dependencies = [
        ('destinations', '0013_auto_20150317_1743'),
    ]

    operations = [
        migrations.AlterField(
            model_name='feedevent',
            name='content',
            field=ckeditor.fields.RichTextField(blank=True),
            preserve_default=True,
        ),
    ]
