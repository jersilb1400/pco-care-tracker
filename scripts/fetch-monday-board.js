const fetch = require('node-fetch');

const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUwNDI5MjY3MCwiYWFpIjoxMSwidWlkIjo3MjQzNTU1MSwiaWFkIjoiMjAyNS0wNC0yNFQxNzozNDoxNi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjA1MDI1MTAsInJnbiI6InVzZTEifQ.sp2Al9PQ-gTQc8V0Ppf5NTBZjYR_q-vdk6hnIEUbusc';
const BOARD_ID = '9302420826';

async function fetchMondayBoard() {
  const query = `
    query {
      boards(ids: ${BOARD_ID}) {
        name
        description
        items_page {
          items {
            id
            name
            group {
              id
              title
            }
            column_values {
              id
              type
              value
              text
            }
          }
        }
        groups {
          id
          title
        }
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_TOKEN
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('API Errors:', data.errors);
      return;
    }
    
    console.log('Board Structure:', JSON.stringify(data, null, 2));
    
    // Save to file for easier review
    const fs = require('fs');
    fs.writeFileSync('monday-board-structure.json', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error fetching Monday.com board:', error);
  }
}

fetchMondayBoard(); 