const fs = require('fs');

const data = JSON.parse(fs.readFileSync('monday-board-structure.json', 'utf8'));
const items = data.data.boards[0].items_page.items;

const careTypes = new Set();

for (const item of items) {
  for (const col of item.column_values) {
    if (col.id === 'color_mkrk2646' && col.text) {
      careTypes.add(col.text);
    }
  }
}

console.log('Unique Care Types:');
for (const type of careTypes) {
  console.log(type);
} 