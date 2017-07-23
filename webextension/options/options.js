/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2017 Marc Ruiz Altisent. All rights reserved.
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

var editedIndex = null; // index of node currently being edited in the dialog, null if none

/**
 *  A cell renderer that shows a checkbox and is also able to edit a boolean field.
 */
class CheckboxCellRenderer {

  init(params) {
    this.checkbox = document.createElement("input");
    this.checkbox.setAttribute("type", "checkbox");
    this.checkbox.checked = params.value;
    this.listener = (event) => {
      params.node.setDataValue(params.column, event.target.checked);
    };
    this.checkbox.addEventListener("input", this.listener);
  }

  getGui() {
    return this.checkbox;
  }

  destroy() {
    this.checkbox.removeEventListener("input", this.listener);
    delete this.checkbox;
  }

  refresh(params) {
    this.checkbox.checked = params.value;
  }

}

/**
 *  A cell renderer that shows edit and delete buttons.
 */
class ButtonsCellRenderer {

  init(params) {
    this.edit = ButtonsCellRenderer.createIconButton("edit");
    this.editListener = () => {
      editedIndex = params.rowIndex;
      groupEditor.setGroup(params.node.data);
      $("#groupEditorModal").modal("show");
    };
    this.edit.addEventListener("click", this.editListener);

    this.del = ButtonsCellRenderer.createIconButton("remove");
    this.deleteListener = () => {
      params.api.removeItems([params.node]);
    };
    this.del.addEventListener("click", this.deleteListener);

    this.gui = document.createElement("div");
    this.gui.appendChild(this.edit);
    this.gui.appendChild(this.del);
  }

  getGui() {
    return this.gui;
  }

  destroy() {
    this.edit.removeEventListener("click", this.editListener);
    this.del.removeEventListener("click", this.deleteListener);
    delete this.gui;
    delete this.edit;
    delete this.del;
  }

  static createIconButton(iconName) {
    let icon = document.createElement("i");
    icon.setAttribute("class", iconName + " icon");
    return icon;
  }

}

var gridOptions = {
  columnDefs: [
    {
      headerName: "Enabled",
      field: "enabled",
      width: 63,
      cellClass: "enabledCell",
      cellRenderer: CheckboxCellRenderer,
      suppressFilter: true
    },
    {
      headerName: "Name",
      field: "nonEmptyName"
    },
    {
      headerName: "URL",
      valueGetter: (params) => params.data.urls.length > 0 ? params.data.urls[0] : ""
    },
    {
      headerName: "Replace",
      valueGetter: (params) => params.data.substitutions.length > 0 ? params.data.substitutions[0].input : ""
    },
    {
      headerName: "With",
      valueGetter: (params) => params.data.substitutions.length > 0 ? params.data.substitutions[0].output : ""
    },
    {
      headerName: "",
      field: "index",
      width: 48,
      cellRenderer: ButtonsCellRenderer,
      suppressFilter: true,
      suppressNavigable: true
    }
  ],
  rowSelection: 'single',
  enableColResize: true,
  //enableFilter: true,
  //onRowSelected: // enable/disable buttons
  //onRowDoubleClicked: // edit
  onCellFocused(params) {
    let row = this.api.getModel().getRow(params.rowIndex);
    if (row) row.setSelected(true); // check needed when deleting the last row by click
  },
};

function onLoad() {
  document.removeEventListener("DOMContentLoaded", onLoad);

  let substitutionListGrid = document.getElementById("listGrid");
  new agGrid.Grid(substitutionListGrid, gridOptions);

  storage.getList().then(list => {
    gridOptions.api.setRowData(list);
  });

  storage.getPrefs().then(prefs => {
    $("#prefs").form("set values", prefs);
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
          alert("Select a file");
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
          alert("Enter a URL");
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
          gridOptions.api.addItems(list);
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
        alert("You must add at least one substitution");
        return false;
      }

      if (editedIndex === null) {
        editedIndex = gridOptions.api.getModel().getRowCount();
        gridOptions.api.addItems([groupEditor.getGroup()]);
      }
      else {
        gridOptions.api.removeItems([gridOptions.api.getModel().getRow(editedIndex)]);
        gridOptions.api.insertItemsAtIndex(editedIndex, [groupEditor.getGroup()]);
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
    editedIndex = null;
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
      let newIndex = Math.max(selectedNode.rowIndex - 1, 0);
      api.removeItems([selectedNode]);
      api.insertItemsAtIndex(newIndex, [selectedNode.data]);
      api.setFocusedCell(newIndex);
    }
  },
  moveDownGroup() {
    let api = gridOptions.api;
    let selectedNode = api.getSelectedNodes()[0];

    if (selectedNode) {
      let newIndex = Math.min(selectedNode.rowIndex + 1, selectedNode.rowModel.getRowCount() - 1);
      api.removeItems([selectedNode]);
      api.insertItemsAtIndex(newIndex, [selectedNode.data]);
      api.setFocusedCell(newIndex);
    }
  },
  startImport() {
    $("#importModal .header").text("Import");
    $("#importModal").removeClass("importFromUrl").addClass("importFromFile");
    $("#importModal").modal("show");
  },
  startImportFromUrl() {
    $("#importModal .header").text("Import from URL");
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

    browser.downloads.download({
      url: url,
      filename: "FoxReplace.json",
      saveAs: true
    }).then(() => URL.revokeObjectURL(url));
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
  document.getElementById("import").addEventListener("click", eventListeners.startImport);
  document.getElementById("importFromUrl").addEventListener("click", eventListeners.startImportFromUrl);
  document.getElementById("export").addEventListener("click", eventListeners.startExport);
  document.getElementById("save").addEventListener("click", eventListeners.save);
}

function removeEventListeners() {
  document.getElementById("addGroup").removeEventListener("click", eventListeners.addGroup);
  document.getElementById("clearGroups").removeEventListener("click", eventListeners.clearGroups);
  document.getElementById("moveUpGroup").removeEventListener("click", eventListeners.moveUpGroup);
  document.getElementById("moveDownGroup").removeEventListener("click", eventListeners.moveDownGroup);
  document.getElementById("import").removeEventListener("click", eventListeners.startImport);
  document.getElementById("importFromUrl").removeEventListener("click", eventListeners.startImportFromUrl);
  document.getElementById("export").removeEventListener("click", eventListeners.startExport);
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
          reject(Error("Invalid JSON at " + url));
        }
      }
      else {
        reject(Error(request.status + " " + request.statusText));
      }
    };
    request.onerror = () => {
      reject(Error("Can't connect to server"));
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
// TODO remember column widths
// TODO allow to sort and unsort
// TODO allow to filter
