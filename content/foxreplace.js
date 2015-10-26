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
 * Portions created by the Initial Developer are Copyright (C) 2007-2014 the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Lutay Sergey (href substitution)
 *
 * Alternatively, the contents of this file may be used under the terms of either the GNU General Public License Version 2 or later (the "GPL"), or the GNU
 * Lesser General Public License Version 2.1 or later (the "LGPL"), in which case the provisions of the GPL or the LGPL are applicable instead of those above.
 * If you wish to allow use of your version of this file only under the terms of either the GPL or the LGPL, and not to allow others to use your version of this
 * file under the terms of the MPL, indicate your decision by deleting the provisions above and replace them with the notice and other provisions required by
 * the GPL or the LGPL. If you do not delete the provisions above, a recipient may use your version of this file under the terms of any one of the MPL, the GPL
 * or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Main object of the FoxReplace extension. It performs the substitutions and manages the main UI.
 */
var foxreplace = {

  core: {},

  /**
   * Initialization code.
   */
  onLoad: function() {
    //document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", function() { foxreplace.onShowContextMenu(); }, false);

    this.prefs.service.addObserver("", this, false);
    this.Observers.add(fxrPeriodicReplace.observerKey, this.listReplace, this);
    this.Observers.add(this.prefs.substitutionListChangedKey, this._loadEnabledGroups, this);

    gBrowser.addEventListener("DOMContentLoaded", this.onPageLoad, true);

    this._loadEnabledGroups();
    this.setAutoReplaceOnLoad(this.prefs.autoReplaceOnLoad);

    let autoReplacePeriodically = this.prefs.autoReplacePeriodically;
    let autoReplacePeriod = this.prefs.autoReplacePeriod;
    if (autoReplacePeriodically)
      fxrPeriodicReplace.start(autoReplacePeriod);

    // subscription
    var enableSubscription = this.prefs.enableSubscription;
    var subscriptionUrl = this.prefs.subscriptionUrl;
    var subscriptionPeriod = this.prefs.subscriptionPeriod;

    if (enableSubscription && subscriptionUrl && subscriptionPeriod > 0)
      fxrSubscription.start(subscriptionUrl, subscriptionPeriod);
  },

  /**
   * Finalization code.
   */
  onUnload: function() {
    this.Observers.remove(this.prefs.substitutionListChangedKey, this._loadEnabledGroups, this);
    this.Observers.remove(fxrPeriodicReplace.observerKey, this.listReplace, this);
    this.prefs.service.removeObserver("", this);
  },

  /**
   * Updates the menu of the toolbar button. More specifically, it updates the status of the auto-replace on load item. This is needed because the menu isn't
   * created until it's shown the first time, so it may be out of sync with the preference.
   */
  updateToolbarButtonMenu: function() {
    document.getElementById("fxrToolbarButtonMenuAutoReplaceOnLoad").setAttribute("checked", this.prefs.autoReplaceOnLoad);
  },

  /**
   * Observes changes in preferences.
   */
  observe: function(aSubject, aTopic, aData) {
    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
    // aData is the name of the pref that's been changed (relative to aSubject)

    if (aTopic != "nsPref:changed") return;

    switch (aData) {
      case "autoReplaceOnLoad":
        this.setAutoReplaceOnLoad(this.prefs.autoReplaceOnLoad);
        break;

      case "autoReplacePeriodically":
      case "autoReplacePeriod":
        let autoReplacePeriodically = this.prefs.autoReplacePeriodically;
        let autoReplacePeriod = this.prefs.autoReplacePeriod;
        if (autoReplacePeriodically)
          fxrPeriodicReplace.restart(autoReplacePeriod);
        else
          fxrPeriodicReplace.stop();
        break;

      case "enableSubscription":
      case "subscriptionUrl":
      case "subscriptionPeriod":
        var enableSubscription = this.prefs.enableSubscription;
        var subscriptionUrl = this.prefs.subscriptionUrl;
        var subscriptionPeriod = this.prefs.subscriptionPeriod;
        if (enableSubscription && subscriptionUrl && subscriptionPeriod > 0)
          fxrSubscription.restart(subscriptionUrl, subscriptionPeriod);
        else
          fxrSubscription.stop();
        break;
    }
  },

  /**
   * Sets auto-replace on load setting.
   */
  setAutoReplaceOnLoad: function(aAutoReplaceOnLoad) {
    document.getElementById("fxrMenuToolsFoxReplaceAutoReplaceOnLoad").setAttribute("checked", aAutoReplaceOnLoad);
    var menuItem = document.getElementById("fxrToolbarButtonMenuAutoReplaceOnLoad");
    if (menuItem) menuItem.setAttribute("checked", aAutoReplaceOnLoad);

    this._autoReplaceOnLoad = aAutoReplaceOnLoad;
  },

  /**
   * Shows the replace bar.
   */
  showReplaceBar: function() {
    var replaceBar = document.getElementById("fxrReplaceBar");
    replaceBar.hidden = false;
    // without the timeout it doesn't get the focus
    window.setTimeout(function() {
      document.getElementById("fxrReplaceBarInputStringTextBox").focus();
    }, 100);
  },

  /**
   * Hides the replace bar.
   */
  hideReplaceBar: function() {
    document.getElementById("fxrReplaceBar").hidden = true;
  },

  /**
   * Applies the substitution entered by the user in the replace bar.
   */
  instantReplace: function() {
    var inputString = document.getElementById("fxrReplaceBarInputStringTextBox").value;
    var inputType = document.getElementById("fxrReplaceBarInputStringTextBox").inputType;
    var outputString = document.getElementById("fxrReplaceBarOutputStringTextBox").value;
    var caseSensitive = document.getElementById("fxrReplaceBarCaseSensitiveCheckBox").checked;
    var html = document.getElementById("fxrReplaceBarHtmlButton").html;

    if (inputString == "") return;  // this should not happen

    try {
      // new temporal substitution list with only one item
      this._substitutionList = [new this.core.SubstitutionGroup("", [], [new this.core.Substitution(inputString, outputString, caseSensitive, inputType)], html,
                                                                true)];
      // perform substitutions
      this.replaceDocXpath();
    }
    catch (se) {  // SyntaxError
      this.prompts.alert(this.getLocalizedString("regExpError"), se);
    }

    // restore substitution list
    this._loadEnabledGroups();
  },

  /**
   * Applies substitutions from the substitution list.
   */
  listReplace: function() {
    this.replaceDocXpath();
  },

  /**
   * Toggles auto-replace on load setting.
   */
  toggleAutoReplaceOnLoad: function() {
    this.prefs.autoReplaceOnLoad = !this.prefs.autoReplaceOnLoad;
  },

  /**
   * Shows options dialog.
   */
  showOptions: function() {
    // Based on code from https://developer.mozilla.org/en-US/docs/XUL/School_tutorial/Handling_Preferences#Preference_windows
    if (!this.prefs.optionsWindow) {
      let preferences = new this.Preferences();
      let instantApply = preferences.get("browser.preferences.instantApply");
      let features = "chrome,titlebar,toolbar,centerscreen,resizable" + (instantApply ? ",dialog=no" : ",modal");
      window.openDialog("chrome://foxreplace/content/options.xul", "", features);
    }
    else this.prefs.optionsWindow.focus();
  },

  /**
   * Shows help file in a new tab.
   */
  showHelp: function() {
    // Add tab, then make active
    gBrowser.selectedTab = gBrowser.addTab("chrome://foxreplace/content/help.xhtml");
  },

  /**
   * Applies substitutions from the substitution list to the loaded page if auto-replace on load is on.
   */
  onPageLoad: function(aEvent) {
    if (!foxreplace._autoReplaceOnLoad) return;

    // doc is the document that triggered "onload" event
    var doc = aEvent.originalTarget;
    if (doc.nodeName != "#document") return;

    // perform substitutions on the loaded document
    foxreplace.replaceDocXpath(doc.defaultView);
  },

  /**
   * Performs susbstitutions from the substitution list in the passed window. If no window is passed the current window is the target.
   */
  replaceDocXpath: function(aWindow) {
    if (!aWindow) aWindow = window.content;
    this.replaceWindow(aWindow, this._substitutionList);
  },

  /**
   * Loads enabled substitution groups. The original substitution list can be taken either from aSubstitutionList or from prefs.
   */
  _loadEnabledGroups: function(aSubstitutionList) {
    if (aSubstitutionList) {
      this._substitutionList = aSubstitutionList.filter(function(aGroup) { return aGroup.enabled; });
    }
    else {
      this.prefs.substitutionList.then(function(aList) { foxreplace._loadEnabledGroups(aList); });
    }
  }

};

Components.utils.import("resource://foxreplace/core.js", foxreplace.core);
Components.utils.import("resource://foxreplace/Observers.js", foxreplace);
Components.utils.import("resource://foxreplace/periodicreplace.js");
Components.utils.import("resource://foxreplace/Preferences.js", foxreplace);
Components.utils.import("resource://foxreplace/prefs.js", foxreplace);
Components.utils.import("resource://foxreplace/replace.js", foxreplace);
Components.utils.import("resource://foxreplace/services.js", foxreplace);
Components.utils.import("resource://foxreplace/subscription.js");

window.addEventListener("load", function() { foxreplace.onLoad(); }, false);
window.addEventListener("unload", function() { foxreplace.onUnload(); }, false);
