/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2009-2014 the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of either the GNU General Public License Version 2 or later (the "GPL"), or the GNU
 * Lesser General Public License Version 2.1 or later (the "LGPL"), in which case the provisions of the GPL or the LGPL are applicable instead of those above.
 * If you wish to allow use of your version of this file only under the terms of either the GPL or the LGPL, and not to allow others to use your version of this
 * file under the terms of the MPL, indicate your decision by deleting the provisions above and replace them with the notice and other provisions required by
 * the GPL or the LGPL. If you do not delete the provisions above, a recipient may use your version of this file under the terms of any one of the MPL, the GPL
 * or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://foxreplace/core.js");
Cu.import("resource://foxreplace/io.js");
Cu.import("resource://foxreplace/Observers.js");
Cu.import("resource://foxreplace/Preferences.js");
Cu.import("resource://foxreplace/services.js");
Cu.import("resource://gre/modules/osfile.jsm");

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
   * Returns the path of the directory where the substitution list is saved.
   */
  get substitutionListDirPath() {
    return OS.Path.join(OS.Constants.Path.profileDir, "foxreplace");
  },

  /**
   * Returns the path of the file where the substitution list is saved.
   */
  get substitutionListFilePath() {
    return OS.Path.join(this.substitutionListDirPath, "list.json");
  },

  /**
   * Returns the observer key for the substitution list changed event.
   */
  get substitutionListChangedKey() {
    return "substitutionListChanged";
  },

  /**
   * Initializes this object to leave it ready for the first use.
   */
  init: function() {
    // Port from previous version if necessary
    if (this._preferences.has("substitutionListJSON")) {
      let substitutionList = this.substitutionListJson;
      this._preferences.reset("substitutionListJSON");
      this.substitutionList = substitutionList;
    }
    // Create the file with an empty list if it doesn't exist
    else if (!OS.File.exists(this.substitutionListFilePath)) {
      this.substitutionList = [];
    }
    // Read the substitution list from file to have it ready when it's needed
    else {
      let l = this.substitutionList;
    }
  },

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
  get substitutionListJson() {
    if (this._preferences.has("substitutionListJSON")) {
      try {
        let substitutionListJsonString = this._preferences.get("substitutionListJSON");
        return this.substitutionListFromString(substitutionListJsonString);
      }
      catch (e) {
        prompts.alert(getLocalizedString("jsonErrorTitle"), getLocalizedString("jsonErrorText") + "\n" + e);
      }
    }

    return null;
  },

  /**
   * Loads the substitution list asynchronously and returns a promise that is fulfilled with it.
   */
  get substitutionList() {
    if (!this._getPromise) {
      this._getPromise = io.readList(this.substitutionListFilePath);
    }

    // Each time we return a new promise that clones the substitution list so that the instance stored here is not modified externally
    return this._getPromise.then(cloneSubstitutionList);
  },

  /**
   * Saves the substitution list asynchronously.
   */
  set substitutionList(aSubstitutionList) {
    // Save a copy of the substitution list to return in the getter
    this._getPromise = Promise.resolve(cloneSubstitutionList(aSubstitutionList));
    Observers.notify(this.substitutionListChangedKey, aSubstitutionList);
    OS.File.makeDir(this.substitutionListDirPath).then(function() {
      io.writeList(aSubstitutionList, prefs.substitutionListFilePath);
    });
  },
  
  /**
   * Converts the string as saved in preferences to a substitution list.
   */
  substitutionListFromString: function(aJSONString) {
    return substitutionListFromJSON(JSON.parse(aJSONString));
  },
  
  /**
   * Converts the substitution list to a string to save to preferences.
   */
  substitutionListToString: function(aSubstitutionList) {
    return JSON.stringify(substitutionListToJSON(aSubstitutionList));
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
   * Loads the auto-replace periodically setting from preferences and returns it.
   */
  get autoReplacePeriodically() {
    return this._preferences.get("autoReplacePeriodically");
  },

  /**
   * Saves the auto-replace periodically setting to preferences.
   */
  set autoReplacePeriodically(aAutoReplacePeriodically) {
    this._preferences.set("autoReplacePeriodically", aAutoReplacePeriodically);
  },

  /**
   * Loads the auto-replace period setting from preferences and returns it.
   */
  get autoReplacePeriod() {
    return this._preferences.get("autoReplacePeriod");
  },

  /**
   * Saves the auto-replace period setting to preferences.
   */
  set autoReplacePeriod(aAutoReplacePeriod) {
    this._preferences.set("autoReplacePeriod", aAutoReplacePeriod);
  },

  /**
   * Loads the replace URLs setting from preferences and returns it.
   */
  get replaceUrls() {
    return this._preferences.get("replaceUrls");
  },

  /**
   * Saves the replace scripts setting to preferences.
   */
  set replaceScripts(aReplaceScripts) {
    this._preferences.set("replaceScripts", aReplaceScripts);
  },

  /**
   * Loads the replace scripts setting from preferences and returns it.
   */
  get replaceScripts() {
    return this._preferences.get("replaceScripts");
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
   * A Preferences object that doesn't reference any specific branch.
   */
  _globalPrefs: new Preferences(),

  /**
   * Returns the value of the instantApply preference.
   */
  get instantApply() {
    return this._globalPrefs.get("browser.preferences.instantApply");
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
   * Reference to the options window.
   */
  optionsWindow: null

};

prefs.init();
