/**
 * Manage modals used to set and display trip planning options.
 */
CAC.Control.TripOptions = (function ($, Handlebars, moment, Modal, UserPreferences, Utils) {
    'use strict';

    var defaults = {
        currentMode: 'WALK',
        // default text to display for top-level modal menu options
        // when user has not set anything for it yet
        defaultMenuText: {
            bikeShare: 'Indego bike sharing',
            timing: 'Arrive or Depart at…',
            bikeOptimize: 'Safe ride',
            accessibility: 'Accessibility'
        },
        selectors: {
            hiddenClass: 'hidden',

            bodyModalClass: 'body-modal body-modal-options',
            selectedClass: 'selected', // used to mark selected list item
            visibleClass: 'visible',
            listOptions: 'li.modal-list-choice',
            listOptionsClass: 'modal-list-choice',

            arriveBy: '#arriveBy',
            departAt: '#departAt',

            // date/time selectors
            timingOptions: '.modal-options.timing-modal',
            timingFields: '.modal-options-timing-fields',
            arriveByDepartAt: '.modal-options-timing-tabs',
            timeOptionsId: 'options-timing-time',
            dayOptionsId: 'options-timing-day',
            nextQuarterHourClass: 'next-qtr-hour',
            earlierQuarterHourClass: 'earlier-qtr-hour',
            currentTimeClass: 'current-time',
            notTodayClass: 'not-today',
            firstOption: 'option:first',
            modalListContents: '.modal-list.modal-contents',
            timingMenuOption: 'li.modal-list-timing',

            // the two top-level modals
            bikeOptionsModal: '.modal-options.bike-options',
            walkOptionsModal: '.modal-options.walk-options',

            // mapping of menu option classes to the selector for the child modal to open
            bikeMenuOptions: {
                'modal-list-indego': '.modal-options.bike-share-select',
                'modal-list-timing': '.modal-options.timing-modal',
                'modal-list-ride': '.modal-options.bike-triangle'
            },

            walkMenuOptions: {
                'modal-list-timing': '.modal-options.timing-modal',
                'modal-list-accessibility': '.modal-options.accessibility-options'
            },

            // mapping of option IDs to what to set in user preferences if option picked
            optionPreferences: {
                'wheelchair': {name: 'wheelchair', value: true},
                'noWheelchair': {name: 'wheelchair', value: undefined},
                'noBikeShare': {name: 'bikeShare', value: undefined},
                'useBikeShare': {name: 'bikeShare', value: true},
                'bikeOptimizeFast': {name: 'bikeOptimize', value: 'QUICK'},
                'bikeOptimizeFlat': {name: 'bikeOptimize', value: 'FLAT'},
                'bikeOptimizeSafe': {name: 'bikeOptimize', value: 'GREENWAYS'},
                'arriveBy': {name: 'arriveBy', value: true},
                'departAt': {name: 'arriveBy', value: false}
            },
            // distinct 'name' in optionPreferences above
            preferences: ['wheelchair', 'bikeShare', 'bikeOptimize', 'arriveBy']
        }
    };
    var events = $({});
    var eventNames = {
        toggle: 'cac:control:tripoptions:toggle'
    };
    var options = {};
    var isBike = false; // in walk mode if false
    var modal = null;
    var modalSelector = null;
    var childModal = null;
    var childModalSelector = null;

    function TripOptionsControl(params) {
        options = $.extend({}, defaults, params);
        this.initialize();
    }

    TripOptionsControl.prototype = {
        initialize: initialize,
        events: events,
        eventNames: eventNames,
        open: open,
        getTimingText: getTimingText
    };

    return TripOptionsControl;

    function initialize() {
        var currentMode = UserPreferences.getPreference('mode');
        if (currentMode.indexOf('BICYCLE') > -1) {
            modalSelector = options.selectors.bikeOptionsModal;
            isBike = true;
        } else {
            modalSelector = options.selectors.walkOptionsModal;
            isBike = false;
        }
    }

    function onClick(e) {
        var $el = $(e.target);

        var menuOptions = isBike ? options.selectors.bikeMenuOptions : options.selectors.walkMenuOptions;

        childModalSelector = _.find(menuOptions, function(option, key) {
            return $el.hasClass(key);
        });

        if (!childModalSelector) {
            console.error('could not find child menu for selected option');
            return;
        }

        var childModalOptions = {
            modalSelector: childModalSelector,
            bodyModalClass: options.selectors.bodyModalClass,
            clickHandler: childModalClick,
            onClose: onChildModalClose
        };

        // populate date/time picker options
        if (childModalSelector === options.selectors.timingOptions) {
            if (isBike && UserPreferences.getPreference('bikeShare')) {
                // in bike share mode; always depart now
                childModalSelector = null;
                UserPreferences.setPreference('dateTime', undefined);
                UserPreferences.setPreference('arriveBy', false);
                return;
            }

            // set 'clear' button event handler for timing options modal
            childModalOptions.clearHandler = onTimingModalClearClick;

            // set time and date selector options
            $(childModalSelector).find(options.selectors.timingFields).html(timingModalOptions());

            // listen to the day drop-down on the timing modal
            addDayDropDownListener();

            // read arrive by user setting and toggle if needed
            if (UserPreferences.getPreference('arriveBy')) {
                $(childModalSelector).find(options.selectors.arriveBy).click();
            }

            // Set date/time selection back using what's stored in preferences.
            var storedDateTime = UserPreferences.getPreference('dateTime');

            var $day = $(options.selectors.timingFields)
                .find('#' + options.selectors.dayOptionsId);

            var $time = $(options.selectors.timingFields)
                .find('#' + options.selectors.timeOptionsId);

            var resetToNow = true; // set false when valid date and/or time option found
            if (storedDateTime) {
                // parse out the date and time portions
                var dt = moment.unix(storedDateTime);
                var day = dt.clone().startOf('date');
                var time = dt.diff(day, 'minutes'); // minutes since midnight on selected day

                // check if value is an available option before selecting it;
                // if not (more than a week passed?) will revert to default of 'now'
                if ($day.find('option[value="' + day.unix().toString() + '"]').length > 0) {
                    $day.val(day.unix().toString());
                    resetToNow = false;
                }

                if ($time.find('option[value="' + time + '"]').length > 0) {
                    $time.val(time);
                    resetToNow = false;
                }
            }

            // default to current date and time
            if (resetToNow) {
                UserPreferences.setPreference('dateTime', undefined);
                $day.val($day.find(options.selectors.firstOption).val());
                $time.val($time.find('.' + options.selectors.currentTimeClass).val());
            }

            if (isBike && UserPreferences.getPreference('bikeShare')) {
                return;
            }
        }

        modal.close();
        childModal = new Modal(childModalOptions);
        childModal.open();
        $(childModalSelector).addClass(options.selectors.visibleClass);
    }

    function onClose() {
        $(modalSelector).removeClass(options.selectors.visibleClass);
        // trigger plan re-query by calling onClose handler
        // check if child modal exists to determine whether closing out of options altogether
        // or just closing to go to another options modal
        if (!childModalSelector && options.onClose) {
            options.onClose();
        }

        modal = null;
    }

    /**
     * Public function to pass through calls to open the top-level modal
     */
    function open() {
        // set user selections in top-level dialogue
        var ul = isBike ? bikeModalOptions() : walkModalOptions();
        $(modalSelector).find(options.selectors.modalListContents).html(ul);

        // set user selections in child modals
        setSelections();

        // note in local storage that trip options have been seen
        UserPreferences.sawTripOptions();

        modal = new Modal({
            modalSelector: modalSelector,
            bodyModalClass: options.selectors.bodyModalClass,
            clickHandler: onClick,
            onClose: onClose
        });

        $(modalSelector).addClass(options.selectors.visibleClass);

        // hide timing option in bike share mode (always depart now)
        if (isBike && UserPreferences.getPreference('bikeShare')) {
            $(options.selectors.timingMenuOption).addClass(options.selectors.hiddenClass);
        } else {
            $(options.selectors.timingMenuOption).removeClass(options.selectors.hiddenClass);
        }

        modal.open();
    }

    /**
     * Set the selections in child modals based on user preferences.
     * Does not manage date/time, which the timing modal controls directly.
     */
    function setSelections() {
        _.forEach(options.selectors.preferences, function(option) {
            var setting = UserPreferences.getPreference(option);
            var toSelect = _.findKey(options.selectors.optionPreferences, function(pref) {
                return option === pref.name && setting === pref.value;
            });

            var $toSelect = $('#' + toSelect);
            $toSelect.siblings().removeClass(options.selectors.selectedClass);

            // if value is defined, it is non-default and to be marked as selected
            if (toSelect) {
                $toSelect.addClass(options.selectors.selectedClass);
            }
        });
    }

    function childModalClick(e) {
        var $el = $(e.target);

        // toggle selected class to clicked item
        if ($el.hasClass(options.selectors.listOptionsClass)) {
            $(childModalSelector).find(options.selectors.listOptions)
                .removeClass(options.selectors.selectedClass);

            $el.addClass(options.selectors.selectedClass);

            // Set chosen value in preferences, then close child modal once option picked.
            // Should not happen with timing modal, which has its own close button
            // and its own preferences management.
            if (childModalSelector !== options.selectors.timingOptions) {
                var selectedOptionId = $el.attr('id');
                if (_.has(options.selectors.optionPreferences, selectedOptionId)) {
                    var setting = options.selectors.optionPreferences[selectedOptionId];
                    UserPreferences.setPreference(setting.name, setting.value);

                    // on switch to bike share mode, reset time to depart now
                    if (selectedOptionId === 'useBikeShare') {
                        UserPreferences.setPreference('arriveBy', false);
                        UserPreferences.setPreference('dateTime', undefined);
                    } else  if (selectedOptionId === 'bikeOptimizeSafe') {
                        // safe mode is default for bike optimization
                        UserPreferences.setPreference(setting.name, undefined);
                    }
                } else {
                    console.error('selected unrecognized option with ID: ' + selectedOptionId);
                }

                childModal.close();
            }

        } // else user clicked somewhere on modal that is not a list item option
    }

    function onChildModalClose(immediately) {
        // if closing the timing modal, read out the new date/time before exiting
        if (childModalSelector === options.selectors.timingOptions) {
            setDateTimeOnLocalStorage();
        }

        $(childModalSelector).removeClass(options.selectors.visibleClass);
        childModal = null;
        childModalSelector = null;

        if (!immediately) {
            // re-open parent modal on child modal close, to show selections
            open();
        } else {
            // close parent modal, too, if user clicked away from modal
            onClose();
        }
    }

    /**
     * Helper to generate options list for top-level menu to display when bike mode is on.
     * Will display current selection instead of default text if user has explicitly set an option.
     *
     * @returns {String} HTML snippet with list items to replace content inside
                         bike modal's unordered list
     */
    function bikeModalOptions() {

        var source = [
            '<li class="modal-list-indego {{#if setBikeShare}} selected{{/if}}">{{bikeShare}}</li>',
            '<li class="modal-list-timing {{#if setTiming}} selected{{/if}}">{{timing}}</li>',
            '<li class="modal-list-ride {{#if setBikeOptimize}} selected{{/if}}">{{bikeOptimize}}</li>'
        ].join('');

        var bikeShare = options.defaultMenuText.bikeShare;
        var setBikeShare = !UserPreferences.isDefault('bikeShare');
        if (setBikeShare) {
            var useBikeShare = UserPreferences.getPreference('bikeShare');
            if (useBikeShare) {
                bikeShare = 'Use Indego bike sharing';
            } else {
                bikeShare = 'Use my own bike';
            }
        }

        var bikeOptimize = options.defaultMenuText.bikeOptimize;
        var setBikeOptimize = false;
        if (!UserPreferences.isDefault('bikeOptimize')) {
            setBikeOptimize = true;
            var bikePreference = UserPreferences.getPreference('bikeOptimize');
            bikeOptimize = Utils.getBikeOptimizeLabel(bikePreference);
        }

        var timing = getTimingText();
        var setTiming = !!timing;
        if (!timing) {
            timing = options.defaultMenuText.timing;
        }

        var template = Handlebars.compile(source);
        var html = template({
            bikeShare: bikeShare,
            setBikeShare: setBikeShare,
            timing: timing,
            setTiming: setTiming,
            bikeOptimize: bikeOptimize,
            setBikeOptimize: setBikeOptimize
        });

        return html;
    }

    /**
     * Helper to generate options list for top-level menu to display when bike mode is off.
     * Will display current selection instead of default text if user has explicitly set an option.
     *
     * @returns {String} HTML snippet with list items to replace content inside
                         walk modal's unordered list
     */
    function walkModalOptions() {
        var source = [
            '<li class="modal-list-timing{{#if setTiming}} selected{{/if}}">{{timing}}</li>',
            '<li class="modal-list-accessibility',
                '{{#if setAccessibility}} selected{{/if}}">{{accessibility}}',
            '</li>'
        ].join('');

        var accessibility = options.defaultMenuText.accessibility;
        var setAccessibility = !UserPreferences.isDefault('wheelchair');

        if (setAccessibility) {
            var wheelchair = UserPreferences.getPreference('wheelchair');
            if (wheelchair) {
                accessibility = 'I have a wheelchair';
            } else {
                accessibility = 'I am walking';
            }
        }

        var timing = getTimingText();
        var setTiming = !!timing;
        if (!timing) {
            timing = options.defaultMenuText.timing;
        }

        var template = Handlebars.compile(source);
        return template({
            accessibility: accessibility,
            setAccessibility: setAccessibility,
            timing: timing,
            setTiming: setTiming
        });
    }

    /**
     * Helper to get the modal dialog text for arrival/departure time,
     * shared by bike and walk modals.
     *
     * @returns {string} Text snippet to display, or null for default (now)
     */
    function getTimingText() {
        if (!UserPreferences.isDefault('dateTime')) {
            var dateTime = moment.unix(UserPreferences.getPreference('dateTime'));
            var arriveBy = UserPreferences.getPreference('arriveBy');
            var timing = arriveBy ? 'Arrive ' : 'Depart ';
            timing += dateTime.calendar(null, {
                sameDay: '[Today] h:mma',
                nextDay: '[Tomorrow] h:mma',
                nextWeek: 'ddd h:mma',
                lastDay: '[Yesterday] h:mma',
                lastWeek: '[Last] ddd h:mma',
                sameElse: 'M/D h:mma'
            });
            return timing;
        }

        // should use default text
        return null;
    }

    /**
     * Helper to read out date and time settings from modal and store them
     * as user settings.
     */
    function setDateTimeOnLocalStorage() {
        var selectedDay = parseInt($('#' + options.selectors.dayOptionsId).val());
        var selectedTime = parseInt($('#' + options.selectors.timeOptionsId).val());

        var when;

        if (!!selectedTime && !!selectedDay) {
            when = moment.unix(selectedDay);

            // set the time portion on the selected day
            when.add(selectedTime, 'minutes');

        } else if (!!selectedTime) {
            // have time but not day; use today
            when = moment().startOf('date').add(selectedTime, 'minutes');
        } else {
            when = undefined;
            // unset depart at/arrive by setting if defaulting to now
            // (cannot arrive by now without time travel)
            UserPreferences.setPreference('arriveBy', undefined);
        }

        if (when) {
            when = when.unix();
            var arriveBy = $(options.selectors.arriveBy).hasClass(options.selectors.selectedClass);
            // have date/time; also store selection for depart at or arrive by that time
            UserPreferences.setPreference('arriveBy', arriveBy);
        }

        // store date/time as seconds since epoch
        UserPreferences.setPreference('dateTime', when);
    }

    /**
     * Helper to generate options lists for days and times available for planning trip.
     *
     * @returns {String} HTML snippet with list items to replace content inside
                         modal-options-timing-fields
     */
    function timingModalOptions() {
        var source = [
            '<li><select class="modal-options-timing-select" id="{{dayOptionsId}}">',
                '<option value="">Today</option>',
                '{{#each days}}',
                    '<option value="{{this.value}}">{{this.label}}</option>',
                '{{/each}}',
                '</select></li>',
                '<li><select class="modal-options-timing-select" id="{{timeOptionsId}}">',
                    '{{#each times}}',
                        '<option class="{{this.classes}}" value="{{this.value}}">{{this.label}}</option>',
                    '{{/each}}',
                '</select></li>'
        ].join('');

        var midnight = moment().startOf('date'); // set to 12 AM to normalize
        var day = midnight.clone();

        // offer options for next 7 days
        var days = [];
        for (var i = 1; i < 8; i++) {
            day = day.add(1, 'days');
            days.push({
                value: day.unix(),
                label: day.format('ddd MM/DD')
            });
        }

        // generate list of options in quarter hour increments within a 24 hour window
        var times = [];
        // round current time up to the next minute
        var now = moment().add(1, 'minute').startOf('minute');
        var passedNow = false;

        // reset day to midnight
        day = midnight.clone();
        var MINUTES_IN_DAY = 24 * 60;

        for (var j = 0; j < MINUTES_IN_DAY; j = j + 15) {
            var classes = '';

            if (!passedNow) {
                // note times earlier than now to hide when selected day is today
                classes = options.selectors.earlierQuarterHourClass;

                passedNow = day > now;
                if (passedNow) {
                    // just found the next quarter hour from the current time; note it
                    classes = options.selectors.nextQuarterHourClass;
                    // also add an option for the current time
                    times.push({
                        value: '',
                        label: 'Now',
                        classes: options.selectors.currentTimeClass
                    });
                }
            }

            times.push({
                value: j,
                label: day.format('h:mm a'),
                classes: classes
            });

            day.add(15, 'minutes');
        }

        var template = Handlebars.compile(source);
        return template({
            dayOptionsId: options.selectors.dayOptionsId,
            timeOptionsId: options.selectors.timeOptionsId,
            days: days,
            times: times
        });
    }

    /**
     * Helper to listen for change events on the day drop-down created by timingModalOptions
     */
    function addDayDropDownListener() {
        var $dayOptions = $('#' + options.selectors.dayOptionsId);
        $dayOptions.on('change', function() {
            var $time = $('#' + options.selectors.timeOptionsId);
            var timeSelection = $time.val();

            if (!$dayOptions.val()) {
                // got set to current day

                // set time to 'now' if selection is before next 15 minute increment
                var nextQtrHr = $time.find('.' + options.selectors.nextQuarterHourClass).val();
                if (parseInt(timeSelection) < parseInt(nextQtrHr)) {
                    $time.val($time.find('.' + options.selectors.currentTimeClass).val());
                }

                // hide times before 'now'
                $(options.selectors.timingFields).removeClass(options.selectors.notTodayClass);

            } else {
                // selection is not today

                // set selection to next 15 minute increment if 'now' was selected
                if (timeSelection === $time.find('.' + options.selectors.currentTimeClass).val()) {
                    $time.val($time.find('.' + options.selectors.nextQuarterHourClass).val());
                }

                // hide 'now' option and show times before now
                $(options.selectors.timingFields).addClass(options.selectors.notTodayClass);
            }
        });
    }

    /**
     * Event handler for user click on 'clear' button on timing modal
     */
    function onTimingModalClearClick() {
        var $timing = $(options.selectors.timingFields);
        var $day = $timing.find('#' + options.selectors.dayOptionsId);
        var $time = $timing.find('#' + options.selectors.timeOptionsId);

        // set date and time selectors to today/now
        $day.val($day.find(options.selectors.firstOption).val());
        $time.val($time.find('.' + options.selectors.currentTimeClass).val());

        // reset to 'depart at'
        $(childModalSelector).find(options.selectors.departAt).click();

        // trigger day drop-down change handler, to hide times before now
        $('#' + options.selectors.dayOptionsId).trigger('change');

        // un-set user preferences (will revert to defaults)
        UserPreferences.setPreference('arriveBy', undefined);
        UserPreferences.setPreference('dateTime', undefined);
    }

})(jQuery, Handlebars, moment, CAC.Control.Modal, CAC.User.Preferences, CAC.Utils);
