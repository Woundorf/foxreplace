/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2018 Marc Ruiz Altisent. All rights reserved.
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

var gridOptions = {
  columnDefs: [
    {
      headerName: browser.i18n.getMessage("options.group.enabled"),
      field: "enabled",
      width: 83,
      cellClass: "enabledCell",
      cellRenderer: CheckboxCellRenderer,
      suppressFilter: true
    },
    {
      headerName: browser.i18n.getMessage("options.group.name"),
      field: "nonEmptyName"
    },
    {
      headerName: browser.i18n.getMessage("options.group.url"),
      valueGetter: (params) => params.data.urls.length > 0 ? params.data.urls[0] : ""
    },
    {
      headerName: browser.i18n.getMessage("list.inputHeader"),
      valueGetter: (params) => params.data.substitutions.length > 0 ? params.data.substitutions[0].input : ""
    },
    {
      headerName: browser.i18n.getMessage("list.outputHeader"),
      valueGetter: (params) => params.data.substitutions.length > 0 ? params.data.substitutions[0].output : ""
    },
    {
      headerName: browser.i18n.getMessage("options.group.mode"),
      field: "mode",
      cellRenderer(params) {  // TODO improve (less hardcoding)
        switch (Number(params.value)) {
          case 0: return browser.i18n.getMessage("options.group.mode.autoAndManual");
          case 1: return browser.i18n.getMessage("options.group.mode.auto");
          case 2: return browser.i18n.getMessage("options.group.mode.manual");
          default: return params.value;
        }
      }
    },
    {
      headerName: "",
      field: "name",
      width: 64,
      cellRenderer: ButtonsCellRenderer,
      suppressFilter: true,
      suppressNavigable: true
    }
  ],
  rowSelection: 'single',
  enableColResize: true,
  //enableFilter: true,
  //onRowSelected: // enable/disable buttons
  onRowDoubleClicked(params) {
    groupEditor.setGroup(params.node.data);
    $("#groupEditorModal").modal("show");
  },
  onCellFocused(params) {
    let row = this.api.getModel().getRow(params.rowIndex);
    if (row) row.setSelected(true); // check needed when deleting the last row by click
  },
  onColumnResized() {
    storage.setMainColumnState(gridOptions.columnApi.getColumnState());
  },
  onDragStopped() {
    storage.setMainColumnState(gridOptions.columnApi.getColumnState());
  }
};

function onLoad() {
  document.removeEventListener("DOMContentLoaded", onLoad);

  let substitutionListGrid = document.getElementById("listGrid");
  new agGrid.Grid(substitutionListGrid, gridOptions);

  storage.getMainColumnState().then(columnState => {
    if (columnState) gridOptions.columnApi.setColumnState(columnState);
  });

  storage.getList().then(list => {
    gridOptions.api.setRowData(list);
  });

  storage.getPrefs().then(prefs => {
    $("#prefs").form("set values", prefs);
    eventListeners.subscriptionUrlChanged();  // update warning visibility after loading preferences
  });

  browser.runtime.getBackgroundPage().then(background => {
    $("#status").text(background.subscription.status);
  });

  browser.runtime.onMessage.addListener(message => {
    if (message.key == "subscriptionStatus")
      $("#status").text(message.status);
  });

  browser.storage.onChanged.addListener(changes => {  // TODO could improve
    storage.getList().then(list => {
      gridOptions.api.setRowData(list);
    });
    storage.getPrefs().then(prefs => {
      $("#prefs").form("set values", prefs);
    });
  });

  $("#importModal").modal({
    onShow() {
      $("#importModal .form").removeClass("error");
    },
    onApprove(button) {
      $("#importModal").modal("setting", "closable", false);

      if ($("#importModal").hasClass("importFromFile")) {
        let files = $("#importFile")[0].files;
        if (files.length === 0) {
          alert(browser.i18n.getMessage("options.warning.selectFile"));
          $("#importModal").modal("setting", "closable", true);
          return false;
        }
        importFromFile(files[0])
          .then(finishImport)
          .catch(error => {
            $("#importError").text(error);
            $("#importModal .form").addClass("error");
            $("#importModal").modal("setting", "closable", true);
          });
      }
      else if ($("#importModal").hasClass("importFromUrl")) {
        let url = $("#importUrl").val();
        if (!url) {
          alert(browser.i18n.getMessage("options.warning.enterUrl"));
          $("#importModal").modal("setting", "closable", true);
          return false;
        }
        importFromUrl(url)
          .then(finishImport)
          .catch(error => {
            $("#importError").text(error);
            $("#importModal .form").addClass("error");
            $("#importModal").modal("setting", "closable", true);
          });
      }

      return false; // to keep modal open while importing

      function finishImport(list) {
        if (button.prop("id") == "importAppend") {
          gridOptions.api.updateRowData({ add: list });
        }
        else if (button.prop("id") == "importOverwrite") {
          gridOptions.api.setRowData(list);
        }

        $("#importModal").modal("hide");
        $("#importModal").modal("setting", "closable", true);
      }
    }
  });

  $("#groupEditorModal").modal({
    onShow() {
      groupEditor.adjustUrlsColumnWidths();
    },
    onApprove(button) {
      if (!groupEditor.isValidGroup()) {
        alert(browser.i18n.getMessage("options.warning.atLeastOneSubstitutionAndNoErrors"));
        return false;
      }

      if (!groupEditor.isEditing) {
        // Add new group
        groupEditor.isEditing = true; // needed in case the apply button is used on a new group
        let result = gridOptions.api.updateRowData({ add: [groupEditor.getGroup()] });
        result.add[0].setSelected(true);
      }
      else {
        // Update current group
        gridOptions.api.getSelectedNodes()[0].setData(groupEditor.getGroup());
      }

      if (button.prop("id") == "groupApplyButton") {
        return false;
      }
    }
  });

  $(".ui.dropdown").dropdown();
  $(".menu .item").tab({
    onFirstLoad(tabPath) {
      if (tabPath == "substitutions") groupEditor.adjustSubstitutionsColumnWidths();
    }
  });

  addEventListeners();
  groupEditor.init();
}

function onUnload() {
  document.removeEventListener("unload", onUnload);
  removeEventListeners();
  groupEditor.cleanUp();
}

var eventListeners = {
  addGroup() {
    groupEditor.clear();
    $("#groupEditorModal").modal("show");
  },
  clearGroups() {
    gridOptions.api.setRowData([]);
  },
  moveUpGroup() {
    let api = gridOptions.api;
    let selectedNode = api.getSelectedNodes()[0];

    if (selectedNode) {
      let data = selectedNode.data;
      let newIndex = Math.max(selectedNode.rowIndex - 1, 0);
      api.updateRowData({ remove: [data] });
      api.updateRowData({ add: [data], addIndex: newIndex});
      api.setFocusedCell(newIndex);
    }
  },
  moveDownGroup() {
    let api = gridOptions.api;
    let selectedNode = api.getSelectedNodes()[0];

    if (selectedNode) {
      let data = selectedNode.data;
      let newIndex = Math.min(selectedNode.rowIndex + 1, selectedNode.rowModel.getRowCount() - 1);
      api.updateRowData({ remove: [data] });
      api.updateRowData({ add: [data], addIndex: newIndex});
      api.setFocusedCell(newIndex);
    }
  },
  subscriptionUrlChanged() {
    // Show the warning if the user inputs a string, hide it otherwise
    let url = document.getElementById("subscriptionUrl").value;
    if (url != "") document.getElementById("prefs").classList.add("warning");
    else document.getElementById("prefs").classList.remove("warning");
  },
  startImport() {
    $("#importModal .header").text(browser.i18n.getMessage("options.import"));
    $("#importModal").removeClass("importFromUrl").addClass("importFromFile");
    $("#importModal").modal("show");
  },
  startImportFromUrl() {
    $("#importModal .header").text(browser.i18n.getMessage("options.importFromUrl"));
    $("#importModal").removeClass("importFromFile").addClass("importFromUrl");
    $("#importModal").modal("show");
  },
  startExport() {
    let list = [];
    gridOptions.api.forEachNode(node => {
      list.push(node.data);
    });

    let json = substitutionListToJSON(list);
    let jsonText = JSON.stringify(json, null, 2);
    let blob = new Blob([jsonText], { type: "application/json" });
    let url = URL.createObjectURL(blob);
    let downloadId;

    browser.downloads.download({
      url: url,
      filename: "FoxReplace.json",
      saveAs: true
    }).then(id => {
      downloadId = id;
    });

    function onChanged(delta) {
      if (delta.id == downloadId && (delta.state.current === "complete" || delta.state.current === "interrupted")) {
        URL.revokeObjectURL(url);
        browser.downloads.onChanged.removeListener(onChanged);
      }
    }

    browser.downloads.onChanged.addListener(onChanged);
  },
  resetColumns() {
    gridOptions.columnApi.resetColumnState();
    storage.setMainColumnState(gridOptions.columnApi.getColumnState());
  },
  save() {
    let list = [];
    gridOptions.api.forEachNode(node => {
      list.push(node.data);
    });
    storage.setList(list);
    storage.setPrefs($("#prefs").form("get values"));
  }
};

function addEventListeners() {
  document.getElementById("addGroup").addEventListener("click", eventListeners.addGroup);
  document.getElementById("clearGroups").addEventListener("click", eventListeners.clearGroups);
  document.getElementById("moveUpGroup").addEventListener("click", eventListeners.moveUpGroup);
  document.getElementById("moveDownGroup").addEventListener("click", eventListeners.moveDownGroup);
  document.getElementById("subscriptionUrl").addEventListener("input", eventListeners.subscriptionUrlChanged);
  document.getElementById("import").addEventListener("click", eventListeners.startImport);
  document.getElementById("importFromUrl").addEventListener("click", eventListeners.startImportFromUrl);
  document.getElementById("export").addEventListener("click", eventListeners.startExport);
  document.getElementById("resetColumns").addEventListener("click", eventListeners.resetColumns);
  document.getElementById("save").addEventListener("click", eventListeners.save);
}

function removeEventListeners() {
  document.getElementById("addGroup").removeEventListener("click", eventListeners.addGroup);
  document.getElementById("clearGroups").removeEventListener("click", eventListeners.clearGroups);
  document.getElementById("moveUpGroup").removeEventListener("click", eventListeners.moveUpGroup);
  document.getElementById("moveDownGroup").removeEventListener("click", eventListeners.moveDownGroup);
  document.getElementById("subscriptionUrl").removeEventListener("input", eventListeners.subscriptionUrlChanged);
  document.getElementById("import").removeEventListener("click", eventListeners.startImport);
  document.getElementById("importFromUrl").removeEventListener("click", eventListeners.startImportFromUrl);
  document.getElementById("export").removeEventListener("click", eventListeners.startExport);
  document.getElementById("resetColumns").removeEventListener("click", eventListeners.resetColumns);
  document.getElementById("save").removeEventListener("click", eventListeners.save);
}

function importFromFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = event => {
      try {
        let text = event.target.result;
        let json = JSON.parse(text);
        let list = substitutionListFromJSON(json);
        resolve(list);
      }
      catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

function importFromUrl(url) {
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.open("GET", url);
    request.responseType = "json";
    request.onload = () => {
      if (request.status === 200) {
        if (request.response) {
          let json = request.response;
          let list = substitutionListFromJSON(json);
          resolve(list);
        }
        else {
          reject(Error(browser.i18n.getMessage("options.error.invalidJson", url)));
        }
      }
      else {
        reject(Error(request.status + " " + request.statusText));
      }
    };
    request.onerror = () => {
      reject(Error(browser.i18n.getMessage("options.error.cantConnect")));
    };
    request.send();
  });
}

document.addEventListener("DOMContentLoaded", onLoad);
document.addEventListener("unload", onUnload);

// TODO split in more files (e.g. one for grid handling, one for import/export, etc.)
// TODO shortcuts
// TODO warn unsaved changes
// TODO move to top/bottom
// TODO remember column widths in secondary grids
// TODO allow to sort and unsort
// TODO allow to filter
