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
  /* HACK: The string bundle cache is cleared on addon shutdown, however it doesn't appear to do so reliably.
     Errors can erratically happen on next load of the same file in certain instances. (at minimum, when strings are added/removed)
     The apparently accepted solution to reliably load new versions is to always create bundles with a unique URL so as to bypass the cache.
     This is accomplished by passing a random number in a parameter after a '?'. (this random ID is otherwise ignored)
     The loaded string bundle is still cached on startup and should still be cleared out of the cache on addon shutdown.
     This just bypasses the built-in cache for repeated loads of the same path so that a newly installed update loads cleanly. */
  this.stringBundle = Services.strings.createBundle("chrome://foxreplace/locale/" + aPropertiesFile + "?" + Math.random());
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
