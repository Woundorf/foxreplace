/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2009-2015 the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of either the GNU General Public License Version 2 or later (the "GPL"), or the GNU
 * Lesser General Public License Version 2.1 or later (the "LGPL"), in which case the provisions of the GPL or the LGPL are applicable instead of those above.
 * If you wish to allow use of your version of this file only under the terms of either the GPL or the LGPL, and not to allow others to use your version of this
 * file under the terms of the MPL, indicate your decision by deleting the provisions above and replace them with the notice and other provisions required by
 * the GPL or the LGPL. If you do not delete the provisions above, a recipient may use your version of this file under the terms of any one of the MPL, the GPL
 * or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

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
   * Reads a substitution list from aFilePath and returns a promise that fulfills with it.
   */
  readList: function(aFilePath) {
    if (!aFilePath) return Promise.resolve(null);

    let promise = OS.File.read(aFilePath, { encoding: "utf-8" });
    promise = promise.then(function onFulfilled(aString) {
      let listJSON = JSON.parse(aString);
      return substitutionListFromJSON(listJSON);
    }, function onRejected(aError) {
      prompts.alert("FoxReplace", getLocalizedString("io.readError", [aFilePath, aError]));
      return null;
    }).catch(function onRejected(aError) {
      prompts.alert("FoxReplace", getLocalizedString("io.jsonError.file", [aFilePath, aError]));
      return null;
    });

    return promise;
  },

  /**
   * Reads a substitution list from aUrl and returns a promise that fulfills with it.
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
      prompts.alert("FoxReplace", getLocalizedString("io.networkError", [aUrl, aError]));
      return null;
    }).catch(function onRejected(aError) {
      prompts.alert("FoxReplace", getLocalizedString("io.jsonError.url", [aUrl, aError]));
      return null;
    });

    return promise;
  },

  /**
   * Writes the given substitution list to aFilePath.
   */
  writeList: function(aSubstitutionList, aFilePath) {
    if (!aFilePath) return;

    let listJSON = substitutionListToJSON(aSubstitutionList);
    let string = JSON.stringify(listJSON, null, 2);
    let promise = OS.File.writeAtomic(aFilePath, string, { encoding: "utf-8" });
    promise = promise.catch(function onRejected(aError) {
      prompts.alert("FoxReplace", getLocalizedString("io.writeError", [aFilePath, aError]));
    });
  }

};
