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
 * Portions created by the Initial Developer are Copyright (C) 2007
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
 * Object to manage FoxReplace options.
 */
var foxreplaceOptions = {
  
  /**
   * Called when the options window is loaded. Loads the substitution list from
   * preferences and fills the listbox.
   */
  loadSubstitutionList: function() {
    this.substitutionListFromArray(foxreplaceIO.loadSubstitutionList());
  },
  
  /**
   * Called when there's a change in the listbox. Saves the substitution list to
   * preferences.
   */
  saveSubstitutionList: function() {
    return foxreplaceIO.saveSubstitutionList(this.substitutionListToArray());
  },
  
  /**
   * Adds a new substitution to the listbox.
   */
  addSubstitution: function() {
    var inputStringTextBox = document.getElementById("inputStringTextBox");
    var inputRegExpCheckBox = document.getElementById("inputRegExpCheckBox");
    var outputStringTextBox = document.getElementById("outputStringTextBox");
    var caseSensitiveCheckBox = document.getElementById("caseSensitiveCheckBox");
    var wholeWordsCheckBox = document.getElementById("wholeWordsCheckBox");
    
    var inputString = inputStringTextBox.value;
    var inputRegExp = inputRegExpCheckBox.checked;
    var outputString = outputStringTextBox.value;
    var caseSensitive = caseSensitiveCheckBox.checked;
    var wholeWords = wholeWordsCheckBox.checked;
    
    if (!inputString) return; // this should not happen
    
    try {
      new FxRSubstitution(inputString, outputString, caseSensitive, inputRegExp, wholeWords);
    }
    catch (se) {  // SyntaxError
      foxreplaceIO.promptService.alert(window, foxreplaceIO.strings.getString("regExpError"), se);
      return;
    }
    
    var newItem = document.createElement("listitem");
    
    var inputStringCell = document.createElement("listcell");
    inputStringCell.setAttribute("label", inputString);
    newItem.appendChild(inputStringCell);
    
    var inputRegExpCell = document.createElement("listcell");
    inputRegExpCell.setAttribute("label", foxreplaceIO.strings.getString(inputRegExp ? "yes" : "no"));
    newItem.appendChild(inputRegExpCell);
    
    var outputStringCell = document.createElement("listcell");
    outputStringCell.setAttribute("label", outputString);
    newItem.appendChild(outputStringCell);
    
    var caseSensitiveCell = document.createElement("listcell");
    caseSensitiveCell.setAttribute("label", foxreplaceIO.strings.getString(caseSensitive ? "yes" : "no"));
    newItem.appendChild(caseSensitiveCell);
    
    var wholeWordsCell = document.createElement("listcell");
    wholeWordsCell.setAttribute("label", foxreplaceIO.strings.getString(wholeWords ? "yes" : "no"));
    newItem.appendChild(wholeWordsCell);
    
    var substitutionListBox = document.getElementById("substitutionListBox");
    substitutionListBox.appendChild(newItem);
    
    // Clear fields
    inputStringTextBox.value = "";
    inputRegExpCheckBox.checked = false;
    outputStringTextBox.value = "";
    caseSensitiveCheckBox.checked = false;
    wholeWordsCheckBox.checked = false;
    
    // Set focus to input
    inputStringTextBox.focus();
    
    this.fireChangeEvent(substitutionListBox);
  },
  
  /**
   * Removes the selected substitution from the listbox.
   */
  deleteSubstitution: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var selectedIndex = substitutionListBox.selectedIndex;
    
    if (selectedIndex >= 0) {
      substitutionListBox.removeItemAt(selectedIndex);
      substitutionListBox.selectedIndex =
        Math.min(selectedIndex, substitutionListBox.getRowCount() - 1);
      
      this.fireChangeEvent(substitutionListBox);
    }
  },
  
  /**
   * Moves up the selected substitution.
   */
  moveUpSubstitution: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var selectedItem = substitutionListBox.selectedItem;
    
    if (selectedItem) {
      var previousItem = substitutionListBox.getPreviousItem(selectedItem, 1);
      
      if (previousItem) {
        substitutionListBox.removeChild(selectedItem);
        substitutionListBox.insertBefore(selectedItem, previousItem);
        substitutionListBox.selectedItem = selectedItem;
        
        this.fireChangeEvent(substitutionListBox);
      }
    }
  },
  
  /**
   * Moves down the selected substitution.
   */
  moveDownSubstitution: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var selectedItem = substitutionListBox.selectedItem;
    
    if (selectedItem) {
      var nextItem = substitutionListBox.getNextItem(selectedItem, 1);
      
      if (nextItem) {
        var nextNextItem = substitutionListBox.getNextItem(selectedItem, 2);
        
        substitutionListBox.removeChild(selectedItem);
        
        if (nextNextItem)
          substitutionListBox.insertBefore(selectedItem, nextNextItem);
        else
          substitutionListBox.appendChild(selectedItem);
        
        substitutionListBox.selectedItem = selectedItem;
        
        this.fireChangeEvent(substitutionListBox);
      }
    }
  },
  
  /**
   * Deletes all substitutions from the listbox.
   */
  clearSubstitutions: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var i = substitutionListBox.getRowCount() - 1;
    
    while (i >= 0) {
      substitutionListBox.removeItemAt(i);
      i--;
    }
    
    this.fireChangeEvent(substitutionListBox);
  },
  
  /**
   * Imports the substitution list from a file.
   */
  importSubstitutionList: function() {
    var substitutionList = foxreplaceIO.importSubstitutionList();
    
    if (substitutionList) {
      var params = { out: null };
      window.openDialog("chrome://foxreplace/content/appendoverwrite.xul","",
                        "chrome,titlebar,toolbar,centerscreen,modal", params);
      if (params.out) {
        this.substitutionListFromArray(substitutionList, params.out.button == "overwrite");
        
        this.fireChangeEvent(document.getElementById("substitutionListBox"));
      }
    }
  },
  
  /**
   * Exports the substitution list to a file.
   */
  exportSubstitutionList: function() {
    // pass the function (for deferred execution)
    foxreplaceIO.exportSubstitutionList(this.substitutionListToArray);
  },
  
  /**
   * Fills the listbox from an array of substitutions.
   */
  substitutionListFromArray: function(aSubstitutionList, aOverwrite) {
    var substitutionListBox = document.getElementById("substitutionListBox");
    
    if (aOverwrite) this.clearSubstitutions();
    
    var nSubstitutions = aSubstitutionList.length

    for (var i = 0; i < nSubstitutions; i++) {
      var substitution = aSubstitutionList[i];
      
      var newItem = document.createElement("listitem");
      
      var inputStringCell = document.createElement("listcell");
      inputStringCell.setAttribute("label", substitution.input);
      newItem.appendChild(inputStringCell);
      
      var inputRegExpCell = document.createElement("listcell");
      inputRegExpCell.setAttribute("label",
                                   foxreplaceIO.strings.getString(substitution.inputRegExp ? "yes" : "no"));
      newItem.appendChild(inputRegExpCell);
      
      var outputStringCell = document.createElement("listcell");
      outputStringCell.setAttribute("label", substitution.output);
      newItem.appendChild(outputStringCell);
      
      var caseSensitiveCell = document.createElement("listcell");
      caseSensitiveCell.setAttribute("label",
                                     foxreplaceIO.strings.getString(substitution.caseSensitive ? "yes" : "no"));
      newItem.appendChild(caseSensitiveCell);
      
      var wholeWordsCell = document.createElement("listcell");
      wholeWordsCell.setAttribute("label",
                                  foxreplaceIO.strings.getString(substitution.wholeWords ? "yes" : "no"));
      newItem.appendChild(wholeWordsCell);
      
      substitutionListBox.appendChild(newItem);
    }
  },
  
  /**
   * Fills an array of substitutions from the substitution list and returns it.
   */
  substitutionListToArray: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var substitutionList = [];
    var nSubstitutions = substitutionListBox.getRowCount();
    
    for (var i = 0; i < nSubstitutions; i++) {
      var substitution = substitutionListBox.getItemAtIndex(i).childNodes;
      var objSubstitution = new FxRSubstitution(
        substitution[0].getAttribute("label"),                                            // input
        substitution[2].getAttribute("label"),                                            // output
        substitution[3].getAttribute("label") == foxreplaceIO.strings.getString("yes"),   // case-sensitive
        substitution[1].getAttribute("label") == foxreplaceIO.strings.getString("yes"),   // reg exp
        substitution[4].getAttribute("label") == foxreplaceIO.strings.getString("yes"));  // whole words
      substitutionList.push(objSubstitution);
    }
    
    return substitutionList;
  },
  
  /**
   * Deletes the "dumbitem" (workaround for listbox height).
   */
  deleteDumbItem: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    
    if (document.getElementById("dumbitem"))
      substitutionListBox.removeItemAt(0);  // dumbitem is the first
  },
  
  /**
   * Fires a change event from the passed object.
   */
  fireChangeEvent: function(aObject) {
    var event = document.createEvent("Events");
    event.initEvent("change", true, true);
    aObject.dispatchEvent(event);
  }
  
};
