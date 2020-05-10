/** ***** BEGIN LICENSE BLOCK *****
 *
 *  Copyright (C) 2020 Marc Ruiz Altisent. All rights reserved.
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
 * Applies aSubstitutionList to the document of aWindow.
 */
function replaceWindow(aWindow, aSubstitutionList, aPrefs) {
  var doc = aWindow.document;
  if (!doc || !("body" in doc)) return;

  var url = doc.URL;
  if (!url) return;

  let applicableGroups = aSubstitutionList.filter(group => group.matches(url));

  // Optimization: handle together consecutive groups with the same HTML mode to reduce the number of renders

  for (let i = 0; i < applicableGroups.length; i++) {
    let group = applicableGroups[i];
    let html = group.html;
    let consecutiveGroups = [group];

    for (let j = i + 1; j < applicableGroups.length; j++) {
      if (applicableGroups[j].html == html) {
        consecutiveGroups.push(applicableGroups[j]);
        i = j;
      }
      else {
        break;
      }
    }

    switch (html) {
      case group.HTML_NONE: replaceText(doc, consecutiveGroups, aPrefs); break;
      case group.HTML_OUTPUT: replaceTextWithHtml(doc, consecutiveGroups, aPrefs); break;
      case group.HTML_INPUT_OUTPUT: replaceHtml(doc, consecutiveGroups, aPrefs); break;
    }
  }
}

/**
 * Applies substitutions from aGroups to aDocument on text.
 */
function replaceText(aDocument, aGroups, aPrefs) {
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
    replaceTextNode(textNode, aGroups);
  }

  // Replace nodes with a "value" property
  var valueNodesXpath = "/html/body//input[@type='text']"
                      + "|/html/body//input[not(@type)]"
                      + "|/html/body//textarea"
                      + "|/html/body//@abbr"
                      + "|/html/body//@alt"
                      + "|/html/body//@label"
                      + "|/html/body//@standby"
                      + "|/html/body//@summary"
                      + "|/html/body//@title"
                      + "|/html/body//input[@type!='hidden']/@value"
                      + "|/html/body//input[not(@type)]/@value"
                      + "|/html/body//option/@value"
                      + "|/html/body//button/@value";
  if (aPrefs.replaceUrls) {
    valueNodesXpath += "|/html/body//a/@href"
                     + "|/html/body//img/@src";
  }
  var valueNodes =
      aDocument.evaluate(valueNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  var nValueNodes = valueNodes.snapshotLength;
  for (var i = 0; i < nValueNodes; i++) {
    var valueNode = valueNodes.snapshotItem(i);
    replaceValueNode(valueNode, aGroups);
  }

  // Replace scripts
  if (aPrefs.replaceScripts) {
    let scriptNodesXpath = "/html/body/script";
    let scriptNodes = aDocument.evaluate(scriptNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    let nScriptNodes = scriptNodes.snapshotLength;
    for (let i = 0; i < nScriptNodes; i++) {
      let scriptNode = scriptNodes.snapshotItem(i);
      let newText = scriptNode.text;
      for (let group of aGroups) {
        newText = group.replace(newText);
      }
      if (newText != scriptNode.text) replaceScript(aDocument, scriptNode, newText);
    }
  }
}

/**
 * Applies substitutions from aGroups to aDocument on text with HTML output.
 */
function replaceTextWithHtml(aDocument, aGroups, aPrefs) {
  // Since each substitution potentially changes the DOM, each group has to be applied individually.
  // In fact each single substitution should be applied individually, but it has never been done that way, so let's keep the old logic for now.
  for (let group of aGroups) {
    // Replace text nodes
    let textNodesXpath = "/html/head/title/text()"
                       + "|/html/body//text()[not(parent::script)]";
    let textNodes = aDocument.evaluate(textNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    let nTextNodes = textNodes.snapshotLength;

    for (let i = 0; i < nTextNodes; i++) {
      let textNode = textNodes.snapshotItem(i);
      replaceTextNode(textNode, [group], true);
    }

    // Replace scripts
    if (aPrefs.replaceScripts) {
      let scriptNodesXpath = "/html/body/script";
      let scriptNodes = aDocument.evaluate(scriptNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      let nScriptNodes = scriptNodes.snapshotLength;

      for (let i = 0; i < nScriptNodes; i++) {
        let scriptNode = scriptNodes.snapshotItem(i);
        let newText = group.replace(scriptNode.text);
        if (newText != scriptNode.text) replaceScript(aDocument, scriptNode, newText);
      }
    }
  }
}

/**
 * Applies substitutions from aGroups to aDocument on HTML.
 */
function replaceHtml(aDocument, aGroups, aPrefs) {
  var html = aDocument.evaluate("/html", aDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  let oldHtml = html.singleNodeValue.innerHTML;
  let newHtml = oldHtml;

  for (let group of aGroups) {
    newHtml = group.replace(newHtml);
  }

  if (oldHtml != newHtml) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(newHtml, "text/html");
    aDocument.replaceChild(doc.documentElement, aDocument.documentElement);

    // Replace scripts
    if (aPrefs.replaceScripts) {
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
 * Replaces the text content in the given node with the given groups. If the resulting text is the same the node is not modified.
 * @param {Node} node The node whose text content has to be replaced.
 * @param {SubstitutionGroup[]} groups List of substitution groups to apply.
 * @param {boolean} [replaceWithHtml=false] If false, the text is replaced with text; if true it is replaced with HTML.
 */
function replaceTextNode(node, groups, replaceWithHtml = false) {
  let oldTextContent = node.textContent;
  let newTextContent = oldTextContent;

  for (let group of groups) {
    newTextContent = group.replace(newTextContent);
  }

  if (oldTextContent != newTextContent) {
    let parent = node.parentNode;
    let selectionStart, selectionEnd, selectionDirection;

    // Save selection to restore it after change
    if (parent.localName == 'textarea' && parent.value == parent.defaultValue) {
      selectionStart = parent.selectionStart;
      selectionEnd = parent.selectionEnd;
      selectionDirection = parent.selectionDirection;
    }

    if (replaceWithHtml) {
      let parser = new DOMParser();
      let parsedDocument = parser.parseFromString(newTextContent, 'text/html');
      let fragment = node.ownerDocument.createDocumentFragment();
      let child = parsedDocument.body.firstChild;

      while (child) {
        fragment.appendChild(child);
        child = parsedDocument.body.firstChild;
      }

      parent.replaceChild(fragment, node);
    }
    else {
      node.textContent = newTextContent;
    }

    // Restore cursor position or selection (#15) and fire change event (#49) for textareas with default value
    if (parent.localName == 'textarea' && parent.value == parent.defaultValue) {
      parent.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
      let event = new Event('change', { bubbles: true, cancelable: false });
      parent.dispatchEvent(event);
    }
  }
}

/**
 * Replaces the value in the given node with the given groups. If the resulting value is the same the node is not modified.
 * @param {Node} node The node whose value has to be replaced.
 * @param {SubstitutionGroup[]} groups List of substitution groups to apply.
 */
function replaceValueNode(node, groups) {
  // Special treatment for textareas that still have their default value (#63) (they are replaced as text nodes)
  if (node.type == 'textarea' && node.value == node.defaultValue) return;

  let oldValue = node.value;
  let newValue = oldValue;

  for (let group of groups) {
    newValue = group.replace(newValue);
  }

  if (oldValue != newValue) {
    let selectionStart, selectionEnd, selectionDirection;

    // Save selection to restore it after change
    if (node.localName == 'input' || node.localName == 'textarea') {
      selectionStart = node.selectionStart;
      selectionEnd = node.selectionEnd;
      selectionDirection = node.selectionDirection;
    }

    node.value = newValue;

    // Restore cursor position or selection (#15) and fire change event (#49) for inputs and textareas
    if (node.localName == 'input' || node.localName == 'textarea') {
      node.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
      let event = new Event('change', { bubbles: true, cancelable: false });
      node.dispatchEvent(event);
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
