export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Handle GET requests (for testing)
    if (request.method === 'GET') {
      return new Response('Monday.com to PCO webhook endpoint is active!', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle POST requests
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        console.log('Received webhook:', JSON.stringify(body));

        // Handle test requests
        if (body.test === true) {
          console.log('Test request received');
          return new Response(JSON.stringify({
            status: 'success',
            message: 'Test webhook received successfully',
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if this is a Monday.com webhook
        if (!body.event) {
          console.log('No event property found, might be a Monday.com challenge');
          
          // Monday.com sends a challenge parameter for webhook validation
          if (body.challenge) {
            console.log('Responding to Monday.com challenge');
            return new Response(JSON.stringify({ challenge: body.challenge }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({
            status: 'error',
            message: 'Invalid webhook format - no event property'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if this is a retry and if we should skip it
        if (body.event.isRetry) {
          console.log('Skipping retry webhook to avoid duplicates');
          return new Response(JSON.stringify({
            status: 'success',
            message: 'Retry webhook acknowledged but skipped'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        // Process Monday.com webhook
        const { event } = body;
        console.log('Processing Monday event type:', event.type);

        // Check if we have PCO credentials
        if (!env.PCO_APP_ID || !env.PCO_SECRET) {
          console.error('Missing PCO credentials in environment variables');
          return new Response(JSON.stringify({
            status: 'error',
            message: 'PCO credentials not configured'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Handle different event types
        switch (event.type) {
          case 'create_pulse':
          case 'create_item':
            return await handleNewItem(event, env);
            
          case 'update_column_value':
          case 'change_column_value':
            return await handleUpdate(event, env);
            
          default:
            console.log('Unhandled event type:', event.type);
            return new Response(JSON.stringify({
              status: 'success',
              message: `Event type ${event.type} acknowledged but not processed`
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
        }

      } catch (error) {
        console.error('Error processing webhook:', error.toString());
        return new Response(JSON.stringify({
          status: 'error',
          message: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Method not allowed', { status: 405 });
  }
}

// Helper function to update PCO custom fields
async function updatePCOCustomFields(personId, caseData, headers) {
  try {
    // First, get field definitions
    const fieldDefsResponse = await fetch(
      'https://api.planningcenteronline.com/people/v2/field_definitions',
      { headers }
    );
    
    if (!fieldDefsResponse.ok) {
      console.error('Failed to fetch field definitions');
      return;
    }
    
    const fieldDefs = await fieldDefsResponse.json();
    
    // Map field names to IDs
    const fieldMap = {};
    fieldDefs.data?.forEach(field => {
      fieldMap[field.attributes.name] = field.id;
    });
    
    console.log('Field definitions found:', Object.keys(fieldMap).join(', '));
    
    // Get existing field data for this person
    const existingFieldsResponse = await fetch(
      `https://api.planningcenteronline.com/people/v2/people/${personId}/field_data?per_page=100`,
      { headers }
    );
    
    if (!existingFieldsResponse.ok) {
      console.error('Failed to fetch existing fields');
      return;
    }
    
    const existingFields = await existingFieldsResponse.json();
    const existingFieldMap = {};
    
    // Map existing fields by field definition ID
    existingFields.data?.forEach(field => {
      const fieldDefId = field.relationships.field_definition.data.id;
      existingFieldMap[fieldDefId] = {
        id: field.id,
        value: field.attributes.value
      };
    });
    
    // Debug: Log what fields we're trying to update
    console.log('Fields we want to update:');
    fieldsToUpdate.forEach(f => {
      console.log(`- ${f.name}: ${f.value} (Field ID: ${fieldMap[f.name] || 'not found'})`);
    });
    
    console.log('Existing field IDs for this person:', Object.entries(existingFieldMap).map(([defId, field]) => `${defId}: ${field.value}`).join(', '));
    
    // Update fields if they exist
    const fieldsToUpdate = [
      { name: 'Care Case ID', value: caseData.caseId },
      { name: 'Care Status', value: caseData.status },
      { name: 'Care Type', value: caseData.careType },
      { name: 'Submitted By', value: caseData.submitterName },
      { name: 'Monday Item ID', value: String(caseData.mondayItemId) }
    ];
    
    for (const field of fieldsToUpdate) {
      const fieldDefId = fieldMap[field.name];
      if (fieldDefId && field.value) {
        try {
          const existingField = existingFieldMap[fieldDefId];
          
          if (existingField) {
            // Field exists - check if value is different before updating
            if (existingField.value === field.value) {
              console.log(`Field ${field.name} already has value ${field.value}, skipping update`);
              continue;
            }
            
            // Field exists with different value, update it with PATCH
            console.log(`Updating existing field ${field.name} from ${existingField.value} to ${field.value}`);
            const updateData = {
              data: {
                type: 'FieldDatum',
                id: existingField.id,
                attributes: {
                  value: field.value
                }
              }
            };
            
            const updateResponse = await fetch(
              `https://api.planningcenteronline.com/people/v2/people/${personId}/field_data/${existingField.id}`,
              {
                method: 'PATCH',
                headers,
                body: JSON.stringify(updateData)
              }
            );
            
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`Failed to update field ${field.name}:`, errorText);
            } else {
              console.log(`Updated field ${field.name} to ${field.value}`);
            }
          } else {
            // Field doesn't exist, create it with POST
            console.log(`Creating new field ${field.name} with value ${field.value}`);
            const fieldData = {
              data: {
                type: 'FieldDatum',
                attributes: {
                  value: field.value
                },
                relationships: {
                  field_definition: {
                    data: {
                      type: 'FieldDefinition',
                      id: fieldDefId
                    }
                  }
                }
              }
            };
            
            const createResponse = await fetch(
              `https://api.planningcenteronline.com/people/v2/people/${personId}/field_data`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify(fieldData)
              }
            );
            
            if (!createResponse.ok) {
              const errorText = await createResponse.text();
              const errorData = JSON.parse(errorText);
              
              // Check if the error is because field already exists
              if (errorData.errors?.[0]?.title === 'Validation Error' && 
                  errorData.errors?.[0]?.detail?.includes('already exists')) {
                console.log(`Field ${field.name} already exists but wasn't in our list, trying to find and update it`);
                
                // Try to get all field data again and find this specific field
                const retryFieldsResponse = await fetch(
                  `https://api.planningcenteronline.com/people/v2/people/${personId}/field_data?per_page=100&where[field_definition_id]=${fieldDefId}`,
                  { headers }
                );
                
                if (retryFieldsResponse.ok) {
                  const retryFields = await retryFieldsResponse.json();
                  if (retryFields.data && retryFields.data.length > 0) {
                    const existingFieldId = retryFields.data[0].id;
                    
                    // Now update it
                    const updateData = {
                      data: {
                        type: 'FieldDatum',
                        id: existingFieldId,
                        attributes: {
                          value: field.value
                        }
                      }
                    };
                    
                    const updateResponse = await fetch(
                      `https://api.planningcenteronline.com/people/v2/people/${personId}/field_data/${existingFieldId}`,
                      {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(updateData)
                      }
                    );
                    
                    if (updateResponse.ok) {
                      console.log(`Successfully updated field ${field.name} on retry`);
                    } else {
                      console.error(`Failed to update field ${field.name} even on retry:`, await updateResponse.text());
                    }
                  }
                }
              } else {
                console.error(`Failed to create field ${field.name}:`, errorText);
              }
            } else {
              console.log(`Created field ${field.name} with value ${field.value}`);
            }
          }
        } catch (error) {
          console.error(`Error updating field ${field.name}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error updating custom fields:', error);
  }
}

// Helper function to get or create note category
async function getOrCreateNoteCategory(categoryName, headers, env) {
  try {
    // First, try to get existing categories
    const categoriesResponse = await fetch(
      'https://api.planningcenteronline.com/people/v2/note_categories',
      { headers }
    );
    
    if (!categoriesResponse.ok) {
      console.error('Failed to fetch note categories');
      return null;
    }
    
    const categoriesData = await categoriesResponse.json();
    
    // Look for existing category
    const existingCategory = categoriesData.data?.find(
      cat => cat.attributes.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (existingCategory) {
      console.log('Found existing note category:', existingCategory.id);
      return existingCategory.id;
    }
    
    // If not found, create new category
    console.log('Creating new note category:', categoryName);
    const createCategoryResponse = await fetch(
      'https://api.planningcenteronline.com/people/v2/note_categories',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            type: 'NoteCategory',
            attributes: {
              name: categoryName
            }
          }
        })
      }
    );
    
    if (createCategoryResponse.ok) {
      const newCategory = await createCategoryResponse.json();
      return newCategory.data.id;
    } else {
      console.error('Failed to create note category');
      return null;
    }
    
  } catch (error) {
    console.error('Error with note categories:', error);
    return null;
  }
};

async function handleNewItem(event, env) {
  try {
    console.log('Handling new item creation');
    
    // Extract data safely with defaults
    const itemData = {
      boardId: event.boardId || event.board_id,
      itemId: event.pulseId || event.itemId || event.pulse_id || event.item_id,
      itemName: event.pulseName || event.itemName || event.pulse_name || event.item_name || 'Unknown',
      columnValues: event.columnValues || event.column_values || {}
    };
    
    console.log('Item data:', JSON.stringify(itemData));

    // Parse column values (Monday sends these in various formats)
    const parsedColumns = {};
    for (const [key, value] of Object.entries(itemData.columnValues)) {
      try {
        // If it's a string that looks like JSON, parse it
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          parsedColumns[key] = JSON.parse(value);
        } else {
          parsedColumns[key] = value;
        }
      } catch (e) {
        parsedColumns[key] = value;
      }
    }

    console.log('Parsed columns:', JSON.stringify(parsedColumns));
    
    // DEBUG: Log column mapping for verification
    console.log('=== COLUMN MAPPING DEBUG ===');
    console.log('Person needing care:', itemData.itemName);
    console.log('Person email (email_mkrkkywc):', parsedColumns.email_mkrkkywc?.email || 'empty');
    console.log('Person phone (phone_mkrkrbbw):', parsedColumns.phone_mkrkrbbw?.phone || 'empty');
    console.log('Submitter name (text_mkrkgaj6):', parsedColumns.text_mkrkgaj6?.value || 'empty');
    console.log('Submitter email (email_mkrkr549):', parsedColumns.email_mkrkr549?.email || 'empty');
    console.log('Submitter phone (phone_mkrkt8q8):', parsedColumns.phone_mkrkt8q8?.phone || 'empty');
    console.log('===========================');

    // Map to care data structure using your actual column IDs and titles
    // Column mapping verified from Monday.com API:
    // name = Person needing care (item name)
    // email_mkrkkywc = Email of person needing care
    // phone_mkrkrbbw = Phone of person needing care
    // text_mkrkgaj6 = Submitter Name
    // email_mkrkr549 = Submitter Email
    // phone_mkrkt8q8 = Submitter Phone
    // color_mkrk2646 = Care Type (dropdown)
    // status = Priority
    // long_text_mkrkff7z = Details/Notes
    // text_mkrkw78h = Location
    // pulse_id_mkrkvsr5 = Case ID (auto number)
    
    // Check if we have the auto-number Case ID
    let caseId;
    if (parsedColumns.pulse_id_mkrkvsr5?.id) {
      // Use the exact Case ID from Monday
      caseId = String(parsedColumns.pulse_id_mkrkvsr5.id);
    } else {
      // Auto-number not assigned yet, we'll update it later
      caseId = `Pending-${itemData.itemId}`;
      console.log('Case ID auto-number not yet assigned, using temporary ID:', caseId);
    }
    
    const caseData = {
      caseId: caseId,
      personName: itemData.itemName,
      personEmail: parsedColumns.email_mkrkkywc?.email || 
                   parsedColumns.email_mkrkkywc?.text || '',
      personPhone: formatPhoneNumber(parsedColumns.phone_mkrkrbbw?.phone || ''),
      submitterName: parsedColumns.text_mkrkgaj6?.value || '',
      submitterEmail: parsedColumns.email_mkrkr549?.email || 
                      parsedColumns.email_mkrkr549?.text || '',
      submitterPhone: formatPhoneNumber(parsedColumns.phone_mkrkt8q8?.phone || ''),
      careType: parsedColumns.color_mkrk2646?.label?.text || '',
      priority: parsedColumns.status?.label?.text || 'Normal',
      details: parsedColumns.long_text_mkrkff7z?.text || '',
      location: parsedColumns.text_mkrkw78h?.value || '',
      status: 'Active',
      mondayItemId: itemData.itemId
    };

    console.log('Care data:', JSON.stringify(caseData));
    console.log('Person needing care:', caseData.personName, '- Email:', caseData.personEmail, '- Phone:', caseData.personPhone);
    console.log('Submitted by:', caseData.submitterName, '- Email:', caseData.submitterEmail, '- Phone:', caseData.submitterPhone);

    // Use the person's email for PCO lookup
    const emailForPCOLookup = caseData.personEmail;
    
    // If no email, we can't proceed
    if (!emailForPCOLookup) {
      console.error('No email address found for person needing care');
      return new Response(JSON.stringify({
        status: 'error',
        message: 'No email address provided for person needing care - cannot create PCO record'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process with PCO using the person's email for lookup
    const result = await processPCOUpdate({...caseData, lookupEmail: emailForPCOLookup}, env);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Item processed successfully',
      caseId: caseData.caseId,
      pcoResult: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleNewItem:', error.toString());
    throw error;
  }
}

// Helper function to format phone numbers
function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove any non-numeric characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as US phone number if it's 10 or 11 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    // Format: 1 (817) 584-1626
    return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    // Format: (817) 584-1626
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not a standard US number
  return phone;
}

async function handleUpdate(event, env) {
  console.log('Handling column update');
  
  try {
    // Extract update data
    const updateData = {
      boardId: event.boardId || event.board_id,
      itemId: event.pulseId || event.itemId || event.pulse_id || event.item_id,
      itemName: event.pulseName || event.itemName || event.pulse_name || event.item_name,
      columnId: event.columnId || event.column_id,
      columnTitle: event.columnTitle || event.column_title,
      value: event.value
    };
    
    console.log('Update data:', JSON.stringify(updateData));
    
    // Special handling for Case ID updates
    if (updateData.columnId === 'pulse_id_mkrkvsr5' && updateData.value?.id) {
      console.log('Case ID updated, updating PCO...');
      
      // Format the case ID
      const newCaseId = `CARE-2025-${String(updateData.value.id).padStart(3, '0')}`;
      
      // We need to find the person in PCO by the old case ID (item ID)
      const oldCaseId = `CASE-${updateData.itemId}`;
      
      // Create auth header
      const auth = btoa(`${env.PCO_APP_ID}:${env.PCO_SECRET}`);
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      };
      
      // Search for person with the old case ID in custom fields
      // This would require searching by custom field which is more complex
      // For now, we'll add a note about the case ID update
      
      console.log(`Case ID changed from ${oldCaseId} to ${newCaseId}`);
      
      // You could implement a more sophisticated update here
      // that finds the person by the old case ID and updates it
    }
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Update acknowledged',
      itemId: updateData.itemId,
      column: updateData.columnId,
      columnTitle: updateData.columnTitle
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in handleUpdate:', error.toString());
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function processPCOUpdate(caseData, env) {
  try {
    // Create auth header
    const auth = btoa(`${env.PCO_APP_ID}:${env.PCO_SECRET}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    // Search for existing person using the person's email first
    console.log('Searching for person needing care with email:', caseData.lookupEmail);
    let searchUrl = `https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${encodeURIComponent(caseData.lookupEmail)}`;
    
    let searchResponse = await fetch(searchUrl, { headers });
    let searchData = await searchResponse.json();
    
    console.log('Email search response:', {
      status: searchResponse.status,
      resultsCount: searchData.data ? searchData.data.length : 0,
      searchTerm: caseData.lookupEmail
    });
    
    // If no results by email, try searching by name
    if ((!searchData.data || searchData.data.length === 0) && caseData.personName) {
      console.log('No results by email, trying name search for:', caseData.personName);
      searchUrl = `https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${encodeURIComponent(caseData.personName)}`;
      searchResponse = await fetch(searchUrl, { headers });
      searchData = await searchResponse.json();
      console.log('Name search results count:', searchData.data ? searchData.data.length : 0);
      
      // If multiple results, try to find best match by name
      if (searchData.data && searchData.data.length > 0) {
        console.log('Found', searchData.data.length, 'people with similar names');
        for (let person of searchData.data) {
          console.log('- ', person.attributes.first_name, person.attributes.last_name, '(ID:', person.id, ')');
        }
        
        const exactMatch = searchData.data.find(person => {
          const fullName = `${person.attributes.first_name} ${person.attributes.last_name}`.toLowerCase();
          return fullName === caseData.personName.toLowerCase();
        });
        
        if (exactMatch) {
          console.log('Using exact name match');
          searchData.data = [exactMatch];
        } else {
          console.log('No exact match found, using first result');
        }
      }
    }
    
    if (!searchResponse.ok) {
      throw new Error(`PCO search failed: ${JSON.stringify(searchData)}`);
    }

    let personId;
    
    if (searchData.data && searchData.data.length > 0) {
      // Person exists
      personId = searchData.data[0].id;
      console.log('Found existing person with ID:', personId);
      console.log('Person details:', JSON.stringify({
        name: `${searchData.data[0].attributes.first_name} ${searchData.data[0].attributes.last_name}`,
        id: personId
      }));
    } else {
      // Create new person
      console.log('Creating new person');
      const nameParts = caseData.personName.split(' ');
      const createData = {
        data: {
          type: 'Person',
          attributes: {
            first_name: nameParts[0] || 'Unknown',
            last_name: nameParts.slice(1).join(' ') || 'Person'
          }
        }
      };
      
      const createResponse = await fetch('https://api.planningcenteronline.com/people/v2/people', {
        method: 'POST',
        headers,
        body: JSON.stringify(createData)
      });
      
      const createResult = await createResponse.json();
      
      if (!createResponse.ok) {
        throw new Error(`Failed to create person: ${JSON.stringify(createResult)}`);
      }
      
      personId = createResult.data.id;
      console.log('Created new person with ID:', personId);
      
      // Add email address to the newly created person
      if (caseData.lookupEmail) {
        const emailData = {
          data: {
            type: 'Email',
            attributes: {
              address: caseData.lookupEmail,
              location: 'Primary',
              primary: true
            }
          }
        };
        
        const emailResponse = await fetch(
          `https://api.planningcenteronline.com/people/v2/people/${personId}/emails`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(emailData)
          }
        );
        
        if (!emailResponse.ok) {
          console.error('Failed to add email:', await emailResponse.text());
        } else {
          console.log('Added email to person');
        }
      }
      
      // Add phone number to the newly created person
      if (caseData.personPhone && caseData.personPhone !== formatPhoneNumber('')) {
        const phoneData = {
          data: {
            type: 'PhoneNumber',
            attributes: {
              number: caseData.personPhone,
              location: 'Mobile',
              primary: true
            }
          }
        };
        
        const phoneResponse = await fetch(
          `https://api.planningcenteronline.com/people/v2/people/${personId}/phone_numbers`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(phoneData)
          }
        );
        
        if (!phoneResponse.ok) {
          console.error('Failed to add phone:', await phoneResponse.text());
        } else {
          console.log('Added phone to person');
        }
      }
    }
    
    // Update custom fields if we have them configured
    await updatePCOCustomFields(personId, caseData, headers);

    // Create a note with category with category
    const noteContent = `
NEW CARE REQUEST
================
Case ID: ${caseData.caseId}
Date: ${new Date().toLocaleString()}

Person Needing Care: ${caseData.personName}
Submitted by: ${caseData.submitterName || 'Not specified'}
Submitter Email: ${caseData.submitterEmail || 'Not provided'}
Person Email: ${caseData.personEmail || 'Not provided'}

Care Type: ${caseData.careType || 'Not specified'}
Priority: ${caseData.priority}
Phone: ${caseData.phoneNumber || 'Not provided'}
Address: ${caseData.address || 'Not provided'}

Details:
${caseData.details || 'No additional details provided'}

---
Automated entry from Monday.com Care Tracking system
    `.trim();

    // First, get note categories to find or create "Care Updates"
    const categoryId = await getOrCreateNoteCategory('Care Updates', headers, env);
    
    const noteData = {
      data: {
        type: 'Note',
        attributes: {
          note: noteContent
        }
      }
    };
    
    // Only add category if we found/created one
    if (categoryId) {
      noteData.data.attributes.note_category_id = parseInt(categoryId);
    }

    const noteResponse = await fetch(`https://api.planningcenteronline.com/people/v2/people/${personId}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(noteData)
    });

    const noteResult = await noteResponse.json();
    
    if (!noteResponse.ok) {
      console.error('Failed to create note:', JSON.stringify(noteResult));
    } else {
      console.log('Note created successfully');
    }

    return {
      personId,
      noteCreated: noteResponse.ok
    };

  } catch (error) {
    console.error('Error in processPCOUpdate:', error.toString());
    throw error;
  }
}