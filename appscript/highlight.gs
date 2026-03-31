function runFullSEOAudit() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const range = sheet.getDataRange();
  const data = range.getValues();
  
  if (data.length < 2) return;
  
  const headers = data[0];
  const colMap = {};
  
  // Map header names to their column indexes dynamically
  headers.forEach((header, index) => {
    colMap[header.toString().trim()] = index;
  });
  
  // Frequencies for checking duplicates
  const counts = { url: {}, title: {}, description: {}, h1Text: {} };
  
  for (let i = 1; i < data.length; i++) {
    const getVal = (colName) => colMap[colName] !== undefined ? String(data[i][colMap[colName]]).trim() : '';
    
    const u = getVal('url');
    const t = getVal('title');
    const d = getVal('description');
    const h1 = getVal('h1Text');
    
    // Only count duplicates if the string is not empty
    if (u !== '') counts.url[u] = (counts.url[u] || 0) + 1;
    if (t !== '') counts.title[t] = (counts.title[t] || 0) + 1;
    if (d !== '') counts.description[d] = (counts.description[d] || 0) + 1;
    if (h1 !== '') counts.h1Text[h1] = (counts.h1Text[h1] || 0) + 1;
  }
  
  const backgrounds = range.getBackgrounds();
  
  // Define distinct colors
  const ERR_MISSING   = '#f4cccc'; // Light Red
  const ERR_DUPLICATE = '#d9d2e9'; // Light Purple
  const ERR_TOOLONG   = '#fce5cd'; // Light Orange
  const WARN_COLOR    = '#fff2cc'; // Light Yellow
  const NORMAL_COLOR  = null;      // Clear
  
  // Loop through rows and apply rules
  for (let i = 1; i < data.length; i++) {
    const getVal = (colName) => colMap[colName] !== undefined ? String(data[i][colMap[colName]]).trim() : null;
    const setBg = (colName, color) => {
      if (colMap[colName] !== undefined) backgrounds[i][colMap[colName]] = color;
    };

    // 1. URL Rules
    const url = getVal('url');
    if (url !== null) {
      if (url === '' || !url.startsWith('http')) setBg('url', ERR_MISSING);
      else if (counts.url[url] > 1) setBg('url', ERR_DUPLICATE);
      else setBg('url', NORMAL_COLOR);
    }
    
    // 2. Title Rules (Priority: Missing -> Duplicate -> Too Long -> Too Short)
    const title = getVal('title');
    if (title !== null) {
      if (title === '') {
        setBg('title', ERR_MISSING);
      } else if (counts.title[title] > 1) {
        setBg('title', ERR_DUPLICATE);
      } else if (title.length > 60) {
        setBg('title', ERR_TOOLONG);
      } else if (title.length < 15) {
        setBg('title', WARN_COLOR);
      } else {
        setBg('title', NORMAL_COLOR);
      }
    }
    
    // 3. Description Rules (Priority: Missing -> Duplicate -> Too Long -> Too Short)
    const desc = getVal('description');
    if (desc !== null) {
      if (desc === '') {
        setBg('description', ERR_MISSING);
      } else if (counts.description[desc] > 1) {
        setBg('description', ERR_DUPLICATE);
      } else if (desc.length > 160) {
        setBg('description', ERR_TOOLONG);
      } else if (desc.length < 50) {
        setBg('description', WARN_COLOR);
      } else {
        setBg('description', NORMAL_COLOR);
      }
    }
    
    // 4. Canonical Rules
    const canonical = getVal('canonical');
    if (canonical !== null) {
      if (canonical === '' || !canonical.startsWith('http')) setBg('canonical', ERR_MISSING);
      else setBg('canonical', NORMAL_COLOR);
    }
    
    // 5. H1 Count & Text Rules
    const h1Count = getVal('h1Count');
    if (h1Count !== null) {
      if (h1Count !== '1') setBg('h1Count', ERR_MISSING);
      else setBg('h1Count', NORMAL_COLOR);
    }
    
    const h1Text = getVal('h1Text');
    if (h1Text !== null) {
      if (h1Text === '') {
        setBg('h1Text', ERR_MISSING);
      } else if (counts.h1Text[h1Text] > 1) {
        setBg('h1Text', ERR_DUPLICATE);
      } else {
        setBg('h1Text', NORMAL_COLOR);
      }
    }
    
    // 6. H2 Rules (Soft warnings)
    const h2Count = getVal('h2Count');
    if (h2Count !== null) {
      if (h2Count === '0' || h2Count === '') setBg('h2Count', WARN_COLOR);
      else setBg('h2Count', NORMAL_COLOR);
    }

    // 7. Page Size Rules (> 3MB roughly 3,000,000 bytes)
    const size = getVal('size');
    if (size !== null) {
      if (parseInt(size) > 3000000) setBg('size', WARN_COLOR);
      else setBg('size', NORMAL_COLOR);
    }
    
    // 8. Analytics & Tag Manager
    const ga4Count = getVal('ga4Count');
    const ga4Ids = getVal('ga4Ids');
    if (ga4Count !== null) {
      if (ga4Count === '0' || ga4Count === '') setBg('ga4Count', ERR_MISSING);
      else setBg('ga4Count', NORMAL_COLOR);
      
      if (ga4Count > '0' && ga4Ids === '') setBg('ga4Ids', ERR_MISSING);
      else setBg('ga4Ids', NORMAL_COLOR);
    }

    const gtmCount = getVal('gtmCount');
    if (gtmCount !== null) {
      if (gtmCount === '0' || gtmCount === '') setBg('gtmCount', ERR_MISSING);
      else setBg('gtmCount', NORMAL_COLOR);
    }

    // 9. Structured Data
    const structureData = getVal('StructureData');
    if (structureData !== null) {
      if (structureData === '0' || structureData === '') setBg('StructureData', WARN_COLOR); 
      else setBg('StructureData', NORMAL_COLOR);
    }
  }
  
  // Apply the colors to the sheet
  range.setBackgrounds(backgrounds);
}

// Add Custom Menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SEO Audit Tools')
      .addItem('Run Full SEO Audit', 'runFullSEOAudit')
      .addToUi();
}