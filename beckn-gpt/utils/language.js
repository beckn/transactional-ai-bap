import { readFileSync } from 'fs';
const language = JSON.parse(readFileSync('./config/language.json'))


function get_text_by_key(key, variables = {}, category='ALL_MESSAGES'){
    let text = language[category][key] || null;
    if (text) {
        Object.keys(variables).forEach(variable => {
            /* eslint no-useless-escape: "off" */
            text = text.replace(new RegExp(`\\$\{${variable}\}`, 'g'), variables[variable]);
        });
    }
    return text;
}

export default get_text_by_key;
