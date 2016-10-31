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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://foxreplace/core.js");
Cu.import("resource://foxreplace/services.js");
Cu.import("resource://gre/modules/osfile.jsm");

/**
 * Functions for input/output.
 */

var EXPORTED_SYMBOLS = ["io"];

var io = {

  /**
   * Reads a substitution list from aFilePath and returns a promise that fulfills with it or rejects with an error message.
   */
  readList: function(aFilePath) {
    if (!aFilePath) return Promise.resolve(null);

    let promise = OS.File.read(aFilePath, { encoding: "utf-8" });
    promise = promise.then(function onFulfilled(aString) {
      let listJSON = JSON.parse(aString);
      return substitutionListFromJSON(listJSON);
    }, function onRejected(aError) {
      throw getLocalizedString("io.readError", [aFilePath, aError]);
    }).catch(function onRejected(aError) {
      if (aError instanceof Error) throw getLocalizedString("io.jsonError.file", [aFilePath, aError]);
      else throw aError;
    });

    return promise;
  },

  /**
   * Reads a substitution list from aUrl and returns a promise that fulfills with it or rejects with an error message.
   */
  readListFromUrl: function(aUrl) {
    if (!aUrl) return Promise.resolve(null);

    let promise = new Promise(function(resolve, reject) {
      let request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
      request.open("GET", aUrl);

      request.onload = function() {
        if (request.status == 200) resolve(request.responseText);
        else reject(Error(request.status + " " + request.statusText));
      };

      request.onerror = function(e) {
        reject(Error(getLocalizedString("io.networkError.generic")));
      };

      request.send();
    });

    promise = promise.then(function onFulfilled(aString) {
      let listJSON = JSON.parse(aString);
      return substitutionListFromJSON(listJSON);
    }, function onRejected(aError) {
      throw getLocalizedString("io.networkError", [aUrl, aError]);
    }).catch(function onRejected(aError) {
      if (aError instanceof Error) throw getLocalizedString("io.jsonError.url", [aUrl, aError]);
      else throw aError;
    });

    return promise;
  },

  /**
   * Writes the given substitution list to aFilePath and returns a promise that fulfills with an undefined value or rejects with an error message.
   */
  writeList: function(aSubstitutionList, aFilePath) {
    if (!aFilePath) return Promise.resolve();

    let listJSON = substitutionListToJSON(aSubstitutionList);
    let string = JSON.stringify(listJSON, null, 2);
    let promise = OS.File.writeAtomic(aFilePath, string, { encoding: "utf-8" });
    promise = promise.catch(function onRejected(aError) {
      throw getLocalizedString("io.writeError", [aFilePath, aError]);
    });

    return promise;
  }

};
