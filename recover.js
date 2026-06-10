const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\khwjs\\.gemini\\antigravity\\brain';
let bestHtml = '';

function extractHtml(data) {
    const lines = data.split('\n');
    for (const line of lines) {
        if (line.includes('<!DOCTYPE html>')) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.tool_calls) {
                    for (const t of parsed.tool_calls) {
                        const argsStr = JSON.stringify(t.args || {});
                        if (argsStr.includes('<!DOCTYPE html>')) {
                            if (argsStr.length > bestHtml.length) {
                                bestHtml = argsStr;
                            }
                        }
                    }
                }
            } catch (e) {
                // If not valid JSON, check if it's a huge raw line
                if (line.length > bestHtml.length && line.length > 5000) {
                    bestHtml = line;
                }
            }
        }
    }
}

function searchDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDir(fullPath);
        } else if (file.endsWith('.jsonl') || file.endsWith('.txt')) {
            try {
                const data = fs.readFileSync(fullPath, 'utf8');
                if (data.includes('index.html') && data.includes('<!DOCTYPE html>')) {
                    extractHtml(data);
                }
            } catch (e) {}
        }
    }
}

searchDir(brainDir);
console.log('Found max length:', bestHtml.length);
if (bestHtml.length > 0) {
    fs.writeFileSync('C:\\3\\B\\recovered_index_html.txt', bestHtml, 'utf8');
}
