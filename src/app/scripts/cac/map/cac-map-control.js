CAC.Map.Control = (function ($, Handlebars, cartodb, L, turf, _) {
    'use strict';

    var defaults = {
        id: 'map',
        selector: '#map',
        homepage: true,
        center: [39.95, -75.1667],
        zoom: 14,
    };

    var map = null;
    var geocodeMarker = null;
    var directionsMarkers = {
        origin: null,
        destination: null
    };

    var overlaysControl = null;

    var events = $({});
    var eventNames = {
        currentLocationClick: 'cac:map:control:currentlocation',
        originMoved: 'cac:map:control:originmoved',
        destinationMoved: 'cac:map:control:destinationmoved',
        geocodeMarkerMoved: 'cac:map:control:geocodemoved',
    };
    var basemaps = {};
    var overlays = {};
    var lastDisplayPointMarker = null;

    var layerControl = null;
    var tabControl = null;
    var zoomControl = null;

    var homepage = true; // whether currently displaying home page view
    var loaded = false; // whether map tiles loaded yet (delay on mobile until in view)

    var esriSatelliteAttribution = [
        '&copy; <a href="http://www.esri.com/">Esri</a> ',
        'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, ',
        'AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community'
    ].join('');
    var cartodbAttribution = [
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ',
        '&copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    ].join('');

    function MapControl(options) {
        this.events = events;
        this.eventNames = eventNames;
        this.options = $.extend({}, defaults, options);
        overlaysControl = new CAC.Map.OverlaysControl();

        this.itineraryControl = new CAC.Map.ItineraryControl({map: null});

        // only load map tiles if map visible
        if (!homepage || $(this.options.selector).is(':visible')) {
            loadMap(this);
        }
    }

    MapControl.prototype.isLoaded = isLoaded;
    MapControl.prototype.loadMap = loadMap;
    MapControl.prototype.setGeocodeMarker = setGeocodeMarker;
    MapControl.prototype.setDirectionsMarkers = setDirectionsMarkers;
    MapControl.prototype.clearDirectionsMarker = clearDirectionsMarker;
    MapControl.prototype.displayPoint = displayPoint;
    MapControl.prototype.goToMapPage = goToMapPage;

    return MapControl;

    /**
     * Display map components not shown on the homepage.
     */
    function goToMapPage() {
        if (!loaded) {
            loadMap(this); // load map tiles and layers if not loaded already
        }

        if (!homepage) {
            return; // already on map page; do nothing
        }

        homepage = false;
        zoomControl.addTo(map);
        initializeOverlays();
        initializeLayerControl();
    }

    /**
     * Helper to determine if Leaflet base map has already loaded tiles.
     *
     * @returns {boolean} True if base map tiles have already been loaded
     */
    function isLoaded() {
        return loaded;
    }

    /**
     * Load base map tiles and set map on associated controls.
     *
     * @param {Object} ctl Reference to this control (useful if calling from elsewhere)
     */
    function loadMap(ctl) {
        if (loaded) {
            return; // already loaded; nothing to do
        }

        map = new cartodb.L.map(ctl.options.id, { zoomControl: false })
                           .setView(ctl.options.center, ctl.options.zoom);

        tabControl = ctl.options.tabControl;
        homepage = ctl.options.homepage;

        // put zoom control on top right
        zoomControl = new cartodb.L.Control.Zoom({ position: 'topright' });

        initializeBasemaps();

        if (!homepage) {
            // hide zoom control on home page view
            zoomControl.addTo(map);
            // delay loading overlays and layer switcher
            initializeOverlays();
            initializeLayerControl();
        }

        ctl.isochroneControl = new CAC.Map.IsochroneControl({map: map, tabControl: tabControl});
        ctl.itineraryControl.setMap(map);
        loaded = true;
    }

    function initializeBasemaps() {
        var retina = '';
        if (window.devicePixelRatio > 1) {
            retina = '@2x';
        }

        basemaps.Light = cartodb.L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}' + retina + '.png', {
            attribution: cartodbAttribution
        });

        basemaps.Dark = cartodb.L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}' + retina + '.png', {
            attribution: cartodbAttribution
        });

        basemaps.Satellite = cartodb.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: esriSatelliteAttribution
        });

        basemaps.Light.addTo(map);

        // In case the base layer changes after the bike routes overlay has been added,
        // make sure the bike routes overlay shows on top of the new base layer.
        map.on('baselayerchange', function() {
            if (map.hasLayer(overlays['Bike Routes'])) {
                overlays['Bike Routes'].bringToFront();
            }
        });
    }

    function initializeOverlays() {
        overlays['Bike Share Locations'] = overlaysControl.bikeShareOverlay();
        overlays['Bike Routes'] = overlaysControl.bikeRoutesOverlay(map);

        // TODO: handle hiding layers on home view more cleanly
        // when user switches back to home view from map view
        // Would be better to initialize but not add to map, to avoid flashing,
        // although it probably won't be visible due to centering of home page text.
        if (homepage) {
            overlays['Bike Share Locations'].eachLayer(function(layer) { layer.hide(); });
            overlays['Bike Routes'].eachLayer(function(layer) { layer.hide(); });
        }

        // TODO: re-enable when Uwishunu feed returns
        //overlays['Nearby Events'] = overlaysControl.nearbyEventsOverlay();
        //overlays['Nearby Events'].addTo(map);
    }

    function initializeLayerControl() {
        layerControl = cartodb.L.control.layers(basemaps, overlays, {
            position: 'bottomright',
            collapsed: false
        });

        layerControl.addTo(map);

        // add minimize button to layer control
        var leafletMinimizer = '.leaflet-minimize';
        var leafletLayerList = '.leaflet-control-layers-list';
        var $layerContainer = $('.leaflet-control-layers');

        $layerContainer.prepend('<div class="leaflet-minimize"><i class="fa fa-minus"></i></div>');
        $(leafletMinimizer).click(function() {
            if ($(leafletMinimizer).hasClass('minimized')) {
                // show again
                $(leafletLayerList).show();
                $(leafletMinimizer).html('<i class="fa fa-minus"></i>');
                $(leafletMinimizer).removeClass('minimized');
            } else {
                // minimize it
                $(leafletMinimizer).html('<i class="fa fa-map-marker"></i>');
                $(leafletMinimizer).addClass('minimized');
                $(leafletLayerList).hide();
            }
        });
    }

    function setGeocodeMarker(latLng) {
        // helper for when marker dragged to new place
        function markerDrag(event) {
            var marker = event.target;
            var position = marker.getLatLng();
            var latlng = new cartodb.L.LatLng(position.lat, position.lng);
            marker.setLatLng(latlng, {draggable: true});
            map.panTo(latlng); // allow user to drag marker off map

            events.trigger(eventNames.geocodeMarkerMoved, position);
        }

        if (latLng === null) {
            if (geocodeMarker) {
                map.removeLayer(geocodeMarker);
            }
            geocodeMarker = null;
            return;
        }
        if (geocodeMarker) {
            geocodeMarker.setLatLng(latLng);
        } else {
            var icon = L.AwesomeMarkers.icon({
                icon: 'dot-circle-o',
                prefix: 'fa',
                markerColor: 'darkred'
            });
            geocodeMarker = new cartodb.L.marker(latLng, { icon: icon, draggable: true });
            geocodeMarker.addTo(map);
            geocodeMarker.on('dragend', markerDrag);
        }
        map.panTo(latLng);
    }

    /**
     * Show markers for trip origin/destination.
     * Will unset the corresponding marker if either coordinate set is null/empty.
     *
     * @param {Array} originCoords Start point coordinates [lat, lng]
     * @param {Array} destinationCoords End point coordinates [lat, lng]
     * @param {Boolean} [zoomToFit] Zoom the view to the marker(s)
     */
    function setDirectionsMarkers(originCoords, destinationCoords, zoomToFit) {

        // helper for when origin/destination dragged to new place
        function markerDrag(event) {
            var marker = event.target;
            var position = marker.getLatLng();
            var latlng = new cartodb.L.LatLng(position.lat, position.lng);
            marker.setLatLng(latlng, {draggable: true});

            var trigger = (marker.options.title === 'origin') ?
                            eventNames.originMoved : eventNames.destinationMoved;

            events.trigger(trigger, position);
        }

        // Due to time constraints, these two icon definitions were copied to cac-pages-directions.js
        // for use on the static map page there. If you change them here, change them there as well
        // Remove comment if icon definitions are abstracted elsewhere
        var originIcon = L.AwesomeMarkers.icon({
            icon: 'home',
            prefix: 'icon',
            markerColor: 'purple'
        });

        var destIcon = L.AwesomeMarkers.icon({
            icon: 'flag',
            prefix: 'icon',
            markerColor: 'red'
        });

        if (originCoords) {
            var origin = cartodb.L.latLng(originCoords[0], originCoords[1]);

            if (directionsMarkers.origin) {
                directionsMarkers.origin.setLatLng(origin);
            } else {
                var originOptions = {icon: originIcon, draggable: true, title: 'origin' };
                directionsMarkers.origin = new cartodb.L.marker(origin, originOptions)
                                                        .bindPopup('<p>Origin</p>');
                directionsMarkers.origin.addTo(map);
                directionsMarkers.origin.on('dragend', markerDrag);
            }
        } else {
            clearDirectionsMarker('origin');
        }

        if (destinationCoords) {
            var destination = cartodb.L.latLng(destinationCoords[0], destinationCoords[1]);

            if (directionsMarkers.destination) {
                directionsMarkers.destination.setLatLng(destination);
            } else {
                var destOptions = {icon: destIcon, draggable: true, title: 'destination' };
                directionsMarkers.destination = new cartodb.L.marker(destination, destOptions)
                                                             .bindPopup('<p>Destination</p>');
                directionsMarkers.destination.addTo(map);
                directionsMarkers.destination.on('dragend', markerDrag);
            }
        } else {
            clearDirectionsMarker('destination');
        }

        var markers = _.compact(_.values(directionsMarkers));
        if (zoomToFit && !_.isEmpty(markers)) {
            // zoom to fit all markers if several, or if there's only one, center on it
            if (markers.length > 1) {
                map.fitBounds(L.latLngBounds(markers), { maxZoom: defaults.zoom });
            } else {
                map.setView(markers[0].getLatLng());
            }
        }
    }

    function clearDirectionsMarker(type) {
        if (directionsMarkers[type]) {
            map.removeLayer(directionsMarkers[type]);
        }
        directionsMarkers[type] = null;
    }

    /**
     * Displays a simple point marker on the map.
     * Currently only used while a leg of a direction is hovered over.
     *
     * Only one point can be displayed at a time.
     * If this is called without lon/lat params, the current point is removed.
     *
     * @param {Int} Longitude
     * @param {Int} Latitude
     */
    function displayPoint(lon, lat) {
        if (lon && lat) {
            var latlng = new cartodb.L.LatLng(lat, lon);
            if (!lastDisplayPointMarker) {
                lastDisplayPointMarker = new cartodb.L.CircleMarker(latlng);
                lastDisplayPointMarker.addTo(map);
            } else {
                lastDisplayPointMarker.setLatLng(latlng);
            }
        } else if (lastDisplayPointMarker) {
            map.removeLayer(lastDisplayPointMarker);
            lastDisplayPointMarker = null;
        }
    }

})(jQuery, Handlebars, cartodb, L, turf, _);
