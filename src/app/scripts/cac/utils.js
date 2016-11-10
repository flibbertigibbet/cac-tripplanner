CAC.Utils = (function (_) {
    'use strict';

    var module = {
        convertReverseGeocodeToFeature: convertReverseGeocodeToFeature,
        getImageUrl: getImageUrl,
        abbrevStreetName: abbrevStreetName,
        getUrlParams: getUrlParams,
        encodeUrlParams: encodeUrlParams,
        modeStringHelper: modeStringHelper
    };

    var directions = {
        north: 'N',
        northeast: 'NE',
        east: 'E',
        southeast: 'SE',
        south: 'S',
        southwest: 'SW',
        west: 'W',
        northwest: 'NW',
        n: 'N',
        ne: 'NE',
        e: 'E',
        se: 'SE',
        s: 'S',
        sw: 'SW',
        w: 'W',
        nw: 'NW'
    };

    var abbreviations = {
        ave: 'Ave',
        avenue: 'Ave',
        blvd: 'Blvd',
        boulevard: 'Blvd',
        court: 'Ct',
        ct: 'Ct',
        dr: 'Dr',
        drive: 'Dr',
        expressway: 'Expwy',
        expwy: 'Expwy',
        freeway: 'Fwy',
        fwy: 'Fwy',
        highway: 'Hwy',
        hwy: 'Hwy',
        lane: 'Ln',
        ln: 'Ln',
        parkway: 'Pkwy',
        pkwy: 'Pkwy',
        pl: 'Pl',
        place: 'Pl',
        rd: 'Rd',
        road: 'Rd',
        st: 'St',
        street: 'St',
        ter: 'Ter',
        terrace: 'Ter',
        tr: 'Tr',
        trail: 'Tr',
        way: 'Wy',
        wy: 'Wy',
    };

    return module;

    /**
     * Convert ESRI reverse geocode response into feature formatted like typeahead results.
     *
     * @param {Object} response JSON response from ESRI reverse geocode service
     * @returns {Object} Feature object structured like the typeahead results, for use on map page.
     */
    function convertReverseGeocodeToFeature(response) {
        var feature = {
            /*jshint camelcase: false */
            name: response.address.Match_addr,
            /*jshint camelcase: true */
            extent: {
                xmax: response.location.x,
                xmin: response.location.x,
                ymax: response.location.y,
                ymin: response.location.y
            },
            feature: {
                attributes: {
                    City: response.address.City,
                    Postal: response.address.Postal,
                    Region: response.address.Region,
                    StAddr: response.address.Address,
                },
                geometry: {
                    x: response.location.x,
                    y: response.location.y
                }
            }
        };
        return feature;
    }

    // Source: https://github.com/azavea/nih-wayfinding/blob/develop/src/nih_wayfinding/app/scripts/routing/abbreviate-filter.js
    function abbrevStreetName(streetAddress) {
        if (!(_.isString(streetAddress) && streetAddress.length)) {
            return streetAddress;
        }
        var parts = streetAddress.trim().split(/\s+/);
        var keys = streetAddress.toLowerCase().trim().split(/\s+/);

        // Remove street number if first item in parts
        var streetNumber = parseInt(parts[0], 10);
        if (!isNaN(streetNumber)) {
            parts = parts.slice(1);
            keys = keys.slice(1);
        }
        var numParts = parts.length;
        var numKeys = parts.length;

        // Example "North Baltimore Avenue"
        if (numParts >= 3 && _.has(directions, keys[0]) && _.has(abbreviations, keys[numKeys-1])) {
            parts[0] = directions[keys[0]];
            parts[numParts-1] = abbreviations[keys[numKeys-1]];
        // Example "Baltimore Avenue North"
        } else if (numParts >= 3 && _.has(abbreviations, keys[numKeys-2]) && _.has(directions, keys[numKeys-1])) {
            parts[numParts-2] = abbreviations[keys[numKeys-2]];
            parts[numParts-1] = directions[keys[numKeys-1]];
        } else if (numParts >= 2 && _.has(abbreviations, keys[numKeys-1])) {
             parts[numParts-1] = abbreviations[keys[numKeys-1]];
        }

        // Readd street number if it was actually a number
        if (!isNaN(streetNumber)) {
            parts.splice(0, 0, streetNumber);
        }
        return parts.join(' ');
    }

    // Use with images in the app/images folder
    function getImageUrl(imageName) {
        return '/static/images/' + imageName;
    }

    // Parses URL parameters and returns them as an object
    function getUrlParams() {
        // Code borrowed from: http://www.timetler.com/2013/11/14/location-search-split-one-liner/
        // Remove the '?' at the start of the string and split out each assignment
        return _.chain(location.search.slice(1).split('&'))
            // Split each array item into [key, value]
            // ignore empty string if search is empty
            .map(function(item) {
                if (item) {
                    var itm = item.split('=');
                    if (itm.length > 1) {
                        // decode parameters before passing them on to OTP
                        itm[1] = decodeURIComponent(itm[1]);
                        // convert boolean values stored as strings back to booleans
                        if (itm[1] === 'false') {
                            itm[1] = false;
                        } else if (itm[1] === 'true') {
                            itm[1] = true;
                        }
                    }
                    return itm;
                }
                return undefined;
            })
            // Remove undefined in the case the search is empty
            .compact()
            // Turn [key, value] arrays into object parameters
            .fromPairs()
            // Return the value of the chain operation
            .value();
    }

    function encodeUrlParams(params) {
        return _.map(params, function(val, key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(val);
        }).join('&');
    }

    function modeStringHelper(modeString) {
        var modeIcons = {
            // TODO: add appropriate mode icons
            BUS: {name: 'train', font: 'icon'}, // TODO
            SUBWAY: {name: 'train', font: 'icon'}, // TODO
            CAR: {name: 'train', font: 'icon'}, // TODO
            TRAIN: {name: 'train', font: 'icon'},
            RAIL: {name: 'train', font: 'icon'}, // TODO
            BICYCLE: {name: 'bike', font: 'icon'},
            WALK: {name: 'walk', font: 'icon'},
            TRAM: {name: 'train', font: 'icon'}, // TODO
            FERRY: {name: 'train', font: 'icon'} // TODO
        };

        var mode = modeIcons[modeString];

        if (!mode) {
            mode = {name: 'transit', font: 'icon'};
            console.error('Unrecognized transit mode: ' + modeString + '. Using default icon.');
        }

        var modeStr = ['<i class="',
                        mode.font,
                        ' ',
                        mode.font,
                        '-',
                        mode.name,
                        '"></i>'
                      ].join('');
        return modeStr;
    }

})(_);
