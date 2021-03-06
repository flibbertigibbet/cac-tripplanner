from datetime import datetime
import os
import json

from django.test import TestCase, Client

from django.contrib.gis.geos import GEOSGeometry

from destinations.models import Destination

class CACTripPlannerIsochroneTestCase(TestCase):
    """ Test behavior of within-isochrone view """

    def setUp(self):
        file_directory = os.path.dirname(os.path.abspath(__file__))
        with open(os.path.join(file_directory, 'testing', 'test_point_inside.json'),
                  'r') as json_point:
            test_point_inside = json.load(json_point)
        with open(os.path.join(file_directory, 'testing', 'test_point_outside.json'),
                  'r') as json_point:
            test_point_outside = json.load(json_point)

        self.client = Client()
        self.test_point_inside = GEOSGeometry(json.dumps(test_point_inside))
        self.test_point_outside = GEOSGeometry(json.dumps(test_point_outside))
        Destination.objects.create(
            name='testWithin',
            description='A simple test destination',
            point=self.test_point_inside,
            address='123 Test ln.',
            city='Gotham',
            state='Euphoria',
            zipcode='12345',
            published=True,
            image_raw='default_media/square/JohnHeinzNationalWildlifeRefuge.jpg',
            wide_image_raw='default_media/half-square/JohnHeinzNationalWildlifeRefuge.jpg'
        )
        Destination.objects.create(
            name='testWithout',
            description='A simple test destination',
            point=self.test_point_outside,
            address='123 Test ln.',
            city='Thangorodrim',
            state='Angband',
            zipcode='12349',
            published=True,
            image_raw='default_media/square/JohnHeinzNationalWildlifeRefuge.jpg',
            wide_image_raw='default_media/half-square/JohnHeinzNationalWildlifeRefuge.jpg'
        )

    def test_points_exists(self):
        """Diagnose setup's success in creating points"""
        self.assertEqual(Destination.objects.filter(name='testWithin')[0].point,
                         self.test_point_inside)
        self.assertEqual(Destination.objects.filter(name='testWithout')[0].point,
                         self.test_point_outside)

    def test_isochrone_partitioning(self):
        """Ensure that our pet isochrone correctly demarcates between points within and
        points outside of its boundary"""
        # flake8: noqa

        # use current date for query
        dt = datetime.now()
        day_str = str(dt.date())
        isochrone_start = '/map/reachable?fromPlace=39.954688%2C-75.204677&mode%5B%5D=WALK%2DTRANSIT&time=7%3A30am&cutoffSec=3600&maxWalkDistance=5000'
        isochrone_url = ('{start}&date={day_str}').format(start=isochrone_start, day_str=day_str)
        response = self.client.get(isochrone_url)
        json_response = json.loads(response.content)
        destinations = json_response['matched']
        # should have at least one destination (maybe multiple with defaults loaded)
        self.assertGreater(len(destinations), 0)
        # check for our entry
        destination = [dest for dest in destinations if dest['city'] == 'Gotham'][0]
        # did we get back our entry?
        self.assertEqual(destination['name'], 'testWithin')
        # did we get a pair of coordinates back?
        self.assertEqual(2, len(destination['point']['coordinates']))

    def test_empty_isochrone(self):
        """Return empty results if no isochrone found (for example, if origin is outside graph bounds)"""

        # use current date for query
        dt = datetime.now()
        day_str = str(dt.date())

        isochrone_start = '/map/reachable?fromPlace=79.954688%2D-45.204677&mode%5B%5D=WALK%2DTRANSIT&time=7%3A30am&cutoffSec=2000&maxWalkDistance=5000'
        isochrone_url = ('{start}&date={day_str}').format(start=isochrone_start, day_str=day_str)

        response = self.client.get(isochrone_url)
        json_response = json.loads(response.content)
        matched = json_response['matched']
        self.assertEqual(0, len(matched))
        isochrone = json_response['isochrone']
        self.assertEqual({}, isochrone)

    def test_isochrone_outside_range(self):
        """Return error if cutoffSec parameter is outside allowed range"""

        # use current date for query
        dt = datetime.now()
        day_str = str(dt.date())

        isochrone_start = '/map/reachable?fromPlace=79.954688%2D-45.204677&mode%5B%5D=WALK%2DTRANSIT&time=7%3A30am&cutoffSec=9000&maxWalkDistance=5000'
        isochrone_url = ('{start}&date={day_str}').format(start=isochrone_start, day_str=day_str)

        response = self.client.get(isochrone_url)
        self.assertEqual(400, response.status_code)
