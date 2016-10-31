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

const Ci = Components.interfaces;
const Cu = Components.utils;

const XPathResult = Ci.nsIDOMXPathResult;

Cu.import("chrome://foxreplace/content/core.js");
Cu.import("chrome://foxreplace/content/prefs.js");

/**
 * Exports a function that applies a substitution list to a window or frame.
 */

var EXPORTED_SYMBOLS = ["replaceWindow"];

/**
 * Applies aSubstitutionList to the document of aWindow.
 */
function replaceWindow(aWindow, aSubstitutionList) {
  if (aWindow.frames.length > 0) {
    var nFrames = aWindow.frames.length;
    for (var i = 0; i < nFrames; i++) replaceWindow(aWindow.frames[i], aSubstitutionList);
  }

  var doc = aWindow.document;
  if (!doc || !("body" in doc)) return;

  var url = doc.URL;
  if (!url) return;
  var nSubstitutions = aSubstitutionList.length;

  for (var j = 0; j < nSubstitutions; j++) {
    var group = aSubstitutionList[j];

    if (!group.matches(url)) continue;

    switch (group.html) {
      case group.HTML_NONE: replaceText(doc, group); break;
      case group.HTML_OUTPUT: replaceTextWithHtml(doc, group); break;
      case group.HTML_INPUT_OUTPUT: replaceHtml(doc, group); break;
    }
  }
}

/**
 * Applies substitutions from aGroup to aDocument on text.
 */
function replaceText(aDocument, aGroup) {
  // selection string possibilities
  /* ... empty(index-of(('style'),lower-case(name(parent::*))))  :( functions not supported */
  /* //body//text()[string-length(normalize-space())>0] */

  // TODO any other xml document won't be replaced

  // Replace text nodes
  var textNodesXpath = "/html/head/title/text()"
                     + "|/html/body//text()[not(parent::script)]";
  var textNodes = aDocument.evaluate(textNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  var nTextNodes = textNodes.snapshotLength;
  for (var i = 0; i < nTextNodes; i++) {
    var textNode = textNodes.snapshotItem(i);
    let oldTextContent = textNode.textContent;
    let newTextContent = aGroup.replace(oldTextContent);

    if (oldTextContent != newTextContent) {
      textNode.textContent = newTextContent;

      // Fire change event for textareas with default value (issue 49)
      if (textNode.parentNode.localName == "textarea" && textNode.parentNode.value == textNode.parentNode.defaultValue) {
        let event = aDocument.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        textNode.parentNode.dispatchEvent(event);
      }
    }
  }

  // Replace nodes with a "value" property
  var valueNodesXpath = "/html/body//input[@type='text']"
                      + "|/html/body//textarea"
                      + "|/html/body//@abbr"
                      + "|/html/body//@alt"
                      + "|/html/body//@label"
                      + "|/html/body//@standby"
                      + "|/html/body//@summary"
                      + "|/html/body//@title"
                      + "|/html/body//input[@type!='hidden']/@value"
                      + "|/html/body//option/@value"
                      + "|/html/body//button/@value";
  if (prefs.replaceUrls) {
    valueNodesXpath += "|/html/body//a/@href"
                     + "|/html/body//img/@src";
  }
  var valueNodes =
      aDocument.evaluate(valueNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  var nValueNodes = valueNodes.snapshotLength;
  for (var i = 0; i < nValueNodes; i++) {
    var valueNode = valueNodes.snapshotItem(i);

    // Special treatment for textareas that still have their default value (issue 63)
    if (valueNode.type == "textarea" && valueNode.value == valueNode.defaultValue) continue;

    let oldValue = valueNode.value;
    let newValue = aGroup.replace(oldValue);

    if (oldValue != newValue) {
      valueNode.value = newValue;

      // Fire change event for inputs and textareas (issue 49)
      if (valueNode.localName == "input" || valueNode.localName == "textarea") {
        let event = aDocument.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        valueNode.dispatchEvent(event);
      }
    }
  }

  // Replace scripts
  if (prefs.replaceScripts) {
    let scriptNodesXpath = "/html/body/script";
    let scriptNodes = aDocument.evaluate(scriptNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    let nScriptNodes = scriptNodes.snapshotLength;
    for (let i = 0; i < nScriptNodes; i++) {
      let scriptNode = scriptNodes.snapshotItem(i);
      let newText = aGroup.replace(scriptNode.text);
      if (newText != scriptNode.text) replaceScript(aDocument, scriptNode, newText);
    }
  }
}

/**
 * Applies substitutions from aGroup to aDocument on text with HTML output.
 */
function replaceTextWithHtml(aDocument, aGroup) {
  // Replace text nodes
  let textNodesXpath = "/html/head/title/text()"
                     + "|/html/body//text()[not(parent::script)]";
  let textNodes = aDocument.evaluate(textNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  let nTextNodes = textNodes.snapshotLength;

  for (let i = 0; i < nTextNodes; i++) {
    let textNode = textNodes.snapshotItem(i);
    let originalText = textNode.textContent;
    let replacedText = aGroup.replace(originalText);

    if (originalText != replacedText) {
      let fragment = aDocument.createDocumentFragment();
      let tmp = aDocument.createElement("a");
      tmp.innerHTML = replacedText;
      let child = tmp.firstChild;

      while (child) {
        fragment.appendChild(child);
        child = tmp.firstChild
      }

      let parent = textNode.parentNode;
      parent.replaceChild(fragment, textNode);

      // Fire change event for textareas with default value (issue 49)
      if (parent.localName == "textarea" && parent.value == parent.defaultValue) {
        let event = aDocument.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        parent.dispatchEvent(event);
      }
    }
  }

  // Replace scripts
  if (prefs.replaceScripts) {
    let scriptNodesXpath = "/html/body/script";
    let scriptNodes = aDocument.evaluate(scriptNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    let nScriptNodes = scriptNodes.snapshotLength;

    for (let i = 0; i < nScriptNodes; i++) {
      let scriptNode = scriptNodes.snapshotItem(i);
      let newText = aGroup.replace(scriptNode.text);
      if (newText != scriptNode.text) replaceScript(aDocument, scriptNode, newText);
    }
  }
}

/**
 * Applies substitutions from aGroup to aDocument on HTML.
 */
function replaceHtml(aDocument, aGroup) {
  var html = aDocument.evaluate("/html", aDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  let oldHtml = html.singleNodeValue.innerHTML;
  let newHtml = aGroup.replace(html.singleNodeValue.innerHTML);

  if (oldHtml != newHtml) {
    html.singleNodeValue.innerHTML = newHtml;

    // Replace scripts
    if (prefs.replaceScripts) {
      let scriptNodesXpath = "/html//script";
      let scriptNodes = aDocument.evaluate(scriptNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      let nScriptNodes = scriptNodes.snapshotLength;
      for (let i = 0; i < nScriptNodes; i++) {
        let scriptNode = scriptNodes.snapshotItem(i);
        replaceScript(aDocument, scriptNode, scriptNode.text);
        // scriptNode.text is already the replaced code, but scriptNode still executes the old code, so a new script node has to be created for the change to
        // really work
      }
    }
  }
}

/**
 * Replaces aScript within aDocument with a new one with aNewCode.
 */
function replaceScript(aDocument, aScript, aNewCode) {
  let newScript = aDocument.createElement("script");
  let attributes = aScript.attributes;
  let nAttributes = attributes.length;
  for (let i = 0; i < nAttributes; i++) newScript.setAttribute(attributes[i].name, attributes[i].value);
  newScript.text = aNewCode;
  aScript.parentNode.replaceChild(newScript, aScript);
}
