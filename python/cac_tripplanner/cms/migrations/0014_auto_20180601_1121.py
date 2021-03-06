# -*- coding: utf-8 -*-
# Generated by Django 1.11.12 on 2018-06-01 15:21


from django.db import migrations
import image_cropping.fields


class Migration(migrations.Migration):

    dependencies = [
        ('CMS', '0013_auto_20180418_1103'),
    ]

    operations = [
        migrations.AlterField(
            model_name='article',
            name='narrow_image',
            field=image_cropping.fields.ImageRatioField('narrow_image_raw', '310x218', adapt_rotation=False, allow_fullsize=False, free_crop=False, help_text='The small image. Will be displayed at 310x218', hide_image_field=False, size_warning=True, verbose_name='narrow image'),
        ),
    ]
