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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("chrome://foxreplace/content/core.js");
Cu.import("chrome://foxreplace/content/prefs.js");
Cu.import("chrome://foxreplace/content/services.js");
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
   * Listens and responds to messages from the embedded WebExtension.
   */
  webExtensionMessageListener: function(message, sender, sendResponse) {
    // Note: this != foxreplace
    switch (message.key) {
      case "migrateData":
        prefs.shouldMigrate().then(should => {
          if (should || message.force) {
            prefs.backup();
            prefs.substitutionList.then(list => {
              sendResponse({
                list: substitutionListToJSON(list),
                autoReplaceOnLoad: prefs.autoReplaceOnLoad,
                autoReplacePeriodically: prefs.autoReplacePeriodically,
                autoReplacePeriod: prefs.autoReplacePeriod,
                replaceUrls: prefs.replaceUrls,
                replaceScripts: prefs.replaceScripts,
                enableSubscription: prefs.enableSubscription,
                subscriptionUrl: prefs.subscriptionUrl,
                subscriptionPeriod: prefs.subscriptionPeriod
                // prefs.debug consciously ignored
              });
            });
          }
        });
        return true;  // needed to use sendResponse asynchronously
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

    this.window.foxreplace = this;
  },

  /**
   * Finalization code.
   */
  onUnload: function() {
    removeUi(this.window.gBrowser);

    if (this.webExtensionMessageListener && !Cu.isDeadWrapper(foxreplace.webExtensionPort)) {
      foxreplace.webExtensionPort.onMessage.removeListener(this.webExtensionMessageListener);
    }

    delete this.window.foxreplace;
    this.window = null;
    this.document = null;
  },

  /**
   * Updates the menu of the toolbar button. More specifically, it updates the status of the auto-replace on load item. This is needed because the menu isn't
   * created until it's shown the first time, so it may be out of sync with the preference.
   */
  updateToolbarButtonMenu: function() {
    this.document.getElementById("fxrToolbarButtonMenuAutoReplaceOnLoad").setAttribute("checked", this._autoReplaceOnLoad);
  },

  /**
   * Starts to listen on the WebExtension port.
   */
  listenOnWebExtensionPort() {
    if (foxreplace.webExtensionPort) {
      this.webExtensionMessageListener = message => {
        switch (message.key) {
          case "autoReplaceOnLoad":
            this.setAutoReplaceOnLoad(message.value);
            break;
          case "showHelp":
            this.showHelp();
            break;
        }
      };
      foxreplace.webExtensionPort.onMessage.addListener(this.webExtensionMessageListener);
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
    foxreplace.webExtensionPort.postMessage({
      key: "autoReplaceOnLoad",
      value: !this._autoReplaceOnLoad
    });
  },

  /**
   * Shows options dialog.
   */
  showOptions: function() {
    foxreplace.webExtensionPort.postMessage({
      key: "showOptions"
    });
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
