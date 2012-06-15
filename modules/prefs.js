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
 * Portions created by the Initial Developer are Copyright (C) 2009-2012
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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://foxreplace/core.js");
Cu.import("resource://foxreplace/Preferences.js");
Cu.import("resource://foxreplace/services.js");

/**
 * Easy access to preferences.
 */

var EXPORTED_SYMBOLS = ["prefs"];

var prefs = {

  /**
   * Preferences object referencing FoxReplace branch.
   */
  _preferences: new Preferences("extensions.foxreplace."),

  /**
   * Returns the preferences service.
   */
  get service() {
    if (!this._service) {
      this._service = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.foxreplace.");
      this._service.QueryInterface(Ci.nsIPrefBranch2);
    }

    return this._service;
  },

  /**
   * Loads the substitution list from preferences and returns it.
   */
  get substitutionList() {
    if (!this._substitutionList || this._substitutionListJSONString != this._preferences.get("substitutionListJSON")) {
      this.upgradeListToJSON();
      try {
        this._substitutionListJSONString = this._preferences.get("substitutionListJSON");
        let substitutionListJSON = JSON.parse(this._substitutionListJSONString);
        this._substitutionList = substitutionListFromJSON(substitutionListJSON);
      }
      catch (e) {
        prompts.alert(getLocalizedString("jsonErrorTitle"), getLocalizedString("jsonErrorText") + "\n" + e);
        return undefined;
      }
    }
    return this._substitutionList;
  },

  /**
   * Saves the substitution list to preferences.
   */
  set substitutionList(aSubstitutionList) {
    this._preferences.set("substitutionListJSON", JSON.stringify(substitutionListToJSON(aSubstitutionList)));
  },

  /**
   * Loads the substitution list from preferences and returns it.
   */
  get substitutionListXml() {
    try {
      let substitutionListXmlString = this._preferences.get("substitutionListXml");
      let parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
      let listXml = parser.parseFromString(substitutionListXmlString, "text/xml");
      let substitutionList = fxrSubstitutionListFromXml(listXml);
      return substitutionList;
    }
    catch (e) {
      prompts.alert(getLocalizedString("xmlErrorTitle"), getLocalizedString("xmlErrorText") + "\n" + e);
      return undefined;
    }
  },

  /**
   * Deletes the cached substitution list.
   */
  onSubstitutionListJSONChange: function() {
    this._substitutionList = null;
  },

  /**
   * Loads the auto-replace on load setting from preferences and returns it.
   */
  get autoReplaceOnLoad() {
    return this._preferences.get("autoReplaceOnLoad");
  },

  /**
   * Saves the auto-replace on load setting to preferences.
   */
  set autoReplaceOnLoad(aAutoReplaceOnLoad) {
    this._preferences.set("autoReplaceOnLoad", aAutoReplaceOnLoad);
  },

  /**
   * Loads the replace URLs setting from preferences and returns it.
   */
  get replaceUrls() {
    return this._preferences.get("replaceUrls");
  },

  /**
   * Saves the replace URLs setting to preferences.
   */
  set replaceUrls(aReplaceUrls) {
    this._preferences.set("replaceUrls", aReplaceUrls);
  },

  /**
   * Loads the enable subscription setting from preferences and returns it.
   */
  get enableSubscription() {
    return this._preferences.get("enableSubscription");
  },

  /**
   * Saves the enable subscription setting to preferences.
   */
  set enableSubscription(aBool) {
    this._preferences.set("enableSubscription", aBool);
  },

  /**
   * Loads the subscription URL from preferences and returns it.
   */
  get subscriptionUrl() {
    return this._preferences.get("subscriptionUrl");
  },

  /**
   * Saves the subscription URL to preferences.
   */
  set subscriptionUrl(aUrl) {
    this._preferences.set("subscriptionUrl", aUrl);
  },

  /**
   * Loads the subscription period from preferences and returns it.
   */
  get subscriptionPeriod() {
    return this._preferences.get("subscriptionPeriod");
  },

  /**
   * Saves the subscription period to preferences.
   */
  set subscriptionPeriod(aPeriod) {
    this._preferences.set("subscriptionPeriod", aPeriod);
  },

  /**
   * Loads the debug setting from preferences and returns it.
   */
  get debug() {
    return this._preferences.get("debug");
  },

  /**
   * Saves the debug setting to preferences.
   */
  set debug(aBool) {
    this._preferences.set("debug", aBool);
  },

  /**
   * Start observing a preference.
   */
  observe: function(aPrefName, aCallback, aThisObject) {
    this._preferences.observe(aPrefName, aCallback, aThisObject);
  },

  /**
   * Stop observing a preference.
   */
  ignore: function(aPrefName, aCallback, aThisObject) {
    this._preferences.ignore(aPrefName, aCallback, aThisObject);
  },

  /**
   * Upgrades the substitution list preference from the old XML format (0.12) to the new JSON format (0.13), if necessary.
   */
  upgradeListToJSON: function() {
    if (this._preferences.has("substitutionListXml")) {
      let substitutionList = this.substitutionListXml;
      this._preferences.reset("substitutionListXml");
      this.substitutionList = substitutionList;
    }
  }

};

prefs.observe("substitutionListJSON", prefs.onSubstitutionListJSONChange, prefs);
