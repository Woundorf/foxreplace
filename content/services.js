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

const Cu = Components.utils;

Cu.import("chrome://foxreplace/content/strings.js");

/**
 * Easy access to some services.
 */

var EXPORTED_SYMBOLS = ["prompts", "getLocalizedString"];

var prompts = {

  /**
   * Returns the prompt service.
   */
  get service() {
    if (!this._service)
      this._service = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

    return this._service;
  },

  /**
   * Shows an alert.
   */
  alert: function(aTitle, aText) {
    this.service.alert(null, aTitle, aText);
  },

  /**
   * Shows a prompt without checkbox.
   */
  prompt: function(aTitle, aText, aValue) {
    return this.service.prompt(null, aTitle, aText, aValue, null, {});
  }

};

let strings = new LocalizedStrings("foxreplace.properties");

function getLocalizedString(aKey, aValues) {
  return strings.get(aKey, aValues);
}
