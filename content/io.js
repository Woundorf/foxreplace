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
 * Portions created by the Initial Developer are Copyright (C) 2007-2008
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

/**
 * Object that centralizes all input/output features.
 */
var foxreplaceIO = {
  
  /**
   * Preferences object.
   */
  _prefs: null,
  
  /**
   * Returns preferences object.
   */
  get prefs() {
    if (!this._prefs) {
      this._prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService)
                              .getBranch("extensions.foxreplace.");
      this._prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
    }
    
    return this._prefs;
  },
  
  /**
   * Strings from the string bundle set (from the properties file).
   */
  _strings: null,
  
  /**
   * Returns strings from the string bundle set (from the properties file).
   */
  get strings() {
    if (!this._strings)
      this._strings = document.getElementById("fxrStrings");
    
    return this._strings;
  },
  
  /**
   * The prompt service.
   */
  _promptService: null,
  
  /**
   * Returns the prompt service.
   */
  get promptService() {
    if (!this._promptService) {
      this._promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                      .getService(Components.interfaces.nsIPromptService);
    }
    
    return this._promptService;
  },
  
  /**
   * Loads substitution list from preferences and returns it.
   */
  loadSubstitutionList: function() {
    var substitutionList = [];
    var listString = this.prefs.getComplexValue("substitutionList",
                                                Components.interfaces.nsISupportsString).data;
    
    if (listString != "") {
      var substitutions = listString.split("|-|");
      var nSubstitutions = substitutions.length;
      
      for (var i = 0; i < nSubstitutions; i++) {
        var substitution = substitutions[i].split("<->");
        try {
          var objSubstitution = new FxROldSubstitution(this.decode(substitution[0]),
                                                    this.decode(substitution[1]),
                                                    Boolean(parseInt(substitution[2])),
                                                    Boolean(parseInt(substitution[3])),
                                                    Boolean(parseInt(substitution[4])));
          substitutionList.push(objSubstitution);
        }
        catch (se) {  // SyntaxError
          this.promptService.alert(window,
                                   foxreplaceIO.strings.getString("regExpError"),
                                   substitution[0] + "\n" + se);
        }
      }
    }
    
    return substitutionList;
  },
  
  /**
   * Loads substitution list in XML from preferences and returns it.
   */
  loadSubstitutionListXml: function() {
    // falta la conversió des de l'altre la primera vegada
    var substitutionList = [];
    var listXmlString = this.prefs.getComplexValue("substitutionListXml", Components.interfaces.nsISupportsString).data;
    var listXml = new XML(listXmlString);
    
    for each (var group in listXml.group) {
      // falta comprovació d'errors
      substitutionList.push(FxRSubstitutionGroup.fromXml(group));
    }
    
    return substitutionList;
  },
  
  /**
   * Returns substitution list encoded as a string to save to preferences.
   */
  saveSubstitutionList: function(aSubstitutionList) {
    var listString = Components.classes["@mozilla.org/supports-string;1"]
                               .createInstance(Components.interfaces.nsISupportsString);
    listString.data = "";
    
    var nSubstitutions = aSubstitutionList.length;
    
    for (var i = 0; i < nSubstitutions; i++) {
      var substitution = aSubstitutionList[i];
      var substitutionString = Components.classes["@mozilla.org/supports-string;1"]
                                         .createInstance(Components.interfaces.nsISupportsString);
      substitutionString.data = this.encode(substitution.input)
                              + "<->"
                              + this.encode(substitution.output)
                              + "<->"
                              + (substitution.caseSensitive ? "1" : "0")
                              + "<->"
                              + (substitution.inputRegExp ? "1" : "0")
                              + "<->"
                              + (substitution.wholeWords ? "1" : "0");
      
      if (listString.data == "") listString.data = substitutionString.data;
      else listString.data += "|-|" + substitutionString.data;
    }
    
    /////////////
    this.saveSubstitutionListXml(this.oldSubstitutionListToNew(aSubstitutionList));
    /////////////
    
    return listString;
  },
  
  /**
   * Returns substitution list in XML encoded as a string to save to preferences.
   */
  saveSubstitutionListXml: function(aSubstitutionList) {
    var listXmlString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    var listXml = <substitutionlist/>;
    
    var nSubstitutions = aSubstitutionList.length;
    
    for (var i = 0; i < nSubstitutions; i++) {
      listXml.appendChild(aSubstitutionList[i].toXml());
    }
    
    XML.prettyPrinting = false;
    listXmlString.data = listXml.toString();
    XML.prettyPrinting = true;
    
    /////////////
    //this.prefs.setComplexValue("substitutionListXml", Components.interfaces.nsISupportsString, listXmlString);
    /////////////
    
    return listXmlString;
  },
  
  /**
   * Loads auto-replace on load setting from preferences and returns it.
   */
  loadAutoReplaceOnLoad: function() {
    return this.prefs.getBoolPref("autoReplaceOnLoad");
  },
  
  /**
   * Saves auto-replace on load setting to preferences.
   */
  saveAutoReplaceOnLoad: function(aAutoReplaceOnLoad) {
    this.prefs.setBoolPref("autoReplaceOnLoad", aAutoReplaceOnLoad);
  },
  
  /**
   * Loads replace URLs setting from preferences and returns it.
   */
  loadReplaceUrls: function() {
    return this.prefs.getBoolPref("replaceUrls");
  },
  
  /**
   * Saves replace URLs setting to preferences.
   */
  saveReplaceUrls: function(aReplaceUrls) {
    this.prefs.setBoolPref("replaceUrls", aReplaceUrls);
  },
  
  /**
   * Imports the substitution list from a file (shows a file dialog to the
   * user) and returns it.
   */
  importSubstitutionList: function() {
    var file = this.showFileDialog("import");
    if (!file) return;
    
    var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIFileInputStream);
    fileInputStream.init(file, 0x01, 0444, 0);  // read
    fileInputStream.QueryInterface(Components.interfaces.nsILineInputStream);
    
    var line = {}, hasMore;
    var substitutionList = [];
    
    do {
      hasMore = fileInputStream.readLine(line);
      var substitution = line.value.split("<->");
      try {
        var objSubstitution = new FxROldSubstitution(this.decode(substitution[0]),
                                                  this.decode(substitution[1]),
                                                  Boolean(parseInt(substitution[2])),
                                                  Boolean(parseInt(substitution[3])),
                                                  Boolean(parseInt(substitution[4])));
        substitutionList.push(objSubstitution);
      }
      catch (se) {  // SyntaxError
        this.promptService.alert(window,
                                 foxreplaceIO.strings.getString("regExpError"),
                                 substitution[0] + "\n" + se);
      }
    } while (hasMore);
    
    fileInputStream.close();
    
    return substitutionList;
  },
  
  /**
   * Imports the substitution list in XML from a file (shows a file dialog to the
   * user) and returns it.
   */
  importSubstitutionListXml: function() {
    var file = this.showFileDialog("import", true);
    if (!file) return;
    
    var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    var converterInputStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                                         .createInstance(Components.interfaces.nsIConverterInputStream);
    fileInputStream.init(file, 0x01, 0444, 0);  // read
    converterInputStream.init(fileInputStream, "UTF-8", 4096, 0x0000);
    
    var listXmlString = "";
    var string = {};
    
    while (converterInputStream.readString(4096, string) > 0) { // atenció: pot llançar excepció
      listXmlString += string.value;
    }
    
    converterInputStream.close();
    fileInputStream.close();
    
    var listXml = new XML(listXmlString);
    var substitutionList = [];
    
    for each (var group in listXml.group) {
      // falta comprovació d'errors
      substitutionList.push(FxRSubstitutionGroup.fromXml(group));
    }
    
    return substitutionList;
  },
  
  /**
   * Exports the substitution list to a file (shows a file dialog to the user).
   * The parameter is a function to get the substitution list that is called
   * only if it's needed (it's not called if the user cancels the export).
   */
  exportSubstitutionList: function(getSubstitutionList) {
    var file = this.showFileDialog("export");
    if (!file) return;
    
    var substitutionList = getSubstitutionList();
    var data = "";
    
    for (var i = 0; i < substitutionList.length; i++) {
      var substitution = substitutionList[i];
      var substitutionString = this.encode(substitution.input)
                             + "<->"
                             + this.encode(substitution.output)
                             + "<->"
                             + (substitution.caseSensitive ? "1" : "0")
                             + "<->"
                             + (substitution.inputRegExp ? "1" : "0")
                             + "<->"
                             + (substitution.wholeWords ? "1" : "0");
      data += substitutionString + "\n";
    }
    
    var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                     .createInstance(Components.interfaces.nsIFileOutputStream);
    // write, create, truncate
    fileOutputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    fileOutputStream.write(data, data.length);
    fileOutputStream.close();
  },
  
  /**
   * Exports the substitution list in XML to a file (shows a file dialog to the user).
   * The parameter is a function to get the substitution list that is called
   * only if it's needed (it's not called if the user cancels the export).
   */
  exportSubstitutionListXml: function(getSubstitutionList) {
    var file = this.showFileDialog("export", true);
    if (!file) return;
    
    var substitutionList = getSubstitutionList();
    var listXml = <substitutionlist/>;
    
    var nSubstitutions = substitutionList.length;
    
    for (var i = 0; i < nSubstitutions; i++) listXml.appendChild(substitutionList[i].toXml());
    
    var data = listXml.toString();
    var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                     .createInstance(Components.interfaces.nsIFileOutputStream);
    // write, create, truncate
    fileOutputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    var converterOutputStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                                          .createInstance(Components.interfaces.nsIConverterOutputStream);
    converterOutputStream.init(fileOutputStream, "UTF-8", 4096, 0x0000);
    converterOutputStream.writeString(data);  // atenció: pot llançar una excepció
    converterOutputStream.close();
    fileOutputStream.close();
  },
  
  /**
   * Converts special characters (%, \n, \r, <, >, |) in a string to %XX format. Returns the encoded string.
   */
  encode: function(aString) {
    return aString.replace("%", "%25", "g").replace("\n", "%0A", "g").replace("\r", "%0D", "g")
                  .replace("<", "%3C", "g").replace(">", "%3E", "g").replace("|", "%7C", "g");
  },
  
  /**
   * Converts characters in a string in %XX format to the real characters.
   * Returns the decoded string.
   */
  decode: function(aString) {
    return unescape(aString);
  },
  
  /**
   * Shows the file dialog in the passed mode (import or export) and returns the
   * file selected by the user.
   */
  showFileDialog: function(aMode, aXml) {
    var title = this.strings.getString(aMode == "import" ? "importTitle" : "exportTitle");
    
    try {
      const nsIFP = Components.interfaces.nsIFilePicker;
      var fileDialog = Components.classes["@mozilla.org/filepicker;1"]
                                 .createInstance(nsIFP);
      fileDialog.init(window, title, aMode == "import" ? nsIFP.modeOpen : nsIFP.modeSave);
      fileDialog.appendFilters(aXml ? nsIFP.filterXML : nsIFP.filterText);
      fileDialog.appendFilters(nsIFP.filterAll);
      fileDialog.filterIndex = 0;
      fileDialog.defaultExtension = aXml ? ".xml" : ".txt";
      fileDialog.defaultString = aXml ? "FoxReplace.xml" : "FoxReplace.txt";
      
      var ret = fileDialog.show();
      
      if (ret == nsIFP.returnOK || ret == nsIFP.returnReplace)
        return fileDialog.file;
    }
    catch (e) {
      this.promptService.alert(window, title, e);
    }
    
    return null;
  },
  
  /**
   * Converts the substitution list from the old format to the new.
   */
  oldSubstitutionListToNew: function(aOldSubstitutionList) {
    var substitutions = aOldSubstitutionList.map(FxRSubstitution.fromOldSubstitution, FxRSubstitution);
    return [new FxRSubstitutionGroup([], substitutions)];
  }
  
};
