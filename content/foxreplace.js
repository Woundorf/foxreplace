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
Cu.import("chrome://foxreplace/content/Observers.js");
Cu.import("chrome://foxreplace/content/periodicreplace.js");
Cu.import("chrome://foxreplace/content/Preferences.js");
Cu.import("chrome://foxreplace/content/prefs.js");
Cu.import("chrome://foxreplace/content/services.js");
Cu.import("chrome://foxreplace/content/subscription.js");
Cu.import("chrome://foxreplace/content/ui.js");

/**
 * Main module of FoxReplace. It manages timers, observers and the main UI.
 */

var EXPORTED_SYMBOLS = ["foxreplace", "FoxReplace"];

/**
 * Global object to manage startup, shutdown and communication with the embedded WebExtension.
 */
var foxreplace = {

  /**
   * Sets up an observer and starts enabled timers.
   */
  startup: function() {
    prefs.service.addObserver("", this, false);
    Observers.add(prefs.substitutionListChangedKey, this.loadEnabledGroups, this);

    this.loadEnabledGroups();

    let autoReplacePeriodically = prefs.autoReplacePeriodically;
    let autoReplacePeriod = prefs.autoReplacePeriod;
    if (autoReplacePeriodically)
      fxrPeriodicReplace.start(autoReplacePeriod);

    // subscription
    var enableSubscription = prefs.enableSubscription;
    var subscriptionUrl = prefs.subscriptionUrl;
    var subscriptionPeriod = prefs.subscriptionPeriod;

    if (enableSubscription && subscriptionUrl && subscriptionPeriod > 0)
      fxrSubscription.start(subscriptionUrl, subscriptionPeriod);
  },

  /**
   * Removes the observer and stops timers.
   */
  shutdown: function() {
    Observers.remove(prefs.substitutionListChangedKey, this.loadEnabledGroups, this);
    prefs.service.removeObserver("", this);

    fxrPeriodicReplace.stop();
    fxrSubscription.stop();
  },

  /**
   * Observes changes in preferences.
   */
  observe: function(aSubject, aTopic, aData) {
    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
    // aData is the name of the pref that's been changed (relative to aSubject)

    if (aTopic != "nsPref:changed") return;

    switch (aData) {
      case "autoReplacePeriodically":
      case "autoReplacePeriod":
        let autoReplacePeriodically = prefs.autoReplacePeriodically;
        let autoReplacePeriod = prefs.autoReplacePeriod;
        if (autoReplacePeriodically)
          fxrPeriodicReplace.restart(autoReplacePeriod);
        else
          fxrPeriodicReplace.stop();
        break;

      case "enableSubscription":
      case "subscriptionUrl":
      case "subscriptionPeriod":
        var enableSubscription = prefs.enableSubscription;
        var subscriptionUrl = prefs.subscriptionUrl;
        var subscriptionPeriod = prefs.subscriptionPeriod;
        if (enableSubscription && subscriptionUrl && subscriptionPeriod > 0)
          fxrSubscription.restart(subscriptionUrl, subscriptionPeriod);
        else
          fxrSubscription.stop();
        break;
    }
  },

  /**
   * Loads enabled substitution groups. The original substitution list can be taken either from aSubstitutionList or from prefs.
   */
  loadEnabledGroups: function(aSubstitutionList) {
    if (aSubstitutionList) {
      this.substitutionList = aSubstitutionList.filter(group => group.enabled);
    }
    else {
      prefs.substitutionList.then(list => { this.loadEnabledGroups(list); });
    }
  },

  /**
   * Listens and responds to messages from the embedded WebExtension.
   */
  webExtensionMessageListener: function(message, sender, sendResponse) {
    // Note: this != foxreplace
    switch (message.key) {
      case "getAutoReplaceOnLoad":
        sendResponse({
          autoReplaceOnLoad: prefs.autoReplaceOnLoad
        });
        break;
      case "getSubstitutionList":
        sendResponse({
          list: substitutionListToJSON(foxreplace.substitutionList),
          prefs: {
            replaceUrls: prefs.replaceUrls,
            replaceScripts: prefs.replaceScripts
          }
        });
        break;
    }
  }

};

/**
 * Creates a FoxReplace object associated with the given aWindow.
 */
function FoxReplace(aWindow) {
  this.window = aWindow;
  this.document = this.window.document;
  this.onLoad();
}

FoxReplace.prototype = {

  /**
   * Initialization code.
   */
  onLoad: function() {
    buildUi(this.window.gBrowser);

    prefs.service.addObserver("", this, false);
    Observers.add(fxrPeriodicReplace.observerKey, this.listReplace, this);

    this.setAutoReplaceOnLoad(prefs.autoReplaceOnLoad);

    this.window.foxreplace = this;
  },

  /**
   * Finalization code.
   */
  onUnload: function() {
    Observers.remove(fxrPeriodicReplace.observerKey, this.listReplace, this);
    prefs.service.removeObserver("", this);

    removeUi(this.window.gBrowser);

    delete this.window.foxreplace;
    this.window = null;
    this.document = null;
  },

  /**
   * Updates the menu of the toolbar button. More specifically, it updates the status of the auto-replace on load item. This is needed because the menu isn't
   * created until it's shown the first time, so it may be out of sync with the preference.
   */
  updateToolbarButtonMenu: function() {
    this.document.getElementById("fxrToolbarButtonMenuAutoReplaceOnLoad").setAttribute("checked", prefs.autoReplaceOnLoad);
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
        this.setAutoReplaceOnLoad(prefs.autoReplaceOnLoad);
        break;
    }
  },

  /**
   * Sets auto-replace on load setting.
   */
  setAutoReplaceOnLoad: function(aAutoReplaceOnLoad) {
    this.document.getElementById("fxrMenuToolsFoxReplaceAutoReplaceOnLoad").setAttribute("checked", aAutoReplaceOnLoad);
    var menuItem = this.document.getElementById("fxrToolbarButtonMenuAutoReplaceOnLoad");
    if (menuItem) menuItem.setAttribute("checked", aAutoReplaceOnLoad);

    this._autoReplaceOnLoad = aAutoReplaceOnLoad;
  },

  /**
   * Shows the replace bar.
   */
  showReplaceBar: function() {
    var replaceBar = this.document.getElementById("fxrReplaceBar");
    replaceBar.hidden = false;
    // without the timeout it doesn't get the focus
    let document = this.document;
    this.window.setTimeout(function() {
      document.getElementById("fxrReplaceBarInputStringTextBox").focus();
    }, 100);
  },

  /**
   * Hides the replace bar.
   */
  hideReplaceBar: function() {
    this.document.getElementById("fxrReplaceBar").hidden = true;
  },

  /**
   * Applies the substitution entered by the user in the replace bar.
   */
  instantReplace: function() {
    var inputString = this.document.getElementById("fxrReplaceBarInputStringTextBox").value;
    var inputType = this.document.getElementById("fxrReplaceBarInputStringTextBox").inputType;
    var outputString = this.document.getElementById("fxrReplaceBarOutputStringTextBox").value;
    var caseSensitive = this.document.getElementById("fxrReplaceBarCaseSensitiveCheckBox").checked;
    var html = this.document.getElementById("fxrReplaceBarHtmlButton").html;

    if (inputString == "") return;  // this should not happen

    try {
      // new temporal substitution list with only one item
      let substitutionList = [new SubstitutionGroup("", [], [new Substitution(inputString, outputString, caseSensitive, inputType)], html, true)];
      // perform substitutions
      this.replaceDocXpath(substitutionList);
    }
    catch (se) {  // SyntaxError
      prompts.alert(getLocalizedString("regExpError"), se);
    }
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
    prefs.autoReplaceOnLoad = !prefs.autoReplaceOnLoad;
  },

  /**
   * Shows options dialog.
   */
  showOptions: function() {
    // Based on code from https://developer.mozilla.org/en-US/docs/XUL/School_tutorial/Handling_Preferences#Preference_windows
    if (!prefs.optionsWindow) {
      let preferences = new Preferences();
      let instantApply = preferences.get("browser.preferences.instantApply");
      let features = "chrome,titlebar,toolbar,centerscreen,resizable" + (instantApply ? ",dialog=no" : ",modal");
      this.window.openDialog("chrome://foxreplace/content/options.xul", "", features);
    }
    else prefs.optionsWindow.focus();
  },

  /**
   * Shows help file in a new tab.
   */
  showHelp: function() {
    this._openAndReuseOneTabPerURL("chrome://foxreplace/content/help.xhtml");
  },

  /**
   * Applies aSubstitutionList to the current tab. If no substitution list is given the current one is used.
   */
  replaceDocXpath: function(aSubstitutionList) {
    let substitutionList = aSubstitutionList || foxreplace.substitutionList;
    foxreplace.webExtensionPort.postMessage({
      key: "replace",
      list: substitutionListToJSON(substitutionList),
      prefs: {
        replaceUrls: prefs.replaceUrls,
        replaceScripts: prefs.replaceScripts
      }
    });
  },

  /**
   * Opens aUrl in a new tab, or selects the tab where it is open.
   * Copied from https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Tabbed_browser#Reusing_tabs.
   */
  _openAndReuseOneTabPerURL: function(aUrl) {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    let browserEnumerator = wm.getEnumerator("navigator:browser");

    // Check each browser instance for our URL
    let found = false;

    while (!found && browserEnumerator.hasMoreElements()) {
      let browserWin = browserEnumerator.getNext();
      let tabBrowser = browserWin.gBrowser;

      // Check each tab of this browser instance
      let numTabs = tabBrowser.browsers.length;

      for (let index = 0; index < numTabs; index++) {
        let currentBrowser = tabBrowser.getBrowserAtIndex(index);

        if (aUrl == currentBrowser.currentURI.spec) {
          // The URL is already opened. Select this tab.
          tabBrowser.selectedTab = tabBrowser.tabContainer.childNodes[index];

          // Focus *this* browser-window
          browserWin.focus();

          found = true;
          break;
        }
      }
    }

    // Our URL isn't open. Open it now.
    if (!found) {
      let recentWindow = wm.getMostRecentWindow("navigator:browser");

      if (recentWindow) {
        // Use an existing browser window
        recentWindow.delayedOpenTab(aUrl, null, null, null, null);
      }
      else {
        // No browser windows are open, so open a new one.
        this.window.open(aUrl);
      }
    }
  }

};
