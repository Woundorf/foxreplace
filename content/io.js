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
    if (!this._promptService)
      this._promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    
    return this._promptService;
  },
  
  /**
   * Shows an alert using the prompt service.
   */
  alert: function(aTitle, aText) {
    this.promptService.alert(window, aTitle, aText);
  },
  
  /**
   * Loads the substitution list from preferences and returns it.
   */
  loadSubstitutionList: function() {
    var substitutionList = [];
    var listString = this.prefs.getComplexValue("substitutionList", Components.interfaces.nsISupportsString).data;
    
    if (listString != "") {
      var substitutions = listString.split("|-|");
      var nSubstitutions = substitutions.length;
      
      for (var i = 0; i < nSubstitutions; i++) {
        var substitution = substitutions[i].split("<->");
        
        try {
          var objSubstitution = new FxRSubstitution07(this.decode(substitution[0]),
                                                      this.decode(substitution[1]),
                                                      Boolean(parseInt(substitution[2])),
                                                      Boolean(parseInt(substitution[3])),
                                                      Boolean(parseInt(substitution[4])));
          substitutionList.push(objSubstitution);
        }
        catch (se) {  // SyntaxError
          this.alert(this.strings.getString("regExpError"), substitution[0] + "\n" + se);
        }
      }
    }
    
    return substitutionList;
  },
  
  /**
   * Loads the substitution list in XML from preferences and returns it.
   */
  loadSubstitutionListXml: function() {
    this.upgradePreferencesFrom07To08();  // upgrade if necessary
    
    var listXmlString = this.prefs.getComplexValue("substitutionListXml", Components.interfaces.nsISupportsString).data;
    
    return this.substitutionListFromXml(listXmlString);
  },
  
  /**
   * Returns substitution list in XML encoded as a string to save to preferences.
   */
  saveSubstitutionListXml: function(aSubstitutionList) {
    var listXml = this.substitutionListToXml(aSubstitutionList);
    var listXmlString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    XML.prettyPrinting = false;
    listXmlString.data = listXml.toString();
    
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
   * Imports the substitution list from aFile and returns it.
   */
  importSubstitutionList: function(aFile) {
    var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    fileInputStream.init(aFile, 0x01, 0444, 0);  // read
    fileInputStream.QueryInterface(Components.interfaces.nsILineInputStream);
    
    var line = {}, hasMore;
    var substitutionList = [];
    
    do {
      hasMore = fileInputStream.readLine(line);
      var substitution = line.value.split("<->");
      
      try {
        var objSubstitution = new FxRSubstitution07(this.decode(substitution[0]),
                                                    this.decode(substitution[1]),
                                                    Boolean(parseInt(substitution[2])),
                                                    Boolean(parseInt(substitution[3])),
                                                    Boolean(parseInt(substitution[4])));
        substitutionList.push(objSubstitution);
      }
      catch (se) {  // SyntaxError
        this.alert(this.strings.getString("regExpError"), substitution[0] + "\n" + se);
      }
    } while (hasMore);
    
    fileInputStream.close();
    
    return substitutionList;
  },
  
  /**
   * Imports the substitution list in XML from a file (shows a file dialog to the user) and returns it.
   */
  importSubstitutionListXml: function() {
    var file = this.showFileDialog("import");
    if (!file) return;
    
    if (/.*\.txt/i.test(file.leafName)) return this.substitutionList07To08(this.importSubstitutionList(file));
    
    var fileInputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    var converterInputStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
                                         .createInstance(Components.interfaces.nsIConverterInputStream);
    fileInputStream.init(file, 0x01, 0444, 0);  // read
    converterInputStream.init(fileInputStream, "UTF-8", 4096, 0x0000);
    
    var listXmlString = "";
    var string = {};
    
    try {
      while (converterInputStream.readString(4096, string) > 0) listXmlString += string.value;
    }
    catch (e) {
      converterInputStream.close();
      fileInputStream.close();
      
      this.alert(this.getStrings("importTitle"), e);
      
      return [];
    }
    
    converterInputStream.close();
    fileInputStream.close();
    
    return this.substitutionListFromXml(listXmlString);
  },
  
  /**
   * Exports the substitution list in XML to a file (shows a file dialog to the user). The parameter is a function to get the substitution list
   * that is called only if it's needed (it's not called if the user cancels the export).
   */
  exportSubstitutionListXml: function(getSubstitutionList) {
    var file = this.showFileDialog("export");
    if (!file) return;
    
    var substitutionList = getSubstitutionList();
    var listXml = this.substitutionListToXml(substitutionList);
    XML.prettyPrinting = true;
    var data = listXml.toString();
    var fileOutputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                     .createInstance(Components.interfaces.nsIFileOutputStream);
    // write, create, truncate
    fileOutputStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
    var converterOutputStream = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
                                          .createInstance(Components.interfaces.nsIConverterOutputStream);
    converterOutputStream.init(fileOutputStream, "UTF-8", 4096, 0x0000);
    
    try {
      converterOutputStream.writeString(data);
    }
    catch (e) {
      this.alert(this.strings.getString.("exportTitle"), e);
    }
    finally {
      converterOutputStream.close();
      fileOutputStream.close();
    }
  },
  
  /**
   * Converts characters in a string in %XX format to the real characters.
   * Returns the decoded string.
   */
  decode: function(aString) {
    return unescape(aString);
  },
  
  /**
   * Shows the file dialog in the passed mode (import or export) and returns the file selected by the user.
   */
  showFileDialog: function(aMode) {
    var title = this.strings.getString(aMode == "import" ? "importTitle" : "exportTitle");
    
    try {
      const nsIFP = Components.interfaces.nsIFilePicker;
      var fileDialog = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFP);
      fileDialog.init(window, title, aMode == "import" ? nsIFP.modeOpen : nsIFP.modeSave);
      fileDialog.appendFilters(nsIFP.filterXML)
      if (aMode == "import") fileDialog.appendFilters(nsIFP.filterText);
      fileDialog.appendFilters(nsIFP.filterAll);
      fileDialog.filterIndex = 0;
      fileDialog.defaultExtension = ".xml";
      fileDialog.defaultString = "FoxReplace.xml";
      
      var ret = fileDialog.show();
      
      if (ret == nsIFP.returnOK || ret == nsIFP.returnReplace)
        return fileDialog.file;
    }
    catch (e) {
      this.alert(title, e);
    }
    
    return null;
  },
  
  /**
   * Upgrades the substitution list from format in 0.7 to format in 0.8.
   */
  upgradePreferencesFrom07To08: function() {
    // check if exists a substitution list in the old format
    if (this.prefs.prefHasUserValue("substitutionList")) {
      // load the old list, convert it to the new format, save the new and delete the old
      var oldSubstitutionList = this.loadSubstitutionList();
      var newSubstitutionList = this.substitutionList07To08(oldSubstitutionList);
      var newListXmlString = this.saveSubstitutionListXml(newSubstitutionList);
      this.prefs.setComplexValue("substitutionListXml", Components.interfaces.nsISupportsString, newListXmlString);
      this.prefs.clearUserPref("substitutionList");
    }
  },
  
  /**
   * Converts the substitution list from the old format to the new.
   */
  substitutionList07To08: function(aSubstitutionList07) {
    var substitutions = aSubstitutionList07.map(FxRSubstitution.fromSubstitution07, FxRSubstitution);
    return [new FxRSubstitutionGroup([], substitutions)];
  },
  
  /**
   * Creates the substitution list from an XML string.
   */
  substitutionListFromXml: function(aXmlString) {
    var substitutionList = [];
    
    try {
      var listXml = new XML(aXmlString);
      var noExclusions = listXml.@version == "0.8";
      
      for each (var group in listXml.group) substitutionList.push(FxRSubstitutionGroup.fromXml(group, noExclusions));
    }
    catch (e) {
      this.alert(this.strings.getString("xmlErrorTitle"), this.strings.getString("xmlErrorText") + "\n" + e);
    }
    
    return substitutionList;
  },
  
  /**
   * Creates an XML object from the substitution list.
   */
  substitutionListToXml: function(aSubstitutionList) {
    var listXml = <substitutionlist version="0.10"/>;
    
    var nSubstitutions = aSubstitutionList.length;
    
    for (var i = 0; i < nSubstitutions; i++) listXml.appendChild(aSubstitutionList[i].toXml());
    
    return listXml;
  }
  
};
