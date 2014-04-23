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
 * Portions created by the Initial Developer are Copyright (C) 2008-2014 the Initial Developer. All Rights Reserved.
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

/**
 * Object to manage the substitution group editor.
 */
var foxreplaceSubstitutionGroupEditor = {

  core: {},

  /**
   * Easy access to most used controls.
   */
  get _nameTextBox() { return document.getElementById("nameTextBox"); },
  get _urlsListBox() { return document.getElementById("urlsListBox"); },
  get _substitutionsListBox() { return document.getElementById("substitutionsListBox"); },
  get _htmlButton() { return document.getElementById("htmlButton"); },
  get _enabledCheckBox() { return document.getElementById("enabledCheckBox"); },
  get _urlTextBox() { return document.getElementById("urlTextBox"); },
  get _inputStringTextBox() { return document.getElementById("inputStringTextBox"); },
  get _outputStringTextBox() { return document.getElementById("outputStringTextBox"); },
  get _tooltip() { return document.getElementById("tooltip"); },
  get _disclosureButton() { return document.getElementById("foxreplaceDialogSubstitutionGroupEditor").getButton("disclosure"); },

  /**
   * Fills the listboxes.
   */
  onLoad: function() {
    if (window.arguments[0]["in"]) {
      var group = window.arguments[0]["in"].group;

      this._nameTextBox.value = group.name;
      for (var i = 0; i < group.urls.length; i++) this.addUrl(group.urls[i]);
      for (var i = 0; i < group.substitutions.length; i++) this.addSubstitution(group.substitutions[i]);
      this._htmlButton.html = group.html;
      this._enabledCheckBox.checked = group.enabled;
    }
  },

  /**
   * Adds a new URL to the URLs listbox. It can be aUrl or taken from the URL textbox.
   */
  addUrl: function(aUrl) {
    if (this._urlsListBox.disabled) return;

    var url = aUrl || this._urlTextBox.value;

    if (!url) return; // this shouldn't happen

    var urlItem = this._urlsListBox.appendItem(url);
    urlItem.ondblclick = function() { foxreplaceSubstitutionGroupEditor.startEditUrl(); }

    if (this.core.fxrIsExclusionUrl(url)) urlItem.setAttribute("class", "exclusionUrl");

    if (!aUrl) {
      this._urlTextBox.value = "";
      this._urlTextBox.focus();
      document.getElementById("addUrlButton").disabled = true;
    }

    document.getElementById("clearUrlsButton").disabled = false;
  },

  /**
   * Deletes the selected URL from the URLs listbox.
   */
  deleteUrl: function() {
    if (this._urlsListBox.disabled) return;

    var selectedIndex = this._urlsListBox.selectedIndex;

    if (selectedIndex >= 0) {
      this._urlsListBox.removeItemAt(selectedIndex);
      this._urlsListBox.selectedIndex = Math.min(selectedIndex, this._urlsListBox.getRowCount() - 1);

      if (this._urlsListBox.getRowCount() == 0) document.getElementById("clearUrlsButton").disabled = true;
    }
  },

  /**
   * Deletes all URLs from the URLs listbox.
   */
  clearUrls: function() {
    if (this._urlsListBox.disabled) return;

    var i = this._urlsListBox.getRowCount() - 1;

    while (i >= 0) {
      this._urlsListBox.removeItemAt(i);
      i--;
    }

    document.getElementById("clearUrlsButton").disabled = true;
  },

  /**
   * Starts to edit the selected URL.
   */
  startEditUrl: function() {
    if (this._urlsListBox.disabled) return;

    var urlItem = this._urlsListBox.selectedItem;

    if (urlItem) {
      this._urlTextBox.value = urlItem.label;
      document.getElementById("addUrlButton").hidden = true;
      document.getElementById("okEditUrlButton").hidden = false;
      document.getElementById("cancelEditUrlButton").hidden = false;
      this.disableUrlsListBox(true);
      this._urlTextBox.focus();
    }
  },

  /**
   * Confirms the edit to the selected URL.
   */
  okEditUrl: function() {
    if (!this._urlsListBox.disabled) return;

    var urlItem = this._urlsListBox.selectedItem;

    if (!this._urlTextBox.value) return;  // this shouldn't happen

    urlItem.label = this._urlTextBox.value;
    this._urlTextBox.value = "";
    document.getElementById("addUrlButton").disabled = true;
    document.getElementById("addUrlButton").hidden = false;
    document.getElementById("okEditUrlButton").hidden = true;
    document.getElementById("cancelEditUrlButton").hidden = true;
    this.disableUrlsListBox(false);
    this._urlsListBox.focus();
  },

  /**
   * Cancels the edit to the selected URL.
   */
  cancelEditUrl: function() {
    if (!this._urlsListBox.disabled) return;

    this._urlTextBox.value = "";
    document.getElementById("addUrlButton").disabled = true;
    document.getElementById("addUrlButton").hidden = false;
    document.getElementById("okEditUrlButton").hidden = true;
    document.getElementById("cancelEditUrlButton").hidden = true;
    this.disableUrlsListBox(false);
    this._urlsListBox.focus();
  },

  /**
   * Sets the disabled property of the URLs listbox and related controls to aBoolean.
   */
  disableUrlsListBox: function(aBoolean) {
    this._urlsListBox.disabled = aBoolean;
    document.getElementById("editUrlButton").disabled = aBoolean;
    document.getElementById("deleteUrlButton").disabled = aBoolean;
    document.getElementById("clearUrlsButton").disabled = aBoolean;
  },

  /**
   * Enables or disables some buttons when an URL item is selected or deselected.
   */
  onSelectUrl: function() {
    if (this._urlsListBox.selectedItem) {
      document.getElementById("editUrlButton").disabled = false;
      document.getElementById("deleteUrlButton").disabled = false;
    }
    else {
      document.getElementById("editUrlButton").disabled = true;
      document.getElementById("deleteUrlButton").disabled = true;
    }
  },

  /**
   * Changes default actions of return and escape keys when focus is on the URL textbox.
   */
  onUrlKeyPress: function(aEvent) {
    if (!this._urlsListBox.disabled) {
      if (aEvent.keyCode == aEvent.DOM_VK_RETURN) {
        this.addUrl();
        aEvent.preventDefault();
      }
    }
    else {
      if (aEvent.keyCode == aEvent.DOM_VK_RETURN) {
        this.okEditUrl();
        aEvent.preventDefault();
      }
      else if (aEvent.keyCode == aEvent.DOM_VK_ESCAPE) {
        this.cancelEditUrl();
        aEvent.preventDefault();
      }
    }
  },

  /**
   * Enables or disables some buttons when the URL textbox changes.
   */
  onUrlInput: function() {
    var empty = this._urlTextBox.value == "";
    document.getElementById("addUrlButton").disabled = empty;
    document.getElementById("okEditUrlButton").disabled = empty;
  },

  /**
   * Adds a new substitution to the substitutions listbox. It can be aSubstitution or taken from the substitution controls.
   */
  addSubstitution: function(aSubstitution) {
    if (this._substitutionsListBox.disabled) return;

    var caseSensitiveCheckBox = document.getElementById("caseSensitiveCheckBox");

    var inputString = aSubstitution ? aSubstitution.input : this._inputStringTextBox.value;
    var inputType = aSubstitution ? aSubstitution.inputType : this._inputStringTextBox.inputType;
    var outputString = aSubstitution ? aSubstitution.output : this._outputStringTextBox.value;
    var caseSensitive = aSubstitution ? aSubstitution.caseSensitive : caseSensitiveCheckBox.checked;

    if (!inputString) return; // this shouldn't happen

    var substitution;

    if (aSubstitution) substitution = aSubstitution;
    else {
      try {
        substitution = new this.core.Substitution(inputString, outputString, caseSensitive, inputType);
      }
      catch (se) {  // SyntaxError
        this.prompts.alert(this.getLocalizedString("regExpError"), se);
        return;
      }
    }

    var substitutionItem = document.createElement("listitem");
    substitutionItem.substitution = substitution;
    substitutionItem.ondblclick = function() { foxreplaceSubstitutionGroupEditor.startEditSubstitution(); }

    var inputStringCell = document.createElement("listcell");
    inputStringCell.setAttribute("label", inputString);
    substitutionItem.appendChild(inputStringCell);

    var inputTypeCell = document.createElement("listcell");
    inputTypeCell.setAttribute("label", this.getLocalizedString(this.core.Substitution.prototype.INPUT_TYPE_STRINGS[inputType]));
    substitutionItem.appendChild(inputTypeCell);

    var outputStringCell = document.createElement("listcell");
    outputStringCell.setAttribute("label", outputString);
    substitutionItem.appendChild(outputStringCell);

    var caseSensitiveCell = document.createElement("listcell");
    caseSensitiveCell.setAttribute("label", this.getLocalizedString(caseSensitive ? "yes" : "no"));
    substitutionItem.appendChild(caseSensitiveCell);

    this._substitutionsListBox.appendChild(substitutionItem);

    if (!aSubstitution) {
      // Clear fields
      this._inputStringTextBox.value = "";
      this._outputStringTextBox.value = "";
      caseSensitiveCheckBox.checked = false;

      // Set focus to input
      this._inputStringTextBox.focus();
      document.getElementById("addSubstitutionButton").disabled = true;
    }

    document.getElementById("clearSubstitutionsButton").disabled = false;
  },

  /**
   * Moves up the selected substitution.
   */
  moveUpSubstitution: function() {
    if (this._substitutionsListBox.disabled) return;

    var selectedItem = this._substitutionsListBox.selectedItem;

    if (selectedItem) {
      var previousItem = this._substitutionsListBox.getPreviousItem(selectedItem, 1);

      if (previousItem) {
        this._substitutionsListBox.removeChild(selectedItem);
        this._substitutionsListBox.insertBefore(selectedItem, previousItem);
        this._substitutionsListBox.selectedItem = selectedItem;
      }
    }
  },

  /**
   * Moves down the selected substitution.
   */
  moveDownSubstitution: function() {
    if (this._substitutionsListBox.disabled) return;

    var selectedItem = this._substitutionsListBox.selectedItem;

    if (selectedItem) {
      var nextItem = this._substitutionsListBox.getNextItem(selectedItem, 1);

      if (nextItem) {
        var nextNextItem = this._substitutionsListBox.getNextItem(selectedItem, 2);

        this._substitutionsListBox.removeChild(selectedItem);

        if (nextNextItem)
          this._substitutionsListBox.insertBefore(selectedItem, nextNextItem);
        else
          this._substitutionsListBox.appendChild(selectedItem);

        this._substitutionsListBox.selectedItem = selectedItem;
      }
    }
  },

  /**
   * Removes the selected substitution from the substitutions listbox.
   */
  deleteSubstitution: function() {
    if (this._substitutionsListBox.disabled) return;

    var selectedIndex = this._substitutionsListBox.selectedIndex;

    if (selectedIndex >= 0) {
      this._substitutionsListBox.removeItemAt(selectedIndex);
      this._substitutionsListBox.selectedIndex = Math.min(selectedIndex, this._substitutionsListBox.getRowCount() - 1);

      if (this._substitutionsListBox.getRowCount() == 0) document.getElementById("clearSubstitutionsButton").disabled = true;
    }
  },

  /**
   * Deletes all substitutions from the substitutions listbox.
   */
  clearSubstitutions: function() {
    if (this._substitutionsListBox.disabled) return;

    var i = this._substitutionsListBox.getRowCount() - 1;

    while (i >= 0) {
      this._substitutionsListBox.removeItemAt(i);
      i--;
    }

    document.getElementById("clearSubstitutionsButton").disabled = true;
  },

  /**
   * Starts to edit the selected substitution.
   */
  startEditSubstitution: function() {
    if (this._substitutionsListBox.disabled) return;

    var substitutionItem = this._substitutionsListBox.selectedItem;

    if (substitutionItem) {
      var substitution = substitutionItem.substitution;
      var caseSensitiveCheckBox = document.getElementById("caseSensitiveCheckBox");
      this._inputStringTextBox.value = substitution.input;
      this._inputStringTextBox.inputType = substitution.inputType
      this._outputStringTextBox.value = substitution.output;
      caseSensitiveCheckBox.checked = substitution.caseSensitive;
      document.getElementById("addSubstitutionButton").hidden = true;
      document.getElementById("okEditSubstitutionButton").hidden = false;
      document.getElementById("cancelEditSubstitutionButton").hidden = false;
      this.disableSubstitutionsListBox(true);
      this._inputStringTextBox.focus();
    }
  },

  /**
   * Confirms the edit to the selected substitution.
   */
  okEditSubstitution: function() {
    if (!this._substitutionsListBox.disabled) return;

    var caseSensitiveCheckBox = document.getElementById("caseSensitiveCheckBox");

    var inputString = this._inputStringTextBox.value;
    var inputType = this._inputStringTextBox.inputType;
    var outputString = this._outputStringTextBox.value;
    var caseSensitive = caseSensitiveCheckBox.checked;

    if (!inputString) return; // this shouldn't happen

    var substitution;

    try {
      substitution = new this.core.Substitution(inputString, outputString, caseSensitive, inputType);
    }
    catch (se) {  // SyntaxError
      this.prompts.alert(this.getLocalizedString("regExpError"), se);
      return;
    }

    var substitutionItem = this._substitutionsListBox.selectedItem;
    substitutionItem.substitution = substitution;
    substitutionItem.childNodes[0].setAttribute("label", inputString);
    substitutionItem.childNodes[1].setAttribute("label", this.getLocalizedString(this.core.Substitution.prototype.INPUT_TYPE_STRINGS[inputType]));
    substitutionItem.childNodes[2].setAttribute("label", outputString);
    substitutionItem.childNodes[3].setAttribute("label", this.getLocalizedString(caseSensitive ? "yes" : "no"));

    // Clear fields
    this._inputStringTextBox.value = "";
    this._outputStringTextBox.value = "";
    caseSensitiveCheckBox.checked = false;

    document.getElementById("addSubstitutionButton").disabled = true;
    document.getElementById("addSubstitutionButton").hidden = false;
    document.getElementById("okEditSubstitutionButton").hidden = true;
    document.getElementById("cancelEditSubstitutionButton").hidden = true;
    this.disableSubstitutionsListBox(false);
    this._substitutionsListBox.focus();
  },

  /**
   * Cancels the edit to the selected substitution.
   */
  cancelEditSubstitution: function() {
    if (!this._substitutionsListBox.disabled) return;

    // Clear fields
    this._inputStringTextBox.value = "";
    this._outputStringTextBox.value = "";
    document.getElementById("caseSensitiveCheckBox").checked = false;

    document.getElementById("addSubstitutionButton").disabled = true;
    document.getElementById("addSubstitutionButton").hidden = false;
    document.getElementById("okEditSubstitutionButton").hidden = true;
    document.getElementById("cancelEditSubstitutionButton").hidden = true;
    this.disableSubstitutionsListBox(false);
    this._substitutionsListBox.focus();
  },

  /**
   * Sets the disabled property of the substitutions listbox and related controls to aBoolean.
   */
  disableSubstitutionsListBox: function(aBoolean) {
    this._substitutionsListBox.disabled = aBoolean;
    document.getElementById("moveUpSubstitutionButton").disabled = aBoolean;
    document.getElementById("moveDownSubstitutionButton").disabled = aBoolean;
    document.getElementById("editSubstitutionButton").disabled = aBoolean;
    document.getElementById("deleteSubstitutionButton").disabled = aBoolean;
    document.getElementById("clearSubstitutionsButton").disabled = aBoolean;
  },

  /**
   * Enables or disables some buttons when a substitution item is selected or deselected.
   */
  onSelectSubstitution: function() {
    if (this._substitutionsListBox.selectedItem) {
      document.getElementById("moveUpSubstitutionButton").disabled = false;
      document.getElementById("moveDownSubstitutionButton").disabled = false;
      document.getElementById("editSubstitutionButton").disabled = false;
      document.getElementById("deleteSubstitutionButton").disabled = false;
    }
    else {
      document.getElementById("moveUpSubstitutionButton").disabled = true;
      document.getElementById("moveDownSubstitutionButton").disabled = true;
      document.getElementById("editSubstitutionButton").disabled = true;
      document.getElementById("deleteSubstitutionButton").disabled = true;
    }
  },

  /**
   * Changes default actions of return and escape keys when focus is on a substitution control.
   */
  onSubstitutionKeyPress: function(aEvent) {
    if (!this._substitutionsListBox.disabled) {
      if (aEvent.keyCode == aEvent.DOM_VK_RETURN) {
        this.addSubstitution();
        aEvent.preventDefault();
      }
    }
    else {
      if (aEvent.keyCode == aEvent.DOM_VK_RETURN) {
        this.okEditSubstitution();
        aEvent.preventDefault();
      }
      else if (aEvent.keyCode == aEvent.DOM_VK_ESCAPE) {
        this.cancelEditSubstitution();
        aEvent.preventDefault();
      }
    }
  },

  /**
   * Enables or disables some buttons when the substitution input textbox changes.
   */
  onSubstitutionInput: function() {
    var empty = this._inputStringTextBox.value == "";
    document.getElementById("addSubstitutionButton").disabled = empty;
    document.getElementById("okEditSubstitutionButton").disabled = empty;
  },

  /**
   * If everything is correct puts the edited substitution group in the out argument and returns.
   */
  onAccept: function () {
    // Check for uncommitted changes in URLs (not added, or edited but not confirmed) and commit them automatically
    if (this._urlTextBox.value != "") {
      // Call both methods to commit either type of change
      this.addUrl();
      this.okEditUrl();
    }

    // Check for uncommitted changes in substitutions (not added, or edited but not confirmed) and commit them automatically
    if (this._inputStringTextBox.value != "") {
      // Call both methods to commit either type of change
      this.addSubstitution();
      this.okEditSubstitution();
    }

    var nSubstitutions = this._substitutionsListBox.getRowCount();

    if (nSubstitutions == 0) {
      this.prompts.alert(this.getLocalizedString("noSubstitutionsTitle"), this.getLocalizedString("noSubstitutionsDescription"));
      return false;
    }

    var substitutions = new Array(nSubstitutions);

    for (var i = 0; i < nSubstitutions; i++) substitutions[i] = this._substitutionsListBox.getItemAtIndex(i).substitution;

    var nUrls = this._urlsListBox.getRowCount();
    var urls = new Array(nUrls);

    for (var i = 0; i < nUrls; i++) urls[i] = this._urlsListBox.getItemAtIndex(i).label;

    let html = this._htmlButton.html;
    let name = this._nameTextBox.value;
    let enabled = this._enabledCheckBox.checked;

    var group = new this.core.SubstitutionGroup(name, urls, substitutions, html, enabled);

    window.arguments[0].out = { group: group };

    return true;
  },
  
  /**
   * Shows the tooltip with additional information.
   */
  showTooltip: function() {
    this._tooltip.openPopup(this._disclosureButton);
  }

};

Components.utils.import("resource://foxreplace/core.js", foxreplaceSubstitutionGroupEditor.core);
Components.utils.import("resource://foxreplace/services.js", foxreplaceSubstitutionGroupEditor);
