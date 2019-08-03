/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2019 Marc Ruiz Altisent. All rights reserved.
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

// Dependencies: storage.js (storage.setList)

/**
 *  Updates the substitution list from a subscription URL.
 */
var subscription = (() => {

  const ALARM_NAME = "subscription";

  let subscription = {

    /**
     *  Starts the subscription service.
     */
    start(url, period) {
      return browser.alarms.get(ALARM_NAME)
        .then(alarm => {
          if (alarm) return;  // already started

          subscribedUrl = url;
          browser.alarms.onAlarm.addListener(update);

          browser.alarms.create(ALARM_NAME, {
            when: Date.now() + 100, // first call after 100 ms
            periodInMinutes: period
          });
        });
    },

    /**
     * Restarts the subscription service with possibly new parameters.
     */
    restart(url, period) {
      this.stop()
        .then(() => {
          this.start(url, period);
        });
    },

    /**
     * Stops the subscription service.
     */
    stop() {
      return browser.alarms.clear(ALARM_NAME)
        .then(cleared => {
          if (cleared) setStatus(browser.i18n.getMessage("subscriptionStatus.disabled"));
        });
    },

    get status() {
      return status;
    }

  };

  var subscribedUrl = "";
  var status = browser.i18n.getMessage("subscriptionStatus.disabled");

  function update(alarm) {
    if (alarm.name != ALARM_NAME) return;

    setStatus(browser.i18n.getMessage("subscriptionStatus.updating"));

    let init;
    if (new URL(subscribedUrl).protocol == "file:") init = { mode: "same-origin" };

    fetch(subscribedUrl, init)
      .then(response => response.json())
      .then(json => {
        let check = checkVersion(json);

        if (check.status) {
          let list = substitutionListFromJSON(json);
          storage.setList(list);
          let status = browser.i18n.getMessage("subscriptionStatus.lastUpdate", new Date().toLocaleString());

          if (check.message) {
            status = `⚠ ${check.message} ${status}`;
          }

          setStatus(status);
        }
        else {
          throw Error(check.message);
        }
      }).
      catch(error => {
        setStatus(String(error));
      });
  }

  function setStatus(text) {
    status = text;
    browser.runtime.sendMessage({
      key: "subscriptionStatus",
      status
    });
  }

  return subscription;

})();
