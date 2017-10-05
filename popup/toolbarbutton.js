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

function onLoad() {
  window.removeEventListener("DOMContentLoaded", onLoad);
  document.getElementById("replace").addEventListener("click", showReplaceBar);
  document.getElementById("replaceWithList").addEventListener("click", replaceWithList);
  document.getElementById("autoReplaceOnLoad").addEventListener("click", toggleAutoReplaceOnLoad);
  document.getElementById("options").addEventListener("click", showOptions);

  storage.getPrefs().then(prefs => {
    if (prefs.autoReplaceOnLoad) document.getElementById("autoReplaceOnLoadCheck").classList.add("checkmark");
    else document.getElementById("autoReplaceOnLoadCheck").classList.remove("checkmark");
  });
}

function onUnload() {
  window.removeEventListener("unload", onUnload);
  document.getElementById("replace").removeEventListener("click", showReplaceBar);
  document.getElementById("replaceWithList").removeEventListener("click", replaceWithList);
  document.getElementById("autoReplaceOnLoad").removeEventListener("click", toggleAutoReplaceOnLoad);
  document.getElementById("options").removeEventListener("click", showOptions);
}

function showReplaceBar() {
  browser.sidebarAction.open()
    .then(() => window.close());
}

function replaceWithList() {
  browser.runtime.sendMessage({ key: "replaceWithList" })
    .then(() => window.close());
}

function toggleAutoReplaceOnLoad() {
  storage.getPrefs().then(prefs => {
    storage.setPrefs({
      autoReplaceOnLoad: !prefs.autoReplaceOnLoad
    }).then(() => window.close());
  });
}

function showOptions() {
  browser.runtime.openOptionsPage()
    .then(() => window.close());
}

window.addEventListener("DOMContentLoaded", onLoad);
window.addEventListener("unload", onUnload);
