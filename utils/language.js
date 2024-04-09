import { readFileSync } from 'fs';
const language = JSON.parse(readFileSync('./config/language.json'))


function get_text_by_key(key, variables = {}, category='ALL_MESSAGES'){
    let text = language[category][key] || null;
    if (text) {
        text = text.replace(/\$\{(\w+)\}/g, (match, variableName) => {
            return variables.hasOwnProperty(variableName) ? variables[variableName] : match;
        });
    }
    return text;
}

export default get_text_by_key;
