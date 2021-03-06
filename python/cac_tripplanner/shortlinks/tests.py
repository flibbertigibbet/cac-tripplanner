import json
import urllib.parse

from django.urls import reverse
from django.test import TestCase, Client, override_settings
from django.utils import timezone

from .forms import ShortenedLinkForm
from .models import ShortenedLink, ShortenedLinkHit
from .shortener import LinkShortener


class LinkShortenerTestCase(TestCase):
    """Verify LinkShortener functionality

    There's not much to do here because it currently returns a random string.
    """
    def setUp(self):
        self.long_link = ('/maps/dir/39.9590326,-75.1583468/39.9526178,-75.1657389/'
                          '@39.9557175,-75.1643398,17z/'
                          'data=!4m9!4m8!1m5!3m4!1m2!1d-75.1617645!2d39.9561121'
                          '!3s0x89c6c62c5dee8b8f:0x3edf9506e5f0f46!1m0!3e2')

    def test_generate_key(self):
        shortener = LinkShortener()
        key_len = len(shortener.generate_key(self.long_link))
        self.assertTrue(key_len >= 15 and key_len <= 30,
                        'Shortened link does not have expected length')


class ShortenedLinkModelsTestCase(TestCase):
    """Make sure that creation and deletion works"""
    def setUp(self):
        self.path = '/path/to/something?with=params'

    def test_create_shortened_link(self):
        sl = ShortenedLink.objects.create(key=LinkShortener().generate_key(self.path),
                                          destination=self.path,
                                          is_public=False)
        self.assertEqual(sl.destination, ShortenedLink.objects.get(pk=sl.pk).destination)
        self.assertLess(sl.create_date, timezone.now())
        sl.delete()
        self.assertEqual(ShortenedLink.objects.all().count(), 0)

    def test_create_shortened_link_hit(self):
        sl = ShortenedLink.objects.create(key=LinkShortener().generate_key(self.path),
                                          destination=self.path,
                                          is_public=False)
        slh = ShortenedLinkHit.objects.create(link=sl)
        self.assertEqual(sl, slh.link)
        self.assertLess(slh.hit_date, timezone.now())
        slh.delete()
        self.assertEqual(ShortenedLinkHit.objects.all().count(), 0)


class ShortenedLinkFormTestCase(TestCase):
    """Make sure that the ShortenedLinkForm behaves properly"""
    def setUp(self):
        self.badLink = '/this/doesnt/resolve/anywhere/except/the/void'
        self.goodLink = '/'
        self.badKey = ''.join(['i' for i in range(0, 200)])

    def test_good_data(self):
        data = {'destination': self.goodLink,
                'key': str(LinkShortener().generate_key(self.goodLink)),
                'is_public': 'false'}
        form = ShortenedLinkForm(data)
        self.assertTrue(form.is_valid())
        sl = form.save()
        self.assertEqual(sl.destination, data['destination'])
        self.assertEqual(sl.key, data['key'])
        self.assertEqual(sl.is_public, False)

    def test_no_data(self):
        data = dict()
        form = ShortenedLinkForm(data)
        self.assertFalse(form.is_valid())

    def test_bad_link(self):
        data = {'destination': self.badLink,
                'key': LinkShortener().generate_key(self.goodLink),
                'is_public': 'false'}
        form = ShortenedLinkForm(data)
        self.assertFalse(form.is_valid())

    def test_bad_key(self):
        data = {'destination': self.goodLink,
                'key': self.badKey,
                'is_public': 'false'}
        form = ShortenedLinkForm(data)
        self.assertFalse(form.is_valid())


class ShortenedLinkViewsTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_methods_and_url_resolution(self):
        """Make sure urls.py and the views' allowed methods are configured properly"""
        response = self.client.get('/link/shorten/')
        self.assertEqual(response.status_code, 405)
        response = self.client.post('/link/shorten/')
        self.assertEqual(response.status_code, 400)

        response = self.client.post('/link/abcdefghijklmnopqrstuv')
        self.assertEqual(response.status_code, 405)
        response = self.client.get('/link/abcdefghijklmnopqrstuv')
        self.assertEqual(response.status_code, 404)
        # This will throw an error if it fails; this is to make sure that the
        # URL resolution is fully working since the redirect method will return a
        # 404 if it is given a bad key.
        reverse('shortlinks:dereference-shortened', kwargs={'key': 'CMBOzqQbSPq25N29BTD54w'})


class ShortenedLinkCreateTestCase(TestCase):
    def setUp(self):
        self.client = Client()

    def test_create_view(self):
        """Make sure creation returns the right status."""
        response = self.client.post('/link/shorten/', data=json.dumps({'destination': '/'}),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)


@override_settings(ROOT_URLCONF='shortlinks.test.urls')
class ShortenedLinkRedirectTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.path = '/?but=with&some=params'

    def test_redirect_view(self):
        """Test the shortening process start-to-finish"""
        # We should start with a blank database
        self.assertEqual(ShortenedLinkHit.objects.all().count(), 0)
        # Create a new shortened link
        data = json.loads(self.client.post('/link/shorten/',
                                           data=json.dumps({'destination': self.path}),
                                           content_type='application/json').content)
        short_path = urllib.parse.urlparse(data['shortenedUrl']).path
        # Navigate to the short link
        response = self.client.get(short_path)
        # Make sure it's found
        self.assertEqual(response.status_code, 302)
        # Make sure the long link location is the same one we shortened.
        scheme, netloc, path, params, query, fragment = urllib.parse.urlparse(response['Location'])
        long_path = urllib.parse.urlunparse(('', '', path, params, query, fragment,))
        # There are certain values of self.path for which this would not be
        # true, for example, if path is '/?', urlunparse will return '/'.
        self.assertEqual(long_path, self.path)

        # And finally, make sure the number of hits was incremented
        self.assertEqual(ShortenedLinkHit.objects.all().count(), 1)
