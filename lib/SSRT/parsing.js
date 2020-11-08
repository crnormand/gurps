import * as Units from './UnitsOfMeasure/Units.js';

export default function parseExpression(expression) {
    const match = expression.match(/([0-9]+\.?[0-9]*)[ ]*(mile|mi|yard|yd|y|foot|feet|ft|'{1,2}|inch|in|"|(?:centi|kilo|)meter?|[ck]?m)?/);

    if (match === null) {
        throw new Error("Can't match expression to length and unit of measure");
    }

    let unit = null;
    switch (match[2]) {
        case undefined:
            unit = Units.YD;
            break;
        case 'mile':
        case 'mi':
            unit = Units.MI;
            break;
        case 'yard':
        case 'yd':
        case 'y':
            unit = Units.YD;
            break;
        case 'foot':
        case 'feet':
        case 'ft':
        case "'":
            unit = Units.FT;
            break;
        case 'inch':
        case 'in':
        case '"':
        case "''":
            unit = Units.IN;
            break;
        case 'cm':
        case 'centimeter':
            unit = Units.CM;
            break;
        case 'm':
        case 'meter':
            unit = Units.M;
            break;
        case 'km':
        case 'kilometer':
            unit = Units.KM;
            break;
        default:
            throw new Error("Can't match expression to length and unit of measure");
    }

    return { linearMeasurement: match[1], unit };
}
