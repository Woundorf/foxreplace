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

/**
 * Utility object to set the output parameter of the Append/Overwrite dialog.
 */
var foxreplaceAppendOverwrite = {

  /**
   * Reverses the button order on GNU/Linux.
   */
  onLoad: function() {
    // Returns WINNT on Windows XP, 2000, NT and returns Linux on GNU/Linux
    var os = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
    if (os == "Linux") document.getElementById("buttons").dir = "reverse";
  },

  /**
   * Sets the output parameter and accepts the dialog.
   */
  setOutput: function(aOutputString) {
    window.arguments[0].out = { button: aOutputString };
    document.getElementById("foxreplaceDialogAppendOverwrite").acceptDialog();
  }

};
