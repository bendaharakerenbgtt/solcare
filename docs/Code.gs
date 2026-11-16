/**
 * GOOGLE APPS SCRIPT BACKEND API - SOLEFUL SOAKS! SHOES CARE
 * Versi Lengkap: Mendukung Orders, Services, Staff, Announcements, Settings, dan Customers
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  // Tunggu maksimal 10 detik agar tidak bentrok saat ada request bersamaan
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e.parameter && e.parameter.action) || 'readAll';
    var payload = {};

    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
        if (payload.action) action = payload.action;
      } catch (err) {}
    }

    // 1. ACTION: SETUP HEADER (Jika tabel masih kosong)
    if (action === 'init') {
      initHeaders(ss);
      return jsonResponse({ ok: true, message: 'Header tabel berhasil diinisialisasi!' });
    }

    // 2. ACTION: AMBIL SEMUA DATA (READ ALL)
    if (action === 'readAll') {
      var data = {
        orders: getSheetData(ss, 'orders'),
        services: getSheetData(ss, 'services'),
        staff: getSheetData(ss, 'staff'),
        announcements: getSheetData(ss, 'announcements'),
        settings: getSettingsData(ss),
        customers: getSheetData(ss, 'customers')
      };
      return jsonResponse({ ok: true, data: data });
    }

    // 3. ACTION: SIMPAN / UPDATE PESANAN (SAVE ORDER)
    if (action === 'saveOrder') {
      var order = payload.order;
      upsertRow(ss, 'orders', 'code', order.code, order);
      return jsonResponse({ ok: true, message: 'Pesanan berhasil disimpan' });
    }

    // 4. ACTION: UPDATE STATUS PESANAN (UPDATE STATUS)
    if (action === 'updateOrderStatus') {
      var code = payload.code;
      var status = payload.status;
      updateSingleField(ss, 'orders', 'code', code, 'status', status);
      return jsonResponse({ ok: true, message: 'Status berhasil diperbarui' });
    }

    // 5. ACTION: SIMPAN LAYANAN (SAVE SERVICE)
    if (action === 'saveService') {
      var svc = payload.service;
      upsertRow(ss, 'services', 'id', svc.id, svc);
      return jsonResponse({ ok: true, message: 'Layanan berhasil disimpan' });
    }

    // 6. ACTION: SIMPAN PENGUMUMAN (SAVE ANNOUNCEMENT)
    if (action === 'saveAnnouncement') {
      var ann = payload.announcement;
      upsertRow(ss, 'announcements', 'id', ann.id, ann);
      return jsonResponse({ ok: true, message: 'Pengumuman berhasil disimpan' });
    }

    // 7. ACTION: SIMPAN / UPDATE PELANGGAN (SAVE CUSTOMER)
    if (action === 'saveCustomer') {
      var cust = payload.customer;
      upsertRow(ss, 'customers', 'id', cust.id, cust);
      return jsonResponse({ ok: true, message: 'Pelanggan berhasil disimpan' });
    }

    // 8. ACTION: HAPUS DATA (DELETE)
    if (action === 'delete') {
      deleteRow(ss, payload.table, payload.keyField, payload.keyValue);
      return jsonResponse({ ok: true, message: 'Data berhasil dihapus' });
    }

    // 9. ACTION: SIMPAN SETTINGS
    if (action === 'saveSettings') {
      saveSettingsData(ss, payload.settings);
      return jsonResponse({ ok: true, message: 'Pengaturan berhasil disimpan' });
    }

    // 10. ACTION: UBAH PASSWORD PEGAWAI
    if (action === 'changeStaffPassword') {
      updateSingleField(ss, 'staff', 'id', payload.id, 'plainPassword', payload.newPassword);
      return jsonResponse({ ok: true, message: 'Password pegawai berhasil diperbarui' });
    }

    // 11. ACTION: TAMBAH PEGAWAI
    if (action === 'saveStaff') {
      upsertRow(ss, 'staff', 'id', payload.staff.id, payload.staff);
      return jsonResponse({ ok: true, message: 'Pegawai berhasil disimpan' });
    }

    return jsonResponse({ ok: false, message: 'Aksi tidak dikenal: ' + action });

  } catch (error) {
    return jsonResponse({ ok: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// -------------------------------------------------------------
// HELPER FUNCTIONS
// -------------------------------------------------------------

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      // Parse JSON strings otomatis jika formatnya array/object
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      item[key] = val;
    }
    result.push(item);
  }
  return result;
}

function upsertRow(ss, sheetName, keyCol, keyVal, dataObj) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  var values = sheet.getDataRange().getValues();
  var headers = values.length > 0 ? values[0] : [];

  // Jika sheet kosong, buat header dari keys dataObj
  if (headers.length === 0) {
    headers = Object.keys(dataObj);
    sheet.appendRow(headers);
    values = [headers];
  }

  // Cek apakah ada key baru yang belum ada di header
  for (var k in dataObj) {
    if (headers.indexOf(k) === -1) {
      headers.push(k);
      sheet.getRange(1, headers.length).setValue(k);
    }
  }

  var keyIdx = headers.indexOf(keyCol);
  var foundRow = -1;

  for (var i = 1; i < values.length; i++) {
    if (values[i][keyIdx] == keyVal) {
      foundRow = i + 1; // 1-indexed
      break;
    }
  }

  var newRowData = headers.map(function(h) {
    var val = dataObj[h];
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return val !== undefined ? val : '';
  });

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, headers.length).setValues([newRowData]);
  } else {
    sheet.appendRow(newRowData);
  }
}

function updateSingleField(ss, sheetName, keyCol, keyVal, targetCol, newVal) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  var headers = values[0];
  var keyIdx = headers.indexOf(keyCol);
  var targetIdx = headers.indexOf(targetCol);

  if (keyIdx === -1) return;
  if (targetIdx === -1) {
    headers.push(targetCol);
    sheet.getRange(1, headers.length).setValue(targetCol);
    targetIdx = headers.length - 1;
  }

  for (var i = 1; i < values.length; i++) {
    if (values[i][keyIdx] == keyVal) {
      sheet.getRange(i + 1, targetIdx + 1).setValue(newVal);
      break;
    }
  }
}

function deleteRow(ss, sheetName, keyCol, keyVal) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  var headers = values[0];
  var keyIdx = headers.indexOf(keyCol);
  if (keyIdx === -1) return;

  for (var i = 1; i < values.length; i++) {
    if (values[i][keyIdx] == keyVal) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function getSettingsData(ss) {
  var sheet = ss.getSheetByName('settings');
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) {
      var val = values[i][1];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      settings[values[i][0]] = val;
    }
  }
  return settings;
}

function saveSettingsData(ss, settingsObj) {
  var sheet = ss.getSheetByName('settings');
  if (!sheet) sheet = ss.insertSheet('settings');
  sheet.clear();
  var rows = [];
  for (var k in settingsObj) {
    var v = settingsObj[k];
    if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    rows.push([k, v]);
  }
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  }
}
