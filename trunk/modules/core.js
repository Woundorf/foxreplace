/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
 * specific language governing rights and limitations under the License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2009-2012 the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of either the GNU General Public License Version 2 or later (the "GPL"), or the GNU
 * Lesser General Public License Version 2.1 or later (the "LGPL"), in which case the provisions of the GPL or the LGPL are applicable instead of those above.
 * If you wish to allow use of your version of this file only under the terms of either the GPL or the LGPL, and not to allow others to use your version of this
 * file under the terms of the MPL, indicate your decision by deleting the provisions above and replace them with the notice and other provisions required by
 * the GPL or the LGPL. If you do not delete the provisions above, a recipient may use your version of this file under the terms of any one of the MPL, the GPL
 * or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import("resource://foxreplace/jxon.js");
Components.utils.import("resource://foxreplace/services.js");
Components.utils.import("resource://foxreplace/xregexp-wrapper.js");

/**
 * Definitions of substitution and substitution group.
 */

var EXPORTED_SYMBOLS = ["Substitution", "SubstitutionGroup", "fxrSubstitutionListFromXml", "fxrIsExclusionUrl", "substitutionListToJSON",
                        "substitutionListFromJSON"];

/**
 * Substitution.
 */
function Substitution(aInput, aOutput, aCaseSensitive, aInputType) {
  this.input = aInput;
  this.output = aOutput;
  this.caseSensitive = Boolean(aCaseSensitive);
  this.inputType = aInputType || this.INPUT_TEXT;
  // avoid invalid values
  if (this.inputType < this.INPUT_TEXT || this.inputType > this.INPUT_REG_EXP) this.inputType = this.INPUT_TEXT;

  switch (this.inputType) {
    case this.INPUT_WHOLE_WORDS:
      var unescapedInput = fxrUnescape(aInput);
      var suffix = wordEndRegExpSource(unescapedInput.charAt(unescapedInput.length - 1));
      this._regExp = new XRegExp(fxrStringToUnicode(unescapedInput) + suffix, aCaseSensitive ? "g" : "gi");
      this._firstCharCategory = charCategory(unescapedInput.charAt(0));
      break;
    case this.INPUT_REG_EXP:
      this._regExp = new RegExp(aInput, aCaseSensitive ? "g" : "gi");
      break;
  }
}
/**
 * Creates a substitution from an XML object.
 */
Substitution.fromXml = function(aXml) {
  var input = aXml.input.slice(1, -1);   // to remove quotes
  var output = aXml.output.slice(1, -1); // to remove quotes
  var caseSensitive = aXml["@casesensitive"] == true;
  var inputType = this.prototype.INPUT_TYPE_STRINGS.indexOf(aXml.input["@type"]);

  try {
    return new Substitution(input, output, caseSensitive, inputType);
  }
  catch (e if e instanceof SyntaxError) {
    e.message = '"' + input + '": ' + e.message;
    throw e;
  }
};

/**
 * Returns the substitution represented by aSubstitutionJSON.
 */
Substitution.fromJSON = function(aSubstitutionJSON) {
  let inputType = this.prototype.INPUT_TYPE_STRINGS.indexOf(aSubstitutionJSON.inputType);
  return new Substitution(aSubstitutionJSON.input, aSubstitutionJSON.output, aSubstitutionJSON.caseSensitive, inputType);
};

Substitution.prototype = {
  /**
   * Applies the substitution to aString and returns the result.
   */
  replace: function(aString) {
    if (aString == undefined || aString == null) return aString;

    switch (this.inputType) {
      case this.INPUT_TEXT:
        return aString.replace(fxrUnescape(this.input), fxrUnescape(this.output), this.caseSensitive ? "g" : "gi");
      case this.INPUT_WHOLE_WORDS:
        // necessary according to http://stackoverflow.com/questions/4950463/regex-in-javascript-fails-every-other-time-with-identical-input
        this._regExp.lastIndex = 0;
        var self = this;
        function replaceWholeWord(aWord, aIndex, aString) {
          if (aIndex == 0 || self._firstCharCategory != charCategory(aString.charAt(aIndex - 1))) {
            var output = fxrUnescape(self.output);
            var re = /\$[\$\&\`\']/g;
            var fragments = output.split(re);
            var nFragments = fragments.length;
            var result = fragments[0];
            var i = fragments[0].length + 1;    // index of the char after the $
            for (var j = 1; j < nFragments; j++) {
              var c = output.charAt(i);
              if (c == "$") result += "$";
              else if (c == "&") result += aWord;
              else if (c == "`") result += aString.slice(0, aIndex);
              else if (c == "'") result += aString.slice(aIndex + aWord.length);
              result += fragments[j];
              i += 2 + fragments[j].length;
            }
            return result;
          }
          else return aWord;
        }
        return aString.replace(this._regExp, replaceWholeWord);
      case this.INPUT_REG_EXP:
        // necessary according to http://stackoverflow.com/questions/4950463/regex-in-javascript-fails-every-other-time-with-identical-input
        this._regExp.lastIndex = 0;
        return aString.replace(this._regExp, fxrUnescape(this.output));
    }
  },

  /**
   * Returns the substitution as a simple object that can be serialized as JSON.
   */
  toJSON: function() {
    return {
      input: this.input,
      inputType: this.INPUT_TYPE_STRINGS[this.inputType],
      output: this.output,
      caseSensitive: this.caseSensitive
    };
  }

};
/**
 * Constants.
 */
Substitution.prototype.INPUT_TEXT = 0;
Substitution.prototype.INPUT_WHOLE_WORDS = 1;
Substitution.prototype.INPUT_REG_EXP = 2;
Substitution.prototype.INPUT_TYPE_STRINGS = ["text", "wholewords", "regexp"];

/**
 * Substitution group, including a name, an URL list and a substitution list. If aHtml is true, substitutions are done in HTML.
 */
function SubstitutionGroup(aName, aUrls, aSubstitutions, aHtml) {
  this.name = aName || "";
  this.urls = aUrls || [];
  this.substitutions = aSubstitutions || [];
  this.html = Boolean(aHtml);
  this.urls.sort();
  this.urlRegExps = [];
  this.exclusionUrlRegExps = [];
  this.urls.forEach(function(element) {
                      var url, exclusion;
                      if (fxrIsExclusionUrl(element)) {
                        url = fxrCleanExclusionUrl(element);
                        exclusion = true;
                      }
                      else {
                        url = element;
                        exclusion = false;
                      }
                      var regExp = new RegExp(url.replace(/\*+/g, "*")      // remove multiple wildcards
                                                 .replace(/(\W)/g, "\\$1")  // escape special symbols
                                                 .replace(/\\\*/g, ".*")    // replace wildcards by .*
                                                 .replace(/^\\\|/, "^")     // process anchor at expression start
                                                 .replace(/\\\|$/, "$")     // process anchor at expression end
                                                 .replace(/^(\.\*)/,"")     // remove leading wildcards
                                                 .replace(/(\.\*)$/,""));   // remove trailing wildcards
                      if (exclusion) this.exclusionUrlRegExps.push(regExp);
                      else this.urlRegExps.push(regExp);
                    }, this);
}

SubstitutionGroup.prototype = {

  /**
   * Returns whether the substitution group should be applied to aUrl.
   */
  matches: function(aUrl) {
    return (this.urlRegExps.length == 0 || this.urlRegExps.some(function(element) { return element.test(aUrl); })) &&
           !this.exclusionUrlRegExps.some(function(element) { return element.test(aUrl); });
  },

  /**
   * Applies the substitution group to aString and returns the result.
   */
  replace: function(aString) {
    if (!aString) return aString;
    this.substitutions.forEach(function(element) { aString = element.replace(aString); });
    return aString;
  },

  /**
   * Applies the substitution group to aString if aUrl matches any of the urls and returns the result.
   */
  applyTo: function(aUrl, aString) {
    if (this.matches(aUrl)) return this.replace(aString);
    else return aString;
  },

  /**
   * Returns a non-empty name for a substitution group. If it has a name it is returned. Otherwise a default name is returned.
   */
  get nonEmptyName() {
    if (this.name) return this.name;
    else if (this.urls.length == 0) return getLocalizedString("generalSubstitutions");
    else if (this.urls.length == 1) return getLocalizedString("substitutionsForUrl", [this.urls[0]]);
    else return getLocalizedString("substitutionsForUrls", [this.urls[0]]);
  },

  /**
   * Returns the substitution group as a simple object that can be serialized as JSON.
   */
  toJSON: function() {
    return {
      name: this.name,
      urls: this.urls,
      substitutions: this.substitutions,
      html: this.html
    };
  }

};

/**
 * Creates a substitution group from an XML object.
 */
SubstitutionGroup.fromXml = function(aXml) {
  let urlsJxon;

  if (!aXml.urls.url) urlsJxon = [];  // special case when there are no urls
  else urlsJxon = aXml.urls.url;

  if (!Array.isArray(urlsJxon)) urlsJxon = [urlsJxon];  // special case when there is one url

  let urls = [];
  for each (let url in urlsJxon) urls.push(url);

  let substitutionsJxon;

  if (!aXml.substitutions.substitution) substitutionsJxon = []; // special case when there are no substitutions (should not happen)
  else substitutionsJxon = aXml.substitutions.substitution;

  if (!Array.isArray(substitutionsJxon)) substitutionsJxon = [substitutionsJxon]; // special case when there is one substitution

  let substitutions = [];

  var errors = "";
  for each (let substitution in substitutionsJxon) {
    try {
      substitutions.push(Substitution.fromXml(substitution));
    }
    catch (e) {
      errors += e + "\n";
    }
  }

  var html = aXml["@html"] == true;

  if (errors) prompts.alert(getLocalizedString("xmlErrorTitle"), getLocalizedString("xmlGroupErrorText") + "\n" + errors);

  return new SubstitutionGroup("", urls, substitutions, html);
};

/**
 * Returns the substitution group represented by aGroupJSON.
 */
SubstitutionGroup.fromJSON = function(aGroupJSON) {
  let substitutions = [];

  for each (let substitutionJSON in aGroupJSON.substitutions) substitutions.push(Substitution.fromJSON(substitutionJSON));

  return new SubstitutionGroup(aGroupJSON.name, aGroupJSON.urls, substitutions, aGroupJSON.html);
};

/**
 * Creates the substitution list from an XML object.
 */
function fxrSubstitutionListFromXml(aListXml) {
  let listJxon = JXON.build(aListXml, 0);
  //prompts.alert("JXON", JSON.stringify(listJxon));
  var substitutionList = [];

  if (listJxon.substitutionlist) {  // necessary when receiving empty string
    let groups;

    if (!listJxon.substitutionlist.group) groups = [];  // special case when there are no groups
    else groups = listJxon.substitutionlist.group;

    if (!Array.isArray(groups)) groups = [groups];  // special case when there is one group

    for each (let group in groups) {
      substitutionList.push(SubstitutionGroup.fromXml(group));
    }
  }

  return substitutionList;
}

/**
 * Returns whether aUrl is an exclusion URL or not (it is an exclusion URL if it starts with "-").
 */
function fxrIsExclusionUrl(aUrl) {
  return /^-.*/.test(aUrl);
}

/**
 * Returns aSubstitutionList as a simple object that can be serialized as JSON.
 */
function substitutionListToJSON(aSubstitutionList) {
  return {
    version: "0.14",
    groups: aSubstitutionList
  };
}

/**
 * Returns the substitution list represented by aListJSON.
 */
function substitutionListFromJSON(aListJSON) {
  // if (aListJSON.version ... // possible version check

  let list = [];

  for each (let groupJSON in aListJSON.groups) list.push(SubstitutionGroup.fromJSON(groupJSON));

  return list;
}

////////////////////////////////////// Non-exported functions //////////////////////////////////////

/**
 * Unescapes backslash-escaped special characters in aString.
 */
function fxrUnescape(aString) {
  return aString.replace(/\\./g, function(str) {
                                   if (str == "\\\\") return "\\";
                                   if (str == "\\n") return "\n";
                                   if (str == "\\r") return "\r";
                                   if (str == "\\t") return "\t";
                                   return str;
                                 });
}

/**
 * Char categories.
 */
const WORD_CHAR = 0;
const NON_WORD_CHAR = 1;
const SEPARATOR_CHAR = 2;

/**
 * Regular expression sources for testing char categories.
 */
const WORD_CHAR_REGEXP_SOURCE = "[\\p{Letter}\\p{Mark}\\p{Number}_]";
const SEPARATOR_CHAR_REGEXP_SOURCE = "[\\s\\p{Separator}]";
const NON_WORD_CHAR_REGEXP_SOURCE = "[^" + WORD_CHAR_REGEXP_SOURCE.slice(1, -1) + SEPARATOR_CHAR_REGEXP_SOURCE.slice(1, -1) + "]";

/**
 * Regular expression sources for testing "word" ends.
 */
const WORD_END_REGEXP_SOURCES = [
  "(?!" + WORD_CHAR_REGEXP_SOURCE + ")",      // word end
  "(?!" + NON_WORD_CHAR_REGEXP_SOURCE + ")",  // non-word "word" end
  "(?!" + SEPARATOR_CHAR_REGEXP_SOURCE + ")"  // separator "word" end
];

/**
 * Returns the category of aChar.
 */
function charCategory(aChar) {
  if (XRegExp.cache(WORD_CHAR_REGEXP_SOURCE).test(aChar)) return WORD_CHAR;
  else if (XRegExp.cache(NON_WORD_CHAR_REGEXP_SOURCE).test(aChar)) return NON_WORD_CHAR;
  else return SEPARATOR_CHAR;
}

function wordEndRegExpSource(aChar) {
  return WORD_END_REGEXP_SOURCES[charCategory(aChar)];
}

/**
 * Converts all the characters of aString to escaped unicode notation.
 */
function fxrStringToUnicode(aString) {
  var result = "";
  var length = aString.length;

  for (var i = 0; i < length; i++) result += "\\u" + fxrNumberToHex(aString.charCodeAt(i));

  return result;
};

/**
 * Converts aNumber to hexadecimal with aDigits digits.
 */
function fxrNumberToHex(aNumber, aDigits) {
  var hex = aNumber.toString(16);
  var digits = aDigits || 4;
  var length = hex.length;

  for (var i = length; i < digits; i++) hex = "0" + hex;

  return hex;
};

/**
 * Returns aUrl removing the exclusion part.
 */
function fxrCleanExclusionUrl(aUrl) {
  if (fxrIsExclusionUrl(aUrl)) return aUrl.slice(1);
  else return aUrl;
}
