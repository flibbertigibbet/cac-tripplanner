# -*- coding: utf-8 -*-
# Generated by Django 1.11.23 on 2019-08-27 21:09
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('destinations', '0048_auto_20190822_1857'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='tourdestination',
            unique_together=set([('destination', 'related_tour')]),
        ),
    ]