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
 * Applies aSubstitutionList to the document of aWindow.
 */
function replaceWindow(aWindow, aSubstitutionList, aPrefs) {
  const doc = aWindow.document;
  if (!doc || !("body" in doc)) return;

  const url = doc.URL;
  if (!url) return;

  const applicableGroups = aSubstitutionList.filter(group => group.matches(url));

  // Optimization: handle together consecutive groups with the same HTML mode to reduce the number of renders

  for (let i = 0; i < applicableGroups.length; i++) {
    const group = applicableGroups[i];
    const html = group.html;
    const consecutiveGroups = [group];

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
      default: console.error('Fox Replace: Invalid output type');
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
  const textNodesXpath = "/html/head/title/text()"
                     + "|/html/body//text()[not(parent::script)]";
  const textNodes = aDocument.evaluate(textNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  const nTextNodes = textNodes.snapshotLength;
  for (let i = 0; i < nTextNodes; i++) {
    const textNode = textNodes.snapshotItem(i);
    const oldTextContent = textNode.textContent;
    let newTextContent = oldTextContent;

    for (const group of aGroups) {
      newTextContent = group.replace(newTextContent);
    }

    if (oldTextContent != newTextContent) {
      textNode.textContent = newTextContent;

      // Fire change event for textareas with default value (issue 49)
      if (textNode.parentNode.localName == "textarea" && textNode.parentNode.value == textNode.parentNode.defaultValue) {
        const event = aDocument.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        textNode.parentNode.dispatchEvent(event);
      }
    }
  }

  // Replace nodes with a "value" property
  const valueNodesXpath = "/html/body//input[@type='text']"
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

    // Special treatment for textareas that still have their default value (issue 63)
    if (valueNode.type == "textarea" && valueNode.value == valueNode.defaultValue) continue;

    let oldValue = valueNode.value;
    let newValue = oldValue;

    for (let group of aGroups) {
      newValue = group.replace(newValue);
    }

    if (oldValue != newValue) {
      let selectionStart, selectionEnd, selectionDirection;

      if (valueNode.localName == "input" || valueNode.localName == "textarea") {
        selectionStart = valueNode.selectionStart;
        selectionEnd = valueNode.selectionEnd;
        selectionDirection = valueNode.selectionDirection;
      }

      valueNode.value = newValue;

      // Restore cursor position or selection (#15) and fire change event (#49) for inputs and textareas
      if (valueNode.localName == "input" || valueNode.localName == "textarea") {
        valueNode.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
        let event = aDocument.createEvent("HTMLEvents");
        event.initEvent("change", true, false);
        valueNode.dispatchEvent(event);
      }
    }
  }

  // Replace scripts
  if (aPrefs.replaceScripts) {
    const scriptNodesXpath = "/html/body/script";
    const scriptNodes = aDocument.evaluate(scriptNodesXpath, aDocument, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    const nScriptNodes = scriptNodes.snapshotLength;
    for (let i = 0; i < nScriptNodes; i++) {
      const scriptNode = scriptNodes.snapshotItem(i);
      let newText = scriptNode.text;
      for (const group of aGroups) {
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
      let originalText = textNode.textContent;
      let replacedText = group.replace(originalText);

      if (originalText != replacedText) {
        let parser = new DOMParser();
        let doc = parser.parseFromString(replacedText, "text/html");
        let fragment = aDocument.createDocumentFragment();
        let child = doc.body.firstChild;

        while (child) {
          fragment.appendChild(child);
          child = doc.body.firstChild;
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
