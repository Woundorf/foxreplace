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
 *  This file incorporates work covered by the following copyright and permission notice:
 *
 *    Software License Agreement (BSD License)
 *
 *    Copyright (c) 2009, Mozilla Foundation
 *    All rights reserved.
 *
 *    Redistribution and use of this software in source and binary forms, with or without modification,
 *    are permitted provided that the following conditions are met:
 *
 *    * Redistributions of source code must retain the above
 *      copyright notice, this list of conditions and the
 *      following disclaimer.
 *
 *    * Redistributions in binary form must reproduce the above
 *      copyright notice, this list of conditions and the
 *      following disclaimer in the documentation and/or other
 *      materials provided with the distribution.
 *
 *    * Neither the name of Mozilla Foundation nor the names of its
 *      contributors may be used to endorse or promote products
 *      derived from this software without specific prior
 *      written permission of Mozilla Foundation.
 *
 *    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 *    IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 *    FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 *    CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 *    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 *    DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *    IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 *    OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *  ***** END LICENSE BLOCK ***** */

"use strict";

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var EXPORTED_SYMBOLS = ["Xul"];

// XUL namespace (see also defineTags method at the bottom of this module).
var Xul = {};

function XulTag(tagName) {
  this.tagName = tagName;
  this.children = [];
}

/**
 * XUL tag (simplified DomplateTag version). This object allows
 * building XUL DOM structure using predefined tags (function) and
 * simplify the code (by minimizing the amount of createElement and
 * setAttribute API calls).
 * 
 * See an example:
 *
 * let box =
 *   HBOX({"id": "myBox", "flex": 1},
 *     BOX({"class": "leftPane"},
 *     SPLITTER({"class": "splitter"},
 *     BOX({"class": "rightPane"}
 *   );
 * box.build(parentNode);
 */
XulTag.prototype =
/** @lends XulTag */
{
  merge: function(args) {
    // The first argument might be an object with attributes.
    let attrs = args.length ? args[0] : null;
    let hasAttrs = typeof(attrs) == "object" && !isTag(attrs);

    // If hasAttrs is true, the first argument passed into the XUL tag
    // is really a set of attributes.
    if (hasAttrs) {
      this.attrs = attrs;
    }

    // The other arguments passed into the XUL tag might be children.
    if (args.length) {
      this.children = Array.prototype.slice.call(args);

      if (hasAttrs) {
        this.children.shift();
      }
    }

    return this;
  },

  build: function(parentNode, options = {}) {
    let doc = parentNode.ownerDocument;

    // Create the current XUL element and set all defined attributes 
    let node = doc.createElementNS(XUL_NS, this.tagName);
    for (let key in this.attrs) {
      node.setAttribute(key, this.attrs[key]);
    }

    // Create all children and append them into the parent element.
    for (let i=0; i<this.children.length; i++) {
      let child = this.children[i];
      child.build(node);
    }

    // Append created element at the right position within
    // the parent node.
    if (options.insertBefore) {
      parentNode.insertBefore(node, options.insertBefore);
    }
    else {
      parentNode.appendChild(node);
    }

    return node;
  }
}

function isTag(obj) {
  return (obj instanceof XulTag);
}

// Define basic set of XUL tags.
function defineTags() {
  for (let i=0; i<arguments.length; i++) {
    let tagName = arguments[i];
    let fn = createTagHandler(tagName);
    let fnName = tagName.toUpperCase();

    Xul[fnName] = fn;
  }

  function createTagHandler(tagName) {
    return function() {
      let newTag = new XulTag(tagName);
      return newTag.merge(arguments);
    };
  }
}

// Basic XUL tags, append others as needed.
defineTags(
  "box", "vbox", "hbox", "splitter", "toolbar", "radio", "image",
  "menupopup", "textbox", "tabbox", "tabs", "tabpanels", "toolbarbutton",
  "arrowscrollbox", "tabscrollbox", "iframe", "description", "panel",
  "label", "progressmeter", "resizer", "stack", "spacer",
  "commandset", "command", "keyset", "key", "menuitem", "menu", "menuseparator", "checkbox", "button"
);
