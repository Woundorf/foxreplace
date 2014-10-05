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
 * Portions created by the Initial Developer are Copyright (C) 2009-2014 the Initial Developer. All Rights Reserved.
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

/**
 * Functions for input/output.
 */

var EXPORTED_SYMBOLS = ["io"];

var io = {

  /**
   * Imports the substitution list from a file (selected by parameter or by a user in a dialog) and returns it.
   */
  importSubstitutionList: function(aFile) {
    if (!aFile) {
      var file = showFileDialog("import");

      if (!file) return null;
      else aFile = file;
    }

    var fileInputStream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    var converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream);
    fileInputStream.init(aFile, 0x01, 0444, 0); // read
    converterInputStream.init(fileInputStream, "UTF-8", 4096, 0x0000);

    var listString = "";
    var string = {};

    try {
      while (converterInputStream.readString(4096, string) > 0) listString += string.value;
    }
    catch (e) {
      converterInputStream.close();
      fileInputStream.close();

      prompts.alert(getLocalizedString("importTitle"), e);

      return null;
    }

    converterInputStream.close();
    fileInputStream.close();

    try {
      let listJSON = JSON.parse(listString);
      return substitutionListFromJSON(listJSON);
    }
    catch (e) {
      prompts.alert(getLocalizedString("jsonErrorTitle"), getLocalizedString("jsonErrorText") + "\n" + e);
      return null;
    }
  },

  /**
   * Imports the substitution list from an URL (selected by parameter or by an user in a dialog) and returns it.
   */
  importSubstitutionListFromUrl: function(aUrl) {
    if (!aUrl) {
      var input = { value: "" };

      if (!prompts.prompt(getLocalizedString("importFromUrlTitle"), getLocalizedString("importFromUrlText"), input)) return null;
      else aUrl = input.value;
    }

    if (!/https?\:\/\//.test(aUrl)) {
      prompts.alert(getLocalizedString("nonSupportedProtocol"), getLocalizedString("onlyHttp"));
      return null;
    }

    try {
      var request = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
      request.open("GET", aUrl, false);
      request.send(null);

      if (request.status == 200) {
        try {
          let listJSON = JSON.parse(request.responseText);
          return substitutionListFromJSON(listJSON);
        }
        catch(e) {
          prompts.alert(getLocalizedString("jsonErrorTitle"), getLocalizedString("jsonErrorText") + "\n" + e);
        }
      }
      else prompts.alert(getLocalizedString("httpError"), request.status + " " + request.statusText);
    }
    catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
      prompts.alert(getLocalizedString("cantConnectToServerTitle"),
                    getLocalizedString("cantConnectToServerText", [url]));
    }
    catch (e) {
      prompts.alert(getLocalizedString("unexpectedError"), e);
    }

    return null;
  },

  /**
   * Exports the given substitution list to a file (selected by parameter or by an user in a dialog).
   */
  exportSubstitutionList: function(aSubstitutionList, aFile) {
    if (!aFile) {
      var file = showFileDialog("export");

      if (!file) return;
      else aFile = file;
    }

    var listJSON = substitutionListToJSON(aSubstitutionList);
    var data = JSON.stringify(listJSON, null, 2);
    var fileOutputStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
    fileOutputStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0);  // write, create, truncate
    var converterOutputStream = Cc["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
    converterOutputStream.init(fileOutputStream, "UTF-8", 4096, 0x0000);

    try {
      converterOutputStream.writeString(data);
    }
    catch (e) {
      prompts.alert(getLocalizedString("exportTitle"), e);
    }
    finally {
      converterOutputStream.close();
      fileOutputStream.close();
    }
  }

};

/**
 * Shows the file dialog in the passed mode (import or export) and returns the file selected by the user.
 */
function showFileDialog(aMode) {
  var title = getLocalizedString(aMode == "import" ? "importTitle" : "exportTitle");

  try {
    const nsIFP = Ci.nsIFilePicker;
    var fileDialog = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFP);
    var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    var window = windowMediator.getMostRecentWindow("");
    fileDialog.init(window, title, aMode == "import" ? nsIFP.modeOpen : nsIFP.modeSave);
    fileDialog.appendFilter(getLocalizedString("jsonFiles"), "*.json");
    fileDialog.appendFilters(nsIFP.filterAll);
    fileDialog.filterIndex = 0;
    fileDialog.defaultExtension = ".json";
    fileDialog.defaultString = "FoxReplace.json";

    var ret = fileDialog.show();

    if (ret == nsIFP.returnOK || ret == nsIFP.returnReplace) return fileDialog.file;
  }
  catch (e) {
    prompts.alert(title, e);
  }

  return null;
}
