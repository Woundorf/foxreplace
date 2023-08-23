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

var gridOptions = {
  columnDefs: [
    {
      headerName: browser.i18n.getMessage("options.group.enabled"),
      field: "enabled",
      width: 92,
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
      width: 80,
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
    groupEditor.resetSearch();
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

  gridOptions.api.addEventListener("listChanged", saveList);

  storage.getMainColumnState().then(columnState => {
    if (columnState) gridOptions.columnApi.setColumnState(columnState);
  });

  storage.getList().then(list => {
    gridOptions.api.setRowData(list);
  });

  storage.getPrefs().then(loadPrefs);

  browser.runtime.getBackgroundPage().then(background => {
    $("#status").text(background.subscription.status);
  });

  browser.runtime.onMessage.addListener(message => {
    if (message.key == "subscriptionStatus")
      $("#status").text(message.status);
  });

  browser.storage.onChanged.addListener(storageChangeListener);

  //$(".menu .item").tab({
  //  onFirstLoad(tabPath) {
  //    if (tabPath == "substitutions") groupEditor.adjustSubstitutionsColumnWidths();
  //  }
  //});

  $('#importWarning').toast({ autohide: false });

  addEventListeners();
  groupEditor.init();
}

function onUnload() {
  document.removeEventListener("unload", onUnload);
  removeEventListeners();
  groupEditor.cleanUp();
}

var eventListeners = {
  moveUpGroup() {
    let api = gridOptions.api;
    let selectedNode = api.getSelectedNodes()[0];

    if (selectedNode) {
      let data = selectedNode.data;
      let newIndex = Math.max(selectedNode.rowIndex - 1, 0);
      api.updateRowData({ remove: [data] });
      api.updateRowData({ add: [data], addIndex: newIndex});
      api.setFocusedCell(newIndex);
      saveList();
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
      saveList();
    }
  },
  subscriptionUrlChanged() {
    // Show the warning if the user inputs a string, hide it otherwise
    let url = document.getElementById("subscriptionUrl").value;
    if (url != "") document.getElementById("subscriptionWarning").classList.remove("d-none");
    else document.getElementById("subscriptionWarning").classList.add("d-none");
  },
  startExport() {
    let list = [];
    gridOptions.api.forEachNode(node => {
      list.push(node.data);
    });

    const json = substitutionListToJSON(list);
    const jsonText = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
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
  }
};

function addEventListeners() {
  $('#groupEditorModal').on('show.bs.modal', prepareGroupEditor);
  $('#substitutionsTab').on('show.bs.tab', function() {
    groupEditor.adjustSubstitutionsColumnWidths();
  });
  $('#groupOk').click(saveGroup);
  $('#groupApply').click(saveGroup);
  $('#groupCancel').click(closeGroupEditor);
  $('#importModal').on('show.bs.modal', prepareImport);
  $('#importModal').on('hide.bs.modal', onHideImport);
  $('#importAppend').click(startImport);
  $('#importOverwrite').click(startImport);
  $('#confirmClearGroupsButton').click(confirmClearGroups);
  document.getElementById("moveUpGroup").addEventListener("click", eventListeners.moveUpGroup);
  document.getElementById("moveDownGroup").addEventListener("click", eventListeners.moveDownGroup);
  document.getElementById("subscriptionUrl").addEventListener("input", eventListeners.subscriptionUrlChanged);
  document.getElementById("export").addEventListener("click", eventListeners.startExport);
  document.getElementById("resetColumns").addEventListener("click", eventListeners.resetColumns);
  document.getElementById("prefs").addEventListener("change", savePref);
}

function removeEventListeners() {
  document.getElementById("moveUpGroup").removeEventListener("click", eventListeners.moveUpGroup);
  document.getElementById("moveDownGroup").removeEventListener("click", eventListeners.moveDownGroup);
  document.getElementById("subscriptionUrl").removeEventListener("input", eventListeners.subscriptionUrlChanged);
  document.getElementById("export").removeEventListener("click", eventListeners.startExport);
  document.getElementById("resetColumns").removeEventListener("click", eventListeners.resetColumns);
  document.getElementById("prefs").removeEventListener("change", savePref);
}

function prepareGroupEditor(event) {
  groupEditor.adjustUrlsColumnWidths();
  groupEditor.resetSearch();

  if (event.relatedTarget == document.getElementById('addGroup')) {
    groupEditor.clear();
  }
}

function closeGroupEditor(_event) {
  groupEditor.resetSearch();
  $('#groupEditorModal').modal('hide');
}

function saveGroup(event) {
  let button = $(event.currentTarget);
  let action = button.data('action');

  if (!groupEditor.isValidGroup()) {
    alert(browser.i18n.getMessage("options.warning.atLeastOneSubstitutionAndNoErrors"));
    return;
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

  saveList();

  if (action == 'ok') {
    closeGroupEditor(event);
  }
}

function prepareImport(event) {
  let button = $(event.relatedTarget);
  let from = button.data('from');
  $('#importAppend').data('from', from);
  $('#importOverwrite').data('from', from);
  $('#importError').addClass('d-none');

  if (from == 'file') {
    $('#importTitle').text(browser.i18n.getMessage('options.import'));
    $('#importModal').removeClass('importFromUrl').addClass('importFromFile');
  }
  else if (from == 'url') {
    $('#importTitle').text(browser.i18n.getMessage('options.importFromUrl'));
    $('#importModal').removeClass('importFromFile').addClass('importFromUrl');
  }
}

var importing = false;  // will be true in the middle of an import

function onHideImport(event) {
  if (importing) {
    event.preventDefault(); // prevents closing the modal in the middle of an import
  }
}

function startImport(event) {
  let button = $(event.currentTarget);
  let from = button.data('from');
  let action = button.data('action');

  if (from == 'file') {
    let files = $('#importFile')[0].files;

    if (files.length === 0) {
      alert(browser.i18n.getMessage('options.warning.selectFile'));
    }
    else {
      importing = true;
      $('#importModal .spinner-border').removeClass('d-none');
      importFromFile(files[0])
        .then(finishImport)
        .catch(error => {
          $('#importError').text(error);
          $('#importError').removeClass('d-none');
          importing = false;
          $('#importModal .spinner-border').addClass('d-none');
        });
    }
  }
  else if (from == 'url') {
    let url = $('#importUrl').val();

    if (!url) {
      alert(browser.i18n.getMessage('options.warning.enterUrl'));
    }
    else {
      importing = true;
      $('#importModal .spinner-border').removeClass('d-none');
      importFromUrl(url)
        .then(finishImport)
        .catch(error => {
          $('#importError').text(error);
          $('#importError').removeClass('d-none');
          importing = false;
          $('#importModal .spinner-border').addClass('d-none');
        });
    }
  }

  function finishImport(list) {
    if (action == 'append') {
      gridOptions.api.updateRowData({ add: list });
    }
    else if (action == 'overwrite') {
      gridOptions.api.setRowData(list);
    }

    saveList();
    importing = false;
    $('#importModal .spinner-border').addClass('d-none');
    $('#importModal').modal('hide');
  }
}

function importFromFile(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = event => {
      try {
        let text = event.target.result;
        let json = JSON.parse(text);
        let check = checkVersion(json);

        if (check.status) {
          if (check.message) {
            $('#importWarning .alert').text(check.message);
            $('#importWarning').toast('show');
          }

          let list = substitutionListFromJSON(json);
          resolve(list);
        }
        else {
          reject(Error(check.message));
        }
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
    request.open('GET', url);
    request.responseType = 'json';
    request.onload = () => {
      if (request.status === 200) {
        if (request.response) {
          let json = request.response;
          let check = checkVersion(json);

          if (check.status) {
            if (check.message) {
              $('#importWarning .alert').text(check.message);
              $('#importWarning').toast('show');
            }

            let list = substitutionListFromJSON(json);
            resolve(list);
          }
          else {
            reject(Error(check.message));
          }
        }
        else {
          reject(Error(browser.i18n.getMessage('options.error.invalidJson', url)));
        }
      }
      else {
        reject(Error(`${request.status} ${request.statusText}`));
      }
    };
    request.onerror = () => {
      reject(Error(browser.i18n.getMessage('options.error.cantConnect')));
    };
    request.send();
  });
}

function confirmClearGroups() {
  gridOptions.api.setRowData([]);
  saveList();
  $('#confirmClearGroupsModal').modal('hide');
}

function saveList() {
  browser.storage.onChanged.removeListener(storageChangeListener);

  let list = [];
  gridOptions.api.forEachNode(node => {
    list.push(node.data);
  });
  storage.setList(list)
    .then(() => { browser.storage.onChanged.addListener(storageChangeListener); });
}

function loadPrefs(prefs) {
  for (let id in prefs) {
    let element = document.getElementById(id);

    switch (element.type) {
      case 'checkbox': element.checked = prefs[id]; break;
      case 'number': element.valueAsNumber = prefs[id]; break;
      case 'text': element.value = prefs[id]; break;
    }
  }

  eventListeners.subscriptionUrlChanged();  // update warning visibility after loading preferences
}

function savePref(event) {
  browser.storage.onChanged.removeListener(storageChangeListener);

  let prefs = {};

  if (event.target.type == "checkbox") prefs[event.target.id] = event.target.checked;
  else if (event.target.type == "number") prefs[event.target.id] = event.target.valueAsNumber;
  else if (event.target.type == "text") prefs[event.target.id] = event.target.value;

  storage.setPrefs(prefs)
    .then(() => { browser.storage.onChanged.addListener(storageChangeListener); });
}

function storageChangeListener(changes) {
  if (changes.list) {
    gridOptions.api.setRowData(substitutionListFromJSON(changes.list.newValue));
  }
  else {
    for (let c in changes) {
      let element = document.getElementById(c);
      let newValue = changes[c].newValue;

      switch (element.type) {
        case 'checkbox': element.checked = newValue; break;
        case 'number': element.valueAsNumber = newValue; break;
        case 'text': element.value = newValue; break;
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", onLoad);
document.addEventListener("unload", onUnload);

// TODO split in more files (e.g. one for grid handling, one for import/export, etc.)
// TODO shortcuts
// TODO move to top/bottom
// TODO remember column widths in secondary grids
// TODO allow to sort and unsort
// TODO allow to filter
