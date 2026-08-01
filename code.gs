// ==========================================
// TNTC Admin Backend - Strict Multi-DB Router (OPTIMIZED)
// ==========================================

// 🔴 MUKKIYAM: Unga 4 Spreadsheet-oda ID-kalaiyum inga podunga! 🔴
const DB_WEBSITE = "19ryICHTmtAp1dekGdF2wwq5b_oAKkgxxEEzLVApn4GQ"; // TNTC Website Database
const DB_JOBS    = "1e6Q0Bd6QPGHrAwbqqIuLgdVnIP8PomSFVSs_Kg4XK6Y"; // Live Job Logs Sheet
const DB_TOURS   = "1Z3Y6wf8YyS-15aIf-7PiGXqz5lEbfwHMYXNczWH8Mxg"; // TNTC Tour 1 Sheet
const DB_EVENTS  = "1NhiUDmXIfy6BXnLcXhAv8Mmp6rmSKzvdI_eznlWbLsw"; // TNTC EVENT MONITOR Sheet

function doOptions(e) {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON).setHeaders(headers);
}

function doGet(e) {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  try {
    if (e.parameter.action === "GET_APPLICATIONS") return handleGetApplications(headers);
    return createJsonResponse({ status: "success", message: "TNTC API is Live" }, headers);
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.message }, headers);
  }
}

function doPost(e) {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "ADD_EVENT") return handleAddEvent(payload.data, headers);
    if (action === "CREATE_TOUR") return handleCreateTour(payload.data, headers);
    if (action === "UPDATE_TOUR_STATUS") return handleUpdateTourStatus(payload.data, headers);
    if (action === "UPDATE_ASSET") return handleUpdateAsset(payload.data, headers);
    if (action === "ADD_NEWS") return handleAddNews(payload.data, headers);
    if (action === "ADD_GALLERY") return handleAddGallery(payload.data, headers);
    if (action === "SUBMIT_APPLICATION") return handleSubmitApplication(payload.data, headers);
    if (action === "GET_APPLICATIONS") return handleGetApplications(headers);

    throw new Error("Invalid action provided.");
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.message }, headers);
  }
}

// --- STRICT MULTI-DB ROUTER ---
function getTargetSheet(sheetName) {
  let targetId = "";
  
  if (["Site_Assets", "Website_News", "Website_Gallery", "APPLICATIONS"].includes(sheetName)) {
    targetId = DB_WEBSITE;
  } else if (["Live_Job_Logs"].includes(sheetName)) {
    targetId = DB_JOBS;
  } else if (["ENTRY SHEET", "EVENT_RECORDS"].includes(sheetName)) {
    targetId = DB_EVENTS;
  } else {
    targetId = DB_TOURS;
  }
  
  try {
    let ss = SpreadsheetApp.openById(targetId);
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) return { sheet: sheet, ss: ss };
    return { sheet: ss.insertSheet(sheetName), ss: ss };
  } catch(e) {
    throw new Error("Routing Error: Could not open Spreadsheet ID: " + targetId + " for sheet: " + sheetName + ".");
  }
}

function getColLetter(colIdx) {
  let letter = '';
  while (colIdx > 0) {
    let temp = (colIdx - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    colIdx = (colIdx - temp - 1) / 26;
  }
  return letter;
}

// -----------------------------------------------------------------
// Action: Update Site Assets
// -----------------------------------------------------------------
function handleUpdateAsset(data, headers) {
  let { sheet } = getTargetSheet("Site_Assets");
  let headerRow = sheet.getRange(1, 1, 1, 2).getValues()[0];
  if(headerRow[0] !== "Asset_Name") { sheet.appendRow(["Asset_Name", "Image_URL"]); sheet.setFrozenRows(1); }

  const assetKey = String(data.assetKey).trim().toUpperCase();
  const newUrl = String(data.newUrl).trim();
  
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim().toUpperCase() === assetKey) {
        sheet.getRange(i + 2, 2).setValue(newUrl);
        return createJsonResponse({ status: "success" }, headers);
      }
    }
  }
  
  sheet.appendRow([assetKey, newUrl]);
  return createJsonResponse({ status: "success" }, headers);
}

// -----------------------------------------------------------------
// Action: Add Event Record (OPTIMIZED)
// -----------------------------------------------------------------
function handleAddEvent(data, headers) {
  let { sheet } = getTargetSheet("ENTRY SHEET"); 
  
  let dataRange = sheet.getRange(1, 1, 5, sheet.getLastColumn()).getValues();
  let headerRow = [];
  let headerRowIndex = 1; 
  
  for(let i=0; i<5; i++) {
     if(String(dataRange[i][1]).toUpperCase().includes('DATE') || String(dataRange[i][2]).toUpperCase().includes('EVENT')) {
         headerRow = dataRange[i];
         headerRowIndex = i + 1; 
         break;
     }
  }
  if(headerRow.length === 0) headerRow = dataRange[0]; 

  let newRow = new Array(headerRow.length).fill("");

  newRow[0] = ""; 
  newRow[1] = data.date || "";
  newRow[2] = data.eventName || "";
  newRow[3] = data.link || "";
  newRow[4] = data.category || "";
  newRow[5] = data.imageLink || "";

  if (data.attendedDrivers && Array.isArray(data.attendedDrivers)) {
      for (let i = 6; i < headerRow.length; i++) {
        let driverName = String(headerRow[i]).toUpperCase().trim();
        if (driverName && driverName !== "UNKNOWN" && !driverName.includes('ATTENDANCE')) {
            if (data.attendedDrivers.includes(driverName)) newRow[i] = true; 
            else newRow[i] = false; 
        }
      }
  }
  
  // OPTIMIZATION: Bounding the search scope to avoid execution timeouts
  let lastDataRow = sheet.getLastRow();
  let searchLimit = Math.max(lastDataRow, headerRowIndex + 1);
  let colC = sheet.getRange(1, 3, searchLimit, 1).getValues(); 
  let targetRow = lastDataRow + 1; 
  
  for (let r = headerRowIndex; r < colC.length; r++) {
      if (String(colC[r][0]).trim() === "") {
          targetRow = r + 1; 
          break;
      }
  }
  
  sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  return createJsonResponse({ status: "success" }, headers);
}

// -----------------------------------------------------------------
// Action: Create New Tour Campaign (OPTIMIZED)
// -----------------------------------------------------------------
function handleCreateTour(data, headers) {
  let { sheet: masterSheet, ss } = getTargetSheet("TOUR_MASTER");
  const tourName = data.tourName || `Tour_${new Date().getTime()}`;
  if (ss.getSheetByName(tourName)) throw new Error(`Tour '${tourName}' already exists.`);

  let driverNames = [];
  let { sheet: jobSheet } = getTargetSheet("Live_Job_Logs");
  
  if (jobSheet) {
      let lastRow = jobSheet.getLastRow();
      if (lastRow > 1) {
          let jobData = jobSheet.getRange(2, 1, lastRow - 1, 3).getValues(); 
          let driverMap = new Map();
          
          let thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          jobData.forEach(row => {
              let dateVal = new Date(row[0]);
              let name = String(row[2]).trim();
              
              if (name && name.toUpperCase() !== 'UNKNOWN' && !isNaN(dateVal.getTime())) {
                  if (dateVal >= thirtyDaysAgo) {
                      driverMap.set(name.toUpperCase(), name);
                  }
              }
          });
          driverNames = Array.from(driverMap.values()).sort();
      }
  }
  
  if (driverNames.length === 0) driverNames = ["MADHANRAJ", "ASHWANTH", "YUVANESH"];

  const newSheet = ss.insertSheet(tourName);
  let tourHeaders = ["S NO", "SOURCE CITY", "SOURCE COMPANY", "DEST CITY", "DEST COMPANY", "DISTANCE (KM)", "IMAGE LINK"].concat(driverNames);
  newSheet.appendRow(tourHeaders);
  newSheet.setFrozenRows(1);

  // OPTIMIZATION: Batch Array processing instead of appending row-by-row
  let routesData = [];
  if (data.routes && data.routes.length > 0) {
      data.routes.forEach((route, idx) => {
          let rowNum = idx + 2; 
          let row = [idx + 1, route.source, route.sourceCo, route.dest, route.destCo, route.dist, route.img];
          
          for (let d = 0; d < driverNames.length; d++) {
              let colLetter = getColLetter(8 + d); 
              // IMPORTANT: This formula assumes "Live_Job_Logs" is mirrored in DB_TOURS via IMPORTRANGE
              let formula = `=IF(IFERROR(ROWS(FILTER(Live_Job_Logs!$A:$A, Live_Job_Logs!$C:$C=${colLetter}$1, Live_Job_Logs!$F:$F=$B${rowNum}, Live_Job_Logs!$G:$G=$C${rowNum}, Live_Job_Logs!$H:$H=$D${rowNum}, Live_Job_Logs!$I:$I=$E${rowNum}, Live_Job_Logs!$A:$A>=DATE(${data.startYear},${data.startMonth},${data.startDay}), VALUE(REGEXEXTRACT(Live_Job_Logs!$M:$M&"0", "[0-9.]+"))>=VALUE(REGEXEXTRACT($F${rowNum}&"0", "[0-9.]+")))), 0)>0, TRUE, FALSE)`;
              row.push(formula);
          }
          routesData.push(row);
      });
      // Extremely fast batch insertion
      newSheet.getRange(2, 1, routesData.length, routesData[0].length).setValues(routesData);
  }

  if(masterSheet) {
      masterSheet.appendRow([tourName, data.startDate, data.endDate, "LIVE", "", data.bannerUrl, newSheet.getSheetId()]);
  }

  return createJsonResponse({ status: "success", sheetName: tourName }, headers);
}

// -----------------------------------------------------------------
// Action: Update Tour Status
// -----------------------------------------------------------------
function handleUpdateTourStatus(data, headers) {
  let { sheet } = getTargetSheet("TOUR_MASTER");
  let values = sheet.getDataRange().getValues();
  for(let i=1; i<values.length; i++) {
     if(values[i][0] == data.tourName) {
         sheet.getRange(i+1, 4).setValue(data.status);
         sheet.getRange(i+1, 5).setValue(data.reason);
         return createJsonResponse({status: "success"}, headers);
     }
  }
  throw new Error("Tour not found in MASTER list");
}

// -----------------------------------------------------------------
// Action: Add News
// -----------------------------------------------------------------
function handleAddNews(data, headers) {
  let { sheet } = getTargetSheet("Website_News");
  let headerRow = sheet.getRange(1, 1, 1, 1).getValues()[0];
  if(headerRow[0] !== "TITLE") { sheet.appendRow(["TITLE", "DATE", "CATEGORY", "IMAGE_URL", "DESCRIPTION", "LINK"]); sheet.setFrozenRows(1); }
  sheet.appendRow([data.title, data.date, data.category, data.image, data.desc, data.link]);
  return createJsonResponse({status:"success"}, headers);
}

// -----------------------------------------------------------------
// Action: Add Gallery
// -----------------------------------------------------------------
function handleAddGallery(data, headers) {
  let { sheet } = getTargetSheet("Website_Gallery");
  let headerRow = sheet.getRange(1, 1, 1, 1).getValues()[0];
  if(headerRow[0] !== "IMAGE_URL") { sheet.appendRow(["IMAGE_URL"]); sheet.setFrozenRows(1); }
  sheet.appendRow([data.image]);
  return createJsonResponse({status:"success"}, headers);
}

// -----------------------------------------------------------------
// Action: Driver Recruitment Requests
// -----------------------------------------------------------------
function handleSubmitApplication(data, headers) {
  let { sheet } = getTargetSheet("APPLICATIONS");
  let headerRow = sheet.getRange(1, 1, 1, 1).getValues()[0];
  if(headerRow[0] !== "DATE") { sheet.appendRow(["DATE", "NAME", "DISCORD", "STEAM", "TMP", "REASON", "STATUS"]); sheet.setFrozenRows(1); }
  sheet.appendRow([new Date().toLocaleString(), data.name, data.discord, data.steamId, data.tmpId, data.reason, "PENDING"]);
  return createJsonResponse({status:"success"}, headers);
}

function handleGetApplications(headers) {
  let { sheet } = getTargetSheet("APPLICATIONS");
  let values = sheet.getDataRange().getValues();
  let apps = [];
  for(let i=1; i<values.length; i++) {
      if(values[i][6] === "PENDING") {
          apps.push({ date: values[i][0], name: values[i][1], discord: values[i][2], tmpId: values[i][4], status: values[i][6] });
      }
  }
  return createJsonResponse({status:"success", data: apps}, headers);
}

function createJsonResponse(responseObject, headers) {
  return ContentService.createTextOutput(JSON.stringify(responseObject)).setMimeType(ContentService.MimeType.JSON).setHeaders(headers);
}