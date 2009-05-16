/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is
 * Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://foxreplace/defs.js");
Components.utils.import("resource://foxreplace/services.js");

/**
 * Functions for input/output.
 */

var EXPORTED_SYMBOLS = ["fxrIO"];

var fxrIO = {
  
  /**
   * Imports the substitution list from a file (selected by parameter or by an user in a dialog) and returns it.
   */
  importSubstitutionList: function(aFile) {
    if (!aFile) {
      var file = fxrShowFileDialog("import");
      
      if (!file) return;
      else aFile = file;
    }
    
    var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIFileInputStream);
    var converterInputStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                                         .createInstance(Components.interfaces.nsIConverterInputStream);
    fileInputStream.init(aFile, 0x01, 0444, 0); // read
    converterInputStream.init(fileInputStream, "UTF-8", 4096, 0x0000);
    
    var listXmlString = "";
    var string = {};
    
    try {
      while (converterInputStream.readString(4096, string) > 0) listXmlString += string.value;
    }
    catch (e) {
      converterInputStream.close();
      fileInputStream.close();
      
      prompts.alert(getLocalizedString("importTitle"), e);
      
      return;
    }
    
    converterInputStream.close();
    fileInputStream.close();
    
    try {
      var listXml = new XML(listXmlString);
      return fxrSubstitutionListFromXml(listXml);
    }
    catch (e) {
      prompts.alert(getLocalizedString("xmlErrorTitle"), getLocalizedString("xmlErrorText") + "\n" + e);
    }
  },
  
  /**
   * Imports the substitution list from an URL (selected by parameter or by an user in a dialog) and returns it.
   */
  importSubstitutionListFromUrl: function(aUrl) {
    if (!aUrl) {
      var input = { value: "" };
      
      if (!prompts.prompt(getLocalizedString("importFromUrlTitle"), getLocalizedString("importFromUrlText"), input))
        return;
      else aUrl = input.value;
    }
    
    if (!/https?\:\/\//.test(aUrl)) {
      prompts.alert(getLocalizedString("nonSupportedProtocol"), getLocalizedString("onlyHttp"));
      return;
    }
    
    try {
      var request = new XMLHttpRequest();
      request.open("GET", aUrl, false);
      request.send(null);
      
      if (request.status == 200) {
        try {
          var listXml = new XML(request.responseText.replace(/<\?.*\?>/, ""));
          return fxrSubstitutionListFromXml(listXml);
        }
        catch (e) {
          prompts.alert(getLocalizedString("xmlErrorTitle"), getLocalizedString("xmlErrorText") + "\n" + e);
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
  },
  
  /**
   * Exports the substitution list to a file (selected by parameter or by an user in a dialog). The parameter is a
   * function to get the substitution list that is called only if it's needed (it's not called if the user cancels the
   * export).
   */
  exportSubstitutionList: function(getSubstitutionList, aFile) {
    if (!aFile) {
      var file = fxrShowFileDialog("export");
      
      if (!file) return;
      else aFile = file;
    }
    
    var substitutionList = getSubstitutionList();
    var listXml = fxrSubstitutionListToXml(substitutionList);
    XML.prettyPrinting = true;
    var data = listXml.toString();
    var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                     .createInstance(Components.interfaces.nsIFileOutputStream);
    fileOutputStream.init(aFile, 0x02 | 0x08 | 0x20, 0666, 0);  // write, create, truncate
    var converterOutputStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                                          .createInstance(Components.interfaces.nsIConverterOutputStream);
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

////////////////////////////////////// Non-exported functions //////////////////////////////////////

/**
 * Shows the file dialog in the passed mode (import or export) and returns the file selected by the user.
 */
function fxrShowFileDialog(aMode) {
  var title = getLocalizedString(aMode == "import" ? "importTitle" : "exportTitle");
  
  try {
    const nsIFP = Components.interfaces.nsIFilePicker;
    var fileDialog = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFP);
    fileDialog.init(window, title, aMode == "import" ? nsIFP.modeOpen : nsIFP.modeSave);
    fileDialog.appendFilters(nsIFP.filterXML);
    fileDialog.appendFilters(nsIFP.filterAll);
    fileDialog.filterIndex = 0;
    fileDialog.defaultExtension = ".xml";
    fileDialog.defaultString = "FoxReplace.xml";
    
    var ret = fileDialog.show();
    
    if (ret == nsIFP.returnOK || ret == nsIFP.returnReplace) return fileDialog.file;
  }
  catch (e) {
    prompts.alert(title, e);
  }
  
  return null;
}
