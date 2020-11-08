import { SSRT } from './SSRT.js';

export const isMessageSMLookup = (message) => message.indexOf(smCommand) === 0;
export const isMessageSRLookup = (message) => message.indexOf(srCommand) === 0;

const smCommand = '!ssrtsm';
const srCommand = '!ssrtsr';

export const ssrtLookup = (chatMessage) => {
    let command, regex, label;
    const isSmNotSr = isMessageSMLookup(chatMessage);
    if (isSmNotSr) {
        command = smCommand;
        regex = /!ssrtsm\s+(.+)/;
        label = 'SM';
    } else {
        command = srCommand;
        regex = /!ssrtsr\s+(.+)/;
        label = 'Speed/Range penalty';
    }

    const advice = `try '${command} &lt;linear-measurement&gt; &lt;unit-of-measure&gt;', for example '${command} 11 yards'`;
    let message = `Could not parse '${chatMessage}'; ${advice}`;

    const match = chatMessage.match(regex);
    if (match !== null) {
        try {
            let result = isSmNotSr ? SSRT.sizeFromExpression({ expression: match[1] }) : SSRT.speedRangeFromExpression({ expression: match[1] });
            result = result >= 0 ? `${isSmNotSr ? '+' : '-'}${result}` : result;
            message = `${label} for ${match[1]} is ${result}`;
        } catch (e) {
            message = `'${match[1]}' is not a valid SSRT lookup expression;  ${advice}`;
        }
    }

    return message;
};
