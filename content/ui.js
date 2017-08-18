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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("chrome://foxreplace/content/strings.js");
Cu.import("chrome://foxreplace/content/xul.js");
Cu.import("resource://gre/modules/Services.jsm");

/**
 * Substitute for XUL overlay.
 */

var EXPORTED_SYMBOLS = ["buildUi", "removeUi"];

let strings = new LocalizedStrings("ui.properties");

/**
 * Builds the FoxReplace UI on the aBrowser window.
 */
function buildUi(aBrowser) {
  let doc = aBrowser.ownerDocument;

  let commandset =
    Xul.COMMANDSET({ id: "fxrCommandset" },
      Xul.COMMAND({ id: "fxrCmdShowReplaceBar", oncommand: "window.foxreplace.showReplaceBar();" }),
      Xul.COMMAND({ id: "fxrCmdListReplace", oncommand: "window.foxreplace.listReplace();" }),
      Xul.COMMAND({ id: "fxrCmdToggleAutoReplaceOnLoad", oncommand: "window.foxreplace.toggleAutoReplaceOnLoad();" }),
      Xul.COMMAND({ id: "fxrCmdOptions", oncommand: "window.foxreplace.showOptions();" }),
      Xul.COMMAND({ id: "fxrCmdHelp", oncommand: "window.foxreplace.showHelp();" })
    );
  commandset.build(aBrowser);

  let editReplace = Xul.MENUITEM({ id: "fxrMenuEditReplace", "class": "menuitem-iconic", label: strings.get("menuReplace.label"),
                                   accesskey: strings.get("menuReplace.accesskey"), command: "fxrCmdShowReplaceBar" });
  editReplace.build(doc.getElementById("menu_EditPopup"), { insertBefore: doc.getElementById("textfieldDirection-separator") });

  let toolsFoxReplace =
    Xul.MENU({ id: "fxrMenuToolsFoxReplace", "class": "menu-iconic", label: strings.get("menuToolsFoxReplace.label"),
               accesskey: strings.get("menuToolsFoxReplace.accesskey") },
      Xul.MENUPOPUP(
        Xul.MENUITEM({ id: "fxrMenuToolsFoxReplaceReplace", label: strings.get("listReplace.label"), accesskey: strings.get("listReplace.accesskey"),
                       command: "fxrCmdListReplace" }),
        Xul.MENUITEM({ id: "fxrMenuToolsFoxReplaceAutoReplaceOnLoad", type: "checkbox", label: strings.get("autoReplaceOnLoad.label"),
                       accesskey: strings.get("autoReplaceOnLoad.accesskey"), command: "fxrCmdToggleAutoReplaceOnLoad" }),
        Xul.MENUITEM({ id: "fxrMenuToolsFoxReplaceOptions", label: strings.get("options.label"), accesskey: strings.get("options.accesskey"),
                       command: "fxrCmdOptions" }),
        Xul.MENUSEPARATOR(),
        Xul.MENUITEM({ id: "fxrMenuToolsHelp", label: strings.get("help.label"), accesskey: strings.get("help.accesskey"), command: "fxrCmdHelp" })
      )
    );
  toolsFoxReplace.build(doc.getElementById("menu_ToolsPopup"), { insertBefore: doc.getElementById("devToolsSeparator") });

  // Load stylesheet
  let styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  let styleSheetURI = Services.io.newURI("chrome://foxreplace/skin/foxreplace.css", null, null);
  styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
}

/**
 * Removes the FoxReplace UI from the aBrowser window.
 */
function removeUi(aBrowser) {
  let doc = aBrowser.ownerDocument;

  let commandset = doc.getElementById("fxrCommandset");
  commandset.parentNode.removeChild(commandset);

  let editReplace = doc.getElementById("fxrMenuEditReplace");
  editReplace.parentNode.removeChild(editReplace);

  let toolsFoxReplace = doc.getElementById("fxrMenuToolsFoxReplace");
  toolsFoxReplace.parentNode.removeChild(toolsFoxReplace);

  // Unload stylesheet
  let styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  let styleSheetURI = Services.io.newURI("chrome://foxreplace/skin/foxreplace.css", null, null);
  if (styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.AUTHOR_SHEET))
    styleSheetService.unregisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
}
