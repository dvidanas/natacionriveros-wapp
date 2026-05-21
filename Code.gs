// ============================================================
// Apps Script — Natación Riveros
// Deployar como Web App: Ejecutar como "Yo", Acceso "Cualquiera"
// ============================================================

const SS_ID = '1KVgc_8qT_cbVr10N9BoIIharQkwQ8_yQWOX01-GtfTI';

function doGet(e) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let result;
  try {
    const action = e.parameter.action;
    if      (action === 'login')      result = login(ss, e.parameter.dni, e.parameter.password);
    else if (action === 'getUsuario') result = getUsuario(ss, e.parameter.dni);
    else if (action === 'getUsuarios')result = getUsuarios(ss);
    else if (action === 'existeDni')  result = existeDni(ss, e.parameter.dni);
    else result = { error: 'Acción desconocida' };
  } catch (err) {
    result = { error: err.message };
  }
  return json(result);
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let result;
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    if      (action === 'registrarUsuario')      result = registrarUsuario(ss, data);
    else if (action === 'agregarInscripcion')    result = agregarInscripcion(ss, data);
    else if (action === 'registrarAdminUsuario') result = registrarAdminUsuario(ss, data);
    else if (action === 'aprobarTodo')           result = aprobarTodo(ss, data);
    else if (action === 'actualizarEstadoPago')  result = actualizarEstadoPago(ss, data);
    else if (action === 'ejecutarReinicio')      result = ejecutarReinicio(ss);
    else result = { error: 'Acción desconocida' };
  } catch (err) {
    result = { error: err.message };
  }
  return json(result);
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Helpers ----

function sheetRows(sheet) {
  const vals = sheet.getDataRange().getValues();
  if (vals.length <= 1) return [];
  const hdr = vals[0];
  return vals.slice(1).map(row => {
    const obj = {};
    hdr.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function nextId(sheet) {
  const lr = sheet.getLastRow();
  if (lr <= 1) return 1;
  const col = sheet.getRange(2, 1, lr - 1, 1).getValues().flat().filter(v => v !== '');
  return col.length === 0 ? 1 : Math.max(...col.map(Number)) + 1;
}

function mapBen(i) {
  return {
    id:       Number(i['ID']),
    usuarioId:Number(i['Usuario ID']),
    nombre:   i['Beneficiario Nombre'] || i['Titular Nombre'],
    relacion: i['Relacion'],
    disc:     i['Disciplina'],
    discId:   Number(i['Disciplina ID']) || 0,
    turno:    i['Turno'],
    turnoId:  Number(i['Turno ID']) || 0,
    estado:   i['Estado Pago'],
    clases:   Number(i['Clases Asistidas']) || 0
  };
}

function buildUsuario(u, ins) {
  return {
    id:       Number(u['ID']),
    nombre:   u['Nombre'],
    dni:      String(u['DNI']),
    tel:      String(u['Telefono']),
    email:    u['Email'] || '',
    obs:      u['Observaciones'] || '',
    fechaReg: u['Fecha Registro'] || '',
    rol:      u['Rol'] || 'alumno',
    beneficiarios: ins
      .filter(i => String(i['Usuario DNI']) === String(u['DNI']))
      .map(mapBen)
  };
}

// ---- Usuarios ----

function getUsuarios(ss) {
  const rows = sheetRows(ss.getSheetByName('Usuarios'));
  const ins  = sheetRows(ss.getSheetByName('Inscripciones'));
  return rows.map(u => buildUsuario(u, ins));
}

function getUsuario(ss, dni) {
  const rows = sheetRows(ss.getSheetByName('Usuarios'));
  const u = rows.find(r => String(r['DNI']) === String(dni));
  if (!u) return { ok: false, error: 'Usuario no encontrado' };
  const ins = sheetRows(ss.getSheetByName('Inscripciones'));
  return { ok: true, user: buildUsuario(u, ins) };
}

function existeDni(ss, dni) {
  const rows = sheetRows(ss.getSheetByName('Usuarios'));
  return { existe: !!rows.find(r => String(r['DNI']) === String(dni)) };
}

function login(ss, dni, password) {
  const rows = sheetRows(ss.getSheetByName('Usuarios'));
  const u = rows.find(r =>
    String(r['DNI']) === String(dni) &&
    String(r['Password']) === String(password)
  );
  if (!u) return { ok: false, error: 'DNI o contraseña incorrectos' };
  const ins = sheetRows(ss.getSheetByName('Inscripciones'));
  return { ok: true, user: buildUsuario(u, ins) };
}

function registrarUsuario(ss, data) {
  const sheet = ss.getSheetByName('Usuarios');
  const rows = sheetRows(sheet);
  if (rows.find(r => String(r['DNI']) === String(data.dni)))
    return { ok: false, error: 'Ya existe una cuenta con ese DNI' };
  const id = nextId(sheet);
  sheet.appendRow([
    id, data.nombre, data.dni, data.tel,
    data.email || '', data.password, data.obs || '',
    new Date().toLocaleDateString('es-AR'), data.rol || 'alumno'
  ]);
  return { ok: true, id };
}

function registrarAdminUsuario(ss, data) {
  const res = registrarUsuario(ss, data);
  if (!res.ok) return res;
  for (const b of (data.beneficiarios || [])) {
    agregarInscripcion(ss, {
      usuarioId:         res.id,
      usuarioDni:        data.dni,
      titularNombre:     data.nombre,
      beneficiarioNombre:b.beneficiarioNombre,
      relacion:          b.relacion,
      disc:              b.disc,
      discId:            b.discId,
      turno:             b.turno,
      turnoId:           b.turnoId
    });
  }
  return { ok: true, id: res.id };
}

// ---- Inscripciones ----

function agregarInscripcion(ss, data) {
  const sheet = ss.getSheetByName('Inscripciones');
  const id = nextId(sheet);
  sheet.appendRow([
    id,
    data.usuarioId,
    data.usuarioDni,
    data.titularNombre,
    data.beneficiarioNombre || data.titularNombre,
    data.relacion || 'titular',
    data.disc,
    data.discId || '',
    data.turno,
    data.turnoId || '',
    'pendiente',
    0
  ]);
  return { ok: true, id };
}

function actualizarEstadoPago(ss, data) {
  const sheet = ss.getSheetByName('Inscripciones');
  const vals  = sheet.getDataRange().getValues();
  const hdr   = vals[0];
  const idCol  = hdr.indexOf('ID');
  const estCol = hdr.indexOf('Estado Pago');
  for (let i = 1; i < vals.length; i++) {
    if (Number(vals[i][idCol]) === Number(data.inscripcionId)) {
      sheet.getRange(i + 1, estCol + 1).setValue(data.estado);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Inscripción no encontrada' };
}

function aprobarTodo(ss, data) {
  const sheet = ss.getSheetByName('Inscripciones');
  const vals  = sheet.getDataRange().getValues();
  const hdr   = vals[0];
  const dniCol = hdr.indexOf('Usuario DNI');
  const estCol = hdr.indexOf('Estado Pago');
  let count = 0;
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][dniCol]) === String(data.dni) && vals[i][estCol] === 'pendiente') {
      sheet.getRange(i + 1, estCol + 1).setValue('pagado');
      count++;
    }
  }
  return { ok: true, count };
}

function ejecutarReinicio(ss) {
  const sheet = ss.getSheetByName('Inscripciones');
  const vals  = sheet.getDataRange().getValues();
  const hdr   = vals[0];
  const estCol = hdr.indexOf('Estado Pago');
  for (let i = 1; i < vals.length; i++) {
    sheet.getRange(i + 1, estCol + 1).setValue('pendiente');
  }
  return { ok: true };
}
