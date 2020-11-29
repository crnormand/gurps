
/*
  Called Moustache Wax because it helps Handlebars. Get it?
*/
export default function () {
  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  // Add "@index to {{times}} function
  Handlebars.registerHelper("times", function (n, content) {
    let result = "";
    for (let i = 0; i < n; i++) {
      content.data.index = i + 1;
      result += content.fn(i);
    }
    return result;
  });


  Handlebars.registerHelper('pluralize', function (word, quantity) {
    if (quantity == 1) return word

    if (word.slice(-1) == 's') return `${word}es`
    return `${word}s`
  })

  Handlebars.registerHelper('gt', function (a, b) { return a > b; });

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('debug', function (value) {
    console.log('Current context:')
    console.log('================')
    console.log(this)

    if (value) {
      console.log("Value:")
      console.log('================')
      console.log(value)
    }
  })

  Handlebars.registerHelper('isOdd', function (value) {
    return value % 2 !== 0
  })

  /*
   * if value is equal to compareTo, return _default; otherwise return the
   * format string replacing '*' with value.
   */
  Handlebars.registerHelper('printIfNe', function (value, compareTo, format, _default = '') {
    if (value === compareTo) return _default
    let result = format.replace('*', value)
    return result
  })
}

