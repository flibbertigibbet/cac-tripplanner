CAC.Map.Routing = (function($, moment, UserModes) {
    'use strict'

    var planMode = ['WALK', 'TRANSIT'];
    var routingUrl = '/otp/routers/default/plan';
    var module = {
        planTrip: planTrip
    };
    return module;

    /**
     * Find shortest path from one point to another
     *
     * @param coordsFrom {array} The coords in lat-lng which we would like to travel from
     * @param coordsTo {array} The coords in lat-lng which we would like to travel to
     *
     * @return {object} (promise) The promise object which - if successful - resolves in a
     *                              geoJSON representation of a trip
     */
    function planTrip(coordsFrom, coordsTo) {
        var urlParams = prepareParamString(coordsFrom, coordsTo);
        var requestUrl = routingUrl + '?' + urlParams;
        return $.ajax({
            url: requestUrl,
            type: 'GET',
            contentType: 'application/json'
        });
    }


    /**
     * Helper function to prepare the parameter string for consumption by the OTP api
     *
     * @param coordsFrom {array} The coords in lat-lng which we would like to travel from
     * @param coordsTo {array} The coords in lat-lng which we would like to travel to
     *
     * @return {string} A set of get params, ready for consumption
     */
    function prepareParamString(coordsFrom, coordsTo) {
        var currentTime = moment();
        var formattedTime = currentTime.format('hh:mma');
        var formattedDate = currentTime.format('MM-DD-YYYY');
        var paramObj = {
            fromPlace: coordsFrom,
            toPlace: coordsTo,
            time: formattedTime,
            date: formattedDate,
            mode: UserModes.makeModeString()
        };
        return $.param(paramObj);
    }


})(jQuery, moment, CAC.User.Modes);
