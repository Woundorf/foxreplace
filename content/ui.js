/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2016 Marc Ruiz Altisent. All rights reserved.
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
      Xul.COMMAND({ id: "fxrCmdShowReplaceBar", oncommand: "foxreplace.showReplaceBar();" }),
      Xul.COMMAND({ id: "fxrCmdHideReplaceBar", oncommand: "foxreplace.hideReplaceBar();" }),
      Xul.COMMAND({ id: "fxrCmdBarReplace", oncommand: "foxreplace.instantReplace();" }),
      Xul.COMMAND({ id: "fxrCmdListReplace", oncommand: "foxreplace.listReplace();" }),
      Xul.COMMAND({ id: "fxrCmdToggleAutoReplaceOnLoad", oncommand: "foxreplace.toggleAutoReplaceOnLoad();" }),
      Xul.COMMAND({ id: "fxrCmdOptions", oncommand: "foxreplace.showOptions();" }),
      Xul.COMMAND({ id: "fxrCmdHelp", oncommand: "foxreplace.showHelp();" })
    );
  commandset.build(aBrowser);

  let keyset =
    Xul.KEYSET({ id: "fxrKeyset" },
      Xul.KEY({ id: "fxrKeyListReplace", modifiers: "shift", keycode: "VK_F9", command: "fxrCmdListReplace" }),
      Xul.KEY({ id: "fxrKeyShowReplaceBar", keycode: "VK_F9", command: "fxrCmdShowReplaceBar" })
    );
  keyset.build(aBrowser);

  let editReplace = Xul.MENUITEM({ id: "fxrMenuEditReplace", "class": "menuitem-iconic", label: strings.get("menuReplace.label"),
                                   accesskey: strings.get("menuReplace.accesskey"), command: "fxrCmdShowReplaceBar", key: "fxrKeyShowReplaceBar" });
  editReplace.build(doc.getElementById("menu_EditPopup"), { insertBefore: doc.getElementById("textfieldDirection-separator") });

  let toolsFoxReplace =
    Xul.MENU({ id: "fxrMenuToolsFoxReplace", "class": "menu-iconic", label: strings.get("menuToolsFoxReplace.label"),
               accesskey: strings.get("menuToolsFoxReplace.accesskey") },
      Xul.MENUPOPUP(
        Xul.MENUITEM({ id: "fxrMenuToolsFoxReplaceReplace", label: strings.get("listReplace.label"), accesskey: strings.get("listReplace.accesskey"),
                       command: "fxrCmdListReplace", key: "fxrKeyListReplace" }),
        Xul.MENUITEM({ id: "fxrMenuToolsFoxReplaceAutoReplaceOnLoad", type: "checkbox", label: strings.get("autoReplaceOnLoad.label"),
                       accesskey: strings.get("autoReplaceOnLoad.accesskey"), command: "fxrCmdToggleAutoReplaceOnLoad" }),
        Xul.MENUITEM({ id: "fxrMenuToolsFoxReplaceOptions", label: strings.get("options.label"), accesskey: strings.get("options.accesskey"),
                       command: "fxrCmdOptions" }),
        Xul.MENUSEPARATOR(),
        Xul.MENUITEM({ id: "fxrMenuToolsHelp", label: strings.get("help.label"), accesskey: strings.get("help.accesskey"), command: "fxrCmdHelp" })
      )
    );
  toolsFoxReplace.build(doc.getElementById("menu_ToolsPopup"), { insertBefore: doc.getElementById("devToolsSeparator") });

  let contextMenuItem = Xul.MENUITEM({ id: "fxrContextMenuFoxReplace", "class": "menuitem-iconic", label: strings.get("contextMenuFoxReplace.label"),
                                       accesskey: strings.get("contextMenuFoxReplace.accesskey"), command: "fxrCmdListReplace", key: "fxrKeyListReplace" });
  contextMenuItem.build(doc.getElementById("contentAreaContextMenu"));

  let toolbarButton =
    Xul.TOOLBARBUTTON({ id: "fxrToolbarButton", "class": "toolbarbutton-1 chromeclass-toolbar-additional", type: "menu-button",
                        label: strings.get("toolbarButton.label"), tooltiptext: strings.get("toolbarButton.tooltip"), command: "fxrCmdListReplace" },
      Xul.MENUPOPUP({ oncommand: "event.stopPropagation();",  // stop event propagation to avoid executing button's command
                      onpopupshowing: "foxreplace.updateToolbarButtonMenu();" },
        Xul.MENUITEM({ id: "fxrToolbarButtonMenuReplace", label: strings.get("listReplace.label"), accesskey: strings.get("listReplace.accesskey"),
                       command: "fxrCmdListReplace", key: "fxrKeyListReplace" }),
        Xul.MENUITEM({ id: "fxrToolbarButtonMenuAutoReplaceOnLoad", type: "checkbox", label: strings.get("autoReplaceOnLoad.label"),
                       accesskey: strings.get("autoReplaceOnLoad.accesskey"), command: "fxrCmdToggleAutoReplaceOnLoad" }),
        Xul.MENUITEM({ id: "fxrToolbarButtonMenuOptions", label: strings.get("options.label"), accesskey: strings.get("options.accesskey"),
                       command: "fxrCmdOptions" }),
        Xul.MENUSEPARATOR(),
        Xul.MENUITEM({ id: "fxrToolbarMenuHelp", label: strings.get("help.label"), accesskey: strings.get("help.accesskey"), command: "fxrCmdHelp" })
      )
    );
  toolbarButton.build(doc.getElementById("navigator-toolbox").palette);

  let replaceBar =
    Xul.TOOLBAR({ id: "fxrReplaceBar", align: "center", fullscreentoolbar: "true", hidden: "true",
                  onkeypress: "if (event.keyCode == event.DOM_VK_ESCAPE) foxreplace.hideReplaceBar();" },
      Xul.LABEL({ id: "fxrReplaceBarInputStringLabel", control: "fxrReplaceBarInputStringTextBox", value: strings.get("replaceBarInputString.label"),
                  accesskey: strings.get("replaceBarInputString.accesskey") }),
      Xul.TEXTBOX({ id: "fxrReplaceBarInputStringTextBox", flex: "1", oninput: "document.getElementById('fxrReplaceBarReplaceButton').disabled=this.value==''",
                    onkeypress: "if (event.keyCode == event.DOM_VK_RETURN) foxreplace.instantReplace();" }),
      Xul.LABEL({ id: "fxrReplaceBarOutputStringLabel", control: "fxrReplaceBarOutputStringTextBox", value: strings.get("replaceBarOutputString.label"),
                  accesskey: strings.get("replaceBarOutputString.accesskey") }),
      Xul.TEXTBOX({ id: "fxrReplaceBarOutputStringTextBox", flex: "1", onkeypress: "if (event.keyCode == event.DOM_VK_RETURN) foxreplace.instantReplace();" }),
      Xul.LABEL({ id: "fxrReplaceBarHtmlLabel", control: "fxrReplaceBarHtmlButton", value: strings.get("replaceBarHtml.label"),
                  accesskey: strings.get("replaceBarHtml.accesskey") }),
      Xul.BOX({ id: "fxrReplaceBarHtmlButton" }), // Warning: it can't be a button or the binding won't work as expected
      Xul.CHECKBOX({ id: "fxrReplaceBarCaseSensitiveCheckBox", label: strings.get("replaceBarCaseSensitive.label"),
                     accesskey: strings.get("replaceBarCaseSensitive.accesskey") }),
      Xul.BUTTON({ id: "fxrReplaceBarReplaceButton", disabled: "true", label: strings.get("replaceBarReplace.label"),
                   accesskey: strings.get("replaceBarReplace.accesskey"), command: "fxrCmdBarReplace" }),
      Xul.TOOLBARBUTTON({ id: "fxrReplaceBarCloseButton", "class": "findbar-closebutton close-icon", tooltiptext: strings.get("replaceBarClose"),
                          command: "fxrCmdHideReplaceBar" })
    );
  replaceBar.build(doc.getElementById("browser-bottombox"));
  
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

  let keyset = doc.getElementById("fxrKeyset");
  keyset.parentNode.removeChild(keyset);

  let editReplace = doc.getElementById("fxrMenuEditReplace");
  editReplace.parentNode.removeChild(editReplace);

  let toolsFoxReplace = doc.getElementById("fxrMenuToolsFoxReplace");
  toolsFoxReplace.parentNode.removeChild(toolsFoxReplace);

  let contextMenuItem = doc.getElementById("fxrContextMenuFoxReplace");
  contextMenuItem.parentNode.removeChild(contextMenuItem);

  let toolbarButton = doc.getElementById("fxrToolbarButton");
  toolbarButton.parentNode.removeChild(toolbarButton);

  let replaceBar = doc.getElementById("fxrReplaceBar");
  replaceBar.parentNode.removeChild(replaceBar);
  
  // Unload stylesheet
  let styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  let styleSheetURI = Services.io.newURI("chrome://foxreplace/skin/foxreplace.css", null, null);
  if (styleSheetService.sheetRegistered(styleSheetURI, styleSheetService.AUTHOR_SHEET))
    styleSheetService.unregisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
}
