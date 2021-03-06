{% extends "gis/admin/openlayers.js" %}
{% block base_layer %}
// explicitly load via SSL to deal with redirect to HTTPS
new OpenLayers.Layer.OSM("OpenStreetMap", [
    'https://a.tile.openstreetmap.org/${z}/${x}/${y}.png',
    'https://b.tile.openstreetmap.org/${z}/${x}/${y}.png',
    'https://c.tile.openstreetmap.org/${z}/${x}/${y}.png'
]);
{% endblock %}

{% block extra_layers %}

var $address = $('[name=address]');
var module = {{ module }};
var map = module.map;
var projLatLng = new OpenLayers.Projection('EPSG:4326');

// See the following link for the reason why 3857 doesn't work here without some tweaking:
// http://docs.openlayers.org/library/spherical_mercator.html#sphericalmercator-and-epsg-aliases
var projWM = new OpenLayers.Projection('EPSG:900913');
var geocodeThrottleMillis = 500;

$address.on('input', _.debounce(function () {
    CAC.Search.Geocoder.search($address.val()).then(function (result) {
        if (!result) {
            return; // no result found
        }

        var geom = result.location;
        var point = new OpenLayers.Geometry.Point(geom.x, geom.y).transform(projLatLng, projWM);
        var vectorLayer = module.layers.vector;
        vectorLayer.addFeatures([new OpenLayers.Feature.Vector(point)]);
        map.zoomToExtent(vectorLayer.getDataExtent());
    });
}, geocodeThrottleMillis));

{% endblock %}
