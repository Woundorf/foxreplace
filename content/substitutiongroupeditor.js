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
 * Portions created by the Initial Developer are Copyright (C) 2008
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
 * ...
 */
var foxreplaceSubstitutionGroupEditor = {
  
  onLoad: function() {
    this.deleteDumbItems();
    
    if (window.arguments[0]["in"]) {
      var group = window.arguments[0]["in"].group;
      
      for (var i = 0; i < group.urls.length; i++) this.addUrl(group.urls[i]);
      for (var i = 0; i < group.substitutions.length; i++) this.addSubstitution(group.substitutions[i]);
    }
  },
  
  addUrl: function(aUrl) {
    var urlTextBox = document.getElementById("urlTextBox");
    var url = aUrl || urlTextBox.value;
    
    if (!url) return; // this shouldn't happen
    
    document.getElementById("urlsListBox").appendItem(url);
    
    if (!aUrl) {
      urlTextBox.value = "";
      urlTextBox.focus();
    }
  },
  
  deleteUrl: function() {
    var urlsListBox = document.getElementById("urlsListBox");
    var selectedIndex = urlsListBox.selectedIndex;
    
    if (selectedIndex >= 0) {
      urlsListBox.removeItemAt(selectedIndex);
      urlsListBox.selectedIndex = Math.min(selectedIndex, urlsListBox.getRowCount() - 1);
    }
  },
  
  clearUrls: function() {
    var urlsListBox = document.getElementById("urlsListBox");
    var i = urlsListBox.getRowCount() - 1;
    
    while (i >= 0) {
      urlsListBox.removeItemAt(i);
      i--;
    }
  },
  
  /**
   * Adds a new substitution to the listbox.
   */
  addSubstitution: function(aSubstitution) {
    var inputStringTextBox = document.getElementById("inputStringTextBox");
    var outputStringTextBox = document.getElementById("outputStringTextBox");
    var caseSensitiveCheckBox = document.getElementById("caseSensitiveCheckBox");
    
    var inputString = aSubstitution ? aSubstitution.input : inputStringTextBox.value;
    var inputType = aSubstitution ? aSubstitution.inputType : inputStringTextBox.inputType;
    var outputString = aSubstitution ? aSubstitution.output : outputStringTextBox.value;
    var caseSensitive = aSubstitution ? aSubstitution.caseSensitive : caseSensitiveCheckBox.checked;
    
    if (!inputString) return; // this shouldn't happen
    
    var substitution;
    
    if (aSubstitution) substitution = aSubstitution;
    else {
      try {
        substitution = new FxRSubstitution(inputString, outputString, caseSensitive, inputType);
      }
      catch (se) {  // SyntaxError
        foxreplaceIO.promptService.alert(window, foxreplaceIO.strings.getString("regExpError"), se);
        return;
      }
    }
    
    var substitutionItem = document.createElement("listitem");
    substitutionItem.substitution = substitution;
    
    var inputStringCell = document.createElement("listcell");
    inputStringCell.setAttribute("label", inputString);
    substitutionItem.appendChild(inputStringCell);
    
    var inputTypeCell = document.createElement("listcell");
    inputTypeCell.setAttribute("label", foxreplaceIO.strings.getString(FxRSubstitution.prototype.INPUT_TYPE_STRINGS[inputType]));
    substitutionItem.appendChild(inputTypeCell);
    
    var outputStringCell = document.createElement("listcell");
    outputStringCell.setAttribute("label", outputString);
    substitutionItem.appendChild(outputStringCell);
    
    var caseSensitiveCell = document.createElement("listcell");
    caseSensitiveCell.setAttribute("label", foxreplaceIO.strings.getString(caseSensitive ? "yes" : "no"));
    substitutionItem.appendChild(caseSensitiveCell);
    
    var substitutionsListBox = document.getElementById("substitutionsListBox");
    substitutionsListBox.appendChild(substitutionItem);
    
    if (!aSubstitution) {
      // Clear fields
      inputStringTextBox.value = "";
      outputStringTextBox.value = "";
      caseSensitiveCheckBox.checked = false;
      
      // Set focus to input
      inputStringTextBox.focus();
    }
  },
  
  /**
   * Moves up the selected substitution.
   */
  moveUpSubstitution: function() {
    var substitutionsListBox = document.getElementById("substitutionsListBox");
    var selectedItem = substitutionsListBox.selectedItem;
    
    if (selectedItem) {
      var previousItem = substitutionsListBox.getPreviousItem(selectedItem, 1);
      
      if (previousItem) {
        substitutionsListBox.removeChild(selectedItem);
        substitutionsListBox.insertBefore(selectedItem, previousItem);
        substitutionsListBox.selectedItem = selectedItem;
      }
    }
  },
  
  /**
   * Moves down the selected substitution.
   */
  moveDownSubstitution: function() {
    var substitutionsListBox = document.getElementById("substitutionsListBox");
    var selectedItem = substitutionsListBox.selectedItem;
    
    if (selectedItem) {
      var nextItem = substitutionsListBox.getNextItem(selectedItem, 1);
      
      if (nextItem) {
        var nextNextItem = substitutionsListBox.getNextItem(selectedItem, 2);
        
        substitutionsListBox.removeChild(selectedItem);
        
        if (nextNextItem)
          substitutionsListBox.insertBefore(selectedItem, nextNextItem);
        else
          substitutionsListBox.appendChild(selectedItem);
        
        substitutionsListBox.selectedItem = selectedItem;
      }
    }
  },
  
  /**
   * Removes the selected substitution from the listbox.
   */
  deleteSubstitution: function() {
    var substitutionsListBox = document.getElementById("substitutionsListBox");
    var selectedIndex = substitutionsListBox.selectedIndex;
    
    if (selectedIndex >= 0) {
      substitutionsListBox.removeItemAt(selectedIndex);
      substitutionsListBox.selectedIndex = Math.min(selectedIndex, substitutionsListBox.getRowCount() - 1);
    }
  },
    
  /**
   * Deletes all substitutions from the listbox.
   */
  clearSubstitutions: function() {
    var substitutionsListBox = document.getElementById("substitutionsListBox");
    var i = substitutionsListBox.getRowCount() - 1;
    
    while (i >= 0) {
      substitutionsListBox.removeItemAt(i);
      i--;
    }
  },
  
  /**
   * Deletes the "dumbitem" (workaround for listbox height).
   */
  deleteDumbItems: function() {
    if (document.getElementById("urlDumbItem"))
      document.getElementById("urlsListBox").removeItemAt(0); // urlDumbItem is the first
    
    if (document.getElementById("substitutionDumbItem"))
      document.getElementById("substitutionsListBox").removeItemAt(0);  // urlDumbItem is the first
  },
  
  onAccept: function () {
    var substitutionsListBox = document.getElementById("substitutionsListBox");
    var nSubstitutions = substitutionsListBox.getRowCount();
    
    if (nSubstitutions == 0) {
      foxreplaceIO.promptService.alert(window,
                                       foxreplaceIO.strings.getString("noSubstitutionsTitle"),
                                       foxreplaceIO.strings.getString("noSubstitutionsDescription"));
      
      return false;
    }
    
    var substitutions = new Array(nSubstitutions);
    
    for (var i = 0; i < nSubstitutions; i++) substitutions[i] = substitutionsListBox.getItemAtIndex(i).substitution;
    
    var urlsListBox = document.getElementById("urlsListBox");
    var nUrls = urlsListBox.getRowCount();
    var urls = new Array(nUrls);
    
    for (var i = 0; i < nUrls; i++) urls[i] = urlsListBox.getItemAtIndex(i).getAttribute("label");
    
    var group = new FxRSubstitutionGroup(urls, substitutions);
    
    window.arguments[0].out = { group: group };
    
    return true;
  }
  
};
