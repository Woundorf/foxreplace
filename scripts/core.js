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
const Substitution = (() => {

  class Substitution {

    constructor(input, output, caseSensitive = false, inputType = this.INPUT_TEXT, outputType = this.OUTPUT_FUNCTION) {
      this.input = input;
      this.output = output;
      this.caseSensitive = !!caseSensitive;
      this.outputType = +outputType;
      this.inputType = +inputType;

      if (![this.INPUT_TEXT, this.INPUT_WHOLE_WORDS, this.INPUT_REG_EXP].includes(this.inputType)) this.inputType = this.INPUT_TEXT;
      if (![this.OUTPUT_TEXT, this.OUTPUT_FUNCTION].includes(this.outputType)) this.outputType = this.OUTPUT_TEXT;


      switch (this.inputType) {
        case this.INPUT_TEXT:
          {
            const unescapedInput = unescape(this.input);
            const unicodeInput = stringToUnicode(unescapedInput);
            // for newlines, non-breaking spaces, multiple spaces, etc.,
            // which the browser renders as a single space
            const spaceyInput = unicodeInput.replaceAll('\\u0020', '\\s+');
            this.regExp = new RegExp(spaceyInput, this.caseSensitive ? "g" : "gi");
          }
          break;
        case this.INPUT_WHOLE_WORDS:
          {
            const unescapedInput = unescape(this.input);
            const unicodeInput = stringToUnicode(unescapedInput);
            // for newlines, non-breaking spaces, multiple spaces, etc.,
            // which the browser renders as a single space
            const spaceyInput = unicodeInput.replaceAll('\\u0020', '\\s+');
            const suffix = wordEndRegExpSource(unescapedInput.charAt(unescapedInput.length - 1));
            this.regExp = new XRegExp(spaceyInput + suffix, this.caseSensitive ? "g" : "gi");
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
        case this.INPUT_REG_EXP:
        case this.INPUT_TEXT:
          // necessary according to https://stackoverflow.com/q/1520800
          this.regExp.lastIndex = 0;

          return (this.outputType === this.OUTPUT_FUNCTION) ?
            this.replaceWithFn(this.regExp, string) :
            string.replace(this.regExp, unescape(this.output));

        case this.INPUT_WHOLE_WORDS:
          // necessary according to https://stackoverflow.com/q/1520800
          this.regExp.lastIndex = 0;
          return string.replace(this.regExp, (word, index, string) => {
            // the following block has to do with correct functioning of replace whole words with non-ASCII characters
            // including respecting the special strings $$, $&, etc
            if (index === 0 || this.firstCharCategory != charCategory(string.charAt(index - 1))) {
              const output = unescape(this.output);
              const re = /\$[\$\&\`\']/g;
              const fragments = output.split(re);
              const nFragments = fragments.length;
              const result = fragments[0];
              const i = fragments[0].length + 1;    // index of the char after the $
              for (let j = 1; j < nFragments; j++) {
                const c = output.charAt(i);
                if (c == "$") result += "$";
                else if (c == "&") result += word;
                else if (c == "`") result += string.slice(0, index);
                else if (c == "'") result += string.slice(index + word.length);
                result += fragments[j];
                i += 2 + fragments[j].length;
              }
              return result;
            }
            return (this.outputType === this.OUTPUT_FUNCTION) ?
              this.replaceWithFn(this.output, word) :
              word;
          });

      }

    }

    /**
     *
     * @remarks
     * `this.output` will run as the `return` statement to `string.replace` and can use the same variables mentioned in
     *   [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_the_replacement)
     *
     * @param pattern {string|RegExp} - matches against `curStrToReplace`
     *   @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#parameters
     * @param curStrToReplace {string}
     *
     * @return results of replacing `curStrToReplace` with the output of executing the user-provided JS code `this.output`.
     *   if `pattern` fails to match `curStrToReplace`, this function returns the original `curStrToReplace`
     */
    replaceWithFn(pattern, curStrToReplace) {

      const matchesInStr = curStrToReplace.match(this.regExp)
      const numCaptureGroups = matchesInStr ? matchesInStr.length : 0;
      const captureGroupArgs = Array.from(Array(numCaptureGroups)).map((_elt, i) => `p${i+1}`);

      if (!matchesInStr) {
        return curStrToReplace;
      }

      // MDN rates Function as more secure than eval. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#Do_not_ever_use_eval!
      // decision to put user-input as the `return` of the function because:
      //   1. assumption: most users will create simple one-line functions
      //   2. users can still write complex input via `(() => { /* arbitrary code; return $result */ })()`
      const fn = Function('match', ...captureGroupArgs, 'offset', 'string', 'groups', `return ${this.output}`);
      return curStrToReplace.replace(pattern, fn);
    }

    /**
     *  Converts this substitution to JSON.
     */
    toJSON() {
      return {
        input: this.input,
        inputType: this.INPUT_TYPE_STRINGS[this.inputType],
        outputType: this.OUTPUT_TYPE_STRINGS[this.outputType],
        output: this.output,
        caseSensitive: this.caseSensitive
      };
    }

  }

  /**
   *  Creates a substitution from the given JSON.
   */
  Substitution.fromJSON = function(json) {
    const inputType = this.prototype.INPUT_TYPE_STRINGS.indexOf(json.inputType);
    const outputType = this.prototype.OUTPUT_TYPE_STRINGS.indexOf(json.outputType);
    return new Substitution(json.input, json.output, json.caseSensitive, inputType, outputType);
  };

  /**
   *  Constants.
   */
  Object.defineProperties(Substitution.prototype, {
    // all `value: number` MUST correspond to the indices of the STRINGS
    // to work correctly with this.toJSON and this.fromJSON
    INPUT_TEXT: { value: 0 },
    INPUT_WHOLE_WORDS: { value: 1 },
    INPUT_REG_EXP: { value: 2 },
    INPUT_TYPE_STRINGS: { value: ["text", "wholewords", "regexp"] },
    OUTPUT_TYPE_STRINGS: { value: ["text", "function"] },
    OUTPUT_TEXT: { value: 0 },
    OUTPUT_FUNCTION: { value: 1 },
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
const SubstitutionGroup = (() => {

  class SubstitutionGroup {

    constructor(name = "", urls = [], substitutions = [], html = this.HTML_NONE, enabled = true, mode = this.MODE_AUTO_AND_MANUAL) {
      this.name = String(name);
      this.urls = urls;
      this.substitutions = substitutions;
      this.html = html;
      if (this.html < this.HTML_NONE || this.html > this.HTML_INPUT_OUTPUT) this.html = this.HTML_NONE; // avoid invalid values
      this.enabled = Boolean(enabled);
      this.mode = mode;
      if (this.mode < this.MODE_AUTO_AND_MANUAL || this.mode > this.MODE_MANUAL) this.mode = this.MODE_AUTO_AND_MANUAL; // avoid invalid values

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

        const regExp = new RegExp(url.replace(/\*+/g, "*")      // remove multiple wildcards
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
        html: this.HTML_STRINGS[this.html],
        enabled: this.enabled,
        mode: this.MODE_STRINGS[this.mode]
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
    else html = this.prototype.HTML_STRINGS.indexOf(json.html);

    // check if mode exists to support versions older than 2.1 (i.e. 0.14 and 0.15)
    let mode = json.mode ? this.prototype.MODE_STRINGS.indexOf(json.mode) : this.prototype.MODE_AUTO_AND_MANUAL;

    return new SubstitutionGroup(json.name, json.urls, substitutions, html, json.enabled, mode);
  };

  /**
   *  Constants.
   */
  Object.defineProperties(SubstitutionGroup.prototype, {
    HTML_NONE: { value: 0 },
    HTML_OUTPUT: { value: 1 },
    HTML_INPUT_OUTPUT: { value: 2 },
    HTML_STRINGS: { value: ["none", "output", "inputoutput"] },
    MODE_AUTO_AND_MANUAL: { value: 0 },
    MODE_AUTO: { value: 1 },
    MODE_MANUAL: { value: 2 },
    MODE_STRINGS: { value: ["auto&manual", "auto", "manual"] }
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
