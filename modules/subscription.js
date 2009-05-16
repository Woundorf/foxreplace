/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is
 * Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://foxreplace/defs.js");
Components.utils.import("resource://foxreplace/io.js");
Components.utils.import("resource://foxreplace/prefs.js");
Components.utils.import("resource://foxreplace/services.js");

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
        var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                                .createInstance(Components.interfaces.nsIXMLHttpRequest);
        request.open("GET", fxrSubscription.url);
        request.onreadystatechange = function() {  
          if (request.readyState == 4) {
            if (request.status == 200) {  
              try {
                var listXml = new XML(request.responseText.replace(/<\?.*\?>/, ""));
                prefs.substitutionListXml = fxrSubstitutionListFromXml(listXml);
              }
              catch (e) {
                if (prefs.debug)
                  prompts.alert(getLocalizedString("xmlErrorTitle"), getLocalizedString("xmlErrorText") + "\n" + e);
              }
            }
            else if (request.status == 0 && prefs.debug)
              prompts.alert(getLocalizedString("cantConnectToServerTitle"),
                            getLocalizedString("cantConnectToServerText", [fxrSubscription.url]));
            else if (prefs.debug)
              prompts.alert(getLocalizedString("httpError"), request.status + " " + request.statusText);
          }
        };
        request.send(null);
      }
      catch (e) {
        if (prefs.debug) prompts.alert(getLocalizedString("unexpectedError"), e);
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
      this._timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    return this._timer;
  },
  
  /**
   * Starts the subscription service.
   */
  start: function(aUrl, aPeriod) {
    if (!/https?\:\/\//.test(aUrl)) {
      prompts.alert(getLocalizedString("invalidSubscriptionUrl"), getLocalizedString("onlyHttp"));
      return;
    }
    
    if (this._timerOn) return;
    
    this._timerOn = true;
    this.url = aUrl;
    this._callback.notify();  // first call
    this.timer.initWithCallback(this._callback, aPeriod * 60000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
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
    this.timer.cancel();
    this._timerOn = false;
  }
  
};
