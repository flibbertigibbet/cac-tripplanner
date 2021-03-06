# -*- coding: utf-8 -*-
# Generated by Django 1.11.21 on 2019-07-15 18:23

from django.conf import settings
from django.db import migrations


def add_sample_tours(apps, schema_editor):
    """ Add sample tours """

    # Only run in development
    if not settings.DEBUG:
        return

    Destination = apps.get_model('destinations', 'Destination')
    Tour = apps.get_model('destinations', 'Tour')
    TourDestination = apps.get_model('destinations', 'TourDestination')

    tour_data = {
        'name': 'Delaware Watershed Alliance',
        'description': '<p>A collection of Watershed Alliance locations.</p>',
        'published': True
    }

    tour = Tour(**tour_data)
    tour.save()
    dest_num = 1
    for wa in Destination.objects.filter(watershed_alliance=True):
        td = TourDestination(destination=wa, related_tour=tour, order=dest_num)
        dest_num += 1
        td.save()


class Migration(migrations.Migration):

    dependencies = [
        ('destinations', '0056_merge_20190910_1428'),
    ]

    operations = [
        migrations.RunPython(add_sample_tours, migrations.RunPython.noop),
    ]
