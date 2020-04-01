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
 *  Represents a single substitution with an input, an output and some additional parameters.
 */
var Substitution = (() => {

  class Substitution {

    constructor(input, output, caseSensitive = false, inputType = this.INPUT_TEXT) {
      this.input = input;
      this.output = output;
      this.caseSensitive = caseSensitive;
      this.inputType = inputType;

      this.init();
    }

    /**
     *  Initializes this object after assigning basic properties.
     */
    init() {
      this.input = String(this.input);
      this.output = String(this.output);
      this.caseSensitive = Boolean(this.caseSensitive);
      if (this.inputType != this.INPUT_TEXT && this.inputType != this.INPUT_WHOLE_WORDS && this.inputType != this.INPUT_REG_EXP)
        this.inputType = this.INPUT_TEXT; // avoid invalid values

      switch (this.inputType) {
        case this.INPUT_TEXT:
          {
            let unescapedInput = unescape(this.input);
            this.regExp = new RegExp(stringToUnicode(unescapedInput), this.caseSensitive ? "g" : "gi");
          }
          break;
        case this.INPUT_WHOLE_WORDS:
          {
            let unescapedInput = unescape(this.input);
            let suffix = wordEndRegExpSource(unescapedInput.charAt(unescapedInput.length - 1));
            this.regExp = new XRegExp(stringToUnicode(unescapedInput) + suffix, this.caseSensitive ? "g" : "gi");
            this.firstCharCategory = charCategory(unescapedInput.charAt(0));
          }
          break;
        case this.INPUT_REG_EXP:
          this.regExp = new RegExp(this.input, this.caseSensitive ? "g" : "gi");
          break;
      }
    }

    /**
     *  Applies this substitution to the given string and returns the result.
     */
    replace(string) {
      if (string === undefined || string === null) return string;

      switch (this.inputType) {
        case this.INPUT_TEXT:
          // necessary according to https://stackoverflow.com/q/1520800
          this.regExp.lastIndex = 0;
          return string.replace(this.regExp, unescape(this.output));

        case this.INPUT_WHOLE_WORDS:
          // necessary according to https://stackoverflow.com/q/1520800
          this.regExp.lastIndex = 0;
          return string.replace(this.regExp, (word, index, string) => {
            if (index === 0 || this.firstCharCategory != charCategory(string.charAt(index - 1))) {
              let output = unescape(this.output);
              let re = /\$[\$\&\`\']/g;
              let fragments = output.split(re);
              let nFragments = fragments.length;
              let result = fragments[0];
              let i = fragments[0].length + 1;    // index of the char after the $
              for (let j = 1; j < nFragments; j++) {
                let c = output.charAt(i);
                if (c == "$") result += "$";
                else if (c == "&") result += word;
                else if (c == "`") result += string.slice(0, index);
                else if (c == "'") result += string.slice(index + word.length);
                result += fragments[j];
                i += 2 + fragments[j].length;
              }
              return result;
            }
            else {
              return word;
            }
          });

        case this.INPUT_REG_EXP:
          // necessary according to https://stackoverflow.com/q/1520800
          this.regExp.lastIndex = 0;
          return string.replace(this.regExp, unescape(this.output));
      }
    }

    /**
     *  Converts this substitution to JSON.
     */
    toJSON() {
      return {
        input: this.input,
        inputType: this.inputType,
        output: this.output,
        caseSensitive: this.caseSensitive
      };
    }

  }

  /**
   *  Creates a substitution from the given JSON.
   */
  Substitution.fromJSON = function(json) {
    return new Substitution(json.input, json.output, json.caseSensitive, json.inputType);
  };

  /**
   *  Constants.
   */
  Object.defineProperties(Substitution.prototype, {
    INPUT_TEXT: { value: 'text' },
    INPUT_WHOLE_WORDS: { value: 'wholewords' },
    INPUT_REG_EXP: { value: 'regexp' }
  });

  // Unescapes backslash-escaped special characters in the given string.
  function unescape(string) {
    return string.replace(/\\./g, str => {
      if (str == "\\\\") return "\\";
      if (str == "\\n") return "\n";
      if (str == "\\r") return "\r";
      if (str == "\\t") return "\t";
      return str;
    });
  }

  // Converts all the characters of the given string to escaped unicode notation.
  function stringToUnicode(string) {
    let result = "";
    let length = string.length;
    for (let i = 0; i < length; i++) result += "\\u" + numberToHex(string.charCodeAt(i));
    return result;
  }

  // Converts the given number to hexadecimal with 4 digits.
  function numberToHex(number) {
    return number.toString(16).padStart(4, "0");
  }

  // Char categories.
  const WORD_CHAR = 0;
  const NON_WORD_CHAR = 1;
  const SEPARATOR_CHAR = 2;

  // Regular expression sources for testing char categories.
  const WORD_CHAR_REGEXP_SOURCE = "[\\p{Letter}\\p{Mark}\\p{Number}_]";
  const SEPARATOR_CHAR_REGEXP_SOURCE = "[\\s\\p{Separator}]";
  const NON_WORD_CHAR_REGEXP_SOURCE = "[^" + WORD_CHAR_REGEXP_SOURCE.slice(1, -1) + SEPARATOR_CHAR_REGEXP_SOURCE.slice(1, -1) + "]";

  // Returns the category of the given character.
  function charCategory(character) {
    if (XRegExp.cache(WORD_CHAR_REGEXP_SOURCE).test(character)) return WORD_CHAR;
    else if (XRegExp.cache(NON_WORD_CHAR_REGEXP_SOURCE).test(character)) return NON_WORD_CHAR;
    else return SEPARATOR_CHAR;
  }

  // Regular expression sources for testing "word" ends.
  const WORD_END_REGEXP_SOURCES = [
    "(?!" + WORD_CHAR_REGEXP_SOURCE + ")",      // word end
    "(?!" + NON_WORD_CHAR_REGEXP_SOURCE + ")",  // non-word "word" end
    "(?!" + SEPARATOR_CHAR_REGEXP_SOURCE + ")"  // separator "word" end
  ];

  // Returns the regular expression source for testing the end of a "word" ending with the given character.
  function wordEndRegExpSource(character) {
    return WORD_END_REGEXP_SOURCES[charCategory(character)];
  }

  return Substitution;

})();

/**
 *  Represents a group of substitutions that are applied to the same set of URLs.
 */
var SubstitutionGroup = (() => {

  class SubstitutionGroup {

    constructor(name = "", urls = [], substitutions = [], html = this.HTML_NONE, enabled = true, mode = this.MODE_AUTO_AND_MANUAL) {
      this.name = name;
      this.urls = urls;
      this.substitutions = substitutions;
      this.html = html;
      this.enabled = enabled;
      this.mode = mode;

      this.init();
    }

    /**
     *  Initializes this object after assigning basic properties.
     */
    init() {
      this.name = String(name);
      this.enabled = Boolean(this.enabled);
      if (this.html != this.HTML_NONE && this.html != this.HTML_OUTPUT && this.html != this.HTML_INPUT_OUTPUT)
        this.html = this.HTML_NONE; // avoid invalid values
      if (this.mode != this.MODE_AUTO_AND_MANUAL && this.mode != this.MODE_AUTO && this.mode != this.MODE_MANUAL)
        this.mode = this.MODE_AUTO_AND_MANUAL;  // avoid invalid values

      this.urls.sort();
      this.urlRegExps = [];
      this.exclusionUrlRegExps = [];

      this.urls.forEach(element => {
        let url, exclusion;

        if (isExclusionUrl(element)) {
          url = cleanExclusionUrl(element);
          exclusion = true;
        }
        else {
          url = element;
          exclusion = false;
        }

        let regExp = new RegExp(url.replace(/\*+/g, "*")      // remove multiple wildcards
                                   .replace(/(\W)/g, "\\$1")  // escape special symbols
                                   .replace(/\\\*/g, ".*")    // replace wildcards by .*
                                   .replace(/^\\\|/, "^")     // process anchor at expression start
                                   .replace(/\\\|$/, "$")     // process anchor at expression end
                                   .replace(/^(\.\*)/, "")    // remove leading wildcards
                                   .replace(/(\.\*)$/, ""));  // remove trailing wildcards

        if (exclusion) this.exclusionUrlRegExps.push(regExp);
        else this.urlRegExps.push(regExp);
      });
    }

    /**
     *  Returns a non-empty name for this substitution group. If it has a name it is returned. Otherwise a default name is returned.
     */
    get nonEmptyName() {
      if (this.name) return this.name;
      else if (this.urls.length === 0) return browser.i18n.getMessage("generalSubstitutions");
      else if (this.urls.length === 1) return browser.i18n.getMessage("substitutionsForUrl", this.urls[0]);
      else return browser.i18n.getMessage("substitutionsForUrls", this.urls[0]);
    }

    /**
     *  Returns whether the substitution group should be applied to the given URL or not.
     *  Returns true if the URL matches one from the list (or the list is empty) and doesn't match any exclusion URL.
     */
    matches(url) {
      return (this.urlRegExps.length === 0 || this.urlRegExps.some(regExp => regExp.test(url))) &&
             !this.exclusionUrlRegExps.some(regExp => regExp.test(url));
    }

    /**
     *  Applies each substitution in the group to the given string and returns the result.
     */
    replace(string) {
      if (!string) return string;
      this.substitutions.forEach(substitution => { string = substitution.replace(string); });
      return string;
    }

    /**
     *  Converts this substitution group to JSON.
     */
    toJSON() {
      return {
        name: this.name,
        urls: this.urls,
        substitutions: this.substitutions.map(substitution => substitution.toJSON()),
        html: this.html,
        enabled: this.enabled,
        mode: this.mode
      };
    }

  }

  /**
   *  Creates a substitution group from the given JSON and version.
   */
  SubstitutionGroup.fromJSON = function(json, version) {
    let substitutions = [];
    for (let substitutionJSON of json.substitutions) substitutions.push(Substitution.fromJSON(substitutionJSON));

    let html;
    if (version == "0.14") html = json.html ? this.prototype.HTML_INPUT_OUTPUT : this.prototype.HTML_NONE;
    else html = json.html;

    // check if mode exists to support versions older than 2.1 (i.e. 0.14 and 0.15)
    let mode = json.mode ? json.mode : this.prototype.MODE_AUTO_AND_MANUAL;

    return new SubstitutionGroup(json.name, json.urls, substitutions, html, json.enabled, mode);
  };

  /**
   *  Constants.
   */
  Object.defineProperties(SubstitutionGroup.prototype, {
    HTML_NONE: { value: 'none' },
    HTML_OUTPUT: { value: 'output' },
    HTML_INPUT_OUTPUT: { value: 'inputoutput' },
    MODE_AUTO_AND_MANUAL: { value: 'auto&manual' },
    MODE_AUTO: { value: 'auto' },
    MODE_MANUAL: { value: 'manual' }
  });

  // Returns the given url removing the exclusion part.
  function cleanExclusionUrl(url) {
    if (isExclusionUrl(url)) return url.slice(1);
    else return url;
  }

  return SubstitutionGroup;

})();

/**
 *  Returns whether the given URL is an exclusion URL or not (it is an exclusion URL if it starts with "-").
 */
function isExclusionUrl(url) {
  return /^-.*/.test(url);
}

/**
 *  Converts the given substitution list to JSON.
 */
function substitutionListToJSON(list) {
  return {
    version: "2.1",
    groups: list.map(group => group.toJSON())
  };
}

/**
 *  Creates a substitution list from the given JSON.
 */
function substitutionListFromJSON(json) {
  // if (json.version ... // possible version check
  let list = [];
  for (let groupJSON of json.groups) list.push(SubstitutionGroup.fromJSON(groupJSON, json.version));
  return list;
}

/**
 *  Checks if the version of the given JSON is supported or not and returns a status and an optional message to explain it.
 */
function checkVersion(json) {
  const currentVersion = '2.1';
  const oldVersions = ['0.14', '0.15'];

  if (json.version == currentVersion) return { status: true };
  else if (oldVersions.includes(json.version)) return { status: true, message: browser.i18n.getMessage('deprecatedJsonVersion', [json.version, currentVersion]) };
  else return { status: false, message: browser.i18n.getMessage('unsupportedJsonVersion', [json.version, currentVersion]) };
}
