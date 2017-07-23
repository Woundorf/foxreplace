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

const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

function startup(aData, aReason) {
  Cu.import("chrome://foxreplace/content/foxreplace.js");

  forEachOpenWindow(loadIntoWindow);

  Services.wm.addListener(WindowListener);

  aData.webExtension.startup().then(api => {
    const {browser} = api;
    browser.runtime.onConnect.addListener(port => {
      foxreplace.webExtensionPort = port;
      forEachOpenWindow(listenOnWebExtensionPort);
    });
    browser.runtime.onMessage.addListener(foxreplace.webExtensionMessageListener);
  });
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN) return;

  forEachOpenWindow(unloadFromWindow);

  Services.wm.removeListener(WindowListener);

  Cu.unload("chrome://foxreplace/content/foxreplace.js");

  // HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
  //               in order to fully update images and locales, their caches need clearing here
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}

let windows = {};

function loadIntoWindow(aWindow) {
  windows[aWindow] = new FoxReplace(aWindow);
}

function unloadFromWindow(aWindow) {
  windows[aWindow].onUnload();
  delete windows[aWindow];
}

function listenOnWebExtensionPort(aWindow) {
  windows[aWindow].listenOnWebExtensionPort();
}

// Apply a function to all open browser windows
function forEachOpenWindow(aFunction) {
  let windows = Services.wm.getEnumerator("navigator:browser");

  while (windows.hasMoreElements())
    aFunction(windows.getNext().QueryInterface(Ci.nsIDOMWindow));
}

let WindowListener = {

  onOpenWindow: function(aXulWindow) {
    let window = aXulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);
    function onWindowLoad() {
      window.removeEventListener("load", onWindowLoad);
      if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser")
        loadIntoWindow(window);
        listenOnWebExtensionPort(window);
    }
    window.addEventListener("load", onWindowLoad);
  },

  onCloseWindow: function(aXulWindow) {
  },

  onWindowTitleChange: function(aXulWindow, aNewTitle) {
  }

};
