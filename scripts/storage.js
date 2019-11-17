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

var storage = (() => {

  const DATABASE_NAME = 'list';

  let db = new Dexie(DATABASE_NAME);
  db.version(1).stores({
    groups: '++id, enabled, mode, index',
    substitutions: '++id, groupId, index'
  });

  let storage = {

    /// Migrates the local storage list to indexed db if necessary.
    migrateToIndexedDb() {
      return browser.storage.local.get('list').then(data => {
        if (data.list !== undefined) {
          //browser.storage.local.remove('list');
          return this.setList(data.list);
        }
      });
    },

    getList() {
      //return browser.storage.local.get("list").then(results => {
      //  if (results.list) return substitutionListFromJSON(results.list);
      //  else return [];
      //});
      return db.groups.toArray();
    },

    async setList(list) {
      //return browser.storage.local.set({ list: substitutionListToJSON(list) });
      // list is json
      await db.delete();
      await db.open();
      await db.transaction('rw', db.groups, db.substitutions, async () => {
        for (let i = 0; i < list.groups.length; i++) {
          let group = list.groups[i];
          let groupId = await db.groups.add({
            name: group.name,
            urls: group.urls,
            html: group.html,
            enabled: Number(group.enabled),
            mode: group.mode,
            index: i
          });

          await db.substitutions.bulkAdd(group.substitutions.map((substitution, index) => {
            substitution.groupId = groupId;
            substitution.index = index;
            return substitution;
          }));
        }
      });
    },

    /// Returns the groups with some data of their first substitution (to show in the options page).
    getGroupsPreview() {
      return db.transaction('r', db.groups, db.substitutions, async () => {
        let groups = await db.groups.orderBy('id').toArray();
        let firstSubstitutions = await db.substitutions.where({ index: 0}).sortBy('groupId');
        return groups.map((group, index) => {
          group.enabled = Boolean(group.enabled);
          group.input = firstSubstitutions[index].input;
          group.output = firstSubstitutions[index].output;
          return group;
        }).sort((group1, group2) => group1.index - group2.index);
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

  return storage;

})();
