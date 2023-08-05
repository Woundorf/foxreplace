# FoxReplace

FoxReplace allows you to replace text fragments in a page by other text fragments. The system is based in substitutions: a substitution consists in a text which has to be replaced (identified as "Replace") and a text by which the first has to be replaced (identified as "With"). All substitutions are always applied over the whole content of a page (you can't do partial substitutions at the moment). Substitutions can be case-sensitive or insensitive. The use of regular expressions is also supported.

You can have predefined substitutions in a substitution list to apply them all at once, and also do individual substitutions. You also have the option to apply the substitution list automatically whenever a page is loaded.

[![Install From AMO](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_1.png)](https://addons.mozilla.org/firefox/addon/foxreplace/)


### Replace with Function
- Syntax: JavaScript
- The provided input will run as the `return` statement to `string.replace` and can use the same variables mentioned in [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_the_replacement)
  - Example:
    - Replace: `dino(saur)`
      - `Regular Expression`
    - With: `"great big " + match + " biga" + p1.toUpperCase()`
      - `Function`
    - Result: `great big dinosaur bigaSAUR`

