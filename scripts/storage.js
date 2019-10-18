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

  /// Returns a random group id.
  getNewGroupId() {
    // Generates 9-digit base 36 random number in range [0, 36^9)
    // 36^9 = 101559956668416
    return `g_${Math.floor(Math.random() * 101559956668416).toString(36).padStart(9, '0')}`;
  },

  /// Converts the given compact list to sparse and stores it in sparse form.
  setCompactList(compactListJson) {
    // 1. Clear current list
    return browser.storage.local.get().then(data => {
      for (let key in data) {
        if (key.startsWith('g_')) browser.storage.local.remove(key);
      }

      return browser.storage.local.set({ proxy_list: [] });
    })
    // 2. Check version and store new list
    .then(() => {
      let check = checkVersion(compactListJson);

      if (!check.status) {  // incompatible version
        return Promise.reject(Error(check.message));
      }

      if (check.message) {  // compatible but deprecated version
        console.warn(check.message);
      }

      // Current version
      let data = {
        list_version: CurrentListVersion,
        proxy_list: []
      };

      for (let group of compactListJson.groups) {
        let id;
        do {
          id = this.getNewGroupId();
        } while (data[id] !== undefined);

        SubstitutionGroup.upgradeJson(group, compactListJson.version);
        data.proxy_list.push({ id: id });
        data[id] = group;
      }

      return browser.storage.local.set(data);
    });
  },

  /// Migrates the compact list to the sparse list if necessary.
  migrateToSparseList() {
    return browser.storage.local.get('list').then(data => {
      if (data.list !== undefined) {
        browser.storage.local.remove('list');
        this.setCompactList(data.list);
      }
    });
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
