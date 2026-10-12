const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'db.json');
const data = { teams: {}, pending: {}, disbanded: {} };

try {
  Object.assign(data, JSON.parse(fs.readFileSync(FILE, 'utf8')));
} catch {}

const save = () => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
};

module.exports = { data, save };
