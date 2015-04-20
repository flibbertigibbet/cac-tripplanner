"""
Django settings for cac_tripplanner project.

For more information on this file, see
https://docs.djangoproject.com/en/1.7/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.7/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os
import yaml
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

try:
    secrets = yaml.safe_load(open('/etc/cac_secrets', 'r'))
except (IOError, NameError):
    # Note: secrets are read in via a YAML file, so make sure nothing is added
    # here that cannot be represented in YAML. One example is a tuple: represent
    # it as a list here, and then convert to a tuple later on (see internal_ips).
    secrets = {
        'secret_key': '%&_DEVELOPMENT_SECRET_KEY_#42*pk!3y6lvk&1psyk=e=pr',
        'database': {
            'ENGINE': 'django.contrib.gis.db.backends.postgis',
            'NAME': 'cac_tripplanner',
            'USER': 'cac_tripplanner',
            'PASSWORD': 'cac_tripplanner',
            'HOST': '192.168.8.25',
            'PORT': '5432'
        },
        # Note: the OTP URL is called directly from within javascript. In
        # order to view the page on an external machine, this URL must be
        # overridden via the secrets file. This can't be automatically set
        # to the host machine's DNS here, because this code runs in a VM.
        'otp_url': 'http://192.168.8.26/otp/routers/{router}/',
        'allowed_hosts': ['127.0.0.1', 'localhost'],
        'internal_ips': ['0.0.0.0', '127.0.0.1'],
        'postgis_version': [2, 1, 5],
        'build_dir': '/opt/app/src',
        'production': False,

        'use_s3_storage': False,

        # Settings only needed if 'use_s3_storage' is set to True
        'aws_access_key_id': '',
        'aws_secret_access_key': '',
        'aws_storage_bucket_name': '',

        'default_admin_username': 'admin',
        'default_admin_password': 'admin',
        'default_admin_email': 'systems+cac@azavea.com'
    }


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.7/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = secrets['secret_key']

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = not secrets['production']

TEMPLATE_DEBUG = not secrets['production']

ALLOWED_HOSTS = secrets['allowed_hosts']

INTERNAL_IPS = tuple(secrets['internal_ips'])

# Needed in order to call collectstatic without a DB (during AMI creation)
POSTGIS_VERSION = tuple(secrets['postgis_version'])

# Application definition

INSTALLED_APPS = (
    'wpadmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',

    # Third Party Apps
    'ckeditor',
    'django_extensions',
    'storages',

    # Project Apps
    'cms',
    'destinations',
    'shortlinks',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'cac_tripplanner.urls'

WSGI_APPLICATION = 'cac_tripplanner.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.7/ref/settings/#databases

DATABASES = {
    'default': secrets['database']
}

# Internationalization
# https://docs.djangoproject.com/en/1.7/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'America/New_York'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.7/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = '/srv/cac'
STATICFILES_DIRS = ()

MEDIA_ROOT = '/media/cac/'
MEDIA_URL = '/media/'

# TEMPLATE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-context-processors
TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.core.context_processors.tz',
    'django.contrib.messages.context_processors.messages',
    'django.core.context_processors.request',
)

# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-loaders
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-dirs
TEMPLATE_DIRS = (
    os.path.normpath(os.path.join(BASE_DIR, 'templates')),
)

CKEDITOR_UPLOAD_PATH = 'uploads/'
CKEDITOR_IMAGE_BACKEND = 'pillow'

# TODO: delete later.
CKEDITOR_JQUERY_URL = '//ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js'

CKEDITOR_CONFIGS = {
    'default': {
        'toolbar': [
            ["Styles",
             "Format",
             "Bold",
             "Italic",
             "Underline",
             "Strike",
             "SpellChecker",
             "Undo",
             "Redo"],
            ["Link", "Unlink", "Anchor"],
            ["Table", "HorizontalRule"],
            ["SpecialChar"],
            ["Source"]
        ]
    }
}

WPADMIN = {
    'admin': {
        'title': 'Clean Air Council Content Management System',
        'menu': {
            'top': 'wpadmin.menu.menus.BasicTopMenu',
            'left': 'wpadmin.menu.menus.BasicLeftMenu'
        }
    }
}

# OTP CONFIGURATION
OTP_URL = secrets['otp_url']

# Settings for S3 storage
if secrets['use_s3_storage']:
    DEFAULT_FILE_STORAGE = 'cac_tripplanner.custom_storages.PublicS3BotoStorage'
    AWS_ACCESS_KEY_ID = secrets['aws_access_key_id']
    AWS_SECRET_ACCESS_KEY = secrets['aws_secret_access_key']
    AWS_STORAGE_BUCKET_NAME = secrets['aws_storage_bucket_name']

# Default user
DEFAULT_ADMIN_USERNAME = secrets['default_admin_username']
DEFAULT_ADMIN_PASSWORD = secrets['default_admin_password']
DEFAULT_ADMIN_EMAIL = secrets['default_admin_email']

# Application settings
#
MAX_IMAGE_SIZE_MB = 1

# Directory for default featured destinations added in destinations 0012
# subdir of MEDIA_ROOT
# used in migration destinations 0016, DO NOT put any other files in this media folder
# they will be deleted on a backwards migration from 0016 -> 0015
# NOTE: If the images placed here are to be used in production as well, they will need to be copied
# to the bucket specified in AWS_STORAGE_BUCKET_NAME
DEFAULT_MEDIA_PATH = 'default_media'
# src directory for default media images
DEFAULT_MEDIA_SRC_PATH = os.path.join(BASE_DIR, DEFAULT_MEDIA_PATH)
