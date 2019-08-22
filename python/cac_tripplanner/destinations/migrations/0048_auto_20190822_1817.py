# -*- coding: utf-8 -*-
# Generated by Django 1.11.23 on 2019-08-22 22:17
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('destinations', '0047_allow_multiple_event_destinations'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tour',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('published', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='TourDestination',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(db_index=True, default=1)),
                ('start_date', models.DateTimeField(blank=True, null=True)),
                ('end_date', models.DateTimeField(blank=True, null=True)),
                ('destination', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='tour_destination', to='destinations.Destination')),
                ('related_tour', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='related_tour', to='destinations.Tour')),
            ],
            options={
                'ordering': ['order', '-start_date'],
            },
        ),
        migrations.AddField(
            model_name='tour',
            name='destinations',
            field=models.ManyToManyField(to='destinations.TourDestination'),
        ),
    ]