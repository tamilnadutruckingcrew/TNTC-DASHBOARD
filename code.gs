// ==========================================
// TNTC Admin Backend - Bound Google Apps Script (Ultimate Version)
// ==========================================

// IMPORTANT: Put the ID of your SECOND Spreadsheet here (TNTC Website Database)
// You can find the ID in the URL: https://docs.google.com/spreadsheets/d/THIS_LONG_TEXT_IS_THE_ID/edit
const SECONDARY_DB_ID = "19ryICHTmtAp1dekGdF2wwq5b_oAKkgxxEEzLVApn4GQ"; 

function doOptions(e) {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON).setHeaders(headers);
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

// --- SMART SHEET FINDER (Dual Database Support) ---
function getTargetSheet(sheetName) {
  let ssMain = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ssMain.getSheetByName(sheetName);
  if (sheet) return { sheet: sheet, ss: ssMain };

  if (SECONDARY_DB_ID && SECONDARY_DB_ID !== "19ryICHTmtAp1dekGdF2wwq5b_oAKkgxxEEzLVApn4GQ") {
    try {
      let ssSec = SpreadsheetApp.openById(SECONDARY_DB_ID);
      let sheetSec = ssSec.getSheetByName(sheetName);
      if (sheetSec) return { sheet: sheetSec, ss: ssSec };
    } catch(e) {}
  }
  
  // If not found in either, create it in the main one
  return { sheet: ssMain.insertSheet(sheetName), ss: ssMain };
}

// -----------------------------------------------------------------
// Action: Update Site Assets (Images & YouTube)
// -----------------------------------------------------------------
function handleUpdateAsset(data, headers) {
  let { sheet } = getTargetSheet("Site_Assets");
  let headerRow = sheet.getRange(1, 1, 1, 2).getValues()[0];
  if(headerRow[0] !== "Asset_Name") { sheet.appendRow(["Asset_Name", "Image_URL"]); sheet.setFrozenRows(1); }

  const assetKey = String(data.assetKey).trim().toUpperCase();
  const newUrl = String(data.newUrl).trim();
  const values = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).toUpperCase() === assetKey) {
      sheet.getRange(i + 1, 2).setValue(newUrl);
      found = true; break;
    }
  }
  if (!found) sheet.appendRow([assetKey, newUrl]);
  return createJsonResponse({ status: "success" }, headers);
}

// -----------------------------------------------------------------
// Action: Add Event Record
// -----------------------------------------------------------------
function handleAddEvent(data, headers) {
  let { sheet } = getTargetSheet("EVENT_RECORDS"); 
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let newRow = new Array(headerRow.length).fill("");

  newRow[0] = new Date().toLocaleString(); 
  newRow[1] = data.date || "";
  newRow[2] = data.eventName || "";
  newRow[3] = data.link || "";
  newRow[4] = data.category || "";
  newRow[5] = data.imageLink || "";

  if (data.attendedDrivers && Array.isArray(data.attendedDrivers)) {
      for (let i = 6; i < headerRow.length; i++) {
        if (data.attendedDrivers.includes(String(headerRow[i]).toUpperCase().trim())) newRow[i] = "TRUE";
        else newRow[i] = "FALSE";
      }
  }
  sheet.appendRow(newRow);
  return createJsonResponse({ status: "success" }, headers);
}

// -----------------------------------------------------------------
// Action: Create New Tour Campaign
// -----------------------------------------------------------------
function handleCreateTour(data, headers) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  const tourName = data.tourName || `Tour_${new Date().getTime()}`;
  if (ss.getSheetByName(tourName)) throw new Error(`Tour '${tourName}' already exists.`);

  let eventSheet = ss.getSheetByName("EVENT_RECORDS");
  let driverNames = [];
  if (eventSheet) {
      const evHeaders = eventSheet.getRange(1, 1, 1, eventSheet.getLastColumn()).getValues()[0];
      for(let i=6; i<evHeaders.length; i++){
          if(evHeaders[i] && evHeaders[i] !== 'UNKNOWN') driverNames.push(evHeaders[i]);
      }
  }

  // 1. Create the new Tour Sheet
  const newSheet = ss.insertSheet(tourName);
  let tourHeaders = ["ROUTE ID", "SOURCE CITY", "SOURCE COMPANY", "DEST CITY", "DEST COMPANY", "DISTANCE (KM)", "IMAGE LINK"].concat(driverNames);
  newSheet.appendRow(tourHeaders);
  newSheet.setFrozenRows(1);

  // Add the routes from the admin panel
  if (data.routes && data.routes.length > 0) {
      let emptyDriverCols = new Array(driverNames.length).fill("FALSE");
      data.routes.forEach((route, idx) => {
          let row = [idx + 1, route.source, route.sourceCo, route.dest, route.destCo, route.dist, route.img].concat(emptyDriverCols);
          newSheet.appendRow(row);
      });
  }

  // 2. Append to TOUR_MASTER so the website can see it!
  let masterSheet = ss.getSheetByName("TOUR_MASTER");
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