/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2019 Marc Ruiz Altisent. All rights reserved.
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

/**
 * Substitution group editor.
 */
var groupEditor = (() => {

  /**
   *  Characters to replace by entities to show them in the grid.
   */
  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
    ' ': '&nbsp;'
  };

  let adjustedUrlsColumnWidths = false;
  let adjustedSubstitutionsColumnWidths = false;

  /**
   *  Returns the given string with special characters replaced by entities.
   */
  function escapeHtml(string) {
    return String(string).replace(/[&<>"'`=\/ ]/g, function (s) {
      return entityMap[s];
    });
  }

  /**
   *  Returns true if the row defined by params is the last row and false otherwise.
   */
  function isLastRow(params) {
    let rowIndex = params.rowIndex;
    let rowModel = params.api && params.api.getModel() || params.rowModel;
    return rowIndex == rowModel.getRowCount() - 1;
  }

  /**
   *  Validates that the given params contains a valid substitution (mainly that it isn't a RegExp with a syntax error).
   */
  function validateSubstitution(params) {
    try {
      new Substitution(params.data.input, params.data.output, params.data.caseSensitive, params.data.inputType);
      if (params.node.error) {
        delete params.node.error;
        params.api.refreshCells({ rowNodes: [params.node], force: true });
      }
    }
    catch (e) {
      params.node.error = e;
      params.api.refreshCells({ rowNodes: [params.node], force: true });
    }
  }

  /**
   *  Options for the URLs grid.
   */
  var urlsGridOptions = {

    headerHeight: 0,
    rowSelection: "single",
    stopEditingWhenGridLosesFocus: true,

    columnDefs: [
      {
        field: "url",
        editable: true,
        cellClassRules: {
          placeholder(params) {
            return params.value === "";
          },
          exclusionUrl(params) {
            return isExclusionUrl(params.data.url);
          }
        },
        cellRenderer(params) {
          return params.value === "" ? browser.i18n.getMessage("list.urlHint") : params.value;
        }//,
        //onCellValueChanged(params) {
        //  // TODO to use this instead of onCellEditingStopped change params.value -> params.newValue and params.rowIndex -> params.node.rowIndex
        //}
      },
      {
        field: "url",
        width: 40,
        cellRenderer: DeleteButtonCellRenderer,
        suppressSizeToFit: true
      }
    ],

    onCellEditingStopped(params) {
      let isLast = isLastRow(params);
      let isEmpty = params.value === "";

      if (!isLast && isEmpty) {
        params.api.updateRowData({ remove: [params.data] });
      }
      else if (isLast && !isEmpty && !editor.currentlySearchingUrls()) {
        params.api.updateRowData({ add: [{ url: "" }] });
      }

      // TODO si s'ha fet enter i no (és l'últim i el deixem buit) -> focus a la fila següent
    },

    onCellFocused(params) {
      if (params.rowIndex === null) return; // Safety check needed in ag-Grid 14.2.0
      this.api.getModel().getRow(params.rowIndex).setSelected(true);
    }

  };

  /**
   *  Options for the substitutions grid.
   */
  var substitutionsGridOptions = {

    enableColResize: true,
    //enableSorting: true,
    //enableFilter: true,
    editType: "fullRow",
    rowSelection: "single",
    stopEditingWhenGridLosesFocus: true,

    defaultColDef: {
      editable: true,
      cellClassRules: {
        placeholder(params) {
          return params.data.input === "";
        },
        error(params) {
          return params.node.error;
        }
      }
    },

    columnDefs: [
      {
        headerName: browser.i18n.getMessage("list.inputHeader"),
        field: "input",
        cellRenderer(params) {
          let text = params.value === "" ? browser.i18n.getMessage("list.inputHint") : escapeHtml(params.value);
          if (params.node.error) text += ` <i class="warning sign icon" title="${params.node.error}"></i>`;
          return text;
        }
      },
      {
        headerName: browser.i18n.getMessage("list.inputTypeHeader"),
        field: "inputType",
        cellRenderer(params) {  // TODO improve (less hardcoding)
          switch (Number(params.value)) {
            case 0: return browser.i18n.getMessage("inputType.text");
            case 1: return browser.i18n.getMessage("inputType.wholeWords");
            case 2: return browser.i18n.getMessage("inputType.regExp");
            default: return params.value;
          }
        },
        cellEditor: InputTypeEditor
      },
      {
        headerName: browser.i18n.getMessage("list.outputHeader"),
        field: "output",
        cellRenderer(params) {
          return params.data.input === "" ? browser.i18n.getMessage("list.outputHint") : escapeHtml(params.value);
        }
      },
      {
        headerName: browser.i18n.getMessage("list.caseSensitiveHeader"),
        field: "caseSensitive",
        cellRenderer(params) {
          return params.value ? browser.i18n.getMessage("yes") : browser.i18n.getMessage("no");
        },
        cellEditor: CheckboxCellEditor
      },
      {
        headerName: "",
        field: "input",
        width: 40,
        cellRenderer: DeleteButtonCellRenderer,
        suppressSizeToFit: true,
        editable: false
      }
    ],

    onRowEditingStopped(params) {
      let isLast = isLastRow(params);
      let isEmpty = params.data.input === "";

      if (!isLast && isEmpty) {
        params.api.updateRowData({ remove: [params.data] });
      }
      else if (isLast && !isEmpty && !editor.currentlySearchingSubstitutions()) {
        params.api.updateRowData({ add: [{ input: "", inputType: 0, output: "", caseSensitive: false }] });
      }

      if (!isEmpty) validateSubstitution(params);

      // TODO si s'ha fet enter i no (és l'últim i el deixem buit) -> focus a la fila següent
    },

    onCellFocused(params) {
      if (params.rowIndex === null) return; // Safety check needed in ag-Grid 14.2.0
      this.api.getModel().getRow(params.rowIndex).setSelected(true);
    },

    tabToNextCell(params) {
      if (params.editing && params.nextCellDef == null) {
        substitutionsGridOptions.api.stopEditing();
        if (!params.backwards && params.previousCellDef.rowIndex < substitutionsGridOptions.api.getModel().getRowCount() - 1) { // if a new row has been added
          params.previousCellDef.rowIndex++;
        }
        params.previousCellDef.column = substitutionsGridOptions.columnApi.getColumn("input");
        return params.previousCellDef;
        // TODO allow to edit a new row
      }
      else {
        return params.nextCellDef;
      }
    }
  };

  var urlsEventListeners = {
    onShow(event) {
      document.getElementById("urlsGrid").removeEventListener("show", urlsEventListeners.onShow);
      urlsGridOptions.api.sizeColumnsToFit();
    },
    onKeyUp(event) {
      if (event.key == "Escape") event.stopPropagation();
    },
    onKeyDown(event) {
      if (event.key == "Delete") {
        let api = urlsGridOptions.api;
        if (!api.getSelectedNodes()) return;
        let selectedNode = api.getSelectedNodes()[0];
        if (selectedNode.rowIndex != selectedNode.rowModel.getRowCount() - 1) { // no last row
          api.updateRowData({ remove: api.getSelectedRows() });
        }
        event.stopPropagation();
      }
    },
    clear() {
      editor.clearUrls();
    },
    onSearchInput(event) {
      let api = urlsGridOptions.api;
      let searchBarElem = document.getElementById('urlsSearchBar');
      console.log('test1');
      api.setQuickFilter(searchBarElem.value);
      //Reenable control buttons if search bar is cleared
      searchBarElem.value == '' ? editor.enableUrlsButtons() : editor.disableUrlsButtons();
    },
    onClickClearSearch(event) {
      document.getElementById('urlsSearchBar').value = '';
      urlsEventListeners.onSearchInput(event);
      editor.enableUrlsButtons();
    }
  };

  function addUrlsEventListeners() {
    document.getElementById("urlsGrid").addEventListener("show", urlsEventListeners.onShow);
    document.getElementById("urlsGrid").addEventListener("keyup", urlsEventListeners.onKeyUp);
    document.getElementById("urlsGrid").addEventListener("keydown", urlsEventListeners.onKeyDown, true);
    document.getElementById("clearUrlsButton").addEventListener("click", urlsEventListeners.clear);
    document.getElementById("urlsSearchBar").addEventListener("input", urlsEventListeners.onSearchInput);
    document.getElementById("urlsSearchClear").addEventListener("click", urlsEventListeners.onClickClearSearch);
  }

  function removeUrlsEventListeners() {
    document.getElementById("urlsGrid").removeEventListener("keyup", urlsEventListeners.onKeyUp);
    document.getElementById("urlsGrid").removeEventListener("keydown", urlsEventListeners.onKeyDown, true);
    document.getElementById("clearUrlsButton").removeEventListener("click", urlsEventListeners.clear);
    document.getElementById("urlsSearchBar").removeEventListener("input", urlsEventListeners.onSearchInput);
    document.getElementById("urlsSearchClear").removeEventListener("click", urlsEventListeners.onClickClearSearch);
  }

  var substitutionsEventListeners = {
    onKeyUp(event) {
      if (event.key == "Escape") event.stopPropagation();
    },
    onKeyDown(event) {
      if (event.key == "Delete" && event.target.tagName != "INPUT") { // In case of input don't do anything to allow to delete characters
        let api = substitutionsGridOptions.api;
        if (!api.getSelectedNodes()) return;
        let selectedNode = api.getSelectedNodes()[0];
        if (selectedNode.rowIndex != selectedNode.rowModel.getRowCount() - 1) { // no last row
          api.updateRowData({ remove: api.getSelectedRows() });
        }
        event.stopPropagation();
      }
      else if (event.key == "ArrowUp" || event.key == "ArrowDown") {   // TODO avoid changing cell and exit edit mode if we are in the select and the user presses arrow up or down
        if ($(".inputTypeEditorFocused").length > 0) {
          let e = $.Event("keydown", { which: event.which });
          $(".inputTypeEditorFocused").trigger(e);
          event.stopPropagation();
          event.preventDefault();
        }
      }
    },
    moveTop() {
      let api = substitutionsGridOptions.api;
      let selectedNode = substitutionsEventListeners._getSelectedNode();
      if (selectedNode && !isLastRow(selectedNode)) {
        let data = selectedNode.data;
        api.updateRowData({ remove: [data] });
        api.updateRowData({ add: [data], addIndex: 0});
        api.setFocusedCell(0);
      }
    },
    moveUp() {
      let api = substitutionsGridOptions.api;
      let selectedNode = substitutionsEventListeners._getSelectedNode();
      if (selectedNode && !isLastRow(selectedNode)) {
        let data = selectedNode.data;
        let newIndex = Math.max(selectedNode.rowIndex - 1, 0);
        api.updateRowData({ remove: [data] });
        api.updateRowData({ add: [data], addIndex: newIndex});
        api.setFocusedCell(newIndex);
      }
    },
    moveDown() {
      let api = substitutionsGridOptions.api;
      let selectedNode = substitutionsEventListeners._getSelectedNode();
      if (selectedNode && !isLastRow(selectedNode)) {
        let data = selectedNode.data;
        let newIndex = Math.min(selectedNode.rowIndex + 1, selectedNode.rowModel.getRowCount() - 2);
        api.updateRowData({ remove: [data] });
        api.updateRowData({ add: [data], addIndex: newIndex});
        api.setFocusedCell(newIndex);
      }
    },
    moveBottom() {
      let api = substitutionsGridOptions.api;
      let selectedNode = substitutionsEventListeners._getSelectedNode();
      if (selectedNode && !isLastRow(selectedNode)) {
        let data = selectedNode.data;
        let newIndex = selectedNode.rowModel.getRowCount() - 2;
        api.updateRowData({ remove: [data] });
        api.updateRowData({ add: [data], addIndex: newIndex});
        api.setFocusedCell(newIndex);
      }
    },
    clear() {
      editor.clearSubstitutions();
    },
    _getSelectedNode() {
      let api = substitutionsGridOptions.api;
      if (!api.getSelectedNodes()) return null;
      else return api.getSelectedNodes()[0];
    },
    onSearchInput(event) {
      let api = substitutionsGridOptions.api;
      let searchBarElem = document.getElementById('substitutionsSearchBar')
      api.setQuickFilter(searchBarElem.value);
      //Reenable control buttons if search bar is cleared
      searchBarElem.value == '' ? editor.enableSubstitutionsButtons() : editor.disableSubstitutionsButtons();
    },
    onClickClearSearch(event) {
      document.getElementById('substitutionsSearchBar').value = '';
      substitutionsEventListeners.onSearchInput(event);
      editor.enableSubstitutionsButtons();
    }
  };

  function addSubstitutionsEventListeners() {
    document.getElementById("substitutionsGrid").addEventListener("keyup", substitutionsEventListeners.onKeyUp);
    document.getElementById("substitutionsGrid").addEventListener("keydown", substitutionsEventListeners.onKeyDown, true);
    document.getElementById("moveTopSubstitutionButton").addEventListener("click", substitutionsEventListeners.moveTop);
    document.getElementById("moveUpSubstitutionButton").addEventListener("click", substitutionsEventListeners.moveUp);
    document.getElementById("moveDownSubstitutionButton").addEventListener("click", substitutionsEventListeners.moveDown);
    document.getElementById("moveBottomSubstitutionButton").addEventListener("click", substitutionsEventListeners.moveBottom);
    document.getElementById("clearSubstitutionsButton").addEventListener("click", substitutionsEventListeners.clear);
    document.getElementById("substitutionsSearchBar").addEventListener("input", substitutionsEventListeners.onSearchInput);
    document.getElementById("substitutionsSearchClear").addEventListener("click", substitutionsEventListeners.onClickClearSearch);
  }

  function removeSubstitutionsEventListeners() {
    document.getElementById("substitutionsGrid").removeEventListener("keyup", substitutionsEventListeners.onKeyUp);
    document.getElementById("substitutionsGrid").removeEventListener("keydown", substitutionsEventListeners.onKeyDown, true);
    document.getElementById("moveTopSubstitutionButton").removeEventListener("click", substitutionsEventListeners.moveTop);
    document.getElementById("moveUpSubstitutionButton").removeEventListener("click", substitutionsEventListeners.moveUp);
    document.getElementById("moveDownSubstitutionButton").removeEventListener("click", substitutionsEventListeners.moveDown);
    document.getElementById("moveBottomSubstitutionButton").removeEventListener("click", substitutionsEventListeners.moveBottom);
    document.getElementById("clearSubstitutionsButton").removeEventListener("click", substitutionsEventListeners.clear);
    document.getElementById("substitutionsSearchBar").removeEventListener("input", substitutionsEventListeners.onSearchInput);
    document.getElementById("substitutionsSearchClear").removeEventListener("click", substitutionsEventListeners.onClickClearSearch);
  }

  var editor = {

    init() {
      this.initUrls();
      this.initSubstitutions();
    },

    initUrls() {
      let grid = document.getElementById("urlsGrid");
      new agGrid.Grid(grid, urlsGridOptions);
      addUrlsEventListeners();
    },

    initSubstitutions() {
      let grid = document.getElementById("substitutionsGrid");
      new agGrid.Grid(grid, substitutionsGridOptions);
      addSubstitutionsEventListeners();
    },

    cleanUp() {
      removeUrlsEventListeners();
      removeSubstitutionsEventListeners();
    },

    clear() {
      this.setGroup(new SubstitutionGroup());
      this.isEditing = false;
    },

    clearUrls() {
      urlsGridOptions.api.setRowData([{ url: "" }]);
    },

    clearSubstitutions() {
      substitutionsGridOptions.api.setRowData([{ input: "", inputType: 0, output: "", caseSensitive: false }]);
    },

    disableUrlsButtons() {
      document.getElementById('clearUrlsButton').disabled = true;
    },

    disableSubstitutionsButtons() {
      document.getElementById('moveTopSubstitutionButton').disabled = true;
      document.getElementById('moveUpSubstitutionButton').disabled = true;
      document.getElementById('moveDownSubstitutionButton').disabled = true;
      document.getElementById('moveBottomSubstitutionButton').disabled = true;
      document.getElementById('clearSubstitutionsButton').disabled = true;
    },

    enableUrlsButtons() {
      document.getElementById('clearUrlsButton').disabled = false;
    },

    enableSubstitutionsButtons() {
      document.getElementById('moveTopSubstitutionButton').disabled = false;
      document.getElementById('moveUpSubstitutionButton').disabled = false;
      document.getElementById('moveDownSubstitutionButton').disabled = false;
      document.getElementById('moveBottomSubstitutionButton').disabled = false;
      document.getElementById('clearSubstitutionsButton').disabled = false;
    },

    setGroup(group) {
      this.isEditing = true;

      document.getElementById('groupEnabled').checked = group.enabled;
      document.getElementById('groupMode').selectedIndex = group.mode;
      document.getElementById('groupHtml').selectedIndex = group.html;
      document.getElementById('groupName').value = group.name;

      let urls = group.urls.map(u => ({ url: u}));
      urls.push({ url: "" });
      urlsGridOptions.api.setRowData(urls);

      let substitutions = group.substitutions.map(s => s);  // shallow copy
      substitutions.push({ input: "", inputType: 0, output: "", caseSensitive: false });
      substitutionsGridOptions.api.setRowData(substitutions);
    },

    getGroup() {
      let enabled = document.getElementById('groupEnabled').checked;
      let mode = document.getElementById('groupMode').selectedIndex;
      let html = document.getElementById('groupHtml').selectedIndex;
      let name = document.getElementById('groupName').value;

      let urls = [];
      urlsGridOptions.api.forEachNode(node => {
        if (node.data.url) urls.push(node.data.url);
      });

      let substitutions = [];
      substitutionsGridOptions.api.forEachNode(node => {
        if (node.data.input) substitutions.push(new Substitution(node.data.input, node.data.output, node.data.caseSensitive, node.data.inputType));
      });

      return new SubstitutionGroup(name, urls, substitutions, html, enabled, mode);
    },

    isValidGroup() {
      let error = false;
      let api = substitutionsGridOptions.api;
      api.setQuickFilter(''); //Disable filter temporarily for validation
      substitutionsGridOptions.api.forEachNode(node => {
        if (node.error) error = true;
      });
      error = error && substitutionsGridOptions.api.getModel().getRowCount() <= 1;
      api.setQuickFilter(document.getElementById('substitutionsSearchBar').value);
      return !error;
    },

    adjustUrlsColumnWidths() {
      if (!adjustedUrlsColumnWidths) {
        urlsGridOptions.api.sizeColumnsToFit();
        adjustedUrlsColumnWidths = true;
      }
    },

    adjustSubstitutionsColumnWidths() {
      if (!adjustedSubstitutionsColumnWidths) {
        substitutionsGridOptions.api.sizeColumnsToFit();
        adjustedSubstitutionsColumnWidths = true;
      }
    },

    resetSearch() {
      let clearSearchEvent = new Event('click');
      document.getElementById("urlsSearchClear").dispatchEvent(clearSearchEvent);
      document.getElementById("substitutionsSearchClear").dispatchEvent(clearSearchEvent);
    },

    currentlySearchingUrls() {
      return document.getElementById('urlsSearchBar').value != '';
    },

    currentlySearchingSubstitutions() {
      return document.getElementById('substitutionsSearchBar').value != '';
    }

  };

  return editor;

})();

// TODO home and end keys while editing
// TODO don't allow to close modal by clicking outside if there are pending changes
