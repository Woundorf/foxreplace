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

Components.utils.import("resource://foxreplace/services.js");
Components.utils.import("resource://foxreplace/xregexp-wrapper.js");

/**
 * Definitions of substitution and substitution group.
 */

var EXPORTED_SYMBOLS = ["Substitution", "SubstitutionGroup", "fxrIsExclusionUrl", "cloneSubstitutionList",
                        "substitutionListToJSON", "substitutionListFromJSON"];

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
    case this.INPUT_TEXT:
      {
        let unescapedInput = fxrUnescape(aInput);
        this._regExp = new XRegExp(fxrStringToUnicode(unescapedInput), aCaseSensitive ? "g" : "gi");
      }
      break;
    case this.INPUT_WHOLE_WORDS:
      {
        let unescapedInput = fxrUnescape(aInput);
        var suffix = wordEndRegExpSource(unescapedInput.charAt(unescapedInput.length - 1));
        this._regExp = new XRegExp(fxrStringToUnicode(unescapedInput) + suffix, aCaseSensitive ? "g" : "gi");
        this._firstCharCategory = charCategory(unescapedInput.charAt(0));
      }
      break;
    case this.INPUT_REG_EXP:
      this._regExp = new RegExp(aInput, aCaseSensitive ? "g" : "gi");
      break;
  }
}

/**
 * Returns the substitution represented by aSubstitutionJSON.
 */
Substitution.fromJSON = function(aSubstitutionJSON) {
  let inputType = this.prototype.INPUT_TYPE_STRINGS.indexOf(aSubstitutionJSON.inputType);
  return new Substitution(aSubstitutionJSON.input, aSubstitutionJSON.output, aSubstitutionJSON.caseSensitive, inputType);
};

Substitution.prototype = {

  /**
   * Returns a clone (a deep copy) of this substitution.
   */
  clone: function() {
    return new Substitution(this.input, this.output, this.caseSensitive, this.inputType);
  },

  /**
   * Applies the substitution to aString and returns the result.
   */
  replace: function(aString) {
    if (aString == undefined || aString == null) return aString;

    switch (this.inputType) {
      case this.INPUT_TEXT:
        return aString.replace(this._regExp, fxrUnescape(this.output));
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
 * Substitution group, including a name, an URL list and a substitution list. aHtml decides whether HTML is used only in output, both in input and output or not
 * used.
 */
function SubstitutionGroup(aName, aUrls, aSubstitutions, aHtml, aEnabled) {
  this.name = aName || "";
  this.urls = aUrls || [];
  this.substitutions = aSubstitutions || [];
  this.html = aHtml || this.HTML_NONE;
  if (this.html < this.HTML_NONE || this.html > this.HTML_INPUT_OUTPUT) this.html = this.HTML_NONE; // avoid invalid values
  this.enabled = Boolean(aEnabled);
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

/**
 * Returns the substitution group represented by aGroupJSON.
 */
SubstitutionGroup.fromJSON = function(aGroupJSON, aVersion) {
  let substitutions = [];
  for each (let substitutionJSON in aGroupJSON.substitutions) substitutions.push(Substitution.fromJSON(substitutionJSON));

  let html;
  if (aVersion == "0.13" || aVersion == "0.14") html = aGroupJSON.html ? this.prototype.HTML_INPUT_OUTPUT : this.prototype.HTML_NONE;
  else html = this.prototype.HTML_STRINGS.indexOf(aGroupJSON.html);

  let enabled = aVersion == "0.13" ? true : aGroupJSON.enabled;

  return new SubstitutionGroup(aGroupJSON.name, aGroupJSON.urls, substitutions, html, enabled);
};

SubstitutionGroup.prototype = {

  /**
   * Returns a clone (a deep copy) of this substitution group.
   */
  clone: function() {
    return new SubstitutionGroup(this.name, this.urls.map(function(aUrl) { return aUrl; }),
                                 this.substitutions.map(function(aSubstitution) { return aSubstitution.clone(); }), this.html, this.enabled);
  },

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
      html: this.HTML_STRINGS[this.html],
      enabled: this.enabled
    };
  }

};

/**
 * Constants.
 */
SubstitutionGroup.prototype.HTML_NONE = 0;
SubstitutionGroup.prototype.HTML_OUTPUT = 1;
SubstitutionGroup.prototype.HTML_INPUT_OUTPUT = 2;
SubstitutionGroup.prototype.HTML_STRINGS = ["none", "output", "inputoutput"];

/**
 * Returns whether aUrl is an exclusion URL or not (it is an exclusion URL if it starts with "-").
 */
function fxrIsExclusionUrl(aUrl) {
  return /^-.*/.test(aUrl);
}

/**
 * Returns a clone (a deep copy) of aSubstitutionList.
 */
function cloneSubstitutionList(aSubstitutionList) {
  return aSubstitutionList.map(function(aSubstitutionGroup) { return aSubstitutionGroup.clone(); });
}

/**
 * Returns aSubstitutionList as a simple object that can be serialized as JSON.
 */
function substitutionListToJSON(aSubstitutionList) {
  return {
    version: "0.15",
    groups: aSubstitutionList
  };
}

/**
 * Returns the substitution list represented by aListJSON.
 */
function substitutionListFromJSON(aListJSON) {
  // if (aListJSON.version ... // possible version check

  let list = [];

  for each (let groupJSON in aListJSON.groups) list.push(SubstitutionGroup.fromJSON(groupJSON, aListJSON.version));

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
