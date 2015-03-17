/**
 *  View control for the sidebar directions tab
 *
 */
CAC.Control.SidebarDirections = (function ($, MapTemplates, Routing, UserPreferences) {

    'use strict';

    var defaults = {};
    var options = {};

    var currentItinerary = null;
    var datepicker = null;

    var directions = {
        origin: null,
        destination: null
    };

    var mapControl = null;
    var tabControl = null;

    function SidebarDirectionsControl(params) {
        options = $.extend({}, defaults, params);
        mapControl = options.mapControl;
        tabControl = options.tabControl;

        // Plan a trip using information provided
        $('section.directions button[type=submit]').click($.proxy(planTrip, this));

        // initiallize date/time picker
        datepicker = $('#datetimeDirections').datetimepicker({useCurrent: true});

        setFromUserPreferences();
    }

    SidebarDirectionsControl.prototype = {
        setDestination: setDestination,
        setDirections: setDirections
    };

    return SidebarDirectionsControl;

    function planTrip() {
        if (!(directions.origin && directions.destination)) {
            setDirectionsError();
            return;
        }

        var picker = $('#datetimeDirections').data('DateTimePicker');
        var date = picker.date();
        if (!date) {
            // use current date/time if none set
            date = moment();
        }

        var mode = $('#directionsModeSelector').val();

        var origin = directions.origin;
        var destination = directions.destination;
        var fromText = $('#directionsFrom').val();
        var toText = $('#directionsTo').val();

        var arriveBy = true;
        if ($('input[name="arriveBy"]:checked').val() !== 'arriveBy') {
            arriveBy = false; // depart at time instead
        }

        // set user preferences
        UserPreferences.setPreference('method', 'directions');
        UserPreferences.setPreference('mode', mode);
        UserPreferences.setPreference('arriveBy', arriveBy);
        UserPreferences.setPreference('fromText', fromText);
        UserPreferences.setPreference('toText', toText);

        Routing.planTrip(origin, destination, date, mode, arriveBy).then(function (itineraries) {
            // Add the itineraries to the map, highlighting the first one
            var highlight = true;
            mapControl.clearItineraries();
            _.forIn(itineraries, function (itinerary) {
                mapControl.plotItinerary(itinerary);
                itinerary.highlight(highlight);
                if (highlight) {
                    currentItinerary = itinerary;
                    highlight = false;
                }
            });

            // Show the directions div and populate with itineraries
            var html = MapTemplates.itinerarySummaries(itineraries);
            $('.itineraries').html(html);
            $('a.itinerary').on('click', onItineraryClicked);
            $('.block-itinerary').on('click', onItineraryClicked);
            $('.directions').addClass('show-results');
        });
    }

    /**
     * Handles click events to highlight a given itinerary
     * Event handler, so this is set to the clicked event
     */
    function onItineraryClicked() {
        var itineraryId = this.getAttribute('data-itinerary');
        var itinerary = mapControl.getItineraryById(itineraryId);
        if (itinerary) {
            currentItinerary.highlight(false);
            itinerary.highlight(true);
            currentItinerary = itinerary;
        }
    }

    function setDestination(destination) {
        // Set origin
        var from = UserPreferences.getPreference('origin');
        var originText = UserPreferences.getPreference('originText');
        directions.origin = [from.feature.geometry.y, from.feature.geometry.x];
        $('section.directions input.origin').val(originText);

        // Set destination
        var toCoords = destination.point.coordinates;
        var destinationText = destination.address;
        directions.destination = [toCoords[1], toCoords[0]];
        $('section.directions input.destination').val(destinationText);

        // Get directions
        planTrip();
    }

    function setDirections(key, value) {
        if (key === 'origin' || key === 'destination') {
            directions[key] = value;
        }
    }

    function setDirectionsError() {
        var errorClass = 'error';
        var $inputOrigin = $('section.directions input.origin');
        var $inputDestination = $('section.directions input.destination');
        if (directions.origin) {
            $inputOrigin.removeClass(errorClass);
        } else {
            $inputOrigin.addClass(errorClass);
        }
        if (directions.destination) {
            $inputDestination.removeClass(errorClass);
        } else {
            $inputDestination.addClass(errorClass);
        }
    }

    /**
     * When first navigating to this page, check for user preferences to load.
     */
    function setFromUserPreferences() {
        var method = UserPreferences.getPreference('method');
        if (method === 'directions') {

            // switch tabs
            tabControl.setTab('directions');
            var mode = UserPreferences.getPreference('mode');

            var arriveBy = UserPreferences.getPreference('arriveBy');
            var from = UserPreferences.getPreference('from');
            var to = UserPreferences.getPreference('to');
            var fromText = UserPreferences.getPreference('fromText');
            var toText = UserPreferences.getPreference('toText');

            directions.destination = [to.feature.geometry.y, to.feature.geometry.x];

            $('section.directions input.origin').typeahead('val', fromText);
            $('section.directions input.destination').typeahead('val', toText);
            $('#directionsModeSelector').val(mode);
            $('input[name="arriveBy"]:checked').val(arriveBy);

            if (from) {
                directions.origin = [from.feature.geometry.y, from.feature.geometry.x];
                planTrip();
            } else {
                // use current location if no directions origin set
                mapControl.locateUser().then(function(data) {
                    directions.origin = [data[0], data[1]];
                    planTrip();
                }, function(error) {
                    console.error('Could not geolocate user');
                    console.error(error);
                    return;
                });
            }

            directions.destination = [to.feature.geometry.y, to.feature.geometry.x];
            $('section.directions input.origin').val(fromText);
            $('section.directions input.destination').val(toText);
            $('#directionsModeSelector').val(mode);
            planTrip();
        }
    }

})(jQuery, CAC.Map.Templates, CAC.Routing.Plans, CAC.User.Preferences);
