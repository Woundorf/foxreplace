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
 * Portions created by the Initial Developer are Copyright (C) 2008
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
 * Substitution (until 0.7)
 */
function FxRSubstitution07(aInput, aOutput, aCaseSensitive, aInputRegExp, aWholeWords) {
  this.input = aInput;
  this.inputRegExp = Boolean(aInputRegExp);
  this.output = aOutput;
  this.caseSensitive = Boolean(aCaseSensitive);
  this.wholeWords = Boolean(aWholeWords);
  
  if (this.inputRegExp)
    this._regExp = new RegExp(aInput, aCaseSensitive ? "g" : "gi");
  else if (this.wholeWords) {
    var prefix = aInput.charAt(0).match(/\w/) ? "\\b" : "\\B";
    var suffix = aInput.charAt(aInput.length - 1).match(/\w/) ? "\\b" : "\\B";
    this._regExp = new RegExp(prefix + aInput.toUnicode() + suffix, aCaseSensitive ? "g" : "gi");
  }
}
FxRSubstitution07.prototype = {

  /**
   * Applies the substitution to aString and returns the result.
   */
  replace: function(aString) {
    if (!aString) return aString;
    
    if (this.inputRegExp || this.wholeWords) return aString.replace(this._regExp, this.output);
    else return aString.replace(this.input, this.output, this.caseSensitive ? "g" : "gi");
  }
  
};

/**
 * Substitution (since 0.8)
 */
function FxRSubstitution(aInput, aOutput, aCaseSensitive, aInputType) {
  this.input = aInput;
  this.output = aOutput;
  this.caseSensitive = Boolean(aCaseSensitive);
  this.inputType = aInputType || this.INPUT_TEXT;
  if (this.inputType < this.INPUT_TEXT || this.inputType > this.INPUT_REG_EXP) this.inputType = this.INPUT_TEXT;
  
  switch (this.inputType) {
    case this.INPUT_WHOLE_WORDS:
      var prefix = aInput.charAt(0).match(/\w/) ? "\\b" : "\\B";
      var suffix = aInput.charAt(aInput.length - 1).match(/\w/) ? "\\b" : "\\B";
      this._regExp = new RegExp(prefix + aInput.toUnicode() + suffix, aCaseSensitive ? "g" : "gi");
      break;
    case this.INPUT_REG_EXP:
      this._regExp = new RegExp(aInput, aCaseSensitive ? "g" : "gi");
      break;
  }
}
/**
 * Creates a substitution from an XML object;
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
/**
 * Creates a substitution from a FxRSubstitution07 object;
 */
FxRSubstitution.fromSubstitution07 = function(aSubstitution07) {
  var input = aSubstitution07.input;
  var output = aSubstitution07.output;
  var caseSensitive = aSubstitution07.caseSensitive;
  var inputType = aSubstitution07.inputRegExp ? this.INPUT_REG_EXP : (aSubstitution07.wholeWords ? this.INPUT_WHOLE_WORDS : this.INPUT_TEXT);
  return new FxRSubstitution(input, output, caseSensitive, inputType);
};
FxRSubstitution.prototype = {

  /**
   * Constants.
   */
  INPUT_TEXT: 0,
  INPUT_WHOLE_WORDS: 1,
  INPUT_REG_EXP: 2,
  INPUT_TYPE_STRINGS: ["text", "wholewords", "regexp"],

  /**
   * Applies the substitution to aString and returns the result.
   */
  replace: function(aString) {
    if (aString == undefined || aString == null) return aString;
    
    if (this._regExp) return aString.replace(this._regExp, this.output);
    else return aString.replace(this.input, this.output, this.caseSensitive ? "g" : "gi");
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
 * Substitution group, including an URL list and a substitution list.
 */
function FxRSubstitutionGroup(aUrls, aSubstitutions) {
  this.urls = aUrls || [];
  this.substitutions = aSubstitutions || [];
  this.urls.sort();
}
FxRSubstitutionGroup.prototype = {

  /**
   * Returns true if aUrl matches any of the urls.
   */
  matches: function(aUrl) {
    return this.urls.length == 0 || this.urls.some(function(element) { return aUrl.indexOf(element) >= 0; });
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
    return group;
  }

};
/**
 * Creates a substitution group from an XML object;
 */
FxRSubstitutionGroup.fromXml = function(aXml) {
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
  
  if (errors) foxreplaceIO.alert(foxreplaceIO.strings.getString("xmlErrorTitle"),
                                 foxreplaceIO.strings.getString("xmlGroupErrorText") + "\n" + errors);
  
  return new FxRSubstitutionGroup(urls, substitutions);
};

/**
 * Converts a number to hexadecimal with aDigits digits.
 */
Number.prototype.toHex = function(aDigits) {
  var hex = this.toString(16);
  var digits = aDigits || 4;
  var length = hex.length;
  
  for (var i = length; i < digits; i++) hex = "0" + hex;
  
  return hex;
};

/**
 * Converts all the characters of the string to escaped unicode notation.
 */
String.prototype.toUnicode = function() {
  var result = "";
  var length = this.length;
  
  for (var i = 0; i < length; i++) result += "\\u" + this.charCodeAt(i).toHex();
  
  return result;
};
