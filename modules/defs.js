/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FoxReplace.
 *
 * The Initial Developer of the Original Code is
 * Marc Ruiz Altisent.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * Definitions of substitution and substitution group.
 */

var EXPORTED_SYMBOLS = ["FxRSubstitution", "FxRSubstitutionGroup",
                        "fxrSubstitutionListFromXml", "fxrSubstitutionListToXml", "fxrIsExclusionUrl"];

/**
 * Substitution.
 */
function FxRSubstitution(aInput, aOutput, aCaseSensitive, aInputType) {
  this.input = aInput;
  this.output = aOutput;
  this.caseSensitive = Boolean(aCaseSensitive);
  this.inputType = aInputType || this.INPUT_TEXT;
  // avoid invalid values
  if (this.inputType < this.INPUT_TEXT || this.inputType > this.INPUT_REG_EXP) this.inputType = this.INPUT_TEXT;
  
  switch (this.inputType) {
    case this.INPUT_WHOLE_WORDS:
      var unescapedInput = fxrUnescape(aInput);
      var suffix = fxrIsWordChar(unescapedInput.charAt(unescapedInput.length - 1)) ? this.WW_REGEXP_WORD_END
                                                                                   : this.WW_REGEXP_NONWORD_END;
      this._regExp = new RegExp(fxrStringToUnicode(unescapedInput) + suffix, aCaseSensitive ? "g" : "gi");
      this._firstCharIsWordChar = fxrIsWordChar(unescapedInput.charAt(0));
      break;
    case this.INPUT_REG_EXP:
      this._regExp = new RegExp(aInput, aCaseSensitive ? "g" : "gi");
      break;
  }
}
/**
 * Creates a substitution from an XML object.
 */
FxRSubstitution.fromXml = function(aXml) {
  var input = aXml.input.toString().slice(1, -1);   // to remove quotes
  var output = aXml.output.toString().slice(1, -1); // to remove quotes
  var caseSensitive = aXml.@casesensitive.toString() == "true";
  var inputType = this.prototype.INPUT_TYPE_STRINGS.indexOf(aXml.input.@type.toString());
  
  try {
    return new FxRSubstitution(input, output, caseSensitive, inputType);
  }
  catch (e if e instanceof SyntaxError) {
    e.message = '"' + input + '": ' + e.message;
    throw e;
  }
};
FxRSubstitution.prototype = {
  /**
   * Applies the substitution to aString and returns the result.
   */
  replace: function(aString) {
    if (aString == undefined || aString == null) return aString;
    
    switch (this.inputType) {
      case this.INPUT_TEXT:
        return aString.replace(fxrUnescape(this.input), fxrUnescape(this.output), this.caseSensitive ? "g" : "gi");
      case this.INPUT_WHOLE_WORDS:
        var self = this;
        function replaceWholeWord(aWord, aIndex, aString) {
          if (aIndex == 0 || self._firstCharIsWordChar != fxrIsWordChar(aString.charAt(aIndex - 1))) {
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
      case this.INPUT_REG_EXP: return aString.replace(this._regExp, fxrUnescape(this.output));
    }
  },
  /**
   * Returns the substitution as an XML object.
   */
  toXml: function() {
    var substitution = <substitution/>;
    substitution.input = '"' + this.input + '"';    // quotes to avoid whitespace problems
    substitution.input.@type = this.INPUT_TYPE_STRINGS[this.inputType];
    substitution.output = '"' + this.output + '"';  // quotes to avoid whitespace problems
    if (this.caseSensitive) substitution.@casesensitive = true;
    return substitution;
  }
};
/**
 * Constants.
 */
FxRSubstitution.prototype.INPUT_TEXT = 0;
FxRSubstitution.prototype.INPUT_WHOLE_WORDS = 1;
FxRSubstitution.prototype.INPUT_REG_EXP = 2;
FxRSubstitution.prototype.INPUT_TYPE_STRINGS = ["text", "wholewords", "regexp"];
FxRSubstitution.prototype.WW_REGEXP_WORD_CHAR = /[0-9A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02AF\u0386-\u03CE\u03D8-\u03EF\u03F3\u03F7\u03F8\u03FA\u03FB\u0400-\u0481\u048A-\u0513]/;
//                                                          <- Latin + IPA extensions --><------------------- Greek + Coptic -------------------><------- Cyrillic ------->
FxRSubstitution.prototype.WW_REGEXP_WORD_END = "(?!" + FxRSubstitution.prototype.WW_REGEXP_WORD_CHAR.source + ")";
FxRSubstitution.prototype.WW_REGEXP_NONWORD_END = "(?![^" + FxRSubstitution.prototype.WW_REGEXP_WORD_CHAR.source.slice(1) + ")";

/**
 * Substitution group, including an URL list and a substitution list. If aHtml is true, substitutions are done in HTML.
 * If aNoExclusions is true, URLs won't be interpreted as exclusion URLs.
 */
function FxRSubstitutionGroup(aUrls, aSubstitutions, aHtml, aNoExclusions) {
  this.urls = aUrls || [];
  this.substitutions = aSubstitutions || [];
  this.html = Boolean(aHtml);
  var noExclusions = Boolean(aNoExclusions);
  // transform URLs that would be interpreted as exclusions to clean equivalents
  if (noExclusions) this.urls = this.urls.map(function(element) { return fxrCleanNoExclusionUrl(element); });
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
FxRSubstitutionGroup.prototype = {
  /**
   * Returns true if aUrl matches any of the urls.
   */
  matches: function(aUrl) {
    return this.urls.length == 0
        || (!this.exclusionUrlRegExps.some(function(element) { return element.test(aUrl); })
        && this.urlRegExps.some(function(element) { return element.test(aUrl); }));
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
   * Applies ths substitution group to aString if aUrl matches any of the urls and returns the result.
   */
  applyTo: function(aUrl, aString) {
    if (this.matches(aUrl)) return this.replace(aString);
    else return aString;
  },
  /**
   * Returns the substitution group as an XML object.
   */
  toXml: function() {
    var group = <group><urls/><substitutions/></group>;
    this.urls.forEach(function(element) { group.urls.appendChild(<url>{element}</url>); });
    this.substitutions.forEach(function(element) { group.substitutions.appendChild(element.toXml()); });
    if (this.html) group.@html = true;
    return group;
  }
};
/**
 * Creates a substitution group from an XML object. If aNoExclusions is true, URLs won't be interpreted as exclusion
 * URLs.
 */
FxRSubstitutionGroup.fromXml = function(aXml, aNoExclusions) {
  var urls = [];
  for each (var url in aXml.urls.url) urls.push(url.toString());
  
  var substitutions = [];
  var errors = "";
  for each (var substitution in aXml.substitutions.substitution) {
    try {
      substitutions.push(FxRSubstitution.fromXml(substitution));
    }
    catch (e) {
      XML.prettyPrinting = false;
      errors += e + "\n";
    }
  }
  
  var html = aXml.@html.toString() == "true";
  
  if (errors) foxreplaceIO.alert(foxreplaceIO.strings.getString("xmlErrorTitle"),
                                 foxreplaceIO.strings.getString("xmlGroupErrorText") + "\n" + errors);
  
  return new FxRSubstitutionGroup(urls, substitutions, html, aNoExclusions);
};

/**
 * Creates the substitution list from an XML object.
 */
function fxrSubstitutionListFromXml(aListXml) {
  var substitutionList = [];
  var noExclusions = aListXml.@version == "0.8";
  
  for each (var group in aListXml.group) substitutionList.push(FxRSubstitutionGroup.fromXml(group, noExclusions));
  
  return substitutionList;
}

/**
 * Creates an XML object from the substitution list.
 */
function fxrSubstitutionListToXml(aSubstitutionList) {
  var listXml = <substitutionlist version="0.10"/>;
  var nSubstitutions = aSubstitutionList.length;
  
  for (var i = 0; i < nSubstitutions; i++) listXml.appendChild(aSubstitutionList[i].toXml());
  
  return listXml;
}

/**
 * Returns whether aUrl is an exclusion URL or not (it is an exclusion URL if it starts with "-").
 */
function fxrIsExclusionUrl(aUrl) {
  return /^-.*/.test(aUrl);
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
 * Returns true if aChar is a word char and false otherwise.
 */
function fxrIsWordChar(aChar) {
  return FxRSubstitution.prototype.WW_REGEXP_WORD_CHAR.test(aChar);
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

/**
 * Returns aUrl transformed so it isn't interpreted as an exclusion URL.
 */
function fxrCleanNoExclusionUrl(aUrl) {
  if (fxrIsExclusionUrl(aUrl)) return "|*" + aUrl;
  else return aUrl;
}
