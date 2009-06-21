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
Components.utils.import("resource://foxreplace/services.js");

/**
 * Easy access to preferences.
 */

var EXPORTED_SYMBOLS = ["prefs"];

var prefs = {
  
  /**
   * Returns the preferences service.
   */
  get service() {
    if (!this._service) {
      this._service = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService)
                                .getBranch("extensions.foxreplace.");
      this._service.QueryInterface(Components.interfaces.nsIPrefBranch2);
    }
    
    return this._service;
  },
  
  /**
   * Loads the substitution list from preferences and returns it.
   */
  get substitutionListXml() {
    try {
      var listXmlString = this.service.getComplexValue("substitutionListXml", Components.interfaces.nsISupportsString)
                                      .data;
      var listXml = new XML(listXmlString);
      return fxrSubstitutionListFromXml(listXml);
    }
    catch (e) {
      prompts.alert(getLocalizedString("xmlErrorTitle"), getLocalizedString("xmlErrorText") + "\n" + e);
      return;
    }
  },
  
  /**
   * Saves the substitution list to preferences.
   */
  set substitutionListXml(aSubstitutionList) {
    this.service.setComplexValue("substitutionListXml", Components.interfaces.nsISupportsString,
                                 this.substitutionListToXmlString(aSubstitutionList));
  },
  
  /**
   * Returns the substitution list encoded as a string to save to preferences.
   */
  substitutionListToXmlString: function(aSubstitutionList) {
    var listXml = fxrSubstitutionListToXml(aSubstitutionList);
    var listXmlString = Components.classes["@mozilla.org/supports-string;1"]
                                  .createInstance(Components.interfaces.nsISupportsString);
    XML.prettyPrinting = false;
    listXmlString.data = listXml.toString();
    
    return listXmlString;
  },
  
  /**
   * Loads the auto-replace on load setting from preferences and returns it.
   */
  get autoReplaceOnLoad() {
    return this.service.getBoolPref("autoReplaceOnLoad");
  },
  
  /**
   * Saves the auto-replace on load setting to preferences.
   */
  set autoReplaceOnLoad(aAutoReplaceOnLoad) {
    this.service.setBoolPref("autoReplaceOnLoad", aAutoReplaceOnLoad);
  },
  
  /**
   * Loads the replace URLs setting from preferences and returns it.
   */
  get replaceUrls() {
    return this.service.getBoolPref("replaceUrls");
  },
  
  /**
   * Saves the replace URLs setting to preferences.
   */
  set replaceUrls(aReplaceUrls) {
    this.service.setBoolPref("replaceUrls", aReplaceUrls);
  },
  
  /**
   * Loads the enable subscription setting from preferences and returns it.
   */
  get enableSubscription() {
    return this.service.getBoolPref("enableSubscription");
  },
  
  /**
   * Saves the enable subscription setting to preferences.
   */
  set enableSubscription(aBool) {
    this.service.setBoolPref("enableSubscription", aBool);
  },
  
  /**
   * Loads the subscription URL from preferences and returns it.
   */
  get subscriptionUrl() {
    return this.service.getComplexValue("subscriptionUrl", Components.interfaces.nsISupportsString).data;
  },
  
  /**
   * Saves the subscription URL to preferences.
   */
  set subscriptionUrl(aUrl) {
    this.service.setComplexValue("subscriptionUrl", Components.interfaces.nsISupportsString,
                                 this.subscriptionUrlToString(aUrl));
  },
  
  /**
   * Returns the subscription URL as a string to save to preferences.
   */
  subscriptionUrlToString: function (aUrl) {
    var urlString = Components.classes["@mozilla.org/supports-string;1"]
                              .createInstance(Components.interfaces.nsISupportsString);
    urlString.data = aUrl;
    
    return urlString;
  },
  
  /**
   * Loads the subscription period from preferences and returns it.
   */
  get subscriptionPeriod() {
    return this.service.getIntPref("subscriptionPeriod");
  },
  
  /**
   * Saves the subscription period to preferences.
   */
  set subscriptionPeriod(aPeriod) {
    this.service.setIntPref("subscriptionPeriod", aPeriod);
  },
  
  /**
   * Loads the debug setting from preferences and returns it.
   */
  get debug() {
    return this.service.getBoolPref("debug");
  },
  
  /**
   * Saves the debug setting to preferences.
   */
  set debug(aBool) {
    this.service.setBoolPref("debug", aBool);
  }
  
};
