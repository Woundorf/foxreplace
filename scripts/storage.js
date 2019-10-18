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

var storage = {

  getList() {
    return browser.storage.local.get("list").then(results => {
      if (results.list) return substitutionListFromJSON(results.list);
      else return [];
    });
  },

  setList(list) {
    return browser.storage.local.set({ list: substitutionListToJSON(list) });
  },

  getPrefs() {
    return browser.storage.local.get({
      enableContextMenu: false,
      autoReplaceOnLoad: false,
      autoReplacePeriodically: false,
      autoReplacePeriod: 1,
      replaceUrls: false,
      replaceScripts: false,
      enableSubscription: false,
      subscriptionUrl: "",
      subscriptionPeriod: 1
    });
  },

  setPrefs(prefs) {
    let sanitizedPrefs = {};
    for (let p in prefs) {
      switch (p) {
        case "enableContextMenu":
        case "autoReplaceOnLoad":
        case "autoReplacePeriodically":
        case "replaceUrls":
        case "replaceScripts":
        case "enableSubscription":
          sanitizedPrefs[p] = Boolean(prefs[p]);
          break;
        case "autoReplacePeriod":
        case "subscriptionPeriod":
          sanitizedPrefs[p] = Number(prefs[p]);
          break;
        case "subscriptionUrl":
          sanitizedPrefs[p] = String(prefs[p]);
          break;
        default:
          console.warn("Unrecognized preference: ", p, prefs[p]);
          break;
      }
    }
    return browser.storage.local.set(sanitizedPrefs);
  },

  getAutomaticGroups() {
    return this.getList().then(list => list.filter(group => group.enabled && (group.mode == group.MODE_AUTO_AND_MANUAL || group.mode == group.MODE_AUTO)));
  },

  getManualGroups() {
    return this.getList().then(list => list.filter(group => group.enabled && (group.mode == group.MODE_AUTO_AND_MANUAL || group.mode == group.MODE_MANUAL)));
  },

  getMainColumnState() {
    return browser.storage.local.get("mainColumnState").then(result => {
      return result.mainColumnState;
    });
  },

  setMainColumnState(columnState) {
    return browser.storage.local.set({ mainColumnState: columnState });
  }

};
