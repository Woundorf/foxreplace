/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2016 Marc Ruiz Altisent. All rights reserved.
 *
 *  This file is part of FoxReplace.
 *
 *  FoxReplace is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software
 *  Foundation, either version 3 of the License, or (at your option) any later version.
 *
 *  FoxReplace is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 *  A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License along with FoxReplace. If not, see <http://www.gnu.org/licenses/>.
 *
 *  ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("chrome://foxreplace/content/core.js");
Cu.import("chrome://foxreplace/content/io.js");
Cu.import("chrome://foxreplace/content/Observers.js");
Cu.import("chrome://foxreplace/content/prefs.js");
Cu.import("chrome://foxreplace/content/services.js");

/**
 * Updates the substitution list from a subscription URL.
 */

var EXPORTED_SYMBOLS = ["fxrSubscription"];

var fxrSubscription = {

  /**
   * Callback that will be called by the timer after every period.
   */
  _callback: {
    notify: function(aTimer) {
      try {
        var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
        request.open("GET", fxrSubscription.url);
        request.responseType = "text";
        request.onreadystatechange = function() {
          if (request.readyState == 4) {
            if (request.status == 200) {
              try {
                let listJSON = JSON.parse(request.responseText);
                prefs.substitutionList = substitutionListFromJSON(listJSON);
                fxrSubscription.status = getLocalizedString("subscriptionStatusLastUpdated", [new Date().toLocaleString()]);
              }
              catch (e) {
                fxrSubscription.status = getLocalizedString("jsonErrorText") + " " + e;
              }
            }
            else if (request.status == 0) fxrSubscription.status = getLocalizedString("cantConnectToServer", [fxrSubscription.url]);
            else fxrSubscription.status = getLocalizedString("httpError", [request.status + " " + request.statusText]);
          }
        };
        request.send(null);
        fxrSubscription.status = getLocalizedString("subscriptionStatusUpdating");
      }
      catch (e if e.name == "NS_ERROR_FILE_NOT_FOUND") {
        fxrSubscription.status = getLocalizedString("fileNotFound", [fxrSubscription.url]);
      }
      catch (e) {
        fxrSubscription.status = getLocalizedString("unexpectedError", [e]);
      }
    }
  },

  /**
   * True if timer is on, false otherwise.
   */
  _timerOn: false,

  /**
   * Returns the timer.
   */
  get timer() {
    if (!this._timer)
      this._timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    return this._timer;
  },

  /**
   * String that describes the status of the subscription.
   */
  _status: getLocalizedString("subscriptionStatusDisabled"),

  /**
   * Returns the status of the subscription.
   */
  get status() {
    return this._status;
  },

  /**
   * Sets the status of the subscription.
   */
  set status(aStatus) {
    this._status = aStatus;
    Observers.notify("fxrSubscriptionStatusChanged", aStatus);
  },

  /**
   * Starts the subscription service.
   */
  start: function(aUrl, aPeriod) {
    if (this._timerOn) return;

    this._timerOn = true;
    this.url = aUrl;
    this._callback.notify();  // first call
    this.timer.initWithCallback(this._callback, aPeriod * 60000, Ci.nsITimer.TYPE_REPEATING_SLACK);
  },

  /**
   * Restarts the subscription service with possibly new parameters.
   */
  restart: function(aUrl, aPeriod) {
    this.stop();
    this.start(aUrl, aPeriod);
  },

  /**
   * Stops the subscription service.
   */
  stop: function() {
    if (!this._timerOn) return;

    this.timer.cancel();
    this._timerOn = false;
    this.status = getLocalizedString("subscriptionStatusDisabled");
  }

};
