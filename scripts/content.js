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

// The content has just loaded. Apply the substitution list if auto-replace on load is on.
storage.getPrefs().then(prefs => {
  if (prefs.autoReplaceOnLoad) {
    storage.getAutomaticGroups().then(list => {
      replaceWindow(window, list, prefs);
    });
  }
});

// Listen to messages from background scripts
browser.runtime.onMessage.addListener(message => {
  switch (message.key) {
    case "replace":
      storage.getPrefs().then(prefs => {
        const substitutionList = substitutionListFromJSON(message.list);
        replaceWindow(window, substitutionList, prefs);
      });
      break;
    case "replaceWithList":
      storage.getPrefs().then(prefs => {
        storage.getManualGroups().then(list => {
          replaceWindow(window, list, prefs);
        });
      });
      break;
    case "replaceWithListPeriod":
      storage.getPrefs().then(prefs => {
        storage.getAutomaticGroups().then(list => {
          replaceWindow(window, list, prefs);
        });
      });
      break;
  }
});
