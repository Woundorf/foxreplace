/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2017 Marc Ruiz Altisent. All rights reserved.
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

/**
 * Updates the substitution list from a subscription URL.
 */
var periodicReplace = {

  get alarmName() {
    return "periodicReplace";
  },

  /**
   * Starts the periodic replace.
   */
  start(period) {
    return browser.alarms.get(this.alarmName)
      .then(alarm => {
        if (alarm) return;  // already started

        browser.alarms.create(this.alarmName, {
          when: Date.now() + 100, // first call after 100 ms
          periodInMinutes: period / 60
        });
      });
  },

  /**
   * Restarts the periodic replace with possibly new parameters.
   */
  restart(period) {
    this.stop()
      .then(() => {
        this.start(period);
      });
  },

  /**
   * Stops the periodic replace.
   */
  stop() {
    return browser.alarms.clear(this.alarmName);
  }

};
