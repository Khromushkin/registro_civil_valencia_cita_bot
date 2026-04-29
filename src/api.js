const CENTRO = 93;
const SERVICIO = 395;
const BASE = 'https://sige.gva.es/qsige.localizador/citaPrevia/disponible';
const HEADERS = { accept: 'application/json, text/plain, */*' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchSlots() {
  const calResp = await fetch(`${BASE}/centro/${CENTRO}/servicio/${SERVICIO}/calendario`, { headers: HEADERS });
  const calData = await calResp.json();

  const availableDays = calData.dias.filter((d) => d.estado === 0).map((d) => d.dia);
  if (availableDays.length === 0) return 'нет доступных слотов';

  const results = [];
  for (const dateStr of availableDays) {
    const [yyyy, mm, dd] = dateStr.split('-');
    const fecha = `${mm}${dd}${yyyy}`;

    await sleep(300);

    const horasResp = await fetch(`${BASE}/horas/centro/${CENTRO}/servicio/${SERVICIO}/fecha/${fecha}`, { headers: HEADERS });
    const horas = await horasResp.json();

    const times =
      Array.isArray(horas) && horas.length > 0
        ? horas.map((h) => h.hora_cita || h).join(', ')
        : 'нет часов';

    results.push(`${dateStr}: ${times}`);
  }

  return results.join('\n');
}

module.exports = { fetchSlots };
