
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

  Handlebars.registerHelper('jsonStringify', function (object) {
    return JSON.stringify(object)
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


  Handlebars.registerHelper('objToString', function (str) {
    let o = CONFIG.GURPS.objToString(str);
    console.log(o);
    return o;
  });

  Handlebars.registerHelper('simpleRating', function (lvl) {
    if (!lvl) return "UNKNOWN";
    let l = parseInt(lvl);
    if (l < 10)
      return "Poor";
    if (l <= 11)
      return "Fair";
    if (l <= 13)
      return "Good";
    if (l <= 15)
      return "Great";
    if (l <= 18)
      return "Super";
    return "Epic";
  });

  Handlebars.registerHelper('notEmpty', function (obj) {
    return !!obj ? Object.values(obj).length > 0 : false;
  });

  /// NOTE:  To use this, you must use {{{gurpslink sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
  Handlebars.registerHelper('gurpslink', function (str, root, clrdmods = false) {
    let actor = root?.data?.root?.actor;
    if (!actor) actor = root?.actor;
    return game.GURPS.gurpslink(str, clrdmods);
  });

  /// NOTE:  To use this, you must use {{{gurpslinkbr sometext}}}.   The triple {{{}}} keeps it from interpreting the HTML
  // Same as gurpslink, but converts \n to <br> for large text values (notes)
  Handlebars.registerHelper('gurpslinkbr', function (str, root, clrdmods = false) {
    let actor = root?.data?.root?.actor;
    if (!actor) actor = root?.actor;
    return game.GURPS.gurpslink(str, clrdmods).replace(/\n/g, "<br>");;
  });

  Handlebars.registerHelper('listeqt', function (context, options) {
    var data;
    if (options.data)
      data = Handlebars.createFrame(options.data);

    let ans = GURPS.listeqtrecurse(context, options, 0, data);
    return ans;
  });

  // Only necessary because of the FG import
  Handlebars.registerHelper('hitlocationroll', function (loc, roll) {
    if (!roll)
      roll = GURPS.hitlocationRolls[loc]?.roll;
    return roll;
  });

  Handlebars.registerHelper('hitlocationpenalty', function (loc, penalty) {
    if (!penalty)
      penalty = GURPS.hitlocationRolls[loc]?.penalty;
    return penalty;
  });

  Handlebars.registerHelper('fractionalize', function (value, digits, prefix = '') {
    if (typeof value == 'number') {
      let wholeNumber = Math.floor(value)
      if (wholeNumber === value) {
        return prefix + value
      }

      let fraction = value - wholeNumber
      let wholeNumberText = (wholeNumber === 0) ? '' : `${wholeNumber}`
      if (fraction === (1 / 3)) return prefix + `${wholeNumberText} 1/3`.trim()
      if (fraction === (2 / 3)) return prefix + `${wholeNumberText} 2/3`.trim()
      return prefix + parseFloat(value.toFixed(digits))
    }
    return value
  })
}

