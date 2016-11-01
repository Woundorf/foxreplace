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

Cu.import("resource://gre/modules/Services.jsm");

/**
 * Defines a function to get localized strings.
 */

var EXPORTED_SYMBOLS = ["LocalizedStrings"];

/**
 * Creates a LocalizedStrings object referencing the given aProperties file in the locale folder.
 */
function LocalizedStrings(aPropertiesFile) {
  this.stringBundle = Services.strings.createBundle("chrome://foxreplace/locale/" + aPropertiesFile);
}

LocalizedStrings.prototype = {

  /**
   * Returns the localized string with the key aKey and with aValues as arguments if any.
   */
  get: function(aKey, aValues) {
    if (!aValues) return this.stringBundle.GetStringFromName(aKey);
    else return this.stringBundle.formatStringFromName(aKey, aValues, aValues.length);
  }

};
