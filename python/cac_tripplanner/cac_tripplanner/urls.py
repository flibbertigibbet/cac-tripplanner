from django.conf.urls import patterns, include, url
from django.contrib.gis import admin

from django.contrib.staticfiles import views as staticviews

from .views import FindReachableDestinations
import settings

urlpatterns = patterns(
    '',
    # Home
    url(r'^$', 'cac_tripplanner.views.home', name='home'),

    # Map
    url(r'^map/', 'cac_tripplanner.views.map', name='map'),
    url(r'^map/reachable$', FindReachableDestinations.as_view(), name='reachable'),

    ## Community Profiles
    url(r'^community-profile/(?P<slug>[\w-]+)/$',
        'cms.views.community_profile_detail',
        name='community-profile-detail'),

    ## Tips and Tricks
    url(r'^tips-and-tricks/(?P<slug>[\w-]+)/$',
        'cms.views.tips_and_tricks_detail',
        name='tips-and-tricks-detail'),

    # Link Shortening
    url(r'^link/', include('shortlinks.urls')),

    url(r'^admin/', include(admin.site.urls)),
    url(r'^ckeditor/', include('ckeditor.urls')),
)

if settings.DEBUG:
    urlpatterns += [
        url(r'^static/(?P<path>.*)$', staticviews.serve),
    ]
