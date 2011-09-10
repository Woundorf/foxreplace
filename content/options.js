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
 * Portions created by the Initial Developer are Copyright (C) 2007-2011
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
   * Called when the options window is loaded. Loads the substitution list in XML from preferences and fills the listbox.
   */
  loadSubstitutionListXml: function() {
    this.substitutionListFromArray(this.prefs.substitutionListXml);
  },
  
  /**
   * Called when there's a change in the listbox. Saves the substitution list in XML to preferences.
   */
  saveSubstitutionListXml: function() {
    return this.prefs.substitutionListToXmlString(this.substitutionListToArray());
  },
  
  /**
   * Adds a new substitution group to the listbox.
   */
  addSubstitutionGroup: function() {
    var params = {};
    
    window.openDialog("chrome://foxreplace/content/substitutiongroupeditor.xul", "",
                      "chrome,titlebar,toolbar,centerscreen,modal", params);
    
    if (params.out) {
      var substitutionGroup = params.out.group;
      var substitutionListBox = document.getElementById("substitutionListBox");
      
      this.createListItemForSubstitutionGroup(substitutionGroup);
      
      this.fireChangeEvent(substitutionListBox);
    }
  },
  
  /**
   * Shows the dialog to edit the selected substitution group in the listbox.
   */
  editSubstitutionGroup: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var selectedItem = substitutionListBox.selectedItem;
    if (!selectedItem) return;
    var params = { "in": { group: selectedItem.substitutionGroup } };
    
    window.openDialog("chrome://foxreplace/content/substitutiongroupeditor.xul", "",
                      "chrome,titlebar,toolbar,centerscreen,modal", params);
    
    if (params.out) {
      var substitutionGroup = params.out.group;
      
      this.editListItemForSubstitutionGroup(selectedItem, substitutionGroup);
      
      this.fireChangeEvent(substitutionListBox);
    }
  },
  
  /**
   * Removes the selected substitution group from the listbox.
   */
  deleteSubstitutionGroup: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var selectedIndex = substitutionListBox.selectedIndex;
    
    if (selectedIndex >= 0) {
      substitutionListBox.removeItemAt(selectedIndex);
      substitutionListBox.selectedIndex = Math.min(selectedIndex, substitutionListBox.getRowCount() - 1);
      
      if (substitutionListBox.getRowCount() == 0) document.getElementById("clearButton").disabled = true;
      
      this.fireChangeEvent(substitutionListBox);
    }
  },
  
  /**
   * Deletes all substitution groups from the listbox.
   */
  clearSubstitutionGroups: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var i = substitutionListBox.getRowCount() - 1;
    
    while (i >= 0) {
      substitutionListBox.removeItemAt(i);
      i--;
    }
    
    document.getElementById("clearButton").disabled = true;
    
    this.fireChangeEvent(substitutionListBox);
  },
  
  /**
   * Moves up the selected substitution group.
   */
  moveUpSubstitutionGroup: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var selectedItem = substitutionListBox.selectedItem;
    var selectedIndex = substitutionListBox.selectedIndex;
    
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
   * Moves down the selected substitution group.
   */
  moveDownSubstitutionGroup: function() {
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
   * Imports the substitution list from a file.
   */
  importSubstitutionList: function() {
    var substitutionList = fxrIO.importSubstitutionList();
    
    if (substitutionList) {
      var params = {};
      window.openDialog("chrome://foxreplace/content/appendoverwrite.xul", "",
                        "chrome,titlebar,toolbar,centerscreen,modal", params);
      
      if (params.out) {
        this.substitutionListFromArray(substitutionList, params.out.button == "overwrite");
        
        this.fireChangeEvent(document.getElementById("substitutionListBox"));
      }
    }
  },
  
  /**
   * Imports the substitution list from an URL.
   */
  importSubstitutionListFromUrl: function() {
    var substitutionList = fxrIO.importSubstitutionListFromUrl();
    
    if (substitutionList) {
      var params = {};
      window.openDialog("chrome://foxreplace/content/appendoverwrite.xul", "",
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
    fxrIO.exportSubstitutionList(this.substitutionListToArray);
  },
  
  /**
   * Enables or disables some buttons when an substitution group item is selected or deselected.
   */
  onSelectSubstitutionGroup: function() {
    if (document.getElementById("substitutionListBox").selectedItem) {
      document.getElementById("editButton").disabled = false;
      document.getElementById("deleteButton").disabled = false;
      document.getElementById("moveUpButton").disabled = false;
      document.getElementById("moveDownButton").disabled = false;
    }
    else {
      document.getElementById("editButton").disabled = true;
      document.getElementById("deleteButton").disabled = true;
      document.getElementById("moveUpButton").disabled = true;
      document.getElementById("moveDownButton").disabled = true;
    }
  },
  
  /**
   * Fills the listbox from an array of substitutions.
   */
  substitutionListFromArray: function(aSubstitutionList, aOverwrite) {
    if (aOverwrite) this.clearSubstitutionGroups();
    
    var nSubstitutions = aSubstitutionList.length

    for (var i = 0; i < nSubstitutions; i++) this.createListItemForSubstitutionGroup(aSubstitutionList[i]);
  },
  
  /**
   * Fills an array of substitutions from the substitution list and returns it.
   */
  substitutionListToArray: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    var nSubstitutions = substitutionListBox.getRowCount();
    var substitutionList = new Array(nSubstitutions);
    
    for (var i = 0; i < nSubstitutions; i++) {
      var substitutionGroup = substitutionListBox.getItemAtIndex(i).substitutionGroup;
      substitutionList[i] = substitutionGroup;
    }
    
    return substitutionList;
  },
  
  /**
   * Deletes the "dumbItem" (workaround for listbox height).
   */
  deleteDumbItem: function() {
    var substitutionListBox = document.getElementById("substitutionListBox");
    
    if (document.getElementById("dumbItem")) substitutionListBox.removeItemAt(0); // dumbItem is the first
  },
  
  /**
   * Fires a change event from the passed object.
   */
  fireChangeEvent: function(aObject) {
    var event = document.createEvent("Events");
    event.initEvent("change", true, true);
    aObject.dispatchEvent(event);
  },
  
  /**
   * Creates a new list item in the listbox given a substitution group.
   */
  createListItemForSubstitutionGroup: function(aSubstitutionGroup) {
    const MAX_LABELS = 2;
    
    var groupItem = document.createElement("listitem");
    groupItem.setAttribute("ondblclick", "foxreplaceOptions.editSubstitutionGroup();");
    groupItem.substitutionGroup = aSubstitutionGroup;
    
    var urlsCell = document.createElement("listcell");
    urlsCell.align = "start";
    urlsCell.orient = "vertical";
    
    var nUrls = aSubstitutionGroup.urls.length;
    
    for (var i = 0; i < nUrls && i < MAX_LABELS; i++) {
      var ellipsis = i == MAX_LABELS - 1 && i < nUrls - 1;
      var urlLabel = document.createElement("label");
      urlLabel.setAttribute("value", ellipsis ? "..." : aSubstitutionGroup.urls[i]);
      if (fxrIsExclusionUrl(aSubstitutionGroup.urls[i])) urlLabel.setAttribute("class", "exclusionUrl");
      urlsCell.appendChild(urlLabel);
    }
    
    groupItem.appendChild(urlsCell);
    
    var inputsCell = document.createElement("listcell");
    inputsCell.align = "start";
    inputsCell.orient = "vertical";
    var outputsCell = document.createElement("listcell");
    outputsCell.align = "start";
    outputsCell.orient = "vertical";
    
    var nSubstitutions = aSubstitutionGroup.substitutions.length;
    
    for (var i = 0; i < nSubstitutions && i < MAX_LABELS; i++) {
      var ellipsis = i == MAX_LABELS - 1 && i < nSubstitutions - 1;
      var inputLabel = document.createElement("label");
      inputLabel.setAttribute("value", ellipsis ? "..." : aSubstitutionGroup.substitutions[i].input);
      inputsCell.appendChild(inputLabel);
      var outputLabel = document.createElement("label");
      outputLabel.setAttribute("value", ellipsis ? "..." : aSubstitutionGroup.substitutions[i].output);
      outputsCell.appendChild(outputLabel);
    }
    
    groupItem.appendChild(inputsCell);
    groupItem.appendChild(outputsCell);
    
    var htmlCell = document.createElement("listcell");
    htmlCell.setAttribute("label", this.getLocalizedString(aSubstitutionGroup.html ? "yes" : "no"));
    groupItem.appendChild(htmlCell);
    
    document.getElementById("substitutionListBox").appendChild(groupItem);
    
    document.getElementById("clearButton").disabled = false;
  },
  
  /**
   * Edits a list item in the listbox to represent a new substitution group.
   */
  editListItemForSubstitutionGroup: function(aListItem, aSubstitutionGroup) {
    const MAX_LABELS = 2;
    
    aListItem.substitutionGroup = aSubstitutionGroup;
    
    var urlsCell = aListItem.firstChild;
    
    while (urlsCell.hasChildNodes()) urlsCell.removeChild(urlsCell.firstChild);
    
    var nUrls = aSubstitutionGroup.urls.length;
    
    for (var i = 0; i < nUrls && i < MAX_LABELS; i++) {
      var ellipsis = i == MAX_LABELS - 1 && i < nUrls - 1;
      var urlLabel = document.createElement("label");
      urlLabel.setAttribute("value", ellipsis ? "..." : aSubstitutionGroup.urls[i]);
      if (fxrIsExclusionUrl(aSubstitutionGroup.urls[i])) urlLabel.setAttribute("class", "exclusionUrl");
      urlsCell.appendChild(urlLabel);
    }
    
    var inputsCell = urlsCell.nextSibling;
    var outputsCell = inputsCell.nextSibling;
    
    while (inputsCell.hasChildNodes()) {
      inputsCell.removeChild(inputsCell.firstChild);
      outputsCell.removeChild(outputsCell.firstChild);
    }
    
    var nSubstitutions = aSubstitutionGroup.substitutions.length;
    
    for (var i = 0; i < nSubstitutions && i < MAX_LABELS; i++) {
      var ellipsis = i == MAX_LABELS - 1 && i < nSubstitutions - 1;
      var inputLabel = document.createElement("label");
      inputLabel.setAttribute("value", ellipsis ? "..." : aSubstitutionGroup.substitutions[i].input);
      inputsCell.appendChild(inputLabel);
      var outputLabel = document.createElement("label");
      outputLabel.setAttribute("value", ellipsis ? "..." : aSubstitutionGroup.substitutions[i].output);
      outputsCell.appendChild(outputLabel);
    }
    
    var htmlCell = outputsCell.nextSibling;
    htmlCell.setAttribute("label", this.getLocalizedString(aSubstitutionGroup.html ? "yes" : "no"));
  },
  
  updateSubscriptionStatus: function() {
    document.getElementById("subscriptionStatusTextBox").setAttribute("value", fxrSubscription.status);
  }
  
};

const Cu = Components.utils;

Cu.import("resource://foxreplace/defs.js");
Cu.import("resource://foxreplace/io.js");
Cu.import("resource://foxreplace/Observers.js", foxreplaceOptions);
Cu.import("resource://foxreplace/prefs.js", foxreplaceOptions);
Cu.import("resource://foxreplace/services.js", foxreplaceOptions);
Cu.import("resource://foxreplace/subscription.js");

window.addEventListener("load",
                        function() {
                          foxreplaceOptions.Observers.add("fxrSubscriptionStatusChanged", foxreplaceOptions.updateSubscriptionStatus, foxreplaceOptions);
                          foxreplaceOptions.updateSubscriptionStatus();
                        },
                        false);
window.addEventListener("unload",
                        function() {
                          foxreplaceOptions.Observers.remove("fxrSubscriptionStatusChanged", foxreplaceOptions.updateSubscriptionStatus, foxreplaceOptions);
                        },
                        false);
