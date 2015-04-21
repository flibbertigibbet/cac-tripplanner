CAC.Control.BikeOptions = (function ($) {
    'use strict';

    var defaults = {
        // Note:  the three bike options must sum to 1, or OTP won't plan the trip
        bikeTriangle: {
            neutral: {
                triangleSafetyFactor: 0.34,
                triangleSlopeFactor: 0.33,
                triangleTimeFactor: 0.33
            },
            flatter: {
                triangleSafetyFactor: 0.17,
                triangleSlopeFactor: 0.66,
                triangleTimeFactor: 0.17
            },
            faster: {
                triangleSafetyFactor: 0.17,
                triangleSlopeFactor: 0.17,
                triangleTimeFactor: 0.66
            },
            safer: {
                triangleSafetyFactor: 0.66,
                triangleSlopeFactor: 0.17,
                triangleTimeFactor: 0.17
            }
        },
        modes: {
            // used to suffix to mode inputs selector
            walkBike: ':radio[name="anytime-mode"]',
            transit: '[name="public-transit-mode"]'
        }
    };

    var options = {};

    function BikeOptionsControl(params) {
        options = $.extend({}, defaults, params);
        this.options = options;
    }

    BikeOptionsControl.prototype = {
        changeMode: changeMode,
        getMode: getMode,
        setMode: setMode
    };

    return BikeOptionsControl;

    /**
     * Show/hide sidebar options based on the selected mode.
     * Expects both tabs to have the same selector names for the toggleable divs.
     */
    function changeMode(selectors) {
        var mode = getMode(selectors.modeSelectors);
        if (mode && mode.indexOf('BICYCLE') > -1) {
            $(selectors.bikeTriangleDiv).removeClass('hidden');
            $(selectors.maxWalkDiv).addClass('hidden');
            $(selectors.wheelchairDiv).addClass('hidden');
        } else {
            $(selectors.bikeTriangleDiv).addClass('hidden');
            $(selectors.maxWalkDiv).removeClass('hidden');
            $(selectors.wheelchairDiv).removeClass('hidden');
        }
    }

    function getMode(modeSelectors) {
        var mode = $(modeSelectors + options.modes.walkBike + ':checked').val();
        var transit = $(modeSelectors + options.modes.transit).prop('checked');
        mode += transit ? ',TRANSIT' : '';
        return mode;
    }

    function setMode(modeSelectors, mode) {
        var radioSelector = modeSelectors + options.modes.walkBike;
        var transitSelector = modeSelectors + options.modes.transit;

        var walkBikeVal = $(radioSelector + ':checked').val();
        var haveTransit = $(transitSelector + ':checked').val();

        // toggle transit button selection, if needed
        // NB: cannot just .click() button here, or wind up in inconsistent state
        if (mode.indexOf('TRANSIT') > -1 && !haveTransit) {
            $(transitSelector).prop('checked', true);
            $(transitSelector).parents('label').toggleClass('active');
        } else if (mode.indexOf('TRANSIT') === -1 && haveTransit) {
            $(transitSelector).prop('checked', false);
            $(transitSelector).parents('label').toggleClass('active');
        }

        // switch walk/bike selection, if needed
        if (mode.indexOf('BICYCLE') > -1 && walkBikeVal !== 'BICYCLE') {
            $(radioSelector + '[value=BICYCLE]').click();
        } else if (mode.indexOf('BICYCLE') === -1 && walkBikeVal === 'BICYCLE') {
            $(radioSelector + '[value=WALK]').click();
        }
    }

})(jQuery);
