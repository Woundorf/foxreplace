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

Cu.import("resource://foxreplace/Observers.js");

/**
 * Updates the substitution list from a subscription URL.
 */

var EXPORTED_SYMBOLS = ["fxrPeriodicReplace"];

var fxrPeriodicReplace = {

  /**
   * Key for notifications.
   */
  get observerKey() {
    return "fxrPeriodicReplace";
  },

  /**
   * Callback that will be called by the timer after every period.
   */
  _callback: {
    notify: function(aTimer) {
      Observers.notify(fxrPeriodicReplace.observerKey);
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
   * Starts the periodic replace.
   */
  start: function(aPeriod) {
    if (this._timerOn) return;

    this._timerOn = true;
    this._callback.notify();  // first call
    this.timer.initWithCallback(this._callback, aPeriod * 1000, Ci.nsITimer.TYPE_REPEATING_SLACK);
  },

  /**
   * Restarts the periodic replace with possibly new parameters.
   */
  restart: function(aPeriod) {
    this.stop();
    this.start(aPeriod);
  },

  /**
   * Stops the periodic replace.
   */
  stop: function() {
    if (!this._timerOn) return;

    this.timer.cancel();
    this._timerOn = false;
  }

};
